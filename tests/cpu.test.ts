// 6502 CPU のユニットテスト
// 小さな機械語プログラムを実行してレジスタ・フラグ・メモリを検証する

import { suite, assertEq, runProgram, FlatBus } from "./harness";
import { Cpu } from "../src/cpu";

export function testLoadStore(): void {
  suite("load/store");
  {
    // LDA #$42; STA $10
    const { cpu, bus } = runProgram([0xa9, 0x42, 0x85, 0x10]);
    assertEq(cpu.a, 0x42, "LDA immediate");
    assertEq(bus.mem[0x10], 0x42, "STA zeropage");
  }
  {
    // LDX #$05; LDA $20,X  ($25 に 0x99 を仕込む)
    const { cpu, bus } = runProgram([0xa2, 0x05, 0xb5, 0x20]);
    // 事前設定できないので別の書き方: STA で書いてから読む
    // LDX #$05; LDA #$99; STA $25; LDA #$00; LDA $20,X
    const r = runProgram([0xa2, 0x05, 0xa9, 0x99, 0x85, 0x25, 0xa9, 0x00, 0xb5, 0x20]);
    assertEq(r.cpu.a, 0x99, "LDA zeropage,X");
  }
  {
    // フラグ: LDA #$00 → Z=1, LDA #$80 → N=1
    const z = runProgram([0xa9, 0x00]);
    assertEq(z.cpu.z, 1, "LDA #0 sets Z");
    const n = runProgram([0xa9, 0x80]);
    assertEq(n.cpu.n, 1, "LDA #$80 sets N");
  }
  {
    // 絶対アドレス: LDA #$AB; STA $0300; LDX $0300
    const { cpu } = runProgram([0xa9, 0xab, 0x8d, 0x00, 0x03, 0xae, 0x00, 0x03]);
    assertEq(cpu.x, 0xab, "LDX absolute");
  }
  {
    // (indirect),Y: ポインタ $10/$11 = $0300, Y=4 → $0304
    const { cpu } = runProgram([
      0xa9, 0x00, 0x85, 0x10, // ptr lo
      0xa9, 0x03, 0x85, 0x11, // ptr hi
      0xa9, 0x77, 0x8d, 0x04, 0x03, // $0304 = $77
      0xa0, 0x04, // LDY #4
      0xa9, 0x00,
      0xb1, 0x10, // LDA ($10),Y
    ]);
    assertEq(cpu.a, 0x77, "LDA (indirect),Y");
  }
}

export function testArithmetic(): void {
  suite("arithmetic");
  {
    // ADC: 0x50 + 0x50 = 0xA0 (符号オーバーフロー)
    const { cpu } = runProgram([0x18, 0xa9, 0x50, 0x69, 0x50]);
    assertEq(cpu.a, 0xa0, "ADC result");
    assertEq(cpu.v, 1, "ADC overflow flag");
    assertEq(cpu.c, 0, "ADC carry clear");
    assertEq(cpu.n, 1, "ADC negative");
  }
  {
    // ADC キャリー発生: 0xFF + 0x01 = 0x00, C=1, Z=1
    const { cpu } = runProgram([0x18, 0xa9, 0xff, 0x69, 0x01]);
    assertEq(cpu.a, 0x00, "ADC wraps");
    assertEq(cpu.c, 1, "ADC sets carry");
    assertEq(cpu.z, 1, "ADC sets zero");
  }
  {
    // SBC: SEC; LDA #$10; SBC #$08 → 0x08, C=1 (ボローなし)
    const { cpu } = runProgram([0x38, 0xa9, 0x10, 0xe9, 0x08]);
    assertEq(cpu.a, 0x08, "SBC result");
    assertEq(cpu.c, 1, "SBC no borrow");
  }
  {
    // SBC ボロー: SEC; LDA #$05; SBC #$08 → 0xFD, C=0
    const { cpu } = runProgram([0x38, 0xa9, 0x05, 0xe9, 0x08]);
    assertEq(cpu.a, 0xfd, "SBC borrow result");
    assertEq(cpu.c, 0, "SBC borrow flag");
  }
  {
    // CMP: LDA #$30; CMP #$30 → Z=1, C=1
    const { cpu } = runProgram([0xa9, 0x30, 0xc9, 0x30]);
    assertEq(cpu.z, 1, "CMP equal Z");
    assertEq(cpu.c, 1, "CMP equal C");
  }
  {
    // INC/DEC メモリ
    const { bus } = runProgram([0xa9, 0x0f, 0x85, 0x40, 0xe6, 0x40, 0xe6, 0x40, 0xc6, 0x41]);
    assertEq(bus.mem[0x40], 0x11, "INC zeropage x2");
    assertEq(bus.mem[0x41], 0xff, "DEC from 0 wraps");
  }
}

