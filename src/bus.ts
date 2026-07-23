// CPU バス — CPU から見える 64KB のアドレス空間の振り分け
//
//   $0000-$1FFF  WRAM 2KB (4回ミラー)
//   $2000-$3FFF  PPU レジスタ 8個 (8バイト周期でミラー)
//   $4000-$4013  APU レジスタ
//   $4014        OAM DMA
//   $4015        APU ステータス
//   $4016/$4017  コントローラー
//   $4020-$FFFF  カセット (マッパー)

import { CpuBus } from "./cpu";
import { Mapper } from "./mappers/mapper";

/** PPU / APU / コントローラーは後の章で実装するため、差し込み口だけ定義 */
export interface PpuPort {
  readRegister(reg: number): number;
  writeRegister(reg: number, value: number): void;
  writeOamDma(data: Uint8Array): void;
}

export interface ApuPort {
  readStatus(): number;
  writeRegister(addr: number, value: number): void;
}

export interface ControllerPort {
  write(value: number): void;
  read1(): number;
  read2(): number;
}

export class Bus implements CpuBus {
  ram = new Uint8Array(0x800);
  ppu: PpuPort | null = null;
  apu: ApuPort | null = null;
  controller: ControllerPort | null = null;
  /** OAM DMA 発生時に CPU を止めるためのコールバック */
  onOamDma: (() => void) | null = null;

  constructor(public mapper: Mapper) {}

  read(addr: number): number {
    if (addr < 0x2000) {
      return this.ram[addr & 0x7ff];
    }
    if (addr < 0x4000) {
      return this.ppu ? this.ppu.readRegister(addr & 7) : 0;
    }
    if (addr === 0x4015) {
      return this.apu ? this.apu.readStatus() : 0;
    }
    if (addr === 0x4016) {
      return this.controller ? this.controller.read1() : 0;
    }
    if (addr === 0x4017) {
      return this.controller ? this.controller.read2() : 0;
    }
    if (addr < 0x4020) {
      return 0; // その他の APU レジスタは読み出し不可
    }
    return this.mapper.cpuRead(addr);
  }

  write(addr: number, value: number): void {
    if (addr < 0x2000) {
      this.ram[addr & 0x7ff] = value;
      return;
    }
    if (addr < 0x4000) {
      this.ppu?.writeRegister(addr & 7, value);
      return;
    }
    if (addr === 0x4014) {
      // OAM DMA: $XX00-$XXFF の 256 バイトを PPU の OAM に一括転送
      if (this.ppu) {
        const page = value << 8;
        const buf = new Uint8Array(256);
        for (let i = 0; i < 256; i++) buf[i] = this.read(page + i);
        this.ppu.writeOamDma(buf);
        this.onOamDma?.();
      }
      return;
    }
    if (addr === 0x4016) {
      this.controller?.write(value);
      return;
    }
    if (addr < 0x4020) {
      this.apu?.writeRegister(addr, value);
      return;
    }
    this.mapper.cpuWrite(addr, value);
  }
}
