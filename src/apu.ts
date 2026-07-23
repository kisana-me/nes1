// APU (Audio Processing Unit) のエミュレーション
//
// NES の音源は CPU (RP2A03) に内蔵されており、5 チャンネル構成:
//   パルス波 x2 (メロディ・効果音)  三角波 (ベース)  ノイズ (打楽器)  DMC (サンプル再生)
//
// 各チャンネルはタイマー(分周器)で波形を進め、
// 「フレームカウンタ」が 1 秒に約 240 回、エンベロープ(音量減衰)や
// 長さカウンタ(自動消音)を駆動する。
//
// 出力はサンプリングレート (44.1kHz) ごとにミキサー式で合成し、
// onSample コールバックへ渡す。

import { ApuPort } from "./bus";

const LENGTH_TABLE = [
  10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
  12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30,
];

const DUTY_TABLE = [
  [0, 1, 0, 0, 0, 0, 0, 0], // 12.5%
  [0, 1, 1, 0, 0, 0, 0, 0], // 25%
  [0, 1, 1, 1, 1, 0, 0, 0], // 50%
  [1, 0, 0, 1, 1, 1, 1, 1], // 25% 反転
];

const TRIANGLE_TABLE = [
  15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

const NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];

const DMC_RATES = [428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54];

/** エンベロープ (音量の自動減衰) — パルスとノイズで共用 */
class Envelope {
  start = false;
  loop = false;
  constant = false;
  period = 0;
  private divider = 0;
  private decay = 0;

  clock(): void {
    if (this.start) {
      this.start = false;
      this.decay = 15;
      this.divider = this.period;
    } else if (this.divider > 0) {
      this.divider--;
    } else {
      this.divider = this.period;
      if (this.decay > 0) {
        this.decay--;
      } else if (this.loop) {
        this.decay = 15;
      }
    }
  }

  get volume(): number {
    return this.constant ? this.period : this.decay;
  }
}

class Pulse {
  enabled = false;
  lengthCounter = 0;
  envelope = new Envelope();
  private duty = 0;
  private dutyPos = 0;
  private timer = 0;
  private timerPeriod = 0;
  // スイープ (音程の自動変化)
  private sweepEnabled = false;
  private sweepPeriod = 0;
  private sweepNegate = false;
  private sweepShift = 0;
  private sweepDivider = 0;
  private sweepReload = false;

  constructor(private channel: 1 | 2) {}

  writeReg(reg: number, value: number): void {
    switch (reg) {
      case 0:
        this.duty = (value >> 6) & 3;
        this.envelope.loop = (value & 0x20) !== 0;
        this.envelope.constant = (value & 0x10) !== 0;
        this.envelope.period = value & 0x0f;
        break;
      case 1:
        this.sweepEnabled = (value & 0x80) !== 0;
        this.sweepPeriod = (value >> 4) & 7;
        this.sweepNegate = (value & 0x08) !== 0;
        this.sweepShift = value & 7;
        this.sweepReload = true;
        break;
      case 2:
        this.timerPeriod = (this.timerPeriod & 0x700) | value;
        break;
      case 3:
        this.timerPeriod = (this.timerPeriod & 0xff) | ((value & 7) << 8);
        if (this.enabled) this.lengthCounter = LENGTH_TABLE[value >> 3];
        this.dutyPos = 0;
        this.envelope.start = true;
        break;
    }
  }

  /** APU サイクル (CPU の 1/2) ごとに呼ばれる */
  clockTimer(): void {
    if (this.timer > 0) {
      this.timer--;
    } else {
      this.timer = this.timerPeriod;
      this.dutyPos = (this.dutyPos + 1) & 7;
    }
  }

  clockLength(): void {
    if (!this.envelope.loop && this.lengthCounter > 0) this.lengthCounter--;
  }

  clockSweep(): void {
    const target = this.sweepTarget();
    if (this.sweepDivider === 0 && this.sweepEnabled && this.sweepShift > 0 && !this.sweepMuted()) {
      this.timerPeriod = target;
    }
    if (this.sweepDivider === 0 || this.sweepReload) {
      this.sweepDivider = this.sweepPeriod;
      this.sweepReload = false;
    } else {
      this.sweepDivider--;
    }
  }

