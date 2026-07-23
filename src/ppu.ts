// PPU (Picture Processing Unit / リコー RP2C02) のエミュレーション
//
// 256x240 ピクセルの画面を生成する。1 フレーム = 262 スキャンライン、
// 1 スキャンライン = 341 PPU サイクル (ドット)。PPU は CPU の 3 倍の速度で動く。
//
//   スキャンライン 0-239   : 可視領域 (描画)
//   スキャンライン 240     : ポストレンダー (何もしない)
//   スキャンライン 241-260 : VBlank (CPU が PPU を更新できる期間)
//   スキャンライン 261     : プリレンダー (次フレームの準備)
//
// このエミュレータではドット単位の描画ではなく、各スキャンラインの
// 描画完了タイミングで 1 ライン分をまとめて描画する (スキャンライン方式)。

import { Mapper } from "./mappers/mapper";
import { Mirroring } from "./cartridge";

/** NES の 64 色マスターパレット (RGBA、一般的な NTSC 近似) */
export const NES_PALETTE = new Uint32Array(64);
{
  // R, G, B の順。よく使われる 2C02 パレット近似値
  const p = [
    0x666666, 0x002a88, 0x1412a7, 0x3b00a4, 0x5c007e, 0x6e0040, 0x6c0600, 0x561d00,
    0x333500, 0x0b4800, 0x005200, 0x004f08, 0x00404d, 0x000000, 0x000000, 0x000000,
    0xadadad, 0x155fd9, 0x4240ff, 0x7527fe, 0xa01acc, 0xb71e7b, 0xb53120, 0x994e00,
    0x6b6d00, 0x388700, 0x0c9300, 0x008f32, 0x007c8d, 0x000000, 0x000000, 0x000000,
    0xfffeff, 0x64b0ff, 0x9290ff, 0xc676ff, 0xf36aff, 0xfe6ecc, 0xfe8170, 0xea9e22,
    0xbcbe00, 0x88d800, 0x5ce430, 0x45e082, 0x48cdde, 0x4f4f4f, 0x000000, 0x000000,
    0xfffeff, 0xc0dfff, 0xd3d2ff, 0xe8c8ff, 0xfbc2ff, 0xfec4ea, 0xfeccc5, 0xf7d8a5,
    0xe4e594, 0xcfef96, 0xbdf4ab, 0xb3f3cc, 0xb5ebf2, 0xb8b8b8, 0x000000, 0x000000,
  ];
  for (let i = 0; i < 64; i++) {
    const rgb = p[i];
    // Canvas の ImageData はリトルエンディアンで ABGR の並びになる
    NES_PALETTE[i] =
      0xff000000 | ((rgb & 0xff) << 16) | (rgb & 0xff00) | ((rgb >> 16) & 0xff);
  }
}

export class Ppu {
  // ---- 外部から見えるメモリ ----
  /** ネームテーブル用 VRAM 2KB (配置はミラーリングで決まる) */
  vram = new Uint8Array(0x800);
  /** パレット RAM 32B */
  palette = new Uint8Array(0x20);
  /** スプライト属性メモリ (64 スプライト x 4 バイト) */
  oam = new Uint8Array(256);

  /** 完成したフレーム (ABGR packed、canvas に直接転送できる) */
  frameBuffer = new Uint32Array(256 * 240);
  /** パレット適用前のピクセル (デバッグ用: パレット RAM インデックス) */
  frameIndex = new Uint8Array(256 * 240);

  /** 描画完了フレーム数 */
  frame = 0;

  // ---- レジスタ ----
  private ctrl = 0;   // $2000 PPUCTRL
  private mask = 0;   // $2001 PPUMASK
  private statusReg = 0; // $2002 PPUSTATUS (bit7=VBlank, bit6=Sprite0, bit5=Overflow)
  private oamAddr = 0;   // $2003

