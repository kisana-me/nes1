// デバッグ UI — エミュレータの内部状態を可視化する
//
//   - CPU レジスタと実行トレース (逆アセンブル付き)
//   - パターンテーブル (タイルの絵の辞書) x2
//   - ネームテーブル (4 画面のタイル配置)
//   - パレット
//
// 実機開発でもエミュレータ開発でも、デバッガは「目」。
// 画面が乱れたとき、原因が CHR (絵) / ネームテーブル (配置) /
// パレット (色) / スクロールのどこにあるかを切り分けられる。

import { Nes } from "./nes";
import { NES_PALETTE } from "./ppu";
import { opcodeInfo } from "./cpu";
import { Mirroring } from "./cartridge";

const hex = (v: number, w: number) => v.toString(16).toUpperCase().padStart(w, "0");

export class DebugView {
  private patternCtx: CanvasRenderingContext2D;
  private nametableCtx: CanvasRenderingContext2D;
  private paletteCtx: CanvasRenderingContext2D;
  private cpuStateEl: HTMLElement;
  private traceEl: HTMLElement;
  traceEnabled = false;
  private traceLines: string[] = [];

  constructor(root: {
    pattern: HTMLCanvasElement;
    nametable: HTMLCanvasElement;
    palette: HTMLCanvasElement;
    cpuState: HTMLElement;
    trace: HTMLElement;
  }) {
    this.patternCtx = root.pattern.getContext("2d")!;
    this.nametableCtx = root.nametable.getContext("2d")!;
    this.paletteCtx = root.palette.getContext("2d")!;
    this.cpuStateEl = root.cpuState;
    this.traceEl = root.trace;
  }

  /** 1 命令実行されるたびに呼ばれる (トレース有効時のみ記録) */
  onStep(nes: Nes): void {
    if (!this.traceEnabled) return;
    const pc = nes.cpu.pc;
    const opcode = nes.bus.read(pc);
    const info = opcodeInfo(opcode);
    let operand = "";
    if (info.bytes === 2) operand = `$${hex(nes.bus.read(pc + 1), 2)}`;
    if (info.bytes === 3) {
      operand = `$${hex(nes.bus.read(pc + 2), 2)}${hex(nes.bus.read(pc + 1), 2)}`;
    }
    this.traceLines.push(
      `${hex(pc, 4)}  ${info.name} ${operand.padEnd(5)}  A:${hex(nes.cpu.a, 2)} X:${hex(nes.cpu.x, 2)} Y:${hex(nes.cpu.y, 2)} P:${hex(nes.cpu.getP(false), 2)}`,
    );
    if (this.traceLines.length > 64) this.traceLines.shift();
  }

  /** フレームごとの更新 (軽量な部分) */
  updateFast(nes: Nes, fps: number): void {
    const c = nes.cpu;
    this.cpuStateEl.textContent =
      `FPS ${fps.toFixed(1)}  FRAME ${nes.ppu.frame}\n` +
      `PC:$${hex(c.pc, 4)}  A:$${hex(c.a, 2)}  X:$${hex(c.x, 2)}  Y:$${hex(c.y, 2)}\n` +
      `SP:$${hex(c.sp, 2)}  P:$${hex(c.getP(false), 2)} [${c.n ? "N" : "."}${c.v ? "V" : "."}..${c.d ? "D" : "."}${c.i ? "I" : "."}${c.z ? "Z" : "."}${c.c ? "C" : "."}]\n` +
      `CYC:${c.cycles}  SL:${nes.ppu.scanline}  DOT:${nes.ppu.dot}\n` +
      `CTRL:$${hex(nes.ppu.control, 2)}  MASK:$${hex(nes.ppu.maskReg, 2)}  STAT:$${hex(nes.ppu.status, 2)}  V:$${hex(nes.ppu.vramAddr, 4)}`;
    if (this.traceEnabled) {
      this.traceEl.textContent = this.traceLines.join("\n");
      this.traceEl.scrollTop = this.traceEl.scrollHeight;
    }
  }

