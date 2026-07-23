// APU のテスト — レジスタ操作で音が出ること、長さカウンタの自動消音、
// ゲームの効果音が実際に鳴ることを検証する

import { suite, assertEq, assertTrue } from "./harness";
import { Apu } from "../src/apu";
import { buildGameRom } from "../game/build-game";
import { Nes } from "../src/nes";
import { Button } from "../src/controller";

export function testPulseProducesSound(): void {
  suite("apu: pulse output");
  const apu = new Apu();
  const samples: number[] = [];
  apu.onSample = (v) => samples.push(v);
  // パルス1: 50% duty, 定音量 15, タイマー 253 (440Hz), 長さ最大
  apu.writeRegister(0x4015, 0x01);
  apu.writeRegister(0x4000, 0xbf); // 11 0 1 1111
  apu.writeRegister(0x4002, 0xfd);
  apu.writeRegister(0x4003, 0x08); // 長さ 254
  apu.tick(44100); // 約 25ms 分
  assertTrue(samples.length > 1000, `samples generated (${samples.length})`);
  const loud = samples.filter((v) => v > 0.05).length;
  assertTrue(loud > 100, `pulse is audible (${loud} loud samples)`);
  // 50% duty なので出力と無音がほぼ半々
  const silent = samples.filter((v) => v < 0.01).length;
  assertTrue(silent > 100, `pulse oscillates (${silent} silent samples)`);
}

export function testLengthCounterSilences(): void {
  suite("apu: length counter");
  const apu = new Apu();
  apu.writeRegister(0x4015, 0x01);
  apu.writeRegister(0x4000, 0x3f); // 定音量 (halt=1? → bit5=1 だと停止…) → 0x1F: halt=0, constant, vol15
  apu.writeRegister(0x4000, 0x1f);
  apu.writeRegister(0x4002, 0xfd);
  apu.writeRegister(0x4003, 0x18); // 長さインデックス 3 → 2 ティック
  assertEq(apu.readStatus() & 1, 1, "channel active after key-on");
  // 半フレーム 2 回分 (約 30000 CPU サイクル) で長さカウンタが尽きる
  apu.tick(30000);
  assertEq(apu.readStatus() & 1, 0, "length counter silenced channel");
}

export function testDisableClearsChannel(): void {
  suite("apu: $4015 disable");
  const apu = new Apu();
  apu.writeRegister(0x4015, 0x01);
  apu.writeRegister(0x4000, 0x1f);
  apu.writeRegister(0x4002, 0x80);
  apu.writeRegister(0x4003, 0x08);
  assertEq(apu.readStatus() & 1, 1, "active");
  apu.writeRegister(0x4015, 0x00); // 無効化 → 長さカウンタ即 0
  assertEq(apu.readStatus() & 1, 0, "disabled channel reports inactive");
}

export function testGameJumpSfx(): void {
  suite("apu: game jump sound");
  const nes = new Nes(buildGameRom());
  const samples: number[] = [];
  nes.apu.onSample = (v) => samples.push(v);
  for (let i = 0; i < 10; i++) nes.runFrame();
  nes.controller.buttons1 = Button.Start;
  nes.runFrame(); nes.runFrame();
  nes.controller.buttons1 = 0;
  for (let i = 0; i < 60; i++) nes.runFrame(); // 着地
  // ここまでは無音のはず
  const before = samples.filter((v) => v > 0.02).length;
  assertEq(before, 0, `silent before jump (${before} loud samples)`);
  samples.length = 0;
  // ジャンプ → 効果音が鳴る
  nes.controller.buttons1 = Button.A;
  for (let i = 0; i < 10; i++) nes.runFrame();
  nes.controller.buttons1 = 0;
  const during = samples.filter((v) => v > 0.02).length;
  assertTrue(during > 500, `jump SFX audible (${during} loud samples)`);
}