export function testLogicShift(): void {
  suite("logic/shift");
  {
    const { cpu } = runProgram([0xa9, 0b11001100, 0x29, 0b10101010]); // AND
    assertEq(cpu.a, 0b10001000, "AND");
  }
  {
    const { cpu } = runProgram([0xa9, 0b11001100, 0x49, 0b10101010]); // EOR
    assertEq(cpu.a, 0b01100110, "EOR");
  }
  {
    const { cpu } = runProgram([0xa9, 0b11001100, 0x09, 0b10101010]); // ORA
    assertEq(cpu.a, 0b11101110, "ORA");
  }
  {
    // ASL A: 0x81 → 0x02, C=1
    const { cpu } = runProgram([0xa9, 0x81, 0x0a]);
    assertEq(cpu.a, 0x02, "ASL A");
    assertEq(cpu.c, 1, "ASL carry out");
  }
  {
    // LSR A: 0x01 → 0x00, C=1, Z=1
    const { cpu } = runProgram([0xa9, 0x01, 0x4a]);
    assertEq(cpu.a, 0x00, "LSR A");
    assertEq(cpu.c, 1, "LSR carry out");
    assertEq(cpu.z, 1, "LSR zero");
  }
  {
    // ROL: C=1 のとき 0x80 → 0x01, C=1
    const { cpu } = runProgram([0x38, 0xa9, 0x80, 0x2a]);
    assertEq(cpu.a, 0x01, "ROL A");
    assertEq(cpu.c, 1, "ROL carry");
  }
  {
    // ROR: C=1 のとき 0x01 → 0x80, C=1
    const { cpu } = runProgram([0x38, 0xa9, 0x01, 0x6a]);
    assertEq(cpu.a, 0x80, "ROR A");
    assertEq(cpu.c, 1, "ROR carry");
  }
  {
    // BIT: メモリの bit7/bit6 が N/V に入る
    const { cpu } = runProgram([0xa9, 0xc0, 0x85, 0x50, 0xa9, 0x00, 0x24, 0x50]);
    assertEq(cpu.n, 1, "BIT N from memory");
    assertEq(cpu.v, 1, "BIT V from memory");
    assertEq(cpu.z, 1, "BIT Z (A & M == 0)");
  }
}

export function testBranchJump(): void {
  suite("branch/jump");
  {
    // ループ: X=0 から 5 まで INX; CPX #5; BNE
    const { cpu } = runProgram([
      0xa2, 0x00,       // LDX #0
      0xe8,             // INX      (loop)
      0xe0, 0x05,       // CPX #5
      0xd0, 0xfb,       // BNE loop (-5)
    ]);
    assertEq(cpu.x, 5, "loop with BNE");
  }
  {
    // JSR / RTS
    const { cpu } = runProgram([
      0x20, 0x07, 0x80, // JSR $8007
      0xa2, 0xbb,       // LDX #$BB (サブルーチンから戻った後)
      0x00, 0x00,       // padding
      0xa9, 0xaa,       // $8007: LDA #$AA
      0x60,             // RTS
    ]);
    assertEq(cpu.a, 0xaa, "JSR executes subroutine");
    assertEq(cpu.x, 0xbb, "RTS returns");
    assertEq(cpu.sp, 0xfd, "stack balanced");
  }
  {
    // JMP indirect + 6502 ページ境界バグ:
    // ポインタが $02FF のとき、上位バイトは $0200 から読まれる
    const bus = new FlatBus();
    bus.mem.set([0x6c, 0xff, 0x02], 0x8000); // JMP ($02FF)
    bus.mem[0x02ff] = 0x34; // lo
    bus.mem[0x0300] = 0x12; // 正しければ hi=0x12 だが...
    bus.mem[0x0200] = 0x56; // バグにより hi はここから読まれる
    bus.mem[0xfffc] = 0x00;
    bus.mem[0xfffd] = 0x80;
    const cpu = new Cpu(bus);
    cpu.reset();
    cpu.step();
    assertEq(cpu.pc, 0x5634, "JMP indirect page-boundary bug");
  }
}

