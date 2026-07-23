// マッパー 1: MMC1 (SxROM)
//
// 任天堂純正のバンク切り替えチップ。PRG 最大 256KB / CHR 最大 128KB。
// 特徴は「シリアル書き込み」: $8000-$FFFF への書き込み 5 回で
// 5 ビットの値が 1 ビットずつシフトレジスタに入る。
//
//   書き込み値 bit7=1 → シフトレジスタをリセット
//   5 回目の書き込みで、アドレスに応じた内部レジスタへ転送:
//     $8000-$9FFF: コントロール (ミラーリング / PRG・CHR バンクモード)
//     $A000-$BFFF: CHR バンク 0
//     $C000-$DFFF: CHR バンク 1
//     $E000-$FFFF: PRG バンク

import { Cartridge, Mirroring } from "../cartridge";
import { Mapper } from "./mapper";

export class Mmc1Mapper implements Mapper {
  private shift = 0x10; // bit4 が 1 の状態が「空」の印
  private control = 0x0c; // 起動時: PRG モード 3 (最終バンク固定)
  private chrBank0 = 0;
  private chrBank1 = 0;
  private prgBank = 0;

  constructor(private cart: Cartridge) {}

  cpuRead(addr: number): number {
    if (addr >= 0x8000) {
      const prgMode = (this.control >> 2) & 3;
      const bankCount = this.cart.prgRom.length >> 14; // 16KB 単位
      let bank: number;
      let offset: number;
      if (prgMode < 2) {
        // 32KB モード: prgBank の下位ビット無視で 2 バンク連続
        bank = (this.prgBank & 0x0e) % bankCount;
        offset = addr - 0x8000;
        return this.cart.prgRom[bank * 0x4000 + offset];
      }
      if (addr < 0xc000) {
        // $8000-$BFFF
        bank = prgMode === 2 ? 0 : this.prgBank % bankCount;
        offset = addr - 0x8000;
      } else {
        // $C000-$FFFF
        bank = prgMode === 2 ? this.prgBank % bankCount : bankCount - 1;
        offset = addr - 0xc000;
      }
      return this.cart.prgRom[bank * 0x4000 + offset];
    }
    if (addr >= 0x6000) {
      return this.cart.prgRam[addr - 0x6000];
    }
    return 0;
  }

  cpuWrite(addr: number, value: number): void {
    if (addr < 0x6000) return;
    if (addr < 0x8000) {
      this.cart.prgRam[addr - 0x6000] = value;
      return;
    }
    // シリアルシフトレジスタ
    if (value & 0x80) {
      this.shift = 0x10;
      this.control |= 0x0c; // PRG モードを 3 に戻す
      return;
    }
    const complete = (this.shift & 1) !== 0; // 5 回目か (最初に入れた印ビットが bit0 に到達)
    this.shift = (this.shift >> 1) | ((value & 1) << 4);
    if (complete) {
      const reg = (addr >> 13) & 3; // $8000/$A000/$C000/$E000
      switch (reg) {
        case 0: this.control = this.shift; break;
        case 1: this.chrBank0 = this.shift; break;
        case 2: this.chrBank1 = this.shift; break;
        case 3: this.prgBank = this.shift & 0x0f; break;
      }
      this.shift = 0x10;
    }
  }

  private chrOffset(addr: number): number {
    const chr4kBanks = Math.max(1, this.cart.chrRom.length >> 12);
    if (this.control & 0x10) {
      // 4KB x2 モード
      const bank = addr < 0x1000 ? this.chrBank0 : this.chrBank1;
      return (bank % chr4kBanks) * 0x1000 + (addr & 0xfff);
    }
    // 8KB モード (下位ビット無視)
    const bank = (this.chrBank0 & 0x1e) % chr4kBanks;
    return bank * 0x1000 + addr;
  }

  ppuRead(addr: number): number {
    return this.cart.chrRom[this.chrOffset(addr)];
  }

  ppuWrite(addr: number, value: number): void {
    if (this.cart.chrIsRam) {
      this.cart.chrRom[this.chrOffset(addr)] = value;
    }
  }

  mirroring(): Mirroring {
    switch (this.control & 3) {
      case 0: return Mirroring.SingleScreenLower;
      case 1: return Mirroring.SingleScreenUpper;
      case 2: return Mirroring.Vertical;
      default: return Mirroring.Horizontal;
    }
  }

  onScanline(): void {}
  irqPending(): boolean {
    return false;
  }
}
