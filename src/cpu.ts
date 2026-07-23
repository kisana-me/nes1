// 6502 互換 CPU (リコー RP2A03) のエミュレーション
//
// NES の CPU は MOS 6502 から BCD (10進) モードを取り除いたもの。
// このファイルでは全公式命令 (151 個) をテーブル駆動で実装する。
// 未実装の非公式命令は 2 サイクルの NOP として扱う。

/** CPU から見えるメモリバス。実体は bus.ts が提供する */
export interface CpuBus {
  read(addr: number): number;
  write(addr: number, value: number): void;
}

/** アドレッシングモード */
const enum Mode {
  IMP, // implied        例: CLC
  ACC, // accumulator    例: ASL A
  IMM, // immediate      例: LDA #$10
  ZP,  // zero page      例: LDA $10
  ZPX, // zero page,X    例: LDA $10,X
  ZPY, // zero page,Y    例: LDX $10,Y
  ABS, // absolute       例: LDA $1234
  ABX, // absolute,X     例: LDA $1234,X
  ABY, // absolute,Y     例: LDA $1234,Y
  IND, // indirect       例: JMP ($1234)
  IZX, // (indirect,X)   例: LDA ($10,X)
  IZY, // (indirect),Y   例: LDA ($10),Y
  REL, // relative       例: BNE label
}

interface OpDef {
  name: string;
  mode: Mode;
  cycles: number;
  /** ページ境界をまたぐ読み出しで +1 サイクルになる命令か */
  pageCycle: boolean;
}

const OPTABLE: (OpDef | undefined)[] = new Array(256);

function def(op: number, name: string, mode: Mode, cycles: number, pageCycle = false): void {
  OPTABLE[op] = { name, mode, cycles, pageCycle };
}

// ---- ロード / ストア ----
def(0xa9, "LDA", Mode.IMM, 2); def(0xa5, "LDA", Mode.ZP, 3); def(0xb5, "LDA", Mode.ZPX, 4);
def(0xad, "LDA", Mode.ABS, 4); def(0xbd, "LDA", Mode.ABX, 4, true); def(0xb9, "LDA", Mode.ABY, 4, true);
def(0xa1, "LDA", Mode.IZX, 6); def(0xb1, "LDA", Mode.IZY, 5, true);
def(0xa2, "LDX", Mode.IMM, 2); def(0xa6, "LDX", Mode.ZP, 3); def(0xb6, "LDX", Mode.ZPY, 4);
def(0xae, "LDX", Mode.ABS, 4); def(0xbe, "LDX", Mode.ABY, 4, true);
def(0xa0, "LDY", Mode.IMM, 2); def(0xa4, "LDY", Mode.ZP, 3); def(0xb4, "LDY", Mode.ZPX, 4);
def(0xac, "LDY", Mode.ABS, 4); def(0xbc, "LDY", Mode.ABX, 4, true);
def(0x85, "STA", Mode.ZP, 3); def(0x95, "STA", Mode.ZPX, 4); def(0x8d, "STA", Mode.ABS, 4);
def(0x9d, "STA", Mode.ABX, 5); def(0x99, "STA", Mode.ABY, 5); def(0x81, "STA", Mode.IZX, 6);
def(0x91, "STA", Mode.IZY, 6);
def(0x86, "STX", Mode.ZP, 3); def(0x96, "STX", Mode.ZPY, 4); def(0x8e, "STX", Mode.ABS, 4);
def(0x84, "STY", Mode.ZP, 3); def(0x94, "STY", Mode.ZPX, 4); def(0x8c, "STY", Mode.ABS, 4);

// ---- レジスタ間転送 ----
def(0xaa, "TAX", Mode.IMP, 2); def(0xa8, "TAY", Mode.IMP, 2); def(0x8a, "TXA", Mode.IMP, 2);
def(0x98, "TYA", Mode.IMP, 2); def(0xba, "TSX", Mode.IMP, 2); def(0x9a, "TXS", Mode.IMP, 2);

// ---- スタック ----
def(0x48, "PHA", Mode.IMP, 3); def(0x68, "PLA", Mode.IMP, 4);
def(0x08, "PHP", Mode.IMP, 3); def(0x28, "PLP", Mode.IMP, 4);