  private sweepTarget(): number {
    const change = this.timerPeriod >> this.sweepShift;
    if (this.sweepNegate) {
      // パルス 1 は 1 の補数、パルス 2 は 2 の補数 (実機の微妙な差)
      return this.timerPeriod - change - (this.channel === 1 ? 1 : 0);
    }
    return this.timerPeriod + change;
  }

  private sweepMuted(): boolean {
    return this.timerPeriod < 8 || this.sweepTarget() > 0x7ff;
  }

  output(): number {
    if (!this.enabled || this.lengthCounter === 0) return 0;
    if (this.sweepMuted()) return 0;
    if (DUTY_TABLE[this.duty][this.dutyPos] === 0) return 0;
    return this.envelope.volume;
  }
}

class Triangle {
  enabled = false;
  lengthCounter = 0;
  private linearCounter = 0;
  private linearReload = 0;
  private linearReloadFlag = false;
  private control = false; // 長さカウンタ停止 + リニアカウンタ制御
  private timer = 0;
  private timerPeriod = 0;
  private pos = 0;

  writeReg(reg: number, value: number): void {
    switch (reg) {
      case 0:
        this.control = (value & 0x80) !== 0;
        this.linearReload = value & 0x7f;
        break;
      case 2:
        this.timerPeriod = (this.timerPeriod & 0x700) | value;
        break;
      case 3:
        this.timerPeriod = (this.timerPeriod & 0xff) | ((value & 7) << 8);
        if (this.enabled) this.lengthCounter = LENGTH_TABLE[value >> 3];
        this.linearReloadFlag = true;
        break;
    }
  }

  /** CPU サイクルごと */
  clockTimer(): void {
    if (this.timer > 0) {
      this.timer--;
    } else {
      this.timer = this.timerPeriod;
      if (this.lengthCounter > 0 && this.linearCounter > 0) {
        this.pos = (this.pos + 1) & 31;
      }
    }
  }

  clockLinear(): void {
    if (this.linearReloadFlag) {
      this.linearCounter = this.linearReload;
    } else if (this.linearCounter > 0) {
      this.linearCounter--;
    }
    if (!this.control) this.linearReloadFlag = false;
  }

  clockLength(): void {
    if (!this.control && this.lengthCounter > 0) this.lengthCounter--;
  }

  output(): number {
    if (!this.enabled || this.lengthCounter === 0 || this.linearCounter === 0) return 0;
    // 超高周波 (period < 2) はポップノイズ防止のため無音扱い
    if (this.timerPeriod < 2) return 7;
    return TRIANGLE_TABLE[this.pos];
  }
}

class Noise {
  enabled = false;
  lengthCounter = 0;
  envelope = new Envelope();
  private mode = false;
  private timer = 0;
  private timerPeriod = NOISE_PERIODS[0];
  private shift = 1; // 15bit LFSR

  writeReg(reg: number, value: number): void {
    switch (reg) {
      case 0:
        this.envelope.loop = (value & 0x20) !== 0;
        this.envelope.constant = (value & 0x10) !== 0;
        this.envelope.period = value & 0x0f;
        break;
      case 2:
        this.mode = (value & 0x80) !== 0;
        this.timerPeriod = NOISE_PERIODS[value & 0x0f];
        break;
      case 3:
        if (this.enabled) this.lengthCounter = LENGTH_TABLE[value >> 3];
        this.envelope.start = true;
        break;
    }
  }

  clockTimer(): void {
    if (this.timer > 0) {
      this.timer--;
    } else {
      this.timer = this.timerPeriod;
      // フィードバック: bit0 XOR (モードにより bit6 か bit1)
      const feedback = (this.shift & 1) ^ ((this.shift >> (this.mode ? 6 : 1)) & 1);
      this.shift = (this.shift >> 1) | (feedback << 14);
    }
  }

  clockLength(): void {
    if (!this.envelope.loop && this.lengthCounter > 0) this.lengthCounter--;
  }

  output(): number {
    if (!this.enabled || this.lengthCounter === 0) return 0;
    if (this.shift & 1) return 0; // bit0 が 1 なら無音
    return this.envelope.volume;
  }
}

/** DMC — 1bit デルタ変調サンプル再生 */
class Dmc {
  enabled = false;
  irqEnabled = false;
  irqFlag = false;
  loop = false;
  outputLevel = 0;
  bytesRemaining = 0;
  private rate = DMC_RATES[0];
  private timer = 0;
  private sampleAddress = 0xc000;
  private sampleLength = 0;
  private currentAddress = 0;
  private shiftReg = 0;
  private bitsRemaining = 0;
  private silence = true;

