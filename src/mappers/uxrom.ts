// マッパー 2: UxROM
//
// シンプルなバンク切り替え。書き込んだ値がそのまま PRG バンク番号になる。
//   $8000-$BFFF: 切り替え可能な 16KB バンク
//   $C000-$FFFF: 最終バンク固定 (リセットベクタはここに置く)
// CHR は RAM 8KB のことが多い。

import { Cartridge, Mirroring } from "../cartridge";
import { Mapper } from "./mapper";

export class UxromMapper implements Mapper {
  private bank = 0;

  constructor(private cart: Cartridge) {}

  cpuRead(addr: number): number {
    if (addr >= 0xc000) {
      // 最終バンク固定
      return this.cart.prgRom[this.cart.prgRom.length - 0x4000 + (addr - 0xc000)];
    }
    if (addr >= 0x8000) {
      const bankCount = this.cart.prgRom.length >> 14;
      return this.cart.prgRom[(this.bank % bankCount) * 0x4000 + (addr - 0x8000)];
    }
    if (addr >= 0x6000) return this.cart.prgRam[addr - 0x6000];
    return 0;
  }

  cpuWrite(addr: number, value: number): void {
    if (addr >= 0x8000) {
      this.bank = value & 0x0f;
    } else if (addr >= 0x6000) {
      this.cart.prgRam[addr - 0x6000] = value;
    }
  }

  ppuRead(addr: number): number {
    return this.cart.chrRom[addr & 0x1fff];
  }

  ppuWrite(addr: number, value: number): void {
    if (this.cart.chrIsRam) this.cart.chrRom[addr & 0x1fff] = value;
  }

  mirroring(): Mirroring {
    return this.cart.mirroring;
  }

  onScanline(): void {}
  irqPending(): boolean {
    return false;
  }
}