  // ---- スクロール内部レジスタ (通称 loopy レジスタ) ----
  // v/t は 15bit: yyy NN YYYYY XXXXX
  //   yyy=fine Y, NN=ネームテーブル選択, YYYYY=coarse Y, XXXXX=coarse X
  private v = 0; // 現在の VRAM アドレス
  private t = 0; // テンポラリ (スクロール設定値)
  private fineX = 0; // 横方向の 8 ピクセル未満のずれ
  private w = 0; // $2005/$2006 の 2 回書き込みのどちらかを示すトグル

  private readBuffer = 0; // $2007 読み出しの 1 段バッファ

  // ---- タイミング ----
  scanline = 0; // 0-261
  dot = 0;      // 0-340
  private nmiOccurred = false;

  /** VBlank 開始時に CPU へ NMI を届けるコールバック */
  onNmi: (() => void) | null = null;

  constructor(private mapper: Mapper) {}

  reset(): void {
    this.ctrl = 0;
    this.mask = 0;
    this.w = 0;
    this.scanline = 261;
    this.dot = 0;
  }

  // ================= CPU からのレジスタアクセス =================

  readRegister(reg: number): number {
    switch (reg) {
      case 2: { // PPUSTATUS
        const result = (this.statusReg & 0xe0) | (this.readBuffer & 0x1f);
        this.statusReg &= 0x7f; // VBlank フラグは読むとクリア
        this.w = 0;             // 書き込みトグルもリセット
        return result;
      }
      case 4: // OAMDATA
        return this.oam[this.oamAddr];
      case 7: { // PPUDATA
        const addr = this.v & 0x3fff;
        let value: number;
        if (addr >= 0x3f00) {
          // パレットは即時読み出し (バッファはネームテーブルの値で更新)
          value = this.readPalette(addr);
          this.readBuffer = this.ppuRead(addr - 0x1000);
        } else {
          value = this.readBuffer;
          this.readBuffer = this.ppuRead(addr);
        }
        this.v = (this.v + ((this.ctrl & 0x04) ? 32 : 1)) & 0x7fff;
        return value;
      }
      default:
        return 0;
    }
  }

  writeRegister(reg: number, value: number): void {
    switch (reg) {
      case 0: // PPUCTRL
        this.ctrl = value;
        // ネームテーブル選択ビットは t に入る
        this.t = (this.t & 0x73ff) | ((value & 0x03) << 10);
        break;
      case 1: // PPUMASK
        this.mask = value;
        break;
      case 3: // OAMADDR
        this.oamAddr = value;
        break;
      case 4: // OAMDATA
        this.oam[this.oamAddr] = value;
        this.oamAddr = (this.oamAddr + 1) & 0xff;
        break;
      case 5: // PPUSCROLL (2回書き: X, Y)
        if (this.w === 0) {
          this.t = (this.t & 0x7fe0) | (value >> 3);
          this.fineX = value & 0x07;
          this.w = 1;
        } else {
          this.t = (this.t & 0x0c1f) | ((value & 0x07) << 12) | ((value & 0xf8) << 2);
          this.w = 0;
        }
        break;
      case 6: // PPUADDR (2回書き: 上位, 下位)
        if (this.w === 0) {
          this.t = (this.t & 0x00ff) | ((value & 0x3f) << 8);
          this.w = 1;
        } else {
          this.t = (this.t & 0x7f00) | value;
          this.v = this.t;
          this.w = 0;
        }
        break;
      case 7: // PPUDATA
        this.ppuWrite(this.v & 0x3fff, value);
        this.v = (this.v + ((this.ctrl & 0x04) ? 32 : 1)) & 0x7fff;
        break;
    }
  }

  writeOamDma(data: Uint8Array): void {
    // OAMADDR からの相対位置に 256 バイト転送
    for (let i = 0; i < 256; i++) {
      this.oam[(this.oamAddr + i) & 0xff] = data[i];
    }
  }

