// MOSS HOP の ROM をファイルに書き出す (node で実行)

import { writeFileSync, mkdirSync } from "node:fs";
import { buildGameRom } from "./build-game";

const rom = buildGameRom();
mkdirSync("game/out", { recursive: true });
writeFileSync("game/out/mosshop.nes", rom);
writeFileSync("docs/mosshop.nes", rom);
console.log(`MOSS HOP built: ${rom.length} bytes → game/out/mosshop.nes, docs/mosshop.nes`);
