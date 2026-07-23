// マッパー 0: NROM
//
// バンク切り替え回路を持たない最も単純なカセット。
//   PRG 16KB → $8000-$BFFF に配置し $C000-$FFFF にミラー
//   PRG 32KB → $8000-$FFFF にそのまま配置
//   CHR 8KB  → PPU $0000-$1FFF
// 『初期のシンプルなゲーム』はほとんどこれ。

import { Cartridge, Mirroring } from "../cartridge";
import { Mapper } from "./mapper";

export class NromMapper implements Mapper {
  private prgMask: number;

  constructor(private cart: Cartridge) {
    // 16KB なら 0x3FFF でマスクしてミラー、32KB なら 0x7FFF
    this.prgMask = cart.prgRom.length > 0x4000 ? 0x7fff : 0x3fff;
  }

  cpuRead(addr: number): number {
    if (addr >= 0x8000) {
      return this.cart.prgRom[(addr - 0x8000) & this.prgMask];
    }
    if (addr >= 0x6000) {
      return this.cart.prgRam[addr - 0x6000];
    }
    return 0;
  }

  cpuWrite(addr: number, value: number): void {
    if (addr >= 0x6000 && addr < 0x8000) {
      this.cart.prgRam[addr - 0x6000] = value;
    }
    // ROM への書き込みは無視
  }

  ppuRead(addr: number): number {
    return this.cart.chrRom[addr & 0x1fff];
  }

  ppuWrite(addr: number, value: number): void {
    if (this.cart.chrIsRam) {
      this.cart.chrRom[addr & 0x1fff] = value;
    }
  }

  mirroring(): Mirroring {
    return this.cart.mirroring;
  }

  onScanline(): void {}

  irqPending(): boolean {
    return false;
  }
}
