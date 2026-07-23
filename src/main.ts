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

// ---- デバッグ UI ----
import { DebugView } from "./debug";
const debugView = new DebugView({
  pattern: document.getElementById("dbg-pattern") as HTMLCanvasElement,
  nametable: document.getElementById("dbg-nametable") as HTMLCanvasElement,
  palette: document.getElementById("dbg-palette") as HTMLCanvasElement,
  cpuState: document.getElementById("cpu-state")!,
  trace: document.getElementById("cpu-trace")!,
});
let debugVisible = false;

// ---- タイミング ----
// ディスプレイのリフレッシュレート (60/120/144Hz...) に依存しないよう、
// 経過時間を積算して NTSC の 60.0988fps 分だけフレームを実行する
const FRAME_MS = 1000 / 60.0988;
let lastTime = 0;
let accumulator = 0;
let fps = 0;
let fpsCounter = 0;
let fpsTime = 0;

function loop(now: number): void {
  if (!nes || !running) return;
  if (lastTime === 0) lastTime = now;
  accumulator += now - lastTime;
  lastTime = now;
  // 遅延が溜まりすぎたら捨てる (タブ復帰時の暴走防止)
  if (accumulator > FRAME_MS * 4) accumulator = FRAME_MS * 4;
  let ran = false;
  while (accumulator >= FRAME_MS) {
    nes.runFrame();
    accumulator -= FRAME_MS;
    fpsCounter++;
    ran = true;
  }
  if (ran) drawFrame();
  // FPS 計測
  if (now - fpsTime >= 1000) {
    fps = (fpsCounter * 1000) / (now - fpsTime);
    fpsCounter = 0;
    fpsTime = now;
  }
  if (debugVisible) {
    debugView.updateFast(nes, fps);
    if (nes.ppu.frame % 15 === 0) debugView.updateHeavy(nes);
  }
  rafId = requestAnimationFrame(loop);
}

function setRunning(r: boolean): void {
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
    exposeForDebug(nes);
    if (debugView.traceEnabled) nes.beforeStep = () => debugView.onStep(nes!);
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

// ---- 画面上コントローラー (スマホ / タッチ操作用) ----
// data-btn 属性 → NES ボタンのマッピング
const TOUCH_MAP: Record<string, number> = {
  a: Button.A,
  b: Button.B,
  select: Button.Select,
  start: Button.Start,
  up: Button.Up,
  down: Button.Down,
  left: Button.Left,
  right: Button.Right,
};

function pressButton(btn: number): void {
  if (nes) nes.controller.buttons1 |= btn;
}
// 学習・デバッグ用: 読み込んだ NES インスタンスをコンソールから触れるように公開
function exposeForDebug(n: Nes): void {
  (window as unknown as { nes: Nes }).nes = n;
}
function releaseButton(btn: number): void {
  if (nes) nes.controller.buttons1 &= ~btn;
}

// 各ボタンに Pointer イベントを配線。
// setPointerCapture で、指がボタンから外れても pointerup を確実に受け取る。
// touch-action:none (CSS) と preventDefault でスクロール・拡大を抑止し、
// 複数ボタンの同時押し (十字キー + A など) にも対応する。
for (const el of Array.from(document.querySelectorAll<HTMLElement>(".tp-btn"))) {
  const btn = TOUCH_MAP[el.dataset.btn ?? ""];
  if (!btn) continue;
  const down = (e: PointerEvent) => {
    e.preventDefault();
    el.classList.add("pressed");
    el.setPointerCapture?.(e.pointerId);
    pressButton(btn);
  };
  const up = (e: PointerEvent) => {
    e.preventDefault();
    el.classList.remove("pressed");
    releaseButton(btn);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  // マウス操作でボタン外へドラッグしたときの保険
  el.addEventListener("pointerleave", (e) => {
    if (e.buttons === 0) return; // 押していなければ無視
  });
  // 右クリックメニュー等でボタンが押しっぱなしにならないように
  el.addEventListener("contextmenu", (e) => e.preventDefault());
}

/** 同梱のオリジナルゲームを fetch してロードする */
async function loadBundledGame(): Promise<void> {
  try {
    const res = await fetch("mosshop.nes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = new Uint8Array(await res.arrayBuffer());
    nes = new Nes(data);
    attachAudio(nes);
    exposeForDebug(nes);
    if (debugView.traceEnabled) nes.beforeStep = () => debugView.onStep(nes!);
    statusEl.textContent = "同梱ゲーム『MOSS HOP』を読み込みました。Enter でスタート!";
    setRunning(true);
  } catch (e) {
    statusEl.textContent = `同梱ゲームの読み込みに失敗: ${e instanceof Error ? e.message : e}`;
  }
}
document.getElementById("btn-sample")?.addEventListener("click", () => {
  void loadBundledGame();
});

// ---- デバッグ UI の操作 ----
document.getElementById("btn-debug")?.addEventListener("click", () => {
  debugVisible = !debugVisible;
  const panel = document.getElementById("debug-panel")!;
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
  const enabled = (e.target as HTMLInputElement).checked;
  debugView.traceEnabled = enabled;
  if (nes) {
    nes.beforeStep = enabled ? () => debugView.onStep(nes!) : null;
  }
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
