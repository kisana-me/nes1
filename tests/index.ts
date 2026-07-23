// テストのエントリポイント。scripts/run-tests.mjs からバンドルされて実行される。

import { report } from "./harness";
import * as cpu from "./cpu.test";

for (const [name, fn] of Object.entries(cpu)) {
  if (typeof fn === "function" && name.startsWith("test")) fn();
}

report();