// ---- 論理演算 ----
def(0x29, "AND", Mode.IMM, 2); def(0x25, "AND", Mode.ZP, 3); def(0x35, "AND", Mode.ZPX, 4);
def(0x2d, "AND", Mode.ABS, 4); def(0x3d, "AND", Mode.ABX, 4, true); def(0x39, "AND", Mode.ABY, 4, true);
def(0x21, "AND", Mode.IZX, 6); def(0x31, "AND", Mode.IZY, 5, true);
def(0x49, "EOR", Mode.IMM, 2); def(0x45, "EOR", Mode.ZP, 3); def(0x55, "EOR", Mode.ZPX, 4);
def(0x4d, "EOR", Mode.ABS, 4); def(0x5d, "EOR", Mode.ABX, 4, true); def(0x59, "EOR", Mode.ABY, 4, true);
def(0x41, "EOR", Mode.IZX, 6); def(0x51, "EOR", Mode.IZY, 5, true);
def(0x09, "ORA", Mode.IMM, 2); def(0x05, "ORA", Mode.ZP, 3); def(0x15, "ORA", Mode.ZPX, 4);
def(0x0d, "ORA", Mode.ABS, 4); def(0x1d, "ORA", Mode.ABX, 4, true); def(0x19, "ORA", Mode.ABY, 4, true);
def(0x01, "ORA", Mode.IZX, 6); def(0x11, "ORA", Mode.IZY, 5, true);
def(0x24, "BIT", Mode.ZP, 3); def(0x2c, "BIT", Mode.ABS, 4);

// ---- 算術演算 ----
def(0x69, "ADC", Mode.IMM, 2); def(0x65, "ADC", Mode.ZP, 3); def(0x75, "ADC", Mode.ZPX, 4);
def(0x6d, "ADC", Mode.ABS, 4); def(0x7d, "ADC", Mode.ABX, 4, true); def(0x79, "ADC", Mode.ABY, 4, true);
def(0x61, "ADC", Mode.IZX, 6); def(0x71, "ADC", Mode.IZY, 5, true);
def(0xe9, "SBC", Mode.IMM, 2); def(0xe5, "SBC", Mode.ZP, 3); def(0xf5, "SBC", Mode.ZPX, 4);
def(0xed, "SBC", Mode.ABS, 4); def(0xfd, "SBC", Mode.ABX, 4, true); def(0xf9, "SBC", Mode.ABY, 4, true);
def(0xe1, "SBC", Mode.IZX, 6); def(0xf1, "SBC", Mode.IZY, 5, true);
def(0xc9, "CMP", Mode.IMM, 2); def(0xc5, "CMP", Mode.ZP, 3); def(0xd5, "CMP", Mode.ZPX, 4);
def(0xcd, "CMP", Mode.ABS, 4); def(0xdd, "CMP", Mode.ABX, 4, true); def(0xd9, "CMP", Mode.ABY, 4, true);
def(0xc1, "CMP", Mode.IZX, 6); def(0xd1, "CMP", Mode.IZY, 5, true);
def(0xe0, "CPX", Mode.IMM, 2); def(0xe4, "CPX", Mode.ZP, 3); def(0xec, "CPX", Mode.ABS, 4);
def(0xc0, "CPY", Mode.IMM, 2); def(0xc4, "CPY", Mode.ZP, 3); def(0xcc, "CPY", Mode.ABS, 4);

// ---- インクリメント / デクリメント ----
def(0xe6, "INC", Mode.ZP, 5); def(0xf6, "INC", Mode.ZPX, 6); def(0xee, "INC", Mode.ABS, 6);
def(0xfe, "INC", Mode.ABX, 7);
def(0xc6, "DEC", Mode.ZP, 5); def(0xd6, "DEC", Mode.ZPX, 6); def(0xce, "DEC", Mode.ABS, 6);
def(0xde, "DEC", Mode.ABX, 7);
def(0xe8, "INX", Mode.IMP, 2); def(0xc8, "INY", Mode.IMP, 2);
def(0xca, "DEX", Mode.IMP, 2); def(0x88, "DEY", Mode.IMP, 2);

