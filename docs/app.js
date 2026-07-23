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
function opcodeInfo(opcode) {
  const op = OPTABLE[opcode];
  if (!op) return { name: "???", bytes: 1 };
  let bytes;
  switch (op.mode) {
    case 0 /* IMP */:
    case 1 /* ACC */:
      bytes = 1;
      break;
    case 6 /* ABS */:
    case 7 /* ABX */:
    case 8 /* ABY */:
    case 9 /* IND */:
      bytes = 3;
      break;
    default:
      bytes = 2;
  }
  return { name: op.name, bytes };
}
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

// src/mappers/mmc1.ts
var Mmc1Mapper = class {
  constructor(cart) {
    this.cart = cart;
  }
  cart;
  shift = 16;
  // bit4 が 1 の状態が「空」の印
  control = 12;
  // 起動時: PRG モード 3 (最終バンク固定)
  chrBank0 = 0;
  chrBank1 = 0;
  prgBank = 0;
  cpuRead(addr) {
    if (addr >= 32768) {
      const prgMode = this.control >> 2 & 3;
      const bankCount = this.cart.prgRom.length >> 14;
      let bank;
      let offset;
      if (prgMode < 2) {
        bank = (this.prgBank & 14) % bankCount;
        offset = addr - 32768;
        return this.cart.prgRom[bank * 16384 + offset];
      }
      if (addr < 49152) {
        bank = prgMode === 2 ? 0 : this.prgBank % bankCount;
        offset = addr - 32768;
      } else {
        bank = prgMode === 2 ? this.prgBank % bankCount : bankCount - 1;
        offset = addr - 49152;
      }
      return this.cart.prgRom[bank * 16384 + offset];
    }
    if (addr >= 24576) {
      return this.cart.prgRam[addr - 24576];
    }
    return 0;
  }
  cpuWrite(addr, value) {
    if (addr < 24576) return;
    if (addr < 32768) {
      this.cart.prgRam[addr - 24576] = value;
      return;
    }
    if (value & 128) {
      this.shift = 16;
      this.control |= 12;
      return;
    }
    const complete = (this.shift & 1) !== 0;
    this.shift = this.shift >> 1 | (value & 1) << 4;
    if (complete) {
      const reg = addr >> 13 & 3;
      switch (reg) {
        case 0:
          this.control = this.shift;
          break;
        case 1:
          this.chrBank0 = this.shift;
          break;
        case 2:
          this.chrBank1 = this.shift;
          break;
        case 3:
          this.prgBank = this.shift & 15;
          break;
      }
      this.shift = 16;
    }
  }
  chrOffset(addr) {
    const chr4kBanks = Math.max(1, this.cart.chrRom.length >> 12);
    if (this.control & 16) {
      const bank2 = addr < 4096 ? this.chrBank0 : this.chrBank1;
      return bank2 % chr4kBanks * 4096 + (addr & 4095);
    }
    const bank = (this.chrBank0 & 30) % chr4kBanks;
    return bank * 4096 + addr;
  }
  ppuRead(addr) {
    return this.cart.chrRom[this.chrOffset(addr)];
  }
  ppuWrite(addr, value) {
    if (this.cart.chrIsRam) {
      this.cart.chrRom[this.chrOffset(addr)] = value;
    }
  }
  mirroring() {
    switch (this.control & 3) {
      case 0:
        return 3 /* SingleScreenLower */;
      case 1:
        return 4 /* SingleScreenUpper */;
      case 2:
        return 1 /* Vertical */;
      default:
        return 0 /* Horizontal */;
    }
  }
  onScanline() {
  }
  irqPending() {
    return false;
  }
};

