// NES 本体 — CPU / PPU / (APU) / コントローラーを配線して 1 フレーム単位で動かす

import { Cpu } from "./cpu";
import { Bus } from "./bus";
import { Ppu } from "./ppu";
import { Cartridge } from "./cartridge";
import { Mapper } from "./mappers/mapper";

export class Nes {
  readonly cart: Cartridge;
  readonly mapper: Mapper;
  readonly bus: Bus;
  readonly cpu: Cpu;
  readonly ppu: Ppu;

  constructor(romData: Uint8Array) {
    this.cart = new Cartridge(romData);
    this.mapper = this.cart.createMapper();
    this.bus = new Bus(this.mapper);
    this.cpu = new Cpu(this.bus);
    this.ppu = new Ppu(this.mapper);

    // 配線
    this.bus.ppu = this.ppu;
    this.ppu.onNmi = () => this.cpu.requestNmi();
    // OAM DMA は CPU を 513 サイクル停止させる
    this.bus.onOamDma = () => {
      this.cpu.stall += 513 + (this.cpu.cycles & 1);
    };

    this.reset();
  }

  reset(): void {
    this.cpu.reset();
    this.ppu.reset();
  }

  /**
   * 1 フレーム分実行する。
   * CPU を 1 命令進めるたびに、消費サイクル x3 だけ PPU を進める (キャッチアップ方式)。
   */
  runFrame(): void {
    const target = this.ppu.frame + 1;
    while (this.ppu.frame < target) {
      this.step();
    }
  }

  /** CPU 1 命令 (+付随する PPU の進行) を実行 */
  step(): number {
    const cpuCycles = this.cpu.step();
    for (let i = 0; i < cpuCycles * 3; i++) {
      this.ppu.tick();
    }
    // マッパー (MMC3 など) の IRQ を CPU へ伝える
    this.cpu.setIrqLine(this.mapper.irqPending());
    return cpuCycles;
  }

  /** 現在のフレームバッファ (256x240, ABGR packed) */
  get frameBuffer(): Uint32Array {
    return this.ppu.frameBuffer;
  }
}
