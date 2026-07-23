// PPU のテスト — 手書きの機械語プログラムで実際に画面を描かせて検証する

import { suite, assertEq, assertTrue } from "./harness";
import { buildRom } from "./rom-builder";
import { Nes } from "../src/nes";
import { NES_PALETTE } from "../src/ppu";

/**
 * テスト ROM:
 *   - パレット設定 (背景色 $0F=黒, パレット0 の色1 = $21=水色)
 *   - ネームテーブル左上にタイル 1 を配置
 *   - 背景表示を ON
 *   - CHR: タイル1 = 全ピクセル色1 のベタ塗り
 */
function makeBgTestRom(): Uint8Array {
  const prg = [
    0x78,             // SEI
    0xd8,             // CLD
    // VBlank を 2 回待つ (PPU ウォームアップ)
    0x2c, 0x02, 0x20, // wait1: BIT $2002
    0x10, 0xfb,       // BPL wait1
    0x2c, 0x02, 0x20, // wait2: BIT $2002
    0x10, 0xfb,       // BPL wait2
    // パレット書き込み $3F00-$3F03
    0xa9, 0x3f, 0x8d, 0x06, 0x20, // LDA #$3F; STA $2006
    0xa9, 0x00, 0x8d, 0x06, 0x20, // LDA #$00; STA $2006
    0xa9, 0x0f, 0x8d, 0x07, 0x20, // $3F00 = $0F (黒)
    0xa9, 0x21, 0x8d, 0x07, 0x20, // $3F01 = $21 (水色)
    0xa9, 0x16, 0x8d, 0x07, 0x20, // $3F02
    0xa9, 0x30, 0x8d, 0x07, 0x20, // $3F03
    // ネームテーブル $2000 の先頭にタイル 1
    0xa9, 0x20, 0x8d, 0x06, 0x20,
    0xa9, 0x00, 0x8d, 0x06, 0x20,
    0xa9, 0x01, 0x8d, 0x07, 0x20, // タイル番号 1
    // スクロールを (0,0) に
    0xa9, 0x00,
    0x8d, 0x05, 0x20,
    0x8d, 0x05, 0x20,
    // PPUCTRL=0, PPUMASK=$1E (BG+スプライト表示、左端も表示)
    0x8d, 0x00, 0x20,
    0xa9, 0x1e, 0x8d, 0x01, 0x20,
    // 無限ループ
    0x4c, 0x4a, 0x80, // JMP $804A (この命令自身)
  ];
  // JMP のアドレスを実際の位置に合わせる
  const jmpAddr = 0x8000 + prg.length - 3;
  prg[prg.length - 2] = jmpAddr & 0xff;
  prg[prg.length - 1] = jmpAddr >> 8;

  const chr = new Uint8Array(0x2000);
  // タイル 1: plane0 全 0xFF → 全ピクセルが色 1
  for (let i = 0; i < 8; i++) chr[16 + i] = 0xff;
  return buildRom({ prg, chr });
}

export function testBackgroundRendering(): void {
  suite("ppu background");
  const nes = new Nes(makeBgTestRom());
  // 数フレーム回してプログラムに初期化させる
  for (let i = 0; i < 5; i++) nes.runFrame();

  const fb = nes.frameBuffer;
  // 左上 8x8 はタイル 1 (色 $21 = 水色)
  assertEq(fb[0], NES_PALETTE[0x21], "top-left pixel is tile color");
  assertEq(fb[7 + 7 * 256], NES_PALETTE[0x21], "tile bottom-right");
  // タイルの外は背景色 $0F (黒)
  assertEq(fb[8], NES_PALETTE[0x0f], "outside tile is backdrop");
  assertEq(fb[100 + 100 * 256], NES_PALETTE[0x0f], "center is backdrop");
}

export function testVblankFlag(): void {
  suite("ppu vblank");
  const nes = new Nes(makeBgTestRom());
  // VBlank 待ちループを抜けてプログラムが最後まで到達している
  // = 無限ループ (JMP) に入っている
  for (let i = 0; i < 5; i++) nes.runFrame();
  const pcBefore = nes.cpu.pc;
  nes.step();
  assertEq(nes.cpu.pc, pcBefore, "program reached the idle loop (vblank waits passed)");
  // PPUMASK が設定されている = 初期化コードが完走した
  assertEq(nes.ppu.maskReg, 0x1e, "PPUMASK was written");
}

export function testPpuDataBuffer(): void {
  suite("ppu $2007 read buffer");
  // プログラムは何もしない。CPU 側から直接レジスタを操作して検証する
  const nes = new Nes(buildRom({ prg: [0x4c, 0x00, 0x80] })); // JMP $8000
  const ppu = nes.ppu;
  // $2400 (VRAM) に書き込み (水平ミラーなので $2000 と同じ物理セルではない)
  ppu.writeRegister(6, 0x24); // PPUADDR hi
  ppu.writeRegister(6, 0x10); // PPUADDR lo
  ppu.writeRegister(7, 0xab); // PPUDATA write
  // 読み出し: 1 回目はバッファの古い値、2 回目に本物が来る
  ppu.writeRegister(6, 0x24);
  ppu.writeRegister(6, 0x10);
  ppu.readRegister(7); // ダミーリード
  assertEq(ppu.readRegister(7), 0xab, "buffered read returns value on 2nd read");
}

export function testPaletteMirror(): void {
  suite("ppu palette mirror");
  const nes = new Nes(buildRom({ prg: [0x4c, 0x00, 0x80] }));
  const ppu = nes.ppu;
  // $3F10 への書き込みは $3F00 に反映される
  ppu.writeRegister(6, 0x3f);
  ppu.writeRegister(6, 0x10);
  ppu.writeRegister(7, 0x2a);
  ppu.writeRegister(6, 0x3f);
  ppu.writeRegister(6, 0x00);
  assertEq(ppu.readRegister(7), 0x2a, "$3F10 mirrors $3F00");
}

export function testNmi(): void {
  suite("ppu nmi");
  // NMI ハンドラで $00 をインクリメントするだけの ROM
  // reset: NMI 有効化 → 無限ループ / nmi: INC $00; RTI
  const prg = [
    0x78,                   // SEI
    0x2c, 0x02, 0x20,       // BIT $2002
    0x10, 0xfb,             // BPL -5
    0xa9, 0x80,             // LDA #$80 (NMI enable)
    0x8d, 0x00, 0x20,       // STA $2000
    0x4c, 0x0b, 0x80,       // loop: JMP $800B
    // $800E: NMI ハンドラ
    0xe6, 0x00,             // INC $00
    0x40,                   // RTI
  ];
  const rom = buildRom({ prg });
  // NMI ベクタを $800E に上書き
  rom[16 + 0x8000 - 0x8000 + 2 * 0x4000 - 6] = 0x0e;
  rom[16 + 2 * 0x4000 - 5] = 0x80;
  const nes = new Nes(rom);
  for (let i = 0; i < 4; i++) nes.runFrame();
  const count = nes.bus.ram[0];
  assertTrue(count >= 2, `NMI handler ran every frame (count=${count})`);
}
