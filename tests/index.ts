// テストのエントリポイント。scripts/run-tests.mjs からバンドルされて実行される。

import { report } from "./harness";
import * as cpu from "./cpu.test";
import * as ppu from "./ppu.test";
import * as game from "./game.test";
import * as apu from "./apu.test";
import * as mapper from "./mapper.test";

for (const mod of [cpu, ppu, game, apu, mapper] as Record<string, unknown>[]) {
  for (const [name, fn] of Object.entries(mod)) {
    if (typeof fn === "function" && name.startsWith("test")) (fn as () => void)();
  }
}

report();
