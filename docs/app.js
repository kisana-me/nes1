// src/main.ts
var canvas = document.getElementById("screen");
var ctx = canvas.getContext("2d");
var statusEl = document.getElementById("status");
function drawPlaceholder() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 256, 240);
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
statusEl.textContent = "\u7B2C1\u7AE0: \u30D7\u30ED\u30B8\u30A7\u30AF\u30C8\u57FA\u76E4\u306E\u307F\u3002\u7B2C2\u7AE0\u4EE5\u964D\u3067\u547D\u304C\u5439\u304D\u8FBC\u307E\u308C\u307E\u3059\u3002";
