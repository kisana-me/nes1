// game/cli.ts をバンドルして実行し、MOSS HOP の ROM を生成する
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "nes1-game-"));
const outfile = join(dir, "build-game.mjs");

await build({
  entryPoints: ["game/cli.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile,
});

const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
rmSync(dir, { recursive: true, force: true });
process.exit(result.status ?? 1);
