// マッパー 3: CNROM
//
// PRG は NROM と同じ固定 16/32KB。CHR だけ 8KB 単位で切り替える。
// 「絵は多いがプログラムは小さい」ゲーム向け。

import { Cartridge, Mirroring } from "../cartridge";
import { Mapper } from "./mapper";

export class CnromMapper implements Mapper {
  private bank = 0;
  private prgMask: number;

  constructor(private cart: Cartridge) {
    this.prgMask = cart.prgRom.length > 0x4000 ? 0x7fff : 0x3fff;
  }

  cpuRead(addr: number): number {
    if (addr >= 0x8000) return this.cart.prgRom[(addr - 0x8000) & this.prgMask];
    if (addr >= 0x6000) return this.cart.prgRam[addr - 0x6000];
    return 0;
  }

  cpuWrite(addr: number, value: number): void {
    if (addr >= 0x8000) {
      this.bank = value & 3;
    } else if (addr >= 0x6000) {
      this.cart.prgRam[addr - 0x6000] = value;
    }
  }

  ppuRead(addr: number): number {
    const bankCount = Math.max(1, this.cart.chrRom.length >> 13);
    return this.cart.chrRom[(this.bank % bankCount) * 0x2000 + (addr & 0x1fff)];
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
