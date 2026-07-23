// src/cpu.ts
var OPTABLE = new Array(256);
function def(op, name, mode, cycles, pageCycle = false) {
  OPTABLE[op] = { name, mode, cycles, pageCycle };
}
def(169, "LDA", 2 /* IMM */, 2);
def(165, "LDA", 3 /* ZP */, 3);
def(181, "LDA", 4 /* ZPX */, 4);
def(173, "LDA", 6 /* ABS */, 4);
def(189, "LDA", 7 /* ABX */, 4, true);
def(185, "LDA", 8 /* ABY */, 4, true);
def(161, "LDA", 10 /* IZX */, 6);
def(177, "LDA", 11 /* IZY */, 5, true);
def(162, "LDX", 2 /* IMM */, 2);
def(166, "LDX", 3 /* ZP */, 3);
def(182, "LDX", 5 /* ZPY */, 4);
def(174, "LDX", 6 /* ABS */, 4);
def(190, "LDX", 8 /* ABY */, 4, true);
def(160, "LDY", 2 /* IMM */, 2);
def(164, "LDY", 3 /* ZP */, 3);
def(180, "LDY", 4 /* ZPX */, 4);
def(172, "LDY", 6 /* ABS */, 4);
def(188, "LDY", 7 /* ABX */, 4, true);
def(133, "STA", 3 /* ZP */, 3);
def(149, "STA", 4 /* ZPX */, 4);
def(141, "STA", 6 /* ABS */, 4);
def(157, "STA", 7 /* ABX */, 5);
def(153, "STA", 8 /* ABY */, 5);
def(129, "STA", 10 /* IZX */, 6);
def(145, "STA", 11 /* IZY */, 6);
def(134, "STX", 3 /* ZP */, 3);
def(150, "STX", 5 /* ZPY */, 4);
def(142, "STX", 6 /* ABS */, 4);
def(132, "STY", 3 /* ZP */, 3);
def(148, "STY", 4 /* ZPX */, 4);
def(140, "STY", 6 /* ABS */, 4);
def(170, "TAX", 0 /* IMP */, 2);
def(168, "TAY", 0 /* IMP */, 2);
def(138, "TXA", 0 /* IMP */, 2);
def(152, "TYA", 0 /* IMP */, 2);
def(186, "TSX", 0 /* IMP */, 2);
def(154, "TXS", 0 /* IMP */, 2);
def(72, "PHA", 0 /* IMP */, 3);
def(104, "PLA", 0 /* IMP */, 4);
def(8, "PHP", 0 /* IMP */, 3);
def(40, "PLP", 0 /* IMP */, 4);
def(41, "AND", 2 /* IMM */, 2);
def(37, "AND", 3 /* ZP */, 3);
def(53, "AND", 4 /* ZPX */, 4);
def(45, "AND", 6 /* ABS */, 4);
def(61, "AND", 7 /* ABX */, 4, true);
def(57, "AND", 8 /* ABY */, 4, true);
def(33, "AND", 10 /* IZX */, 6);
def(49, "AND", 11 /* IZY */, 5, true);
def(73, "EOR", 2 /* IMM */, 2);
def(69, "EOR", 3 /* ZP */, 3);
def(85, "EOR", 4 /* ZPX */, 4);
def(77, "EOR", 6 /* ABS */, 4);
def(93, "EOR", 7 /* ABX */, 4, true);
def(89, "EOR", 8 /* ABY */, 4, true);
def(65, "EOR", 10 /* IZX */, 6);
def(81, "EOR", 11 /* IZY */, 5, true);
def(9, "ORA", 2 /* IMM */, 2);
def(5, "ORA", 3 /* ZP */, 3);
def(21, "ORA", 4 /* ZPX */, 4);
def(13, "ORA", 6 /* ABS */, 4);
def(29, "ORA", 7 /* ABX */, 4, true);
def(25, "ORA", 8 /* ABY */, 4, true);
def(1, "ORA", 10 /* IZX */, 6);
def(17, "ORA", 11 /* IZY */, 5, true);
def(36, "BIT", 3 /* ZP */, 3);
def(44, "BIT", 6 /* ABS */, 4);
def(105, "ADC", 2 /* IMM */, 2);
def(101, "ADC", 3 /* ZP */, 3);
def(117, "ADC", 4 /* ZPX */, 4);
def(109, "ADC", 6 /* ABS */, 4);
def(125, "ADC", 7 /* ABX */, 4, true);
def(121, "ADC", 8 /* ABY */, 4, true);
def(97, "ADC", 10 /* IZX */, 6);
def(113, "ADC", 11 /* IZY */, 5, true);
def(233, "SBC", 2 /* IMM */, 2);
def(229, "SBC", 3 /* ZP */, 3);
def(245, "SBC", 4 /* ZPX */, 4);
def(237, "SBC", 6 /* ABS */, 4);
def(253, "SBC", 7 /* ABX */, 4, true);
def(249, "SBC", 8 /* ABY */, 4, true);
def(225, "SBC", 10 /* IZX */, 6);
def(241, "SBC", 11 /* IZY */, 5, true);
def(201, "CMP", 2 /* IMM */, 2);
def(197, "CMP", 3 /* ZP */, 3);
def(213, "CMP", 4 /* ZPX */, 4);
def(205, "CMP", 6 /* ABS */, 4);
def(221, "CMP", 7 /* ABX */, 4, true);
def(217, "CMP", 8 /* ABY */, 4, true);
def(193, "CMP", 10 /* IZX */, 6);
def(209, "CMP", 11 /* IZY */, 5, true);
def(224, "CPX", 2 /* IMM */, 2);
def(228, "CPX", 3 /* ZP */, 3);
def(236, "CPX", 6 /* ABS */, 4);
def(192, "CPY", 2 /* IMM */, 2);
def(196, "CPY", 3 /* ZP */, 3);
def(204, "CPY", 6 /* ABS */, 4);
def(230, "INC", 3 /* ZP */, 5);
def(246, "INC", 4 /* ZPX */, 6);
def(238, "INC", 6 /* ABS */, 6);
def(254, "INC", 7 /* ABX */, 7);
def(198, "DEC", 3 /* ZP */, 5);
def(214, "DEC", 4 /* ZPX */, 6);
def(206, "DEC", 6 /* ABS */, 6);
def(222, "DEC", 7 /* ABX */, 7);
def(232, "INX", 0 /* IMP */, 2);
def(200, "INY", 0 /* IMP */, 2);
def(202, "DEX", 0 /* IMP */, 2);
def(136, "DEY", 0 /* IMP */, 2);
def(10, "ASL", 1 /* ACC */, 2);
def(6, "ASL", 3 /* ZP */, 5);
def(22, "ASL", 4 /* ZPX */, 6);
def(14, "ASL", 6 /* ABS */, 6);
def(30, "ASL", 7 /* ABX */, 7);
def(74, "LSR", 1 /* ACC */, 2);
def(70, "LSR", 3 /* ZP */, 5);
def(86, "LSR", 4 /* ZPX */, 6);
def(78, "LSR", 6 /* ABS */, 6);
def(94, "LSR", 7 /* ABX */, 7);
def(42, "ROL", 1 /* ACC */, 2);
def(38, "ROL", 3 /* ZP */, 5);
def(54, "ROL", 4 /* ZPX */, 6);
def(46, "ROL", 6 /* ABS */, 6);
def(62, "ROL", 7 /* ABX */, 7);
def(106, "ROR", 1 /* ACC */, 2);
def(102, "ROR", 3 /* ZP */, 5);
def(118, "ROR", 4 /* ZPX */, 6);
def(110, "ROR", 6 /* ABS */, 6);
def(126, "ROR", 7 /* ABX */, 7);
def(76, "JMP", 6 /* ABS */, 3);
def(108, "JMP", 9 /* IND */, 5);
def(32, "JSR", 6 /* ABS */, 6);
def(96, "RTS", 0 /* IMP */, 6);
def(144, "BCC", 12 /* REL */, 2);
def(176, "BCS", 12 /* REL */, 2);
def(240, "BEQ", 12 /* REL */, 2);
def(208, "BNE", 12 /* REL */, 2);
def(48, "BMI", 12 /* REL */, 2);
def(16, "BPL", 12 /* REL */, 2);
def(80, "BVC", 12 /* REL */, 2);
def(112, "BVS", 12 /* REL */, 2);
def(24, "CLC", 0 /* IMP */, 2);
def(56, "SEC", 0 /* IMP */, 2);
def(88, "CLI", 0 /* IMP */, 2);
def(120, "SEI", 0 /* IMP */, 2);
def(184, "CLV", 0 /* IMP */, 2);
def(216, "CLD", 0 /* IMP */, 2);
def(248, "SED", 0 /* IMP */, 2);
def(0, "BRK", 0 /* IMP */, 7);
def(64, "RTI", 0 /* IMP */, 6);
def(234, "NOP", 0 /* IMP */, 2);
var Cpu = class {
  constructor(bus) {
    this.bus = bus;
  }
  bus;
  a = 0;
  x = 0;
  y = 0;
  sp = 253;
  pc = 0;
  // ステータスフラグ (P レジスタを 1 ビットずつ分解して保持)
  c = 0;
  // carry
  z = 0;
  // zero
  i = 1;
  // interrupt disable
  d = 0;
  // decimal (2A03 では無効だがフラグ自体は存在する)
  v = 0;
  // overflow
  n = 0;
  // negative
  /** 起動からの総サイクル数 */
  cycles = 0;
  /** OAM DMA などで CPU が停止する残りサイクル */
  stall = 0;
  nmiPending = false;
  irqLine = false;
  // ---------- 割り込み要求 ----------
  /** PPU が VBlank 開始時に呼ぶ (エッジトリガ) */
  requestNmi() {
    this.nmiPending = true;
  }
  /** APU やマッパーが呼ぶ (レベルトリガ) */
  setIrqLine(level) {
    this.irqLine = level;
  }
  // ---------- リセット ----------
  reset() {
    this.sp = 253;
    this.i = 1;
    this.pc = this.read16(65532);
    this.cycles = 7;
    this.nmiPending = false;
  }
  // ---------- メモリアクセスヘルパ ----------
  read(addr) {
    return this.bus.read(addr & 65535) & 255;
  }
  write(addr, value) {
    this.bus.write(addr & 65535, value & 255);
  }
  read16(addr) {
    return this.read(addr) | this.read(addr + 1) << 8;
  }
  /** 6502 のバグ: ページ境界をまたぐ間接参照は下位バイトだけ巻き戻る */
  read16Bug(addr) {
    const lo = this.read(addr);
    const hi = this.read(addr & 65280 | addr + 1 & 255);
    return lo | hi << 8;
  }
  push(value) {
    this.write(256 | this.sp, value);
    this.sp = this.sp - 1 & 255;
  }
  pop() {
    this.sp = this.sp + 1 & 255;
    return this.read(256 | this.sp);
  }
  /** P レジスタを 1 バイトに合成 (bit5 は常に 1) */
  getP(b) {
    return this.c | this.z << 1 | this.i << 2 | this.d << 3 | (b ? 1 : 0) << 4 | 32 | this.v << 6 | this.n << 7;
  }
  setP(p) {
    this.c = p & 1;
    this.z = p >> 1 & 1;
    this.i = p >> 2 & 1;
    this.d = p >> 3 & 1;
    this.v = p >> 6 & 1;
    this.n = p >> 7 & 1;
  }
  setZN(value) {
    this.z = value === 0 ? 1 : 0;
    this.n = value >> 7 & 1;
  }
  // ---------- 実行 ----------
  /** 1 命令実行し、消費サイクル数を返す */
  step() {
    if (this.stall > 0) {
      this.stall--;
      this.cycles++;
      return 1;
    }
    if (this.nmiPending) {
      this.nmiPending = false;
      this.interrupt(65530, false);
      return 7;
    }
    if (this.irqLine && this.i === 0) {
      this.interrupt(65534, false);
      return 7;
    }
    const opcode = this.read(this.pc);
    this.pc = this.pc + 1 & 65535;
    const op = OPTABLE[opcode];
    if (!op) {
      this.cycles += 2;
      return 2;
    }
    let addr = 0;
    let pageCrossed = false;
    switch (op.mode) {
      case 0 /* IMP */:
      case 1 /* ACC */:
        break;
      case 2 /* IMM */:
        addr = this.pc;
        this.pc = this.pc + 1 & 65535;
        break;
      case 3 /* ZP */:
        addr = this.read(this.pc);
        this.pc = this.pc + 1 & 65535;
        break;
      case 4 /* ZPX */:
        addr = this.read(this.pc) + this.x & 255;
        this.pc = this.pc + 1 & 65535;
        break;
      case 5 /* ZPY */:
        addr = this.read(this.pc) + this.y & 255;
        this.pc = this.pc + 1 & 65535;
        break;
      case 6 /* ABS */:
        addr = this.read16(this.pc);
        this.pc = this.pc + 2 & 65535;
        break;
      case 7 /* ABX */: {
        const base = this.read16(this.pc);
        this.pc = this.pc + 2 & 65535;
        addr = base + this.x & 65535;
        pageCrossed = (base & 65280) !== (addr & 65280);
        break;
      }
      case 8 /* ABY */: {
        const base = this.read16(this.pc);
        this.pc = this.pc + 2 & 65535;
        addr = base + this.y & 65535;
        pageCrossed = (base & 65280) !== (addr & 65280);
        break;
      }
      case 9 /* IND */: {
        const ptr = this.read16(this.pc);
        this.pc = this.pc + 2 & 65535;
        addr = this.read16Bug(ptr);
        break;
      }
      case 10 /* IZX */: {
        const ptr = this.read(this.pc) + this.x & 255;
        this.pc = this.pc + 1 & 65535;
        addr = this.read16Bug(ptr);
        break;
      }
      case 11 /* IZY */: {
        const ptr = this.read(this.pc);
        this.pc = this.pc + 1 & 65535;
        const base = this.read16Bug(ptr);
        addr = base + this.y & 65535;
        pageCrossed = (base & 65280) !== (addr & 65280);
        break;
      }
      case 12 /* REL */: {
        const offset = this.read(this.pc);
        this.pc = this.pc + 1 & 65535;
        addr = this.pc + (offset < 128 ? offset : offset - 256) & 65535;
        break;
      }
    }
    let extra = 0;
    if (op.pageCycle && pageCrossed) extra = 1;
    switch (op.name) {
      // ロード / ストア
      case "LDA":
        this.a = this.read(addr);
        this.setZN(this.a);
        break;
      case "LDX":
        this.x = this.read(addr);
        this.setZN(this.x);
        break;
      case "LDY":
        this.y = this.read(addr);
        this.setZN(this.y);
        break;
      case "STA":
        this.write(addr, this.a);
        break;
      case "STX":
        this.write(addr, this.x);
        break;
      case "STY":
        this.write(addr, this.y);
        break;
      // 転送
      case "TAX":
        this.x = this.a;
        this.setZN(this.x);
        break;
      case "TAY":
        this.y = this.a;
        this.setZN(this.y);
        break;
      case "TXA":
        this.a = this.x;
        this.setZN(this.a);
        break;
      case "TYA":
        this.a = this.y;
        this.setZN(this.a);
        break;
      case "TSX":
        this.x = this.sp;
        this.setZN(this.x);
        break;
      case "TXS":
        this.sp = this.x;
        break;
      // スタック
      case "PHA":
        this.push(this.a);
        break;
      case "PLA":
        this.a = this.pop();
        this.setZN(this.a);
        break;
      case "PHP":
        this.push(this.getP(true));
        break;
      case "PLP":
        this.setP(this.pop());
        break;
      // 論理
      case "AND":
        this.a &= this.read(addr);
        this.setZN(this.a);
        break;
      case "EOR":
        this.a ^= this.read(addr);
        this.setZN(this.a);
        break;
      case "ORA":
        this.a |= this.read(addr);
        this.setZN(this.a);
        break;
      case "BIT": {
        const m = this.read(addr);
        this.z = (this.a & m) === 0 ? 1 : 0;
        this.v = m >> 6 & 1;
        this.n = m >> 7 & 1;
        break;
      }
      // 算術
      case "ADC":
        this.adc(this.read(addr));
        break;
      case "SBC":
        this.adc(this.read(addr) ^ 255);
        break;
      case "CMP":
        this.compare(this.a, this.read(addr));
        break;
      case "CPX":
        this.compare(this.x, this.read(addr));
        break;
      case "CPY":
        this.compare(this.y, this.read(addr));
        break;
      // インクリメント / デクリメント
      case "INC": {
        const v = this.read(addr) + 1 & 255;
        this.write(addr, v);
        this.setZN(v);
        break;
      }
      case "DEC": {
        const v = this.read(addr) - 1 & 255;
        this.write(addr, v);
        this.setZN(v);
        break;
      }
      case "INX":
        this.x = this.x + 1 & 255;
        this.setZN(this.x);
        break;
      case "INY":
        this.y = this.y + 1 & 255;
        this.setZN(this.y);
        break;
      case "DEX":
        this.x = this.x - 1 & 255;
        this.setZN(this.x);
        break;
      case "DEY":
        this.y = this.y - 1 & 255;
        this.setZN(this.y);
        break;
      // シフト / ローテート
      case "ASL":
        if (op.mode === 1 /* ACC */) {
          this.c = this.a >> 7 & 1;
          this.a = this.a << 1 & 255;
          this.setZN(this.a);
        } else {
          let v = this.read(addr);
          this.c = v >> 7 & 1;
          v = v << 1 & 255;
          this.write(addr, v);
          this.setZN(v);
        }
        break;
      case "LSR":
        if (op.mode === 1 /* ACC */) {
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
        if (op.mode === 1 /* ACC */) {
          const c = this.c;
          this.c = this.a >> 7 & 1;
          this.a = (this.a << 1 | c) & 255;
          this.setZN(this.a);
        } else {
          let v = this.read(addr);
          const c = this.c;
          this.c = v >> 7 & 1;
          v = (v << 1 | c) & 255;
          this.write(addr, v);
          this.setZN(v);
        }
        break;
      case "ROR":
        if (op.mode === 1 /* ACC */) {
          const c = this.c;
          this.c = this.a & 1;
          this.a = this.a >> 1 | c << 7;
          this.setZN(this.a);
        } else {
          let v = this.read(addr);
          const c = this.c;
          this.c = v & 1;
          v = v >> 1 | c << 7;
          this.write(addr, v);
          this.setZN(v);
        }
        break;
      // ジャンプ
      case "JMP":
        this.pc = addr;
        break;
      case "JSR": {
        const ret = this.pc - 1 & 65535;
        this.push(ret >> 8);
        this.push(ret & 255);
        this.pc = addr;
        break;
      }
      case "RTS": {
        const lo = this.pop();
        const hi = this.pop();
        this.pc = (hi << 8 | lo) + 1;
        this.pc &= 65535;
        break;
      }
      // 分岐 (成立で +1、ページ跨ぎでさらに +1)
      case "BCC":
        extra += this.branch(this.c === 0, addr);
        break;
      case "BCS":
        extra += this.branch(this.c === 1, addr);
        break;
      case "BEQ":
        extra += this.branch(this.z === 1, addr);
        break;
      case "BNE":
        extra += this.branch(this.z === 0, addr);
        break;
      case "BMI":
        extra += this.branch(this.n === 1, addr);
        break;
      case "BPL":
        extra += this.branch(this.n === 0, addr);
        break;
      case "BVC":
        extra += this.branch(this.v === 0, addr);
        break;
      case "BVS":
        extra += this.branch(this.v === 1, addr);
        break;
      // フラグ
      case "CLC":
        this.c = 0;
        break;
      case "SEC":
        this.c = 1;
        break;
      case "CLI":
        this.i = 0;
        break;
      case "SEI":
        this.i = 1;
        break;
      case "CLV":
        this.v = 0;
        break;
      case "CLD":
        this.d = 0;
        break;
      case "SED":
        this.d = 1;
        break;
      // 割り込み
      case "BRK":
        this.pc = this.pc + 1 & 65535;
        this.interruptBrk();
        break;
      case "RTI": {
        this.setP(this.pop());
        const lo = this.pop();
        const hi = this.pop();
        this.pc = hi << 8 | lo;
        break;
      }
      case "NOP":
        break;
    }
    const used = op.cycles + extra;
    this.cycles += used;
    return used;
  }
  // ---------- 命令の共通処理 ----------
  /** ADC の本体。SBC は operand を反転して呼ぶ (M9 補数) */
  adc(m) {
    const sum = this.a + m + this.c;
    this.c = sum > 255 ? 1 : 0;
    const result = sum & 255;
    this.v = (~(this.a ^ m) & (this.a ^ result) & 128) !== 0 ? 1 : 0;
    this.a = result;
    this.setZN(this.a);
  }
  compare(reg, m) {
    const diff = reg - m & 255;
    this.c = reg >= m ? 1 : 0;
    this.setZN(diff);
  }
  branch(cond, target) {
    if (!cond) return 0;
    const crossed = (this.pc & 65280) !== (target & 65280);
    this.pc = target;
    return crossed ? 2 : 1;
  }
  /** NMI / IRQ 共通の割り込みシーケンス */
  interrupt(vector, brk) {
    this.push(this.pc >> 8);
    this.push(this.pc & 255);
    this.push(this.getP(brk));
    this.i = 1;
    this.pc = this.read16(vector);
    this.cycles += 7;
  }
  interruptBrk() {
    this.push(this.pc >> 8);
    this.push(this.pc & 255);
    this.push(this.getP(true));
    this.i = 1;
    this.pc = this.read16(65534);
  }
  /** デバッグ用: 現在の状態を 1 行で返す */
  debugState() {
    const h = (v, w) => v.toString(16).toUpperCase().padStart(w, "0");
    return `PC:${h(this.pc, 4)} A:${h(this.a, 2)} X:${h(this.x, 2)} Y:${h(this.y, 2)} P:${h(this.getP(false), 2)} SP:${h(this.sp, 2)} CYC:${this.cycles}`;
  }
};

// src/bus.ts
var Bus = class {
  constructor(mapper) {
    this.mapper = mapper;
  }
  mapper;
  ram = new Uint8Array(2048);
  ppu = null;
  apu = null;
  controller = null;
  /** OAM DMA 発生時に CPU を止めるためのコールバック */
  onOamDma = null;
  read(addr) {
    if (addr < 8192) {
      return this.ram[addr & 2047];
    }
    if (addr < 16384) {
      return this.ppu ? this.ppu.readRegister(addr & 7) : 0;
    }
    if (addr === 16405) {
      return this.apu ? this.apu.readStatus() : 0;
    }
    if (addr === 16406) {
      return this.controller ? this.controller.read1() : 0;
    }
    if (addr === 16407) {
      return this.controller ? this.controller.read2() : 0;
    }
    if (addr < 16416) {
      return 0;
    }
    return this.mapper.cpuRead(addr);
  }
  write(addr, value) {
    if (addr < 8192) {
      this.ram[addr & 2047] = value;
      return;
    }
    if (addr < 16384) {
      this.ppu?.writeRegister(addr & 7, value);
      return;
    }
    if (addr === 16404) {
      if (this.ppu) {
        const page = value << 8;
        const buf = new Uint8Array(256);
        for (let i = 0; i < 256; i++) buf[i] = this.read(page + i);
        this.ppu.writeOamDma(buf);
        this.onOamDma?.();
      }
      return;
    }
    if (addr === 16406) {
      this.controller?.write(value);
      return;
    }
    if (addr < 16416) {
      this.apu?.writeRegister(addr, value);
      return;
    }
    this.mapper.cpuWrite(addr, value);
  }
};

// src/mappers/nrom.ts
var NromMapper = class {
  constructor(cart) {
    this.cart = cart;
    this.prgMask = cart.prgRom.length > 16384 ? 32767 : 16383;
  }
  cart;
  prgMask;
  cpuRead(addr) {
    if (addr >= 32768) {
      return this.cart.prgRom[addr - 32768 & this.prgMask];
    }
    if (addr >= 24576) {
      return this.cart.prgRam[addr - 24576];
    }
    return 0;
  }
  cpuWrite(addr, value) {
    if (addr >= 24576 && addr < 32768) {
      this.cart.prgRam[addr - 24576] = value;
    }
  }
  ppuRead(addr) {
    return this.cart.chrRom[addr & 8191];
  }
  ppuWrite(addr, value) {
    if (this.cart.chrIsRam) {
      this.cart.chrRom[addr & 8191] = value;
    }
  }
  mirroring() {
    return this.cart.mirroring;
  }
  onScanline() {
  }
  irqPending() {
    return false;
  }
};

// src/cartridge.ts
var Cartridge = class {
  prgRom;
  chrRom;
  chrIsRam;
  mapperId;
  mirroring;
  hasBattery;
  /** カセット上の拡張 RAM ($6000-$7FFF) */
  prgRam = new Uint8Array(8192);
  constructor(data) {
    if (data.length < 16 || data[0] !== 78 || data[1] !== 69 || data[2] !== 83 || data[3] !== 26) {
      throw new Error("iNES \u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u3067\u306F\u3042\u308A\u307E\u305B\u3093 (NES\\x1A \u30D8\u30C3\u30C0\u304C\u306A\u3044)");
    }
    const prgBanks = data[4];
    const chrBanks = data[5];
    const flags6 = data[6];
    const flags7 = data[7];
    this.mapperId = flags6 >> 4 | flags7 & 240;
    this.hasBattery = (flags6 & 2) !== 0;
    if (flags6 & 8) {
      this.mirroring = 2 /* FourScreen */;
    } else {
      this.mirroring = flags6 & 1 ? 1 /* Vertical */ : 0 /* Horizontal */;
    }
    let offset = 16;
    if (flags6 & 4) offset += 512;
    const prgSize = prgBanks * 16384;
    const chrSize = chrBanks * 8192;
    if (data.length < offset + prgSize + chrSize) {
      throw new Error("ROM \u30D5\u30A1\u30A4\u30EB\u304C\u58CA\u308C\u3066\u3044\u307E\u3059 (\u30B5\u30A4\u30BA\u4E0D\u8DB3)");
    }
    this.prgRom = data.slice(offset, offset + prgSize);
    if (chrBanks === 0) {
      this.chrRom = new Uint8Array(8192);
      this.chrIsRam = true;
    } else {
      this.chrRom = data.slice(offset + prgSize, offset + prgSize + chrSize);
      this.chrIsRam = false;
    }
  }
  /** マッパー番号に応じた Mapper 実装を生成する */
  createMapper() {
    switch (this.mapperId) {
      case 0:
        return new NromMapper(this);
      default:
        throw new Error(`\u30DE\u30C3\u30D1\u30FC ${this.mapperId} \u306F\u672A\u5BFE\u5FDC\u3067\u3059 (\u73FE\u5728\u306F NROM \u306E\u307F)`);
    }
  }
};

// src/ppu.ts
var NES_PALETTE = new Uint32Array(64);
{
  const p = [
    6710886,
    10888,
    1315495,
    3866788,
    6029438,
    7209024,
    7079424,
    5643520,
    3355904,
    739328,
    20992,
    20232,
    16461,
    0,
    0,
    0,
    11382189,
    1400793,
    4342015,
    7677950,
    10492620,
    12000891,
    11874592,
    10046976,
    7040256,
    3704576,
    824064,
    36658,
    31885,
    0,
    0,
    0,
    16776959,
    6598911,
    9605375,
    13006591,
    15952639,
    16674508,
    16679280,
    15375906,
    12369408,
    8968192,
    6087728,
    4579458,
    4771294,
    5197647,
    0,
    0,
    16776959,
    12640255,
    13882111,
    15255807,
    16499455,
    16696554,
    16698565,
    16242853,
    15000980,
    13627286,
    12448939,
    11793356,
    11922418,
    12105912,
    0,
    0
  ];
  for (let i = 0; i < 64; i++) {
    const rgb = p[i];
    NES_PALETTE[i] = 4278190080 | (rgb & 255) << 16 | rgb & 65280 | rgb >> 16 & 255;
  }
}
var Ppu = class {
  constructor(mapper) {
    this.mapper = mapper;
  }
  mapper;
  // ---- 外部から見えるメモリ ----
  /** ネームテーブル用 VRAM 2KB (配置はミラーリングで決まる) */
  vram = new Uint8Array(2048);
  /** パレット RAM 32B */
  palette = new Uint8Array(32);
  /** スプライト属性メモリ (64 スプライト x 4 バイト) */
  oam = new Uint8Array(256);
  /** 完成したフレーム (ABGR packed、canvas に直接転送できる) */
  frameBuffer = new Uint32Array(256 * 240);
  /** パレット適用前のピクセル (デバッグ用: パレット RAM インデックス) */
  frameIndex = new Uint8Array(256 * 240);
  /** 描画完了フレーム数 */
  frame = 0;
  // ---- レジスタ ----
  ctrl = 0;
  // $2000 PPUCTRL
  mask = 0;
  // $2001 PPUMASK
  statusReg = 0;
  // $2002 PPUSTATUS (bit7=VBlank, bit6=Sprite0, bit5=Overflow)
  oamAddr = 0;
  // $2003
  // ---- スクロール内部レジスタ (通称 loopy レジスタ) ----
  // v/t は 15bit: yyy NN YYYYY XXXXX
  //   yyy=fine Y, NN=ネームテーブル選択, YYYYY=coarse Y, XXXXX=coarse X
  v = 0;
  // 現在の VRAM アドレス
  t = 0;
  // テンポラリ (スクロール設定値)
  fineX = 0;
  // 横方向の 8 ピクセル未満のずれ
  w = 0;
  // $2005/$2006 の 2 回書き込みのどちらかを示すトグル
  readBuffer = 0;
  // $2007 読み出しの 1 段バッファ
  // ---- タイミング ----
  scanline = 0;
  // 0-261
  dot = 0;
  // 0-340
  nmiOccurred = false;
  /** VBlank 開始時に CPU へ NMI を届けるコールバック */
  onNmi = null;
  reset() {
    this.ctrl = 0;
    this.mask = 0;
    this.w = 0;
    this.scanline = 261;
    this.dot = 0;
  }
  // ================= CPU からのレジスタアクセス =================
  readRegister(reg) {
    switch (reg) {
      case 2: {
        const result = this.statusReg & 224 | this.readBuffer & 31;
        this.statusReg &= 127;
        this.w = 0;
        return result;
      }
      case 4:
        return this.oam[this.oamAddr];
      case 7: {
        const addr = this.v & 16383;
        let value;
        if (addr >= 16128) {
          value = this.readPalette(addr);
          this.readBuffer = this.ppuRead(addr - 4096);
        } else {
          value = this.readBuffer;
          this.readBuffer = this.ppuRead(addr);
        }
        this.v = this.v + (this.ctrl & 4 ? 32 : 1) & 32767;
        return value;
      }
      default:
        return 0;
    }
  }
  writeRegister(reg, value) {
    switch (reg) {
      case 0:
        this.ctrl = value;
        this.t = this.t & 29695 | (value & 3) << 10;
        break;
      case 1:
        this.mask = value;
        break;
      case 3:
        this.oamAddr = value;
        break;
      case 4:
        this.oam[this.oamAddr] = value;
        this.oamAddr = this.oamAddr + 1 & 255;
        break;
      case 5:
        if (this.w === 0) {
          this.t = this.t & 32736 | value >> 3;
          this.fineX = value & 7;
          this.w = 1;
        } else {
          this.t = this.t & 3103 | (value & 7) << 12 | (value & 248) << 2;
          this.w = 0;
        }
        break;
      case 6:
        if (this.w === 0) {
          this.t = this.t & 255 | (value & 63) << 8;
          this.w = 1;
        } else {
          this.t = this.t & 32512 | value;
          this.v = this.t;
          this.w = 0;
        }
        break;
      case 7:
        this.ppuWrite(this.v & 16383, value);
        this.v = this.v + (this.ctrl & 4 ? 32 : 1) & 32767;
        break;
    }
  }
  writeOamDma(data) {
    for (let i = 0; i < 256; i++) {
      this.oam[this.oamAddr + i & 255] = data[i];
    }
  }
  // ================= PPU バス ($0000-$3FFF) =================
  ppuRead(addr) {
    addr &= 16383;
    if (addr < 8192) return this.mapper.ppuRead(addr);
    if (addr < 16128) return this.vram[this.mirrorVram(addr)];
    return this.readPalette(addr);
  }
  ppuWrite(addr, value) {
    addr &= 16383;
    if (addr < 8192) {
      this.mapper.ppuWrite(addr, value);
    } else if (addr < 16128) {
      this.vram[this.mirrorVram(addr)] = value;
    } else {
      this.writePalette(addr, value);
    }
  }
  /** ネームテーブルアドレス → 2KB VRAM 内オフセット (ミラーリング適用) */
  mirrorVram(addr) {
    const index = addr - 8192 & 4095;
    const table = index >> 10;
    const offset = index & 1023;
    switch (this.mapper.mirroring()) {
      case 1 /* Vertical */:
        return (table & 1) << 10 | offset;
      case 0 /* Horizontal */:
        return table >> 1 << 10 | offset;
      case 3 /* SingleScreenLower */:
        return offset;
      case 4 /* SingleScreenUpper */:
        return 1024 | offset;
      case 2 /* FourScreen */:
      default:
        return index & 2047;
    }
  }
  readPalette(addr) {
    let i = addr & 31;
    if ((i & 19) === 16) i &= 15;
    return this.palette[i];
  }
  writePalette(addr, value) {
    let i = addr & 31;
    if ((i & 19) === 16) i &= 15;
    this.palette[i] = value & 63;
  }
  // ================= タイミング =================
  renderingEnabled() {
    return (this.mask & 24) !== 0;
  }
  /** PPU を 1 サイクル進める */
  tick() {
    const line = this.scanline;
    if (line < 240) {
      if (this.dot === 256) {
        this.renderScanline(line);
        if (this.renderingEnabled()) this.incrementY();
      } else if (this.dot === 257) {
        if (this.renderingEnabled()) this.copyX();
      } else if (this.dot === 260) {
        if (this.renderingEnabled()) this.mapper.onScanline();
      }
    } else if (line === 241) {
      if (this.dot === 1) {
        this.statusReg |= 128;
        this.frame++;
        if (this.ctrl & 128) this.onNmi?.();
      }
    } else if (line === 261) {
      if (this.dot === 1) {
        this.statusReg &= 31;
      } else if (this.dot === 257) {
        if (this.renderingEnabled()) this.copyX();
      } else if (this.dot === 280) {
        if (this.renderingEnabled()) this.copyY();
      } else if (this.dot === 260) {
        if (this.renderingEnabled()) this.mapper.onScanline();
      }
    }
    this.dot++;
    if (this.dot > 340) {
      this.dot = 0;
      this.scanline++;
      if (this.scanline > 261) {
        this.scanline = 0;
      }
    }
  }
  // ---- loopy レジスタ操作 ----
  /** 次のタイルへ (coarse X++)。ネームテーブルの端で隣のテーブルへ切り替え */
  incrementCoarseX() {
    if ((this.v & 31) === 31) {
      this.v &= ~31;
      this.v ^= 1024;
    } else {
      this.v++;
    }
  }
  /** 次のラインへ (fine Y++) */
  incrementY() {
    if ((this.v & 28672) !== 28672) {
      this.v += 4096;
    } else {
      this.v &= ~28672;
      let y = (this.v & 992) >> 5;
      if (y === 29) {
        y = 0;
        this.v ^= 2048;
      } else if (y === 31) {
        y = 0;
      } else {
        y++;
      }
      this.v = this.v & ~992 | y << 5;
    }
  }
  /** t の水平成分 (coarse X + NT下位) を v へコピー */
  copyX() {
    this.v = this.v & 31712 | this.t & 1055;
  }
  /** t の垂直成分 (fine Y + coarse Y + NT上位) を v へコピー */
  copyY() {
    this.v = this.v & 1055 | this.t & 31712;
  }
  // ================= スキャンライン描画 =================
  renderScanline(y) {
    const fbBase = y * 256;
    const bgEnabled = (this.mask & 8) !== 0;
    const sprEnabled = (this.mask & 16) !== 0;
    const bgLeftShow = (this.mask & 2) !== 0;
    const sprLeftShow = (this.mask & 4) !== 0;
    const bgPix = new Uint8Array(256);
    if (bgEnabled) {
      let rv = this.v;
      const fineY = rv >> 12 & 7;
      const patternBase = this.ctrl & 16 ? 4096 : 0;
      let px = -this.fineX;
      for (let tile = 0; tile < 33; tile++) {
        const ntAddr = 8192 | rv & 4095;
        const tileIndex = this.vram[this.mirrorVram(ntAddr)];
        const attrAddr = 9152 | rv & 3072 | rv >> 4 & 56 | rv >> 2 & 7;
        const attr = this.vram[this.mirrorVram(attrAddr)];
        const shift = rv >> 4 & 4 | rv & 2;
        const paletteHi = (attr >> shift & 3) << 2;
        const pAddr = patternBase + tileIndex * 16 + fineY;
        const lo = this.mapper.ppuRead(pAddr);
        const hi = this.mapper.ppuRead(pAddr + 8);
        for (let bit = 7; bit >= 0; bit--) {
          if (px >= 0 && px < 256) {
            const color = (hi >> bit & 1) << 1 | lo >> bit & 1;
            bgPix[px] = color === 0 ? 0 : paletteHi | color;
          }
          px++;
        }
        rv = this.incrementCoarseXOf(rv);
      }
    }
    if (bgEnabled && !bgLeftShow) {
      for (let i = 0; i < 8; i++) bgPix[i] = 0;
    }
    const sprPix = new Uint8Array(256);
    const sprBehind = new Uint8Array(256);
    const sprIsZero = new Uint8Array(256);
    if (sprEnabled) {
      const sprHeight = this.ctrl & 32 ? 16 : 8;
      let count = 0;
      for (let s = 0; s < 64; s++) {
        const sy = this.oam[s * 4];
        const row = y - sy - 1;
        if (row < 0 || row >= sprHeight) continue;
        count++;
        if (count > 8) {
          this.statusReg |= 32;
          break;
        }
        const tileIndex = this.oam[s * 4 + 1];
        const attr = this.oam[s * 4 + 2];
        const sx = this.oam[s * 4 + 3];
        const flipH = (attr & 64) !== 0;
        const flipV = (attr & 128) !== 0;
        const paletteHi = 16 | (attr & 3) << 2;
        const behind = (attr & 32) !== 0 ? 1 : 0;
        let r = flipV ? sprHeight - 1 - row : row;
        let pAddr;
        if (sprHeight === 16) {
          const table = (tileIndex & 1) * 4096;
          const t2 = (tileIndex & 254) + (r >= 8 ? 1 : 0);
          pAddr = table + t2 * 16 + (r & 7);
        } else {
          const table = this.ctrl & 8 ? 4096 : 0;
          pAddr = table + tileIndex * 16 + r;
        }
        const lo = this.mapper.ppuRead(pAddr);
        const hi = this.mapper.ppuRead(pAddr + 8);
        for (let i = 0; i < 8; i++) {
          const px = sx + i;
          if (px >= 256) break;
          if (sprPix[px] !== 0) continue;
          const bit = flipH ? i : 7 - i;
          const color = (hi >> bit & 1) << 1 | lo >> bit & 1;
          if (color === 0) continue;
          sprPix[px] = paletteHi | color;
          sprBehind[px] = behind;
          if (s === 0) sprIsZero[px] = 1;
        }
      }
      if (!sprLeftShow) {
        for (let i = 0; i < 8; i++) {
          sprPix[i] = 0;
          sprIsZero[i] = 0;
        }
      }
    }
    const backdrop = this.palette[0];
    for (let x = 0; x < 256; x++) {
      const bg = bgPix[x];
      const sp = sprPix[x];
      let paletteIndex;
      if (sp !== 0 && (bg === 0 || sprBehind[x] === 0)) {
        paletteIndex = sp;
      } else if (bg !== 0) {
        paletteIndex = bg;
      } else {
        paletteIndex = 0;
      }
      if (sprIsZero[x] && bg !== 0 && x < 255) {
        this.statusReg |= 64;
      }
      const colorIndex = paletteIndex === 0 ? backdrop : this.palette[this.paletteMirror(paletteIndex)];
      this.frameIndex[fbBase + x] = paletteIndex;
      this.frameBuffer[fbBase + x] = NES_PALETTE[colorIndex & 63];
    }
  }
  paletteMirror(i) {
    if ((i & 19) === 16) return i & 15;
    return i;
  }
  /** incrementCoarseX の純粋関数版 (ローカルコピー用) */
  incrementCoarseXOf(rv) {
    if ((rv & 31) === 31) {
      rv &= ~31;
      rv ^= 1024;
    } else {
      rv++;
    }
    return rv & 32767;
  }
  // ---- デバッグ用アクセサ ----
  get status() {
    return this.statusReg;
  }
  get control() {
    return this.ctrl;
  }
  get maskReg() {
    return this.mask;
  }
  get vramAddr() {
    return this.v;
  }
};

// src/controller.ts
var StandardController = class {
  /** 1P のボタン状態 (Button のビット和) */
  buttons1 = 0;
  /** 2P のボタン状態 */
  buttons2 = 0;
  strobe = false;
  index1 = 0;
  index2 = 0;
  write(value) {
    this.strobe = (value & 1) !== 0;
    if (this.strobe) {
      this.index1 = 0;
      this.index2 = 0;
    }
  }
  read1() {
    return this.shift(1);
  }
  read2() {
    return this.shift(2);
  }
  shift(player) {
    const buttons = player === 1 ? this.buttons1 : this.buttons2;
    if (this.strobe) {
      return buttons & 1;
    }
    const index = player === 1 ? this.index1 : this.index2;
    const bit = index < 8 ? buttons >> index & 1 : 1;
    if (player === 1) this.index1++;
    else this.index2++;
    return bit;
  }
};

// src/nes.ts
var Nes = class {
  cart;
  mapper;
  bus;
  cpu;
  ppu;
  controller;
  constructor(romData) {
    this.cart = new Cartridge(romData);
    this.mapper = this.cart.createMapper();
    this.bus = new Bus(this.mapper);
    this.cpu = new Cpu(this.bus);
    this.ppu = new Ppu(this.mapper);
    this.controller = new StandardController();
    this.bus.ppu = this.ppu;
    this.bus.controller = this.controller;
    this.ppu.onNmi = () => this.cpu.requestNmi();
    this.bus.onOamDma = () => {
      this.cpu.stall += 513 + (this.cpu.cycles & 1);
    };
    this.reset();
  }
  reset() {
    this.cpu.reset();
    this.ppu.reset();
  }
  /**
   * 1 フレーム分実行する。
   * CPU を 1 命令進めるたびに、消費サイクル x3 だけ PPU を進める (キャッチアップ方式)。
   */
  runFrame() {
    const target = this.ppu.frame + 1;
    while (this.ppu.frame < target) {
      this.step();
    }
  }
  /** CPU 1 命令 (+付随する PPU の進行) を実行 */
  step() {
    const cpuCycles = this.cpu.step();
    for (let i = 0; i < cpuCycles * 3; i++) {
      this.ppu.tick();
    }
    this.cpu.setIrqLine(this.mapper.irqPending());
    return cpuCycles;
  }
  /** 現在のフレームバッファ (256x240, ABGR packed) */
  get frameBuffer() {
    return this.ppu.frameBuffer;
  }
};

// src/main.ts
var KEYMAP = {
  KeyX: 1 /* A */,
  KeyZ: 2 /* B */,
  ShiftLeft: 4 /* Select */,
  ShiftRight: 4 /* Select */,
  Enter: 8 /* Start */,
  ArrowUp: 16 /* Up */,
  ArrowDown: 32 /* Down */,
  ArrowLeft: 64 /* Left */,
  ArrowRight: 128 /* Right */
};
var canvas = document.getElementById("screen");
var ctx = canvas.getContext("2d");
var statusEl = document.getElementById("status");
var romInput = document.getElementById("rom-input");
var btnRun = document.getElementById("btn-run");
var btnPause = document.getElementById("btn-pause");
var btnReset = document.getElementById("btn-reset");
var nes = null;
var running = false;
var rafId = 0;
var imageData = ctx.createImageData(256, 240);
var imagePixels = new Uint32Array(imageData.data.buffer);
function drawFrame() {
  if (!nes) return;
  imagePixels.set(nes.frameBuffer);
  ctx.putImageData(imageData, 0, 0);
}
function loop() {
  if (!nes || !running) return;
  nes.runFrame();
  drawFrame();
  rafId = requestAnimationFrame(loop);
}
function setRunning(r) {
  running = r;
  btnRun.disabled = !nes || r;
  btnPause.disabled = !nes || !r;
  btnReset.disabled = !nes;
  if (r) {
    rafId = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(rafId);
  }
}
romInput.addEventListener("change", async () => {
  const file = romInput.files?.[0];
  if (!file) return;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    nes = new Nes(data);
    statusEl.textContent = `${file.name} \u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F (PRG ${nes.cart.prgRom.length / 1024}KB, CHR ${nes.cart.chrRom.length / 1024}KB, \u30DE\u30C3\u30D1\u30FC ${nes.cart.mapperId})`;
    setRunning(true);
  } catch (e) {
    nes = null;
    setRunning(false);
    statusEl.textContent = `\u8AAD\u307F\u8FBC\u307F\u5931\u6557: ${e instanceof Error ? e.message : e}`;
  }
});
window.addEventListener("keydown", (e) => {
  const btn = KEYMAP[e.code];
  if (btn && nes) {
    nes.controller.buttons1 |= btn;
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => {
  const btn = KEYMAP[e.code];
  if (btn && nes) {
    nes.controller.buttons1 &= ~btn;
    e.preventDefault();
  }
});
async function loadBundledGame() {
  try {
    const res = await fetch("mosshop.nes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = new Uint8Array(await res.arrayBuffer());
    nes = new Nes(data);
    statusEl.textContent = "\u540C\u68B1\u30B2\u30FC\u30E0\u300EMOSS HOP\u300F\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\u3002Enter \u3067\u30B9\u30BF\u30FC\u30C8!";
    setRunning(true);
  } catch (e) {
    statusEl.textContent = `\u540C\u68B1\u30B2\u30FC\u30E0\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557: ${e instanceof Error ? e.message : e}`;
  }
}
document.getElementById("btn-sample")?.addEventListener("click", () => {
  void loadBundledGame();
});
btnRun.addEventListener("click", () => setRunning(true));
btnPause.addEventListener("click", () => setRunning(false));
btnReset.addEventListener("click", () => {
  nes?.reset();
});
ctx.fillStyle = "#000";
ctx.fillRect(0, 0, 256, 240);
ctx.fillStyle = "#e8eaf6";
ctx.font = "10px monospace";
ctx.fillText("nes1 - load a .nes ROM to start", 8, 120);