// src/mappers/uxrom.ts
var UxromMapper = class {
  constructor(cart) {
    this.cart = cart;
  }
  cart;
  bank = 0;
  cpuRead(addr) {
    if (addr >= 49152) {
      return this.cart.prgRom[this.cart.prgRom.length - 16384 + (addr - 49152)];
    }
    if (addr >= 32768) {
      const bankCount = this.cart.prgRom.length >> 14;
      return this.cart.prgRom[this.bank % bankCount * 16384 + (addr - 32768)];
    }
    if (addr >= 24576) return this.cart.prgRam[addr - 24576];
    return 0;
  }
  cpuWrite(addr, value) {
    if (addr >= 32768) {
      this.bank = value & 15;
    } else if (addr >= 24576) {
      this.cart.prgRam[addr - 24576] = value;
    }
  }
  ppuRead(addr) {
    return this.cart.chrRom[addr & 8191];
  }
  ppuWrite(addr, value) {
    if (this.cart.chrIsRam) this.cart.chrRom[addr & 8191] = value;
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

// src/mappers/cnrom.ts
var CnromMapper = class {
  constructor(cart) {
    this.cart = cart;
    this.prgMask = cart.prgRom.length > 16384 ? 32767 : 16383;
  }
  cart;
  bank = 0;
  prgMask;
  cpuRead(addr) {
    if (addr >= 32768) return this.cart.prgRom[addr - 32768 & this.prgMask];
    if (addr >= 24576) return this.cart.prgRam[addr - 24576];
    return 0;
  }
  cpuWrite(addr, value) {
    if (addr >= 32768) {
      this.bank = value & 3;
    } else if (addr >= 24576) {
      this.cart.prgRam[addr - 24576] = value;
    }
  }
  ppuRead(addr) {
    const bankCount = Math.max(1, this.cart.chrRom.length >> 13);
    return this.cart.chrRom[this.bank % bankCount * 8192 + (addr & 8191)];
  }
  ppuWrite(addr, value) {
    if (this.cart.chrIsRam) this.cart.chrRom[addr & 8191] = value;
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

// src/mappers/mmc3.ts
var Mmc3Mapper = class {
  constructor(cart) {
    this.cart = cart;
    this.mirrorVertical = cart.mirroring === 1 /* Vertical */;
  }
  cart;
  bankSelect = 0;
  banks = new Uint8Array(8);
  // R0-R7
  mirrorVertical = true;
  irqLatch = 0;
  irqCounter = 0;
  irqReload = false;
  irqEnabled = false;
  irqFlag = false;
  // ---- PRG: 8KB x4 ($8000/$A000/$C000/$E000) ----
  prgBankAt(addr) {
    const bankCount = this.cart.prgRom.length >> 13;
    const mode = (this.bankSelect & 64) !== 0;
    const slot = addr - 32768 >> 13;
    let bank;
    switch (slot) {
      case 0:
        bank = mode ? bankCount - 2 : this.banks[6];
        break;
      case 1:
        bank = this.banks[7];
        break;
      case 2:
        bank = mode ? this.banks[6] : bankCount - 2;
        break;
      default:
        bank = bankCount - 1;
        break;
    }
    return bank % bankCount;
  }
  cpuRead(addr) {
    if (addr >= 32768) {
      return this.cart.prgRom[this.prgBankAt(addr) * 8192 + (addr & 8191)];
    }
    if (addr >= 24576) return this.cart.prgRam[addr - 24576];
    return 0;
  }
  cpuWrite(addr, value) {
    if (addr < 24576) return;
    if (addr < 32768) {
      this.cart.prgRam[addr - 24576] = value;
      return;
    }
    const even = (addr & 1) === 0;
    if (addr < 40960) {
      if (even) this.bankSelect = value;
      else this.banks[this.bankSelect & 7] = value;
    } else if (addr < 49152) {
      if (even) this.mirrorVertical = (value & 1) === 0;
    } else if (addr < 57344) {
      if (even) this.irqLatch = value;
      else this.irqReload = true;
    } else {
      if (even) {
        this.irqEnabled = false;
        this.irqFlag = false;
      } else {
        this.irqEnabled = true;
      }
    }
  }
  // ---- CHR: 2KB x2 + 1KB x4 ----
  chrOffset(addr) {
    const invert = (this.bankSelect & 128) !== 0;
    let a = addr & 8191;
    if (invert) a ^= 4096;
    const chrSize = Math.max(this.cart.chrRom.length, 8192);
    let bank1k;
    if (a < 2048) {
      bank1k = (this.banks[0] & 254) + (a >= 1024 ? 1 : 0);
      return bank1k * 1024 % chrSize + (a & 1023);
    }
    if (a < 4096) {
      bank1k = (this.banks[1] & 254) + (a >= 3072 ? 1 : 0);
      return bank1k * 1024 % chrSize + (a & 1023);
    }
    const r = 2 + (a - 4096 >> 10);
    bank1k = this.banks[r];
    return bank1k * 1024 % chrSize + (a & 1023);
  }
  ppuRead(addr) {
    return this.cart.chrRom[this.chrOffset(addr)];
  }
  ppuWrite(addr, value) {
    if (this.cart.chrIsRam) this.cart.chrRom[this.chrOffset(addr)] = value;
  }
  mirroring() {
    if (this.cart.mirroring === 2 /* FourScreen */) return 2 /* FourScreen */;
    return this.mirrorVertical ? 1 /* Vertical */ : 0 /* Horizontal */;
  }
  // ---- スキャンライン IRQ ----
  // PPU が可視スキャンラインの終端ごとに呼ぶ (A12 立ち上がり検出の近似)
  onScanline() {
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
  irqPending() {
    return this.irqFlag;
  }
};

// src/cartridge.ts
var Cartridge3 = class {
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
      case 1:
        return new Mmc1Mapper(this);
      case 2:
        return new UxromMapper(this);
      case 3:
        return new CnromMapper(this);
      case 4:
        return new Mmc3Mapper(this);
      default:
        throw new Error(
          `\u30DE\u30C3\u30D1\u30FC ${this.mapperId} \u306F\u672A\u5BFE\u5FDC\u3067\u3059 (\u5BFE\u5FDC: 0=NROM, 1=MMC1, 2=UxROM, 3=CNROM, 4=MMC3)`
        );
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
  // ライン描画用ワークバッファ (毎ライン new しない — GC 回避の最適化)
  bgPix = new Uint8Array(256);
  sprPix = new Uint8Array(256);
  sprBehind = new Uint8Array(256);
  sprIsZero = new Uint8Array(256);
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
    const bgPix = this.bgPix;
    bgPix.fill(0);
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
    const sprPix = this.sprPix;
    const sprBehind = this.sprBehind;
    const sprIsZero = this.sprIsZero;
    sprPix.fill(0);
    sprBehind.fill(0);
    sprIsZero.fill(0);
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

// src/apu.ts
var LENGTH_TABLE = [
  10,
  254,
  20,
  2,
  40,
  4,
  80,
  6,
  160,
  8,
  60,
  10,
  14,
  12,
  26,
  14,
  12,
  16,
  24,
  18,
  48,
  20,
  96,
  22,
  192,
  24,
  72,
  26,
  16,
  28,
  32,
  30
];
var DUTY_TABLE = [
  [0, 1, 0, 0, 0, 0, 0, 0],
  // 12.5%
  [0, 1, 1, 0, 0, 0, 0, 0],
  // 25%
  [0, 1, 1, 1, 1, 0, 0, 0],
  // 50%
  [1, 0, 0, 1, 1, 1, 1, 1]
  // 25% 反転
];
var TRIANGLE_TABLE = [
  15,
  14,
  13,
  12,
  11,
  10,
  9,
  8,
  7,
  6,
  5,
  4,
  3,
  2,
  1,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15
];
var NOISE_PERIODS = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
var DMC_RATES = [428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54];
var Envelope = class {
  start = false;
  loop = false;
  constant = false;
  period = 0;
  divider = 0;
  decay = 0;
  clock() {
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
  get volume() {
    return this.constant ? this.period : this.decay;
  }
};
var Pulse = class {
  constructor(channel) {
    this.channel = channel;
  }
  channel;
  enabled = false;
  lengthCounter = 0;
  envelope = new Envelope();
  duty = 0;
  dutyPos = 0;
  timer = 0;
  timerPeriod = 0;
  // スイープ (音程の自動変化)
  sweepEnabled = false;
  sweepPeriod = 0;
  sweepNegate = false;
  sweepShift = 0;
  sweepDivider = 0;
  sweepReload = false;
  writeReg(reg, value) {
    switch (reg) {
      case 0:
        this.duty = value >> 6 & 3;
        this.envelope.loop = (value & 32) !== 0;
        this.envelope.constant = (value & 16) !== 0;
        this.envelope.period = value & 15;
        break;
      case 1:
        this.sweepEnabled = (value & 128) !== 0;
        this.sweepPeriod = value >> 4 & 7;
        this.sweepNegate = (value & 8) !== 0;
        this.sweepShift = value & 7;
        this.sweepReload = true;
        break;
      case 2:
        this.timerPeriod = this.timerPeriod & 1792 | value;
        break;
      case 3:
        this.timerPeriod = this.timerPeriod & 255 | (value & 7) << 8;
        if (this.enabled) this.lengthCounter = LENGTH_TABLE[value >> 3];
        this.dutyPos = 0;
        this.envelope.start = true;
        break;
    }
  }
  /** APU サイクル (CPU の 1/2) ごとに呼ばれる */
  clockTimer() {
    if (this.timer > 0) {
      this.timer--;
    } else {
      this.timer = this.timerPeriod;
      this.dutyPos = this.dutyPos + 1 & 7;
    }
  }
  clockLength() {
    if (!this.envelope.loop && this.lengthCounter > 0) this.lengthCounter--;
  }
  clockSweep() {
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
  sweepTarget() {
    const change = this.timerPeriod >> this.sweepShift;
    if (this.sweepNegate) {
      return this.timerPeriod - change - (this.channel === 1 ? 1 : 0);
    }
    return this.timerPeriod + change;
  }
  sweepMuted() {
    return this.timerPeriod < 8 || this.sweepTarget() > 2047;
  }
  output() {
    if (!this.enabled || this.lengthCounter === 0) return 0;
    if (this.sweepMuted()) return 0;
    if (DUTY_TABLE[this.duty][this.dutyPos] === 0) return 0;
    return this.envelope.volume;
  }
};
var Triangle = class {
  enabled = false;
  lengthCounter = 0;
  linearCounter = 0;
  linearReload = 0;
  linearReloadFlag = false;
  control = false;
  // 長さカウンタ停止 + リニアカウンタ制御
  timer = 0;
  timerPeriod = 0;
  pos = 0;
  writeReg(reg, value) {
    switch (reg) {
      case 0:
        this.control = (value & 128) !== 0;
        this.linearReload = value & 127;
        break;
      case 2:
        this.timerPeriod = this.timerPeriod & 1792 | value;
        break;
      case 3:
        this.timerPeriod = this.timerPeriod & 255 | (value & 7) << 8;
        if (this.enabled) this.lengthCounter = LENGTH_TABLE[value >> 3];
        this.linearReloadFlag = true;
        break;
    }
  }
  /** CPU サイクルごと */
  clockTimer() {
    if (this.timer > 0) {
      this.timer--;
    } else {
      this.timer = this.timerPeriod;
      if (this.lengthCounter > 0 && this.linearCounter > 0) {
        this.pos = this.pos + 1 & 31;
      }
    }
  }
  clockLinear() {
    if (this.linearReloadFlag) {
      this.linearCounter = this.linearReload;
    } else if (this.linearCounter > 0) {
      this.linearCounter--;
    }
    if (!this.control) this.linearReloadFlag = false;
  }
  clockLength() {
    if (!this.control && this.lengthCounter > 0) this.lengthCounter--;
  }
  output() {
    if (!this.enabled || this.lengthCounter === 0 || this.linearCounter === 0) return 0;
    if (this.timerPeriod < 2) return 7;
    return TRIANGLE_TABLE[this.pos];
  }
};
var Noise = class {
  enabled = false;
  lengthCounter = 0;
  envelope = new Envelope();
  mode = false;
  timer = 0;
  timerPeriod = NOISE_PERIODS[0];
  shift = 1;
  // 15bit LFSR
  writeReg(reg, value) {
    switch (reg) {
      case 0:
        this.envelope.loop = (value & 32) !== 0;
        this.envelope.constant = (value & 16) !== 0;
        this.envelope.period = value & 15;
        break;
      case 2:
        this.mode = (value & 128) !== 0;
        this.timerPeriod = NOISE_PERIODS[value & 15];
        break;
      case 3:
        if (this.enabled) this.lengthCounter = LENGTH_TABLE[value >> 3];
        this.envelope.start = true;
        break;
    }
  }
  clockTimer() {
    if (this.timer > 0) {
      this.timer--;
    } else {
      this.timer = this.timerPeriod;
      const feedback = this.shift & 1 ^ this.shift >> (this.mode ? 6 : 1) & 1;
      this.shift = this.shift >> 1 | feedback << 14;
    }
  }
  clockLength() {
    if (!this.envelope.loop && this.lengthCounter > 0) this.lengthCounter--;
  }
  output() {
    if (!this.enabled || this.lengthCounter === 0) return 0;
    if (this.shift & 1) return 0;
    return this.envelope.volume;
  }
};
var Dmc = class {
  constructor(readMemory) {
    this.readMemory = readMemory;
  }
  readMemory;
  enabled = false;
  irqEnabled = false;
  irqFlag = false;
  loop = false;
  outputLevel = 0;
  bytesRemaining = 0;
  rate = DMC_RATES[0];
  timer = 0;
  sampleAddress = 49152;
  sampleLength = 0;
  currentAddress = 0;
  shiftReg = 0;
  bitsRemaining = 0;
  silence = true;
  writeReg(reg, value) {
    switch (reg) {
      case 0:
        this.irqEnabled = (value & 128) !== 0;
        if (!this.irqEnabled) this.irqFlag = false;
        this.loop = (value & 64) !== 0;
        this.rate = DMC_RATES[value & 15];
        break;
      case 1:
        this.outputLevel = value & 127;
        break;
      case 2:
        this.sampleAddress = 49152 | value << 6;
        break;
      case 3:
        this.sampleLength = value << 4 | 1;
        break;
    }
  }
  restart() {
    this.currentAddress = this.sampleAddress;
    this.bytesRemaining = this.sampleLength;
  }
  clockTimer() {
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
        this.currentAddress = this.currentAddress === 65535 ? 32768 : this.currentAddress + 1;
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
};
var Apu = class {
  pulse1 = new Pulse(1);
  pulse2 = new Pulse(2);
  triangle = new Triangle();
  noise = new Noise();
  dmc;
  // フレームカウンタ
  frameMode5 = false;
  frameIrqInhibit = false;
  frameIrqFlag = false;
  frameCycle = 0;
  // サンプリング
  sampleRate = 44100;
  onSample = null;
  sampleCounter = 0;
  cyclesPerSample = 1789773 / 44100;
  oddCycle = false;
  constructor(readMemory = () => 0) {
    this.dmc = new Dmc(readMemory);
  }
  setSampleRate(rate) {
    this.sampleRate = rate;
    this.cyclesPerSample = 1789773 / rate;
  }
  // ---------- レジスタ ----------
  writeRegister(addr, value) {
    if (addr >= 16384 && addr <= 16387) this.pulse1.writeReg(addr & 3, value);
    else if (addr >= 16388 && addr <= 16391) this.pulse2.writeReg(addr & 3, value);
    else if (addr >= 16392 && addr <= 16395) this.triangle.writeReg(addr & 3, value);
    else if (addr >= 16396 && addr <= 16399) this.noise.writeReg(addr & 3, value);
    else if (addr >= 16400 && addr <= 16403) this.dmc.writeReg(addr & 3, value);
    else if (addr === 16405) {
      this.pulse1.enabled = (value & 1) !== 0;
      this.pulse2.enabled = (value & 2) !== 0;
      this.triangle.enabled = (value & 4) !== 0;
      this.noise.enabled = (value & 8) !== 0;
      if (!this.pulse1.enabled) this.pulse1.lengthCounter = 0;
      if (!this.pulse2.enabled) this.pulse2.lengthCounter = 0;
      if (!this.triangle.enabled) this.triangle.lengthCounter = 0;
      if (!this.noise.enabled) this.noise.lengthCounter = 0;
      const dmcEnable = (value & 16) !== 0;
      this.dmc.enabled = dmcEnable;
      this.dmc.irqFlag = false;
      if (dmcEnable) {
        if (this.dmc.bytesRemaining === 0) this.dmc.restart();
      } else {
        this.dmc.bytesRemaining = 0;
      }
    } else if (addr === 16407) {
      this.frameMode5 = (value & 128) !== 0;
      this.frameIrqInhibit = (value & 64) !== 0;
      if (this.frameIrqInhibit) this.frameIrqFlag = false;
      this.frameCycle = 0;
      if (this.frameMode5) {
        this.clockQuarter();
        this.clockHalf();
      }
    }
  }
  readStatus() {
    let status = 0;
    if (this.pulse1.lengthCounter > 0) status |= 1;
    if (this.pulse2.lengthCounter > 0) status |= 2;
    if (this.triangle.lengthCounter > 0) status |= 4;
    if (this.noise.lengthCounter > 0) status |= 8;
    if (this.dmc.bytesRemaining > 0) status |= 16;
    if (this.frameIrqFlag) status |= 64;
    if (this.dmc.irqFlag) status |= 128;
    this.frameIrqFlag = false;
    return status;
  }
  irqPending() {
    return this.frameIrqFlag || this.dmc.irqFlag;
  }
  // ---------- タイミング ----------
  /** CPU サイクル数だけ APU を進める */
  tick(cpuCycles) {
    for (let i = 0; i < cpuCycles; i++) {
      this.stepCycle();
    }
  }
  stepCycle() {
    this.triangle.clockTimer();
    this.dmc.clockTimer();
    if (this.oddCycle) {
      this.pulse1.clockTimer();
      this.pulse2.clockTimer();
      this.noise.clockTimer();
    }
    this.oddCycle = !this.oddCycle;
    this.clockFrameCounter();
    this.sampleCounter++;
    if (this.sampleCounter >= this.cyclesPerSample) {
      this.sampleCounter -= this.cyclesPerSample;
      this.onSample?.(this.mix());
    }
  }
  /** フレームカウンタ: 4 ステップ / 5 ステップのシーケンス */
  clockFrameCounter() {
    this.frameCycle++;
    if (!this.frameMode5) {
      switch (this.frameCycle) {
        case 7457:
          this.clockQuarter();
          break;
        case 14913:
          this.clockQuarter();
          this.clockHalf();
          break;
        case 22371:
          this.clockQuarter();
          break;
        case 29829:
          this.clockQuarter();
          this.clockHalf();
          if (!this.frameIrqInhibit) this.frameIrqFlag = true;
          this.frameCycle = 0;
          break;
      }
    } else {
      switch (this.frameCycle) {
        case 7457:
          this.clockQuarter();
          break;
        case 14913:
          this.clockQuarter();
          this.clockHalf();
          break;
        case 22371:
          this.clockQuarter();
          break;
        case 37281:
          this.clockQuarter();
          this.clockHalf();
          this.frameCycle = 0;
          break;
      }
    }
  }
  clockQuarter() {
    this.pulse1.envelope.clock();
    this.pulse2.envelope.clock();
    this.noise.envelope.clock();
    this.triangle.clockLinear();
  }
  clockHalf() {
    this.pulse1.clockLength();
    this.pulse2.clockLength();
    this.triangle.clockLength();
    this.noise.clockLength();
    this.pulse1.clockSweep();
    this.pulse2.clockSweep();
  }
  // ---------- ミキサー ----------
  /** 5 チャンネルを実機の非線形ミキサー式で合成 (-1.0 〜 1.0) */
  mix() {
    const p = this.pulse1.output() + this.pulse2.output();
    const t = this.triangle.output();
    const n = this.noise.output();
    const d = this.dmc.outputLevel;
    const pulseOut = p === 0 ? 0 : 95.88 / (8128 / p + 100);
    const tnd = t / 8227 + n / 12241 + d / 22638;
    const tndOut = tnd === 0 ? 0 : 159.79 / (1 / tnd + 100);
    return (pulseOut + tndOut) * 1.5;
  }
};

// src/nes.ts
var Nes = class {
  cart;
  mapper;
  bus;
  cpu;
  ppu;
  apu;
  controller;
  constructor(romData) {
    this.cart = new Cartridge3(romData);
    this.mapper = this.cart.createMapper();
    this.bus = new Bus(this.mapper);
    this.cpu = new Cpu(this.bus);
    this.ppu = new Ppu(this.mapper);
    this.controller = new StandardController();
    this.apu = new Apu((addr) => this.bus.read(addr));
    this.bus.ppu = this.ppu;
    this.bus.apu = this.apu;
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
  /** デバッグ用: 各命令の実行直前に呼ばれるフック */
  beforeStep = null;
  /** CPU 1 命令 (+付随する PPU の進行) を実行 */
  step() {
    this.beforeStep?.();
    const cpuCycles = this.cpu.step();
    for (let i = 0; i < cpuCycles * 3; i++) {
      this.ppu.tick();
    }
    this.apu.tick(cpuCycles);
    this.cpu.setIrqLine(this.mapper.irqPending() || this.apu.irqPending());
    return cpuCycles;
  }
  /** 現在のフレームバッファ (256x240, ABGR packed) */
  get frameBuffer() {
    return this.ppu.frameBuffer;
  }
};

// src/audio.ts
var AudioOutput = class {
  ctx = null;
  node = null;
  buffer = new Float32Array(16384);
  readPos = 0;
  writePos = 0;
  lastSample = 0;
  muted = false;
  /** ユーザー操作 (クリック等) の中で呼ぶこと (ブラウザの自動再生制限のため) */
  start() {
    if (this.ctx) {
      void this.ctx.resume();
      return this.ctx.sampleRate;
    }
    this.ctx = new AudioContext();
    this.node = this.ctx.createScriptProcessor(2048, 0, 1);
    this.node.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < out.length; i++) {
        if (this.readPos !== this.writePos) {
          this.lastSample = this.buffer[this.readPos];
          this.readPos = this.readPos + 1 & this.buffer.length - 1;
        }
        out[i] = this.muted ? 0 : this.lastSample;
      }
    };
    this.node.connect(this.ctx.destination);
    return this.ctx.sampleRate;
  }
  /** APU の onSample から呼ばれる */
  push(value) {
    const next = this.writePos + 1 & this.buffer.length - 1;
    if (next === this.readPos) return;
    this.buffer[this.writePos] = value;
    this.writePos = next;
  }
  /** 溜まっているサンプル数 (速度調整の目安) */
  get queued() {
    return this.writePos - this.readPos & this.buffer.length - 1;
  }
  suspend() {
    void this.ctx?.suspend();
  }
};

// src/debug.ts
var hex = (v, w) => v.toString(16).toUpperCase().padStart(w, "0");
var DebugView = class {
  patternCtx;
  nametableCtx;
  paletteCtx;
  cpuStateEl;
  traceEl;
  traceEnabled = false;
  traceLines = [];
  constructor(root) {
    this.patternCtx = root.pattern.getContext("2d");
    this.nametableCtx = root.nametable.getContext("2d");
    this.paletteCtx = root.palette.getContext("2d");
    this.cpuStateEl = root.cpuState;
    this.traceEl = root.trace;
  }
  /** 1 命令実行されるたびに呼ばれる (トレース有効時のみ記録) */
  onStep(nes2) {
    if (!this.traceEnabled) return;
    const pc = nes2.cpu.pc;
    const opcode = nes2.bus.read(pc);
    const info = opcodeInfo(opcode);
    let operand = "";
    if (info.bytes === 2) operand = `$${hex(nes2.bus.read(pc + 1), 2)}`;
    if (info.bytes === 3) {
      operand = `$${hex(nes2.bus.read(pc + 2), 2)}${hex(nes2.bus.read(pc + 1), 2)}`;
    }
    this.traceLines.push(
      `${hex(pc, 4)}  ${info.name} ${operand.padEnd(5)}  A:${hex(nes2.cpu.a, 2)} X:${hex(nes2.cpu.x, 2)} Y:${hex(nes2.cpu.y, 2)} P:${hex(nes2.cpu.getP(false), 2)}`
    );
    if (this.traceLines.length > 64) this.traceLines.shift();
  }
  /** フレームごとの更新 (軽量な部分) */
  updateFast(nes2, fps2) {
    const c = nes2.cpu;
    this.cpuStateEl.textContent = `FPS ${fps2.toFixed(1)}  FRAME ${nes2.ppu.frame}
PC:$${hex(c.pc, 4)}  A:$${hex(c.a, 2)}  X:$${hex(c.x, 2)}  Y:$${hex(c.y, 2)}
SP:$${hex(c.sp, 2)}  P:$${hex(c.getP(false), 2)} [${c.n ? "N" : "."}${c.v ? "V" : "."}..${c.d ? "D" : "."}${c.i ? "I" : "."}${c.z ? "Z" : "."}${c.c ? "C" : "."}]
CYC:${c.cycles}  SL:${nes2.ppu.scanline}  DOT:${nes2.ppu.dot}
CTRL:$${hex(nes2.ppu.control, 2)}  MASK:$${hex(nes2.ppu.maskReg, 2)}  STAT:$${hex(nes2.ppu.status, 2)}  V:$${hex(nes2.ppu.vramAddr, 4)}`;
    if (this.traceEnabled) {
      this.traceEl.textContent = this.traceLines.join("\n");
      this.traceEl.scrollTop = this.traceEl.scrollHeight;
    }
  }
  /** 重い可視化 (呼び出し側で間引く) */
  updateHeavy(nes2) {
    this.drawPatternTables(nes2);
    this.drawNametables(nes2);
    this.drawPalettes(nes2);
  }
  /** パターンテーブル 2 面を 256x128 に描く (グレースケール) */
  drawPatternTables(nes2) {
    const img = this.patternCtx.createImageData(256, 128);
    const px = new Uint32Array(img.data.buffer);
    const GRAYS = [4278190080, 4283782485, 4289374890, 4294967295];
    for (let table = 0; table < 2; table++) {
      for (let tile = 0; tile < 256; tile++) {
        const tx = (tile & 15) * 8 + table * 128;
        const ty = (tile >> 4) * 8;
        const base = table * 4096 + tile * 16;
        for (let y = 0; y < 8; y++) {
          const lo = nes2.mapper.ppuRead(base + y);
          const hi = nes2.mapper.ppuRead(base + y + 8);
          for (let x = 0; x < 8; x++) {
            const bit = 7 - x;
            const color = (hi >> bit & 1) << 1 | lo >> bit & 1;
            px[(ty + y) * 256 + tx + x] = GRAYS[color];
          }
        }
      }
    }
    this.patternCtx.putImageData(img, 0, 0);
  }
  /** ネームテーブル 4 面を 512x480 に描く */
  drawNametables(nes2) {
    const img = this.nametableCtx.createImageData(512, 480);
    const px = new Uint32Array(img.data.buffer);
    const ppu = nes2.ppu;
    const patternBase = ppu.control & 16 ? 4096 : 0;
    const backdrop = ppu.palette[0] & 63;
    for (let nt = 0; nt < 4; nt++) {
      const originX = (nt & 1) * 256;
      const originY = (nt >> 1) * 240;
      const vramBase = this.mirrorNametable(nes2, nt) * 1024;
      for (let row = 0; row < 30; row++) {
        for (let col = 0; col < 32; col++) {
          const tile = ppu.vram[vramBase + row * 32 + col];
          const attr = ppu.vram[vramBase + 960 + (row >> 2) * 8 + (col >> 2)];
          const shift = (row & 2) << 1 | col & 2;
          const palHi = (attr >> shift & 3) << 2;
          const base = patternBase + tile * 16;
          for (let y = 0; y < 8; y++) {
            const lo = nes2.mapper.ppuRead(base + y);
            const hi = nes2.mapper.ppuRead(base + y + 8);
            for (let x = 0; x < 8; x++) {
              const bit = 7 - x;
              const color = (hi >> bit & 1) << 1 | lo >> bit & 1;
              const palIndex = color === 0 ? backdrop : ppu.palette[palHi | color] & 63;
              px[(originY + row * 8 + y) * 512 + originX + col * 8 + x] = NES_PALETTE[palIndex];
            }
          }
        }
      }
    }
    this.nametableCtx.putImageData(img, 0, 0);
  }
  /** 論理ネームテーブル番号 → 物理 VRAM ページ (0/1) */
  mirrorNametable(nes2, nt) {
    switch (nes2.mapper.mirroring()) {
      case 1 /* Vertical */:
        return nt & 1;
      case 0 /* Horizontal */:
        return nt >> 1;
      case 3 /* SingleScreenLower */:
        return 0;
      case 4 /* SingleScreenUpper */:
        return 1;
      default:
        return nt & 1;
    }
  }
  /** パレット 32 色を描く */
  drawPalettes(nes2) {
    const img = this.paletteCtx.createImageData(256, 32);
    const px = new Uint32Array(img.data.buffer);
    for (let i = 0; i < 32; i++) {
      const color = NES_PALETTE[nes2.ppu.palette[i] & 63];
      const ox = (i & 15) * 16;
      const oy = i < 16 ? 0 : 16;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          px[(oy + y) * 256 + ox + x] = color;
        }
      }
    }
    this.paletteCtx.putImageData(img, 0, 0);
  }
};

// src/main.ts
var audio = new AudioOutput();
function attachAudio(n) {
  const rate = audio.start();
  n.apu.setSampleRate(rate);
  n.apu.onSample = (v) => audio.push(v);
}
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
var debugView = new DebugView({
  pattern: document.getElementById("dbg-pattern"),
  nametable: document.getElementById("dbg-nametable"),
  palette: document.getElementById("dbg-palette"),
  cpuState: document.getElementById("cpu-state"),
  trace: document.getElementById("cpu-trace")
});
var debugVisible = false;
var FRAME_MS = 1e3 / 60.0988;
var lastTime = 0;
var accumulator = 0;
var fps = 0;
var fpsCounter = 0;
var fpsTime = 0;
function loop(now) {
  if (!nes || !running) return;
  if (lastTime === 0) lastTime = now;
  accumulator += now - lastTime;
  lastTime = now;
  if (accumulator > FRAME_MS * 4) accumulator = FRAME_MS * 4;
  let ran = false;
  while (accumulator >= FRAME_MS) {
    nes.runFrame();
    accumulator -= FRAME_MS;
    fpsCounter++;
    ran = true;
  }
  if (ran) drawFrame();
  if (now - fpsTime >= 1e3) {
    fps = fpsCounter * 1e3 / (now - fpsTime);
    fpsCounter = 0;
    fpsTime = now;
  }
  if (debugVisible) {
    debugView.updateFast(nes, fps);
    if (nes.ppu.frame % 15 === 0) debugView.updateHeavy(nes);
  }
  rafId = requestAnimationFrame(loop);
}
function setRunning(r) {
  running = r;
  btnRun.disabled = !nes || r;
  btnPause.disabled = !nes || !r;
  btnReset.disabled = !nes;
  lastTime = 0;
  accumulator = 0;
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
    attachAudio(nes);
    if (debugView.traceEnabled) nes.beforeStep = () => debugView.onStep(nes);
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
    attachAudio(nes);
    if (debugView.traceEnabled) nes.beforeStep = () => debugView.onStep(nes);
    statusEl.textContent = "\u540C\u68B1\u30B2\u30FC\u30E0\u300EMOSS HOP\u300F\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\u3002Enter \u3067\u30B9\u30BF\u30FC\u30C8!";
    setRunning(true);
  } catch (e) {
    statusEl.textContent = `\u540C\u68B1\u30B2\u30FC\u30E0\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557: ${e instanceof Error ? e.message : e}`;
  }
}
document.getElementById("btn-sample")?.addEventListener("click", () => {
  void loadBundledGame();
});
document.getElementById("btn-debug")?.addEventListener("click", () => {
  debugVisible = !debugVisible;
  const panel = document.getElementById("debug-panel");
  panel.style.display = debugVisible ? "flex" : "none";
  if (debugVisible && nes) {
    debugView.updateFast(nes, fps);
    debugView.updateHeavy(nes);
  }
});
document.getElementById("btn-step")?.addEventListener("click", () => {
  if (!nes) return;
  setRunning(false);
  nes.runFrame();
  drawFrame();
  if (debugVisible) {
    debugView.updateFast(nes, 0);
    debugView.updateHeavy(nes);
  }
});
document.getElementById("chk-trace")?.addEventListener("change", (e) => {
  const enabled = e.target.checked;
  debugView.traceEnabled = enabled;
  if (nes) {
    nes.beforeStep = enabled ? () => debugView.onStep(nes) : null;
  }
});
document.getElementById("btn-mute")?.addEventListener("click", (e) => {
  audio.muted = !audio.muted;
  e.target.textContent = audio.muted ? "\u{1F507} \u97F3\u58F0 OFF" : "\u{1F50A} \u97F3\u58F0 ON";
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