// ---- シフト / ローテート ----
def(0x0a, "ASL", Mode.ACC, 2); def(0x06, "ASL", Mode.ZP, 5); def(0x16, "ASL", Mode.ZPX, 6);
def(0x0e, "ASL", Mode.ABS, 6); def(0x1e, "ASL", Mode.ABX, 7);
def(0x4a, "LSR", Mode.ACC, 2); def(0x46, "LSR", Mode.ZP, 5); def(0x56, "LSR", Mode.ZPX, 6);
def(0x4e, "LSR", Mode.ABS, 6); def(0x5e, "LSR", Mode.ABX, 7);
def(0x2a, "ROL", Mode.ACC, 2); def(0x26, "ROL", Mode.ZP, 5); def(0x36, "ROL", Mode.ZPX, 6);
def(0x2e, "ROL", Mode.ABS, 6); def(0x3e, "ROL", Mode.ABX, 7);
def(0x6a, "ROR", Mode.ACC, 2); def(0x66, "ROR", Mode.ZP, 5); def(0x76, "ROR", Mode.ZPX, 6);
def(0x6e, "ROR", Mode.ABS, 6); def(0x7e, "ROR", Mode.ABX, 7);

// ---- ジャンプ / サブルーチン ----
def(0x4c, "JMP", Mode.ABS, 3); def(0x6c, "JMP", Mode.IND, 5);
def(0x20, "JSR", Mode.ABS, 6); def(0x60, "RTS", Mode.IMP, 6);

// ---- 分岐 ----
def(0x90, "BCC", Mode.REL, 2); def(0xb0, "BCS", Mode.REL, 2);
def(0xf0, "BEQ", Mode.REL, 2); def(0xd0, "BNE", Mode.REL, 2);
def(0x30, "BMI", Mode.REL, 2); def(0x10, "BPL", Mode.REL, 2);
def(0x50, "BVC", Mode.REL, 2); def(0x70, "BVS", Mode.REL, 2);

// ---- フラグ操作 ----
def(0x18, "CLC", Mode.IMP, 2); def(0x38, "SEC", Mode.IMP, 2);
def(0x58, "CLI", Mode.IMP, 2); def(0x78, "SEI", Mode.IMP, 2);
def(0xb8, "CLV", Mode.IMP, 2);
def(0xd8, "CLD", Mode.IMP, 2); def(0xf8, "SED", Mode.IMP, 2);

// ---- 割り込み / その他 ----
def(0x00, "BRK", Mode.IMP, 7); def(0x40, "RTI", Mode.IMP, 6);
def(0xea, "NOP", Mode.IMP, 2);

export class Cpu {
  a = 0;
  x = 0;
  y = 0;
  sp = 0xfd;
  pc = 0;

  // ステータスフラグ (P レジスタを 1 ビットずつ分解して保持)
  c = 0; // carry
  z = 0; // zero
  i = 1; // interrupt disable
  d = 0; // decimal (2A03 では無効だがフラグ自体は存在する)
  v = 0; // overflow
  n = 0; // negative

  /** 起動からの総サイクル数 */
  cycles = 0;
  /** OAM DMA などで CPU が停止する残りサイクル */
  stall = 0;

  private nmiPending = false;
  private irqLine = false;

  constructor(private bus: CpuBus) {}

  // ---------- 割り込み要求 ----------

  /** PPU が VBlank 開始時に呼ぶ (エッジトリガ) */
  requestNmi(): void {
    this.nmiPending = true;
  }

  /** APU やマッパーが呼ぶ (レベルトリガ) */
  setIrqLine(level: boolean): void {
    this.irqLine = level;
  }

  // ---------- リセット ----------

  reset(): void {
    this.sp = 0xfd;
    this.i = 1;
    this.pc = this.read16(0xfffc);
    this.cycles = 7;
    this.nmiPending = false;
  }

  // ---------- メモリアクセスヘルパ ----------

  private read(addr: number): number {
    return this.bus.read(addr & 0xffff) & 0xff;
  }

  private write(addr: number, value: number): void {
    this.bus.write(addr & 0xffff, value & 0xff);
  }

  private read16(addr: number): number {
    return this.read(addr) | (this.read(addr + 1) << 8);
  }