  constructor(private readMemory: (addr: number) => number) {}

  writeReg(reg: number, value: number): void {
    switch (reg) {
      case 0:
        this.irqEnabled = (value & 0x80) !== 0;
        if (!this.irqEnabled) this.irqFlag = false;
        this.loop = (value & 0x40) !== 0;
        this.rate = DMC_RATES[value & 0x0f];
        break;
      case 1:
        this.outputLevel = value & 0x7f;
        break;
      case 2:
        this.sampleAddress = 0xc000 | (value << 6);
        break;
      case 3:
        this.sampleLength = (value << 4) | 1;
        break;
    }
  }

  restart(): void {
    this.currentAddress = this.sampleAddress;
    this.bytesRemaining = this.sampleLength;
  }

  clockTimer(): void {
    if (!this.enabled) return;
    if (this.timer > 0) {
      this.timer--;
      return;
    }
    this.timer = this.rate - 1;
    if (!this.silence) {
      if (this.shiftReg & 1) {
        if (this.outputLevel <= 125) this.outputLevel += 2;
      } else if (this.outputLevel >= 2) {
        this.outputLevel -= 2;
      }
    }
    this.shiftReg >>= 1;
    if (this.bitsRemaining > 0) this.bitsRemaining--;
    if (this.bitsRemaining === 0) {
      this.bitsRemaining = 8;
      if (this.bytesRemaining > 0) {
        this.shiftReg = this.readMemory(this.currentAddress);
        this.silence = false;
        this.currentAddress = this.currentAddress === 0xffff ? 0x8000 : this.currentAddress + 1;
        this.bytesRemaining--;
        if (this.bytesRemaining === 0) {
          if (this.loop) this.restart();
          else if (this.irqEnabled) this.irqFlag = true;
        }
      } else {
        this.silence = true;
      }
    }
  }
}

export class Apu implements ApuPort {
  private pulse1 = new Pulse(1);
  private pulse2 = new Pulse(2);
  private triangle = new Triangle();
  private noise = new Noise();
  private dmc: Dmc;

  // フレームカウンタ
  private frameMode5 = false;
  private frameIrqInhibit = false;
  private frameIrqFlag = false;
  private frameCycle = 0;

  // サンプリング
  sampleRate = 44100;
  onSample: ((value: number) => void) | null = null;
  private sampleCounter = 0;
  private cyclesPerSample = 1789773 / 44100;

  private oddCycle = false;

  constructor(readMemory: (addr: number) => number = () => 0) {
    this.dmc = new Dmc(readMemory);
  }

  setSampleRate(rate: number): void {
    this.sampleRate = rate;
    this.cyclesPerSample = 1789773 / rate;
  }

  // ---------- レジスタ ----------

  writeRegister(addr: number, value: number): void {
    if (addr >= 0x4000 && addr <= 0x4003) this.pulse1.writeReg(addr & 3, value);
    else if (addr >= 0x4004 && addr <= 0x4007) this.pulse2.writeReg(addr & 3, value);
    else if (addr >= 0x4008 && addr <= 0x400b) this.triangle.writeReg(addr & 3, value);
    else if (addr >= 0x400c && addr <= 0x400f) this.noise.writeReg(addr & 3, value);
    else if (addr >= 0x4010 && addr <= 0x4013) this.dmc.writeReg(addr & 3, value);
    else if (addr === 0x4015) {
      this.pulse1.enabled = (value & 0x01) !== 0;
      this.pulse2.enabled = (value & 0x02) !== 0;
      this.triangle.enabled = (value & 0x04) !== 0;
      this.noise.enabled = (value & 0x08) !== 0;
      if (!this.pulse1.enabled) this.pulse1.lengthCounter = 0;
      if (!this.pulse2.enabled) this.pulse2.lengthCounter = 0;
      if (!this.triangle.enabled) this.triangle.lengthCounter = 0;
      if (!this.noise.enabled) this.noise.lengthCounter = 0;
      const dmcEnable = (value & 0x10) !== 0;
      this.dmc.enabled = dmcEnable;
      this.dmc.irqFlag = false;
      if (dmcEnable) {
        if (this.dmc.bytesRemaining === 0) this.dmc.restart();
      } else {
        this.dmc.bytesRemaining = 0;
      }
    } else if (addr === 0x4017) {
      this.frameMode5 = (value & 0x80) !== 0;
      this.frameIrqInhibit = (value & 0x40) !== 0;
      if (this.frameIrqInhibit) this.frameIrqFlag = false;
      this.frameCycle = 0;
      if (this.frameMode5) {
        // 5 ステップモードは書き込み直後に半フレーム+四半フレームをクロック
        this.clockQuarter();
        this.clockHalf();
      }
    }
  }

