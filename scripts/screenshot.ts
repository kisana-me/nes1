// ヘッドレスでゲームを実行し、スクリーンショット PNG を保存する (デバッグ用)
// 使い方: node scripts/screenshot.mjs (esbuild でバンドルして実行)

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { buildGameRom } from "../game/build-game";
import { Nes } from "../src/nes";
import { Button } from "../src/controller";

/** 256x240 の ABGR フレームバッファ → PNG */
function encodePng(fb: Uint32Array): Buffer {
  const width = 256;
  const height = 240;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // フィルタなし
    for (let x = 0; x < width; x++) {
      const px = fb[y * width + x];
      raw[o++] = px & 0xff;         // R
      raw[o++] = (px >> 8) & 0xff;  // G
      raw[o++] = (px >> 16) & 0xff; // B
      raw[o++] = 0xff;              // A
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crcTable: number[] = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const b of body) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = process.argv[2] ?? ".";
const nes = new Nes(buildGameRom());
for (let i = 0; i < 10; i++) nes.runFrame();
writeFileSync(`${outDir}/shot-title.png`, encodePng(nes.frameBuffer));

// START → プレイ画面
nes.controller.buttons1 = Button.Start;
nes.runFrame(); nes.runFrame();
nes.controller.buttons1 = 0;
for (let i = 0; i < 60; i++) nes.runFrame();
writeFileSync(`${outDir}/shot-play.png`, encodePng(nes.frameBuffer));

// 少し歩いてジャンプ中
nes.controller.buttons1 = Button.Right;
for (let i = 0; i < 20; i++) nes.runFrame();
nes.controller.buttons1 = Button.Right | Button.A;
for (let i = 0; i < 10; i++) nes.runFrame();
writeFileSync(`${outDir}/shot-jump.png`, encodePng(nes.frameBuffer));
console.log("screenshots saved");