  /** 6502 のバグ: ページ境界をまたぐ間接参照は下位バイトだけ巻き戻る */
  private read16Bug(addr: number): number {
    const lo = this.read(addr);
    const hi = this.read((addr & 0xff00) | ((addr + 1) & 0xff));
    return lo | (hi << 8);
  }

  private push(value: number): void {
    this.write(0x100 | this.sp, value);
    this.sp = (this.sp - 1) & 0xff;
  }

  private pop(): number {
    this.sp = (this.sp + 1) & 0xff;
    return this.read(0x100 | this.sp);
  }

  /** P レジスタを 1 バイトに合成 (bit5 は常に 1) */
  getP(b: boolean): number {
    return (
      this.c |
      (this.z << 1) |
      (this.i << 2) |
      (this.d << 3) |
      ((b ? 1 : 0) << 4) |
      0x20 |
      (this.v << 6) |
      (this.n << 7)
    );
  }

  setP(p: number): void {
    this.c = p & 1;
    this.z = (p >> 1) & 1;
    this.i = (p >> 2) & 1;
    this.d = (p >> 3) & 1;
    this.v = (p >> 6) & 1;
    this.n = (p >> 7) & 1;
  }

  private setZN(value: number): void {
    this.z = value === 0 ? 1 : 0;
    this.n = (value >> 7) & 1;
  }

  // ---------- 実行 ----------