  readStatus(): number {
    let status = 0;
    if (this.pulse1.lengthCounter > 0) status |= 0x01;
    if (this.pulse2.lengthCounter > 0) status |= 0x02;
    if (this.triangle.lengthCounter > 0) status |= 0x04;
    if (this.noise.lengthCounter > 0) status |= 0x08;
    if (this.dmc.bytesRemaining > 0) status |= 0x10;
    if (this.frameIrqFlag) status |= 0x40;
    if (this.dmc.irqFlag) status |= 0x80;
    this.frameIrqFlag = false; // 読むとクリア
    return status;
  }

  irqPending(): boolean {
    return this.frameIrqFlag || this.dmc.irqFlag;
  }

  // ---------- タイミング ----------

  /** CPU サイクル数だけ APU を進める */
  tick(cpuCycles: number): void {
    for (let i = 0; i < cpuCycles; i++) {
      this.stepCycle();
    }
  }

  private stepCycle(): void {
    // 三角波と DMC は CPU クロック、パルスとノイズは半分のクロック
    this.triangle.clockTimer();
    this.dmc.clockTimer();
    if (this.oddCycle) {
      this.pulse1.clockTimer();
      this.pulse2.clockTimer();
      this.noise.clockTimer();
    }
    this.oddCycle = !this.oddCycle;

    this.clockFrameCounter();

    // ダウンサンプリングして出力
    this.sampleCounter++;
    if (this.sampleCounter >= this.cyclesPerSample) {
      this.sampleCounter -= this.cyclesPerSample;
      this.onSample?.(this.mix());
    }
  }

  /** フレームカウンタ: 4 ステップ / 5 ステップのシーケンス */
  private clockFrameCounter(): void {
    this.frameCycle++;
    // NTSC の実機タイミング (CPU サイクル)
    if (!this.frameMode5) {
      switch (this.frameCycle) {
        case 7457: this.clockQuarter(); break;
        case 14913: this.clockQuarter(); this.clockHalf(); break;
        case 22371: this.clockQuarter(); break;
        case 29829:
          this.clockQuarter();
          this.clockHalf();
          if (!this.frameIrqInhibit) this.frameIrqFlag = true;
          this.frameCycle = 0;
          break;
      }
    } else {
      switch (this.frameCycle) {
        case 7457: this.clockQuarter(); break;
        case 14913: this.clockQuarter(); this.clockHalf(); break;
        case 22371: this.clockQuarter(); break;
        case 37281:
          this.clockQuarter();
          this.clockHalf();
          this.frameCycle = 0;
          break;
      }
    }
  }

  private clockQuarter(): void {
    this.pulse1.envelope.clock();
    this.pulse2.envelope.clock();
    this.noise.envelope.clock();
    this.triangle.clockLinear();
  }

  private clockHalf(): void {
    this.pulse1.clockLength();
    this.pulse2.clockLength();
    this.triangle.clockLength();
    this.noise.clockLength();
    this.pulse1.clockSweep();
    this.pulse2.clockSweep();
  }

  // ---------- ミキサー ----------

  /** 5 チャンネルを実機の非線形ミキサー式で合成 (-1.0 〜 1.0) */
  private mix(): number {
    const p = this.pulse1.output() + this.pulse2.output();
    const t = this.triangle.output();
    const n = this.noise.output();
    const d = this.dmc.outputLevel;
    const pulseOut = p === 0 ? 0 : 95.88 / (8128 / p + 100);
    const tnd = t / 8227 + n / 12241 + d / 22638;
    const tndOut = tnd === 0 ? 0 : 159.79 / (1 / tnd + 100);
    // 0〜約0.5 のユニポーラ出力。軽くゲインを掛けて返す
    return (pulseOut + tndOut) * 1.5;
  }
}