  /** 重い可視化 (呼び出し側で間引く) */
  updateHeavy(nes: Nes): void {
    this.drawPatternTables(nes);
    this.drawNametables(nes);
    this.drawPalettes(nes);
  }

  /** パターンテーブル 2 面を 256x128 に描く (グレースケール) */
  private drawPatternTables(nes: Nes): void {
    const img = this.patternCtx.createImageData(256, 128);
    const px = new Uint32Array(img.data.buffer);
    const GRAYS = [0xff000000, 0xff555555, 0xffaaaaaa, 0xffffffff];
    for (let table = 0; table < 2; table++) {
      for (let tile = 0; tile < 256; tile++) {
        const tx = (tile & 15) * 8 + table * 128;
        const ty = (tile >> 4) * 8;
        const base = table * 0x1000 + tile * 16;
        for (let y = 0; y < 8; y++) {
          const lo = nes.mapper.ppuRead(base + y);
          const hi = nes.mapper.ppuRead(base + y + 8);
          for (let x = 0; x < 8; x++) {
            const bit = 7 - x;
            const color = (((hi >> bit) & 1) << 1) | ((lo >> bit) & 1);
            px[(ty + y) * 256 + tx + x] = GRAYS[color];
          }
        }
      }
    }
    this.patternCtx.putImageData(img, 0, 0);
  }

  /** ネームテーブル 4 面を 512x480 に描く */
  private drawNametables(nes: Nes): void {
    const img = this.nametableCtx.createImageData(512, 480);
    const px = new Uint32Array(img.data.buffer);
    const ppu = nes.ppu;
    const patternBase = ppu.control & 0x10 ? 0x1000 : 0;
    const backdrop = ppu.palette[0] & 0x3f;
    for (let nt = 0; nt < 4; nt++) {
      const originX = (nt & 1) * 256;
      const originY = (nt >> 1) * 240;
      const vramBase = this.mirrorNametable(nes, nt) * 0x400;
      for (let row = 0; row < 30; row++) {
        for (let col = 0; col < 32; col++) {
          const tile = ppu.vram[vramBase + row * 32 + col];
          const attr = ppu.vram[vramBase + 0x3c0 + (row >> 2) * 8 + (col >> 2)];
          const shift = ((row & 2) << 1) | (col & 2);
          const palHi = ((attr >> shift) & 3) << 2;
          const base = patternBase + tile * 16;
          for (let y = 0; y < 8; y++) {
            const lo = nes.mapper.ppuRead(base + y);
            const hi = nes.mapper.ppuRead(base + y + 8);
            for (let x = 0; x < 8; x++) {
              const bit = 7 - x;
              const color = (((hi >> bit) & 1) << 1) | ((lo >> bit) & 1);
              const palIndex = color === 0 ? backdrop : ppu.palette[palHi | color] & 0x3f;
              px[(originY + row * 8 + y) * 512 + originX + col * 8 + x] = NES_PALETTE[palIndex];
            }
          }
        }
      }
    }
    this.nametableCtx.putImageData(img, 0, 0);
  }

  /** 論理ネームテーブル番号 → 物理 VRAM ページ (0/1) */
  private mirrorNametable(nes: Nes, nt: number): number {
    switch (nes.mapper.mirroring()) {
      case Mirroring.Vertical: return nt & 1;
      case Mirroring.Horizontal: return nt >> 1;
      case Mirroring.SingleScreenLower: return 0;
      case Mirroring.SingleScreenUpper: return 1;
      default: return nt & 1;
    }
  }

  /** パレット 32 色を描く */
  private drawPalettes(nes: Nes): void {
    const img = this.paletteCtx.createImageData(256, 32);
    const px = new Uint32Array(img.data.buffer);
    for (let i = 0; i < 32; i++) {
      const color = NES_PALETTE[nes.ppu.palette[i] & 0x3f];
      const ox = (i & 15) * 16;
      const oy = i < 16 ? 0 : 16;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          px[(oy + y) * 256 + ox + x] = color;
        }
      }
    }
    this.paletteCtx.putImageData(img, 0, 0);
  }
}