export function testStackInterrupt(): void {
  suite("stack/interrupt");
  {
    // PHA/PLA
    const { cpu } = runProgram([0xa9, 0x5a, 0x48, 0xa9, 0x00, 0x68]);
    assertEq(cpu.a, 0x5a, "PHA/PLA roundtrip");
  }
  {
    // PHP/PLP: キャリーを立てて保存 → クリア → 復元
    const { cpu } = runProgram([0x38, 0x08, 0x18, 0x28]);
    assertEq(cpu.c, 1, "PHP/PLP restores carry");
  }
  {
    // NMI: ハンドラで $0200 に書き込み RTI で戻る
    const bus = new FlatBus();
    bus.mem.set([0xa9, 0x11, 0xa9, 0x22, 0xa9, 0x33], 0x8000); // メインループ
    bus.mem.set([0xa9, 0xee, 0x8d, 0x00, 0x02, 0x40], 0x9000); // NMI: LDA #$EE; STA $0200; RTI
    bus.mem[0xfffa] = 0x00; bus.mem[0xfffb] = 0x90; // NMI ベクタ
    bus.mem[0xfffc] = 0x00; bus.mem[0xfffd] = 0x80;
    const cpu = new Cpu(bus);
    cpu.reset();
    cpu.step(); // LDA #$11
    cpu.requestNmi();
    cpu.step(); // → NMI ハンドラへ
    cpu.step(); // LDA #$EE
    cpu.step(); // STA $0200
    cpu.step(); // RTI
    assertEq(bus.mem[0x0200], 0xee, "NMI handler ran");
    cpu.step(); // LDA #$22 (復帰後)
    assertEq(cpu.a, 0x22, "RTI resumes main flow");
  }
}

export function testCycles(): void {
  suite("cycles");
  {
    // LDA #imm = 2 サイクル
    const bus = new FlatBus();
    bus.mem.set([0xa9, 0x01], 0x8000);
    bus.mem[0xfffc] = 0x00; bus.mem[0xfffd] = 0x80;
    const cpu = new Cpu(bus);
    cpu.reset();
    assertEq(cpu.step(), 2, "LDA imm = 2 cycles");
  }
  {
    // LDA abs,X ページ跨ぎで 5 サイクル
    const bus = new FlatBus();
    bus.mem.set([0xa2, 0x01, 0xbd, 0xff, 0x02], 0x8000); // LDX #1; LDA $02FF,X
    bus.mem[0xfffc] = 0x00; bus.mem[0xfffd] = 0x80;
    const cpu = new Cpu(bus);
    cpu.reset();
    cpu.step();
    assertEq(cpu.step(), 5, "LDA abs,X page cross = 5 cycles");
  }
  {
    // 分岐成立 (同ページ) = 3 サイクル
    const bus = new FlatBus();
    bus.mem.set([0x18, 0x90, 0x02], 0x8000); // CLC; BCC +2
    bus.mem[0xfffc] = 0x00; bus.mem[0xfffd] = 0x80;
    const cpu = new Cpu(bus);
    cpu.reset();
    cpu.step();
    assertEq(cpu.step(), 3, "taken branch = 3 cycles");
  }
}