  // ================= PPU バス ($0000-$3FFF) =================

  private ppuRead(addr: number): number {
    addr &= 0x3fff;
    if (addr < 0x2000) return this.mapper.ppuRead(addr);
    if (addr < 0x3f00) return this.vram[this.mirrorVram(addr)];
    return this.readPalette(addr);
  }

  private ppuWrite(addr: number, value: number): void {
    addr &= 0x3fff;
    if (addr < 0x2000) {
      this.mapper.ppuWrite(addr, value);
    } else if (addr < 0x3f00) {
      this.vram[this.mirrorVram(addr)] = value;
    } else {
      this.writePalette(addr, value);
    }
  }

  /** ネームテーブルアドレス → 2KB VRAM 内オフセット (ミラーリング適用) */
  private mirrorVram(addr: number): number {
    const index = (addr - 0x2000) & 0xfff; // 4KB 空間内
    const table = index >> 10; // 0-3
    const offset = index & 0x3ff;
    switch (this.mapper.mirroring()) {
      case Mirroring.Vertical:
        // 左右 2 枚: 0,1,0,1
        return ((table & 1) << 10) | offset;
      case Mirroring.Horizontal:
        // 上下 2 枚: 0,0,1,1
        return ((table >> 1) << 10) | offset;
      case Mirroring.SingleScreenLower:
        return offset;
      case Mirroring.SingleScreenUpper:
        return 0x400 | offset;
      case Mirroring.FourScreen:
      default:
        // 4 画面は本来カセット側 RAM が必要。ここでは 2KB に折りたたむ
        return index & 0x7ff;
    }
  }

  private readPalette(addr: number): number {
    let i = addr & 0x1f;
    // $3F10/$3F14/$3F18/$3F1C は $3F00/... のミラー
    if ((i & 0x13) === 0x10) i &= 0x0f;
    return this.palette[i];
  }

  private writePalette(addr: number, value: number): void {
    let i = addr & 0x1f;
    if ((i & 0x13) === 0x10) i &= 0x0f;
    this.palette[i] = value & 0x3f;
  }

  // ================= タイミング =================

  private renderingEnabled(): boolean {
    return (this.mask & 0x18) !== 0;
  }

  /** PPU を 1 サイクル進める */
  tick(): void {
    const line = this.scanline;

    if (line < 240) {
      // 可視ライン
      if (this.dot === 256) {
        this.renderScanline(line);
        if (this.renderingEnabled()) this.incrementY();
      } else if (this.dot === 257) {
        if (this.renderingEnabled()) this.copyX();
      } else if (this.dot === 260) {
        // MMC3 の IRQ カウンタ用 (スプライトフェッチ中の A12 立ち上がり近似)
        if (this.renderingEnabled()) this.mapper.onScanline();
      }
    } else if (line === 241) {
      if (this.dot === 1) {
        // VBlank 開始
        this.statusReg |= 0x80;
        this.frame++;
        if (this.ctrl & 0x80) this.onNmi?.();
      }
    } else if (line === 261) {
      // プリレンダーライン
      if (this.dot === 1) {
        this.statusReg &= 0x1f; // VBlank / Sprite0 / Overflow をクリア
      } else if (this.dot === 257) {
        if (this.renderingEnabled()) this.copyX();
      } else if (this.dot === 280) {
        if (this.renderingEnabled()) this.copyY();
      } else if (this.dot === 260) {
        if (this.renderingEnabled()) this.mapper.onScanline();
      }
    }

    // ドット / スキャンラインを進める
    this.dot++;
    if (this.dot > 340) {
      this.dot = 0;
      this.scanline++;
      if (this.scanline > 261) {
        this.scanline = 0;
      }
    }
  }

  // ---- loopy レジスタ操作 ----

