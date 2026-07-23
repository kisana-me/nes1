// nes1 エントリポイント
// 第1章時点ではプレースホルダー画面を描くだけ。
// 以降の章で CPU / PPU / APU / コントローラーを組み込んでいく。

const canvas = document.getElementById("screen") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const statusEl = document.getElementById("status")!;

function drawPlaceholder(): void {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 240);
  // NES 実機の起動直後をイメージしたグレーのノイズ風パターン
  const img = ctx.createImageData(256, 240);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() < 0.5 ? 16 : 32;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v + 8;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = "#e8eaf6";
  ctx.font = "10px monospace";
  ctx.fillText("nes1 - chapter 01", 8, 120);
  ctx.fillText("CPU/PPU/APU not implemented yet", 8, 134);
}

drawPlaceholder();
statusEl.textContent = "第1章: プロジェクト基盤のみ。第2章以降で命が吹き込まれます。";
