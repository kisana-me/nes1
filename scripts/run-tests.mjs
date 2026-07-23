// tests/index.ts を esbuild でバンドルして Node で実行する簡易テストランナー
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "nes1-tests-"));
const outfile = join(dir, "tests.mjs");

await build({
  entryPoints: ["tests/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
});

const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
rmSync(dir, { recursive: true, force: true });
process.exit(result.status ?? 1);