  /** 次のタイルへ (coarse X++)。ネームテーブルの端で隣のテーブルへ切り替え */
  private incrementCoarseX(): void {
    if ((this.v & 0x001f) === 31) {
      this.v &= ~0x001f;
      this.v ^= 0x0400; // 水平ネームテーブル切替
    } else {
      this.v++;
    }
  }

  /** 次のラインへ (fine Y++) */
  private incrementY(): void {
    if ((this.v & 0x7000) !== 0x7000) {
      this.v += 0x1000;
    } else {
      this.v &= ~0x7000;
      let y = (this.v & 0x03e0) >> 5;
      if (y === 29) {
        y = 0;
        this.v ^= 0x0800; // 垂直ネームテーブル切替
      } else if (y === 31) {
        y = 0; // 属性テーブル領域に入った場合は切替なしで巻き戻る
      } else {
        y++;
      }
      this.v = (this.v & ~0x03e0) | (y << 5);
    }
  }

  /** t の水平成分 (coarse X + NT下位) を v へコピー */
  private copyX(): void {
    this.v = (this.v & 0x7be0) | (this.t & 0x041f);
  }

  /** t の垂直成分 (fine Y + coarse Y + NT上位) を v へコピー */
  private copyY(): void {
    this.v = (this.v & 0x041f) | (this.t & 0x7be0);
  }

  // ================= スキャンライン描画 =================

