// マッパー 4: MMC3 (TxROM)
//
// 後期の大作ゲームで広く使われた高機能マッパー。
//   - PRG 8KB x4 窓、CHR 1KB/2KB の細かいバンク切り替え
//   - スキャンラインカウンタによる IRQ (画面分割の定番)
//
// レジスタ (アドレスの偶数/奇数で機能が変わる):
//   $8000 (偶数): バンクセレクト / $8001 (奇数): バンクデータ
//   $A000 (偶数): ミラーリング   / $A001 (奇数): PRG-RAM 保護
//   $C000 (偶数): IRQ ラッチ     / $C001 (奇数): IRQ リロード
//   $E000 (偶数): IRQ 無効+確認  / $E001 (奇数): IRQ 有効

import { Cartridge, Mirroring } from "../cartridge";
import { Mapper } from "./mapper";

export class Mmc3Mapper implements Mapper {
  private bankSelect = 0;
  private banks = new Uint8Array(8); // R0-R7
  private mirrorVertical = true;
  private irqLatch = 0;
  private irqCounter = 0;
  private irqReload = false;
  private irqEnabled = false;
  private irqFlag = false;

  constructor(private cart: Cartridge) {
    this.mirrorVertical = cart.mirroring === Mirroring.Vertical;
  }

  // ---- PRG: 8KB x4 ($8000/$A000/$C000/$E000) ----
  private prgBankAt(addr: number): number {
    const bankCount = this.cart.prgRom.length >> 13; // 8KB 単位
    const mode = (this.bankSelect & 0x40) !== 0;
    const slot = (addr - 0x8000) >> 13; // 0-3
    let bank: number;
    switch (slot) {
      case 0: bank = mode ? bankCount - 2 : this.banks[6]; break;
      case 1: bank = this.banks[7]; break;
      case 2: bank = mode ? this.banks[6] : bankCount - 2; break;
      default: bank = bankCount - 1; break; // $E000 は常に最終バンク
    }
    return bank % bankCount;
  }

  cpuRead(addr: number): number {
    if (addr >= 0x8000) {
      return this.cart.prgRom[this.prgBankAt(addr) * 0x2000 + (addr & 0x1fff)];
    }
    if (addr >= 0x6000) return this.cart.prgRam[addr - 0x6000];
    return 0;
  }

  cpuWrite(addr: number, value: number): void {
    if (addr < 0x6000) return;
    if (addr < 0x8000) {
      this.cart.prgRam[addr - 0x6000] = value;
      return;
    }
    const even = (addr & 1) === 0;
    if (addr < 0xa000) {
      if (even) this.bankSelect = value;
      else this.banks[this.bankSelect & 7] = value;
    } else if (addr < 0xc000) {
      if (even) this.mirrorVertical = (value & 1) === 0;
      // 奇数 ($A001) は PRG-RAM 保護 — 省略
    } else if (addr < 0xe000) {
      if (even) this.irqLatch = value;
      else this.irqReload = true;
    } else {
      if (even) {
        this.irqEnabled = false;
        this.irqFlag = false; // IRQ 確認 (acknowledge)
      } else {
        this.irqEnabled = true;
      }
    }
  }

  // ---- CHR: 2KB x2 + 1KB x4 ----
  private chrOffset(addr: number): number {
    const invert = (this.bankSelect & 0x80) !== 0;
    let a = addr & 0x1fff;
    if (invert) a ^= 0x1000; // CHR モード反転
    const chrSize = Math.max(this.cart.chrRom.length, 0x2000);
    let bank1k: number;
    if (a < 0x0800) {
      bank1k = (this.banks[0] & 0xfe) + (a >= 0x0400 ? 1 : 0);
      return ((bank1k * 0x400) % chrSize) + (a & 0x3ff);
    }
    if (a < 0x1000) {
      bank1k = (this.banks[1] & 0xfe) + (a >= 0x0c00 ? 1 : 0);
      return ((bank1k * 0x400) % chrSize) + (a & 0x3ff);
    }
    const r = 2 + ((a - 0x1000) >> 10); // R2-R5
    bank1k = this.banks[r];
    return ((bank1k * 0x400) % chrSize) + (a & 0x3ff);
  }

  ppuRead(addr: number): number {
    return this.cart.chrRom[this.chrOffset(addr)];
  }

  ppuWrite(addr: number, value: number): void {
    if (this.cart.chrIsRam) this.cart.chrRom[this.chrOffset(addr)] = value;
  }

  mirroring(): Mirroring {
    if (this.cart.mirroring === Mirroring.FourScreen) return Mirroring.FourScreen;
    return this.mirrorVertical ? Mirroring.Vertical : Mirroring.Horizontal;
  }

  // ---- スキャンライン IRQ ----
  // PPU が可視スキャンラインの終端ごとに呼ぶ (A12 立ち上がり検出の近似)
  onScanline(): void {
    if (this.irqCounter === 0 || this.irqReload) {
      this.irqCounter = this.irqLatch;
      this.irqReload = false;
    } else {
      this.irqCounter--;
    }
    if (this.irqCounter === 0 && this.irqEnabled) {
      this.irqFlag = true;
    }
  }

  irqPending(): boolean {
    return this.irqFlag;
  }
}
