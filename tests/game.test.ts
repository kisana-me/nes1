// MOSS HOP (同梱オリジナルゲーム) のヘッドレス動作検証
//
// エミュレータ上で ROM を実際に起動し、
//   タイトル表示 → START でゲーム開始 → 移動 → ジャンプ → 着地
// までを自動プレイして検証する。エミュレータとゲーム両方の統合テスト。

import { suite, assertEq, assertTrue } from "./harness";
import { buildGameRom } from "../game/build-game";
import { Nes } from "../src/nes";
import { Button } from "../src/controller";

function pressFor(nes: Nes, buttons: number, frames: number): void {
  nes.controller.buttons1 = buttons;
  for (let i = 0; i < frames; i++) nes.runFrame();
}

/** OAM 上のプレイヤー座標 (スプライト 0 の X, Y) */
function playerPos(nes: Nes): { x: number; y: number } {
  return { x: nes.ppu.oam[3], y: nes.ppu.oam[0] + 1 };
}

export function testGameBoots(): void {
  suite("game: boot & title");
  const nes = new Nes(buildGameRom());
  assertEq(nes.cart.mapperId, 0, "MOSS HOP is NROM");
  // 起動して数フレーム → タイトル画面が描かれている
  for (let i = 0; i < 10; i++) nes.runFrame();
  // ネームテーブルに "MOSS HOP" のタイルが書かれているはず (M = $2C)
  const vram = nes.ppu.vram;
  let fontTiles = 0;
  for (let i = 0; i < 0x400; i++) {
    if (vram[i] >= 0x20 && vram[i] <= 0x3a) fontTiles++;
  }
  assertTrue(fontTiles >= 15, `title text tiles in nametable (found ${fontTiles})`);
  // 描画が有効になっている
  assertEq(nes.ppu.maskReg & 0x18, 0x18, "rendering enabled on title");
  // フレームバッファに複数の色がある (真っ黒ではない)
  const colors = new Set(nes.frameBuffer);
  assertTrue(colors.size >= 2, `title screen has ${colors.size} colors`);
}

export function testGameStartsAndLands(): void {
  suite("game: start & gravity");
  const nes = new Nes(buildGameRom());
  for (let i = 0; i < 10; i++) nes.runFrame();
  // START でゲーム開始
  pressFor(nes, Button.Start, 2);
  pressFor(nes, 0, 2);
  // ゲーム状態 = プレイ中 (ゼロページ $03)
  assertEq(nes.bus.ram[0x03], 1, "gameState = play after START");
  // プレイヤーが出現している (Y < 240)
  const spawn = playerPos(nes);
  assertTrue(spawn.y < 240, `player visible (y=${spawn.y})`);
  // 60 フレーム待つと重力で落下して地面に着地する
  pressFor(nes, 0, 60);
  const landed = playerPos(nes);
  assertTrue(landed.y > spawn.y, `player fell (${spawn.y} -> ${landed.y})`);
  assertEq(nes.bus.ram[0x0a], 1, "player is on ground");
}

export function testGameMovesRight(): void {
  suite("game: walk");
  const nes = new Nes(buildGameRom());
  for (let i = 0; i < 10; i++) nes.runFrame();
  pressFor(nes, Button.Start, 2);
  pressFor(nes, 0, 60); // 着地待ち
  const before = playerPos(nes);
  pressFor(nes, Button.Right, 30);
  const after = playerPos(nes);
  assertTrue(after.x > before.x + 20, `walked right (${before.x} -> ${after.x})`);
  // 左へも戻れる
  pressFor(nes, Button.Left, 15);
  const back = playerPos(nes);
  assertTrue(back.x < after.x, `walked left (${after.x} -> ${back.x})`);
}

export function testGameJumps(): void {
  suite("game: jump");
  const nes = new Nes(buildGameRom());
  for (let i = 0; i < 10; i++) nes.runFrame();
  pressFor(nes, Button.Start, 2);
  pressFor(nes, 0, 60); // 着地待ち
  const ground = playerPos(nes);
  // ジャンプ! 上昇を確認
  nes.controller.buttons1 = Button.A;
  for (let i = 0; i < 12; i++) nes.runFrame();
  const peak = playerPos(nes);
  assertTrue(peak.y < ground.y - 16, `jumped up (${ground.y} -> ${peak.y})`);
  // 着地して元の高さに戻る
  nes.controller.buttons1 = 0;
  for (let i = 0; i < 60; i++) nes.runFrame();
  const landed = playerPos(nes);
  assertEq(landed.y, ground.y, "landed back at ground level");
  assertEq(nes.bus.ram[0x0a], 1, "on ground after jump");
}

export function testGameCollectsSpore(): void {
  suite("game: collect spore");
  const nes = new Nes(buildGameRom());
  for (let i = 0; i < 10; i++) nes.runFrame();
  pressFor(nes, Button.Start, 2);
  pressFor(nes, 0, 60);
  assertEq(nes.bus.ram[0x0c], 3, "3 spores at level start");
  // レベル 1 の胞子 1 (x=84) へ向かって歩き、足場に乗ってジャンプで取る
  // 自動プレイ: 右へ歩きながら定期的にジャンプ
  for (let attempt = 0; attempt < 12; attempt++) {
    pressFor(nes, Button.Right, 12);
    pressFor(nes, Button.Right | Button.A, 6);
    pressFor(nes, Button.Right, 18);
    if (nes.bus.ram[0x0c] < 3) break;
  }
  assertTrue(nes.bus.ram[0x0c] < 3, `collected a spore (remaining=${nes.bus.ram[0x0c]})`);
}
