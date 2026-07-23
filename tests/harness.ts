// 超小型テストフレームワーク + CPU テスト用のフラットメモリバス

import { Cpu, CpuBus } from "../src/cpu";

let passed = 0;
let failed = 0;
const failures: string[] = [];
let currentSuite = "";

export function suite(name: string): void {
  currentSuite = name;
}

export function assertEq(actual: unknown, expected: unknown, label: string): void {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    failures.push(`[${currentSuite}] ${label}: expected ${expected}, got ${actual}`);
  }
}

export function assertTrue(cond: boolean, label: string): void {
  assertEq(cond, true, label);
}

export function report(): void {
  for (const f of failures) console.error("  FAIL " + f);
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

/** 全アドレスが RAM の単純なバス。CPU 単体テスト用 */
export class FlatBus implements CpuBus {
  mem = new Uint8Array(0x10000);
  read(addr: number): number {
    return this.mem[addr & 0xffff];
  }
  write(addr: number, value: number): void {
    this.mem[addr & 0xffff] = value & 0xff;
  }
}

/**
 * 機械語プログラムを $8000 に置いて実行するヘルパ。
 * BRK (0x00) に到達するか maxSteps を超えたら停止する。
 */
export function runProgram(code: number[], maxSteps = 1000): { cpu: Cpu; bus: FlatBus } {
  const bus = new FlatBus();
  bus.mem.set(code, 0x8000);
  // リセットベクタ → $8000
  bus.mem[0xfffc] = 0x00;
  bus.mem[0xfffd] = 0x80;
  // IRQ/BRK ベクタ → $FF00 (BRK 到達検出用のダミー)
  bus.mem[0xfffe] = 0x00;
  bus.mem[0xffff] = 0xff;
  const cpu = new Cpu(bus);
  cpu.reset();
  for (let i = 0; i < maxSteps; i++) {
    if (bus.mem[cpu.pc] === 0x00 && cpu.pc < 0xff00) break; // 次が BRK なら終了
    cpu.step();
  }
  return { cpu, bus };
}