  private renderScanline(y: number): void {
    const fbBase = y * 256;
    const bgEnabled = (this.mask & 0x08) !== 0;
    const sprEnabled = (this.mask & 0x10) !== 0;
    const bgLeftShow = (this.mask & 0x02) !== 0;
    const sprLeftShow = (this.mask & 0x04) !== 0;

    // ---- 背景 ----
    // line[i] にはパレット RAM のインデックス (0-31)、0 なら透明背景
    const bgPix = new Uint8Array(256);
    if (bgEnabled) {
      // v のローカルコピーでタイルを 33 枚フェッチ (fineX のずれ分で +1 枚)
      let rv = this.v;
      const fineY = (rv >> 12) & 7;
      const patternBase = (this.ctrl & 0x10) ? 0x1000 : 0;
      let px = -this.fineX;
      for (let tile = 0; tile < 33; tile++) {
        const ntAddr = 0x2000 | (rv & 0x0fff);
        const tileIndex = this.vram[this.mirrorVram(ntAddr)];
        // 属性テーブル: 4x4 タイル単位の領域ごとに 2bit のパレット番号
        const attrAddr = 0x23c0 | (rv & 0x0c00) | ((rv >> 4) & 0x38) | ((rv >> 2) & 0x07);
        const attr = this.vram[this.mirrorVram(attrAddr)];
        const shift = ((rv >> 4) & 4) | (rv & 2);
        const paletteHi = ((attr >> shift) & 3) << 2;
        // パターンテーブルから 2 枚のビットプレーンを読む
        const pAddr = patternBase + tileIndex * 16 + fineY;
        const lo = this.mapper.ppuRead(pAddr);
        const hi = this.mapper.ppuRead(pAddr + 8);
        for (let bit = 7; bit >= 0; bit--) {
          if (px >= 0 && px < 256) {
            const color = (((hi >> bit) & 1) << 1) | ((lo >> bit) & 1);
            bgPix[px] = color === 0 ? 0 : paletteHi | color;
          }
          px++;
        }
        rv = this.incrementCoarseXOf(rv);
      }
    }

    // 左端 8 ピクセルのクリッピング
    if (bgEnabled && !bgLeftShow) {
      for (let i = 0; i < 8; i++) bgPix[i] = 0;
    }

    // ---- スプライト ----
    // sprPix: パレットインデックス, sprPriority: 1=背景の後ろ, sprIsZero: スプライト0か
    const sprPix = new Uint8Array(256);
    const sprBehind = new Uint8Array(256);
    const sprIsZero = new Uint8Array(256);
    if (sprEnabled) {
      const sprHeight = (this.ctrl & 0x20) ? 16 : 8;
      let count = 0;
      for (let s = 0; s < 64; s++) {
        const sy = this.oam[s * 4];
        const row = y - sy - 1; // OAM の Y は「表示位置 - 1」で格納される
        if (row < 0 || row >= sprHeight) continue;
        count++;
        if (count > 8) {
          this.statusReg |= 0x20; // スプライトオーバーフロー (近似)
          break;
        }
        const tileIndex = this.oam[s * 4 + 1];
        const attr = this.oam[s * 4 + 2];
        const sx = this.oam[s * 4 + 3];
        const flipH = (attr & 0x40) !== 0;
        const flipV = (attr & 0x80) !== 0;
        const paletteHi = 0x10 | ((attr & 3) << 2);
        const behind = (attr & 0x20) !== 0 ? 1 : 0;

        let r = flipV ? sprHeight - 1 - row : row;
        let pAddr: number;
        if (sprHeight === 16) {
          // 8x16: タイル番号の bit0 がパターンテーブル選択
          const table = (tileIndex & 1) * 0x1000;
          const t2 = (tileIndex & 0xfe) + (r >= 8 ? 1 : 0);
          pAddr = table + t2 * 16 + (r & 7);
        } else {
          const table = (this.ctrl & 0x08) ? 0x1000 : 0;
          pAddr = table + tileIndex * 16 + r;
        }
        const lo = this.mapper.ppuRead(pAddr);
        const hi = this.mapper.ppuRead(pAddr + 8);
        for (let i = 0; i < 8; i++) {
          const px = sx + i;
          if (px >= 256) break;
          if (sprPix[px] !== 0) continue; // 手前のスプライト優先 (OAM 順)
          const bit = flipH ? i : 7 - i;
          const color = (((hi >> bit) & 1) << 1) | ((lo >> bit) & 1);
          if (color === 0) continue;
          sprPix[px] = paletteHi | color;
          sprBehind[px] = behind;
          if (s === 0) sprIsZero[px] = 1;
        }
      }
      if (!sprLeftShow) {
        for (let i = 0; i < 8; i++) {
          sprPix[i] = 0;
          sprIsZero[i] = 0;
        }
      }
    }

    // ---- 合成 ----
    const backdrop = this.palette[0];
    for (let x = 0; x < 256; x++) {
      const bg = bgPix[x];
      const sp = sprPix[x];
      let paletteIndex: number;
      if (sp !== 0 && (bg === 0 || sprBehind[x] === 0)) {
        paletteIndex = sp;
      } else if (bg !== 0) {
        paletteIndex = bg;
      } else {
        paletteIndex = 0;
      }
      // スプライト 0 ヒット: 不透明スプライト0 と不透明背景が重なった瞬間
      if (sprIsZero[x] && bg !== 0 && x < 255) {
        this.statusReg |= 0x40;
      }
      const colorIndex = paletteIndex === 0 ? backdrop : this.palette[this.paletteMirror(paletteIndex)];
      this.frameIndex[fbBase + x] = paletteIndex;
      this.frameBuffer[fbBase + x] = NES_PALETTE[colorIndex & 0x3f];
    }
  }

  private paletteMirror(i: number): number {
    if ((i & 0x13) === 0x10) return i & 0x0f;
    return i;
  }

  /** incrementCoarseX の純粋関数版 (ローカルコピー用) */
  private incrementCoarseXOf(rv: number): number {
    if ((rv & 0x001f) === 31) {
      rv &= ~0x001f;
      rv ^= 0x0400;
    } else {
      rv++;
    }
    return rv & 0x7fff;
  }

  // ---- デバッグ用アクセサ ----
  get status(): number {
    return this.statusReg;
  }
  get control(): number {
    return this.ctrl;
  }
  get maskReg(): number {
    return this.mask;
  }
  get vramAddr(): number {
    return this.v;
  }
}