  /** 1 命令実行し、消費サイクル数を返す */
  step(): number {
    if (this.stall > 0) {
      this.stall--;
      this.cycles++;
      return 1;
    }

    // 割り込みチェック (NMI が最優先)
    if (this.nmiPending) {
      this.nmiPending = false;
      this.interrupt(0xfffa, false);
      return 7;
    }
    if (this.irqLine && this.i === 0) {
      this.interrupt(0xfffe, false);
      return 7;
    }

    const opcode = this.read(this.pc);
    this.pc = (this.pc + 1) & 0xffff;
    const op = OPTABLE[opcode];
    if (!op) {
      // 非公式命令: とりあえず NOP として扱う (引数バイトはモード不明なので消費しない)
      this.cycles += 2;
      return 2;
    }

    // ---- オペランドのアドレスを解決 ----
    let addr = 0;
    let pageCrossed = false;
    switch (op.mode) {
      case Mode.IMP:
      case Mode.ACC:
        break;
      case Mode.IMM:
        addr = this.pc;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case Mode.ZP:
        addr = this.read(this.pc);
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case Mode.ZPX:
        addr = (this.read(this.pc) + this.x) & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case Mode.ZPY:
        addr = (this.read(this.pc) + this.y) & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        break;
      case Mode.ABS:
        addr = this.read16(this.pc);
        this.pc = (this.pc + 2) & 0xffff;
        break;
      case Mode.ABX: {
        const base = this.read16(this.pc);
        this.pc = (this.pc + 2) & 0xffff;
        addr = (base + this.x) & 0xffff;
        pageCrossed = (base & 0xff00) !== (addr & 0xff00);
        break;
      }
      case Mode.ABY: {
        const base = this.read16(this.pc);
        this.pc = (this.pc + 2) & 0xffff;
        addr = (base + this.y) & 0xffff;
        pageCrossed = (base & 0xff00) !== (addr & 0xff00);
        break;
      }
      case Mode.IND: {
        const ptr = this.read16(this.pc);
        this.pc = (this.pc + 2) & 0xffff;
        addr = this.read16Bug(ptr);
        break;
      }
      case Mode.IZX: {
        const ptr = (this.read(this.pc) + this.x) & 0xff;
        this.pc = (this.pc + 1) & 0xffff;
        addr = this.read16Bug(ptr);
        break;
      }
      case Mode.IZY: {
        const ptr = this.read(this.pc);
        this.pc = (this.pc + 1) & 0xffff;
        const base = this.read16Bug(ptr);
        addr = (base + this.y) & 0xffff;
        pageCrossed = (base & 0xff00) !== (addr & 0xff00);
        break;
      }
      case Mode.REL: {
        const offset = this.read(this.pc);
        this.pc = (this.pc + 1) & 0xffff;
        // 符号付き 8 ビットとして解釈
        addr = (this.pc + (offset < 0x80 ? offset : offset - 0x100)) & 0xffff;
        break;
      }
    }

    let extra = 0;
    if (op.pageCycle && pageCrossed) extra = 1;

    // ---- 命令の実行 ----
    switch (op.name) {
      // ロード / ストア
      case "LDA": this.a = this.read(addr); this.setZN(this.a); break;
      case "LDX": this.x = this.read(addr); this.setZN(this.x); break;
      case "LDY": this.y = this.read(addr); this.setZN(this.y); break;
      case "STA": this.write(addr, this.a); break;
      case "STX": this.write(addr, this.x); break;
      case "STY": this.write(addr, this.y); break;

      // 転送
      case "TAX": this.x = this.a; this.setZN(this.x); break;
      case "TAY": this.y = this.a; this.setZN(this.y); break;
      case "TXA": this.a = this.x; this.setZN(this.a); break;
      case "TYA": this.a = this.y; this.setZN(this.a); break;
      case "TSX": this.x = this.sp; this.setZN(this.x); break;
      case "TXS": this.sp = this.x; break;

      // スタック
      case "PHA": this.push(this.a); break;
      case "PLA": this.a = this.pop(); this.setZN(this.a); break;
      case "PHP": this.push(this.getP(true)); break;
      case "PLP": this.setP(this.pop()); break;

      // 論理
      case "AND": this.a &= this.read(addr); this.setZN(this.a); break;
      case "EOR": this.a ^= this.read(addr); this.setZN(this.a); break;
      case "ORA": this.a |= this.read(addr); this.setZN(this.a); break;
      case "BIT": {
        const m = this.read(addr);
        this.z = (this.a & m) === 0 ? 1 : 0;
        this.v = (m >> 6) & 1;
        this.n = (m >> 7) & 1;
        break;
      }

      // 算術
      case "ADC": this.adc(this.read(addr)); break;
      case "SBC": this.adc(this.read(addr) ^ 0xff); break;
      case "CMP": this.compare(this.a, this.read(addr)); break;
      case "CPX": this.compare(this.x, this.read(addr)); break;
      case "CPY": this.compare(this.y, this.read(addr)); break;

      // インクリメント / デクリメント
      case "INC": {
        const v = (this.read(addr) + 1) & 0xff;
        this.write(addr, v);
        this.setZN(v);
        break;
      }
      case "DEC": {
        const v = (this.read(addr) - 1) & 0xff;
        this.write(addr, v);
        this.setZN(v);
        break;
      }
      case "INX": this.x = (this.x + 1) & 0xff; this.setZN(this.x); break;
      case "INY": this.y = (this.y + 1) & 0xff; this.setZN(this.y); break;
      case "DEX": this.x = (this.x - 1) & 0xff; this.setZN(this.x); break;
      case "DEY": this.y = (this.y - 1) & 0xff; this.setZN(this.y); break;

      // シフト / ローテート
      case "ASL":
        if (op.mode === Mode.ACC) {
          this.c = (this.a >> 7) & 1;
          this.a = (this.a << 1) & 0xff;
          this.setZN(this.a);
        } else {
          let v = this.read(addr);
          this.c = (v >> 7) & 1;
          v = (v << 1) & 0xff;
          this.write(addr, v);
          this.setZN(v);
        }
        break;
      case "LSR":
        if (op.mode === Mode.ACC) {
          this.c = this.a & 1;
          this.a >>= 1;
          this.setZN(this.a);
        } else {
          let v = this.read(addr);
          this.c = v & 1;
          v >>= 1;
          this.write(addr, v);
          this.setZN(v);
        }
        break;
      case "ROL":
        if (op.mode === Mode.ACC) {
          const c = this.c;
          this.c = (this.a >> 7) & 1;
          this.a = ((this.a << 1) | c) & 0xff;
          this.setZN(this.a);
        } else {
          let v = this.read(addr);
          const c = this.c;
          this.c = (v >> 7) & 1;
          v = ((v << 1) | c) & 0xff;
          this.write(addr, v);
          this.setZN(v);
        }
        break;
      case "ROR":
        if (op.mode === Mode.ACC) {
          const c = this.c;
          this.c = this.a & 1;
          this.a = (this.a >> 1) | (c << 7);
          this.setZN(this.a);
        } else {
          let v = this.read(addr);
          const c = this.c;
          this.c = v & 1;
          v = (v >> 1) | (c << 7);
          this.write(addr, v);
          this.setZN(v);
        }
        break;

      // ジャンプ
      case "JMP": this.pc = addr; break;
      case "JSR": {
        const ret = (this.pc - 1) & 0xffff;
        this.push(ret >> 8);
        this.push(ret & 0xff);
        this.pc = addr;
        break;
      }
      case "RTS": {
        const lo = this.pop();
        const hi = this.pop();
        this.pc = ((hi << 8) | lo) + 1;
        this.pc &= 0xffff;
        break;
      }

      // 分岐 (成立で +1、ページ跨ぎでさらに +1)
      case "BCC": extra += this.branch(this.c === 0, addr); break;
      case "BCS": extra += this.branch(this.c === 1, addr); break;
      case "BEQ": extra += this.branch(this.z === 1, addr); break;
      case "BNE": extra += this.branch(this.z === 0, addr); break;
      case "BMI": extra += this.branch(this.n === 1, addr); break;
      case "BPL": extra += this.branch(this.n === 0, addr); break;
      case "BVC": extra += this.branch(this.v === 0, addr); break;
      case "BVS": extra += this.branch(this.v === 1, addr); break;

      // フラグ
      case "CLC": this.c = 0; break;
      case "SEC": this.c = 1; break;
      case "CLI": this.i = 0; break;
      case "SEI": this.i = 1; break;
      case "CLV": this.v = 0; break;
      case "CLD": this.d = 0; break;
      case "SED": this.d = 1; break;

      // 割り込み
      case "BRK":
        this.pc = (this.pc + 1) & 0xffff; // BRK は 2 バイト命令扱い
        this.interruptBrk();
        break;
      case "RTI": {
        this.setP(this.pop());
        const lo = this.pop();
        const hi = this.pop();
        this.pc = (hi << 8) | lo;
        break;
      }

      case "NOP": break;
    }

    const used = op.cycles + extra;
    this.cycles += used;
    return used;
  }

