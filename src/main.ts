// nes1 ブラウザ UI エントリポイント
//
// ROM ファイルを読み込み、requestAnimationFrame ごとに 1 フレーム実行して
// PPU のフレームバッファを Canvas へ転送する。

import { Nes } from "./nes";
import { Button } from "./controller";
import { AudioOutput } from "./audio";

const audio = new AudioOutput();

/** NES 起動時に音声を配線する */
function attachAudio(n: Nes): void {
  const rate = audio.start();
  n.apu.setSampleRate(rate);
  n.apu.onSample = (v) => audio.push(v);
}

// キーボード → コントローラーのマッピング
const KEYMAP: Record<string, number> = {
  KeyX: Button.A,
  KeyZ: Button.B,
  ShiftLeft: Button.Select,
  ShiftRight: Button.Select,
  Enter: Button.Start,
  ArrowUp: Button.Up,
  ArrowDown: Button.Down,
  ArrowLeft: Button.Left,
  ArrowRight: Button.Right,
};

const canvas = document.getElementById("screen") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const statusEl = document.getElementById("status")!;
const romInput = document.getElementById("rom-input") as HTMLInputElement;
const btnRun = document.getElementById("btn-run") as HTMLButtonElement;
const btnPause = document.getElementById("btn-pause") as HTMLButtonElement;
const btnReset = document.getElementById("btn-reset") as HTMLButtonElement;

let nes: Nes | null = null;
let running = false;
let rafId = 0;

const imageData = ctx.createImageData(256, 240);
const imagePixels = new Uint32Array(imageData.data.buffer);

function drawFrame(): void {
  if (!nes) return;
  imagePixels.set(nes.frameBuffer);
  ctx.putImageData(imageData, 0, 0);
}

function loop(): void {
  if (!nes || !running) return;
  nes.runFrame();
  drawFrame();
  rafId = requestAnimationFrame(loop);
}

function setRunning(r: boolean): void {
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
    attachAudio(nes);
    statusEl.textContent =
      `${file.name} を読み込みました (PRG ${nes.cart.prgRom.length / 1024}KB, ` +
      `CHR ${nes.cart.chrRom.length / 1024}KB, マッパー ${nes.cart.mapperId})`;
    setRunning(true);
  } catch (e) {
    nes = null;
    setRunning(false);
    statusEl.textContent = `読み込み失敗: ${e instanceof Error ? e.message : e}`;
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

/** 同梱のオリジナルゲームを fetch してロードする */
async function loadBundledGame(): Promise<void> {
  try {
    const res = await fetch("mosshop.nes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = new Uint8Array(await res.arrayBuffer());
    nes = new Nes(data);
    attachAudio(nes);
    statusEl.textContent = "同梱ゲーム『MOSS HOP』を読み込みました。Enter でスタート!";
    setRunning(true);
  } catch (e) {
    statusEl.textContent = `同梱ゲームの読み込みに失敗: ${e instanceof Error ? e.message : e}`;
  }
}
document.getElementById("btn-sample")?.addEventListener("click", () => {
  void loadBundledGame();
});

document.getElementById("btn-mute")?.addEventListener("click", (e) => {
  audio.muted = !audio.muted;
  (e.target as HTMLButtonElement).textContent = audio.muted ? "🔇 音声 OFF" : "🔊 音声 ON";
});

btnRun.addEventListener("click", () => setRunning(true));
btnPause.addEventListener("click", () => setRunning(false));
btnReset.addEventListener("click", () => {
  nes?.reset();
});

// 初期画面
ctx.fillStyle = "#000";
ctx.fillRect(0, 0, 256, 240);
ctx.fillStyle = "#e8eaf6";
ctx.font = "10px monospace";
ctx.fillText("nes1 - load a .nes ROM to start", 8, 120);