  // ---------- 命令の共通処理 ----------

  /** ADC の本体。SBC は operand を反転して呼ぶ (M9 補数) */
  private adc(m: number): void {
    const sum = this.a + m + this.c;
    this.c = sum > 0xff ? 1 : 0;
    const result = sum & 0xff;
    // 符号が同じ 2 数を足して符号が変わったらオーバーフロー
    this.v = (~(this.a ^ m) & (this.a ^ result) & 0x80) !== 0 ? 1 : 0;
    this.a = result;
    this.setZN(this.a);
  }

  private compare(reg: number, m: number): void {
    const diff = (reg - m) & 0xff;
    this.c = reg >= m ? 1 : 0;
    this.setZN(diff);
  }

  private branch(cond: boolean, target: number): number {
    if (!cond) return 0;
    const crossed = (this.pc & 0xff00) !== (target & 0xff00);
    this.pc = target;
    return crossed ? 2 : 1;
  }

  /** NMI / IRQ 共通の割り込みシーケンス */
  private interrupt(vector: number, brk: boolean): void {
    this.push(this.pc >> 8);
    this.push(this.pc & 0xff);
    this.push(this.getP(brk));
    this.i = 1;
    this.pc = this.read16(vector);
    this.cycles += 7;
  }

  private interruptBrk(): void {
    this.push(this.pc >> 8);
    this.push(this.pc & 0xff);
    this.push(this.getP(true));
    this.i = 1;
    this.pc = this.read16(0xfffe);
    // BRK 自体のサイクル (7) は OPTABLE 側で加算される
  }

  /** デバッグ用: 現在の状態を 1 行で返す */
  debugState(): string {
    const h = (v: number, w: number) => v.toString(16).toUpperCase().padStart(w, "0");
    return `PC:${h(this.pc, 4)} A:${h(this.a, 2)} X:${h(this.x, 2)} Y:${h(this.y, 2)} P:${h(this.getP(false), 2)} SP:${h(this.sp, 2)} CYC:${this.cycles}`;
  }
}
