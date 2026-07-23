// マッパー (バンク切り替え) のテスト
//
// 各バンクの先頭にバンク番号を書き込んだ ROM を作り、
// バンク切り替えレジスタを操作して正しい窓に正しいバンクが
// 見えることを検証する。

import { suite, assertEq, assertTrue } from "./harness";
import { Cartridge, Mirroring } from "../src/cartridge";

/** 指定マッパー・バンク数の iNES データを作る (PRG 各16KBバンクの全バイト=バンク番号) */
function makeCart(mapper: number, prgBanks: number, chrBanks: number): Cartridge {
  const header = new Uint8Array(16);
  header.set([0x4e, 0x45, 0x53, 0x1a]);
  header[4] = prgBanks;
  header[5] = chrBanks;
  header[6] = (mapper & 0x0f) << 4;
  header[7] = mapper & 0xf0;
  const prg = new Uint8Array(prgBanks * 0x4000);
  for (let b = 0; b < prgBanks; b++) prg.fill(b, b * 0x4000, (b + 1) * 0x4000);
  const chr = new Uint8Array(chrBanks * 0x2000);
  for (let b = 0; b < chrBanks * 8; b++) chr.fill(b, b * 0x400, (b + 1) * 0x400); // 1KB 単位で番号
  const rom = new Uint8Array(16 + prg.length + chr.length);
  rom.set(header);
  rom.set(prg, 16);
  rom.set(chr, 16 + prg.length);
  return new Cartridge(rom);
}

export function testUxrom(): void {
  suite("mapper: UxROM");
  const mapper = makeCart(2, 4, 0).createMapper();
  // 初期状態: $C000 は最終バンク固定
  assertEq(mapper.cpuRead(0xc000), 3, "$C000 fixed to last bank");
  assertEq(mapper.cpuRead(0x8000), 0, "$8000 starts at bank 0");
  // バンク 2 に切り替え
  mapper.cpuWrite(0x8000, 2);
  assertEq(mapper.cpuRead(0x8000), 2, "$8000 switched to bank 2");
  assertEq(mapper.cpuRead(0xc000), 3, "$C000 still fixed");
}

export function testCnrom(): void {
  suite("mapper: CNROM");
  const mapper = makeCart(3, 2, 4).createMapper();
  assertEq(mapper.ppuRead(0x0000), 0, "CHR bank 0 initially");
  mapper.cpuWrite(0x8000, 2); // CHR バンク 2 (8KB 単位)
  assertEq(mapper.ppuRead(0x0000), 16, "CHR bank 2 selected (1KB unit id 16)");
  assertEq(mapper.cpuRead(0x8000), 0, "PRG unaffected");
}

export function testMmc1(): void {
  suite("mapper: MMC1");
  const mapper = makeCart(1, 4, 2).createMapper();
  // 起動時: PRG モード 3 → $C000 は最終バンク固定
  assertEq(mapper.cpuRead(0xc000), 3, "$C000 fixed to last bank at boot");
  // シリアル書き込みで PRG バンク 2 を選択 ($E000 レジスタに 5 ビット LSB first)
  const writeSerial = (addr: number, value: number) => {
    for (let i = 0; i < 5; i++) {
      mapper.cpuWrite(addr, (value >> i) & 1);
    }
  };
  writeSerial(0xe000, 2);
  assertEq(mapper.cpuRead(0x8000), 2, "$8000 switched to bank 2");
  assertEq(mapper.cpuRead(0xc000), 3, "$C000 remains last bank");
  // コントロールレジスタでミラーリング変更 (値 2 = 垂直)
  writeSerial(0x8000, 0x02 | 0x0c);
  assertEq(mapper.mirroring(), Mirroring.Vertical, "mirroring switched to vertical");
  // CHR 4KB モード + CHR バンク 1 (2 x 8KB = 4 x 4KB バンク)
  writeSerial(0x8000, 0x10 | 0x0c);
  writeSerial(0xa000, 1);
  assertEq(mapper.ppuRead(0x0000), 4, "CHR bank0 window shows 4KB bank 1 (1KB id 4)");
  // リセットビット (bit7) でシフトレジスタが戻る
  mapper.cpuWrite(0x8000, 0x80);
  writeSerial(0xe000, 1);
  assertEq(mapper.cpuRead(0x8000), 1, "serial reset then select bank 1");
}

/** MMC3 用: PRG を 8KB 単位でバンク番号埋めしたカートリッジ */
function makeMmc3Cart(prgBanks16k: number, chrBanks: number): Cartridge {
  const header = new Uint8Array(16);
  header.set([0x4e, 0x45, 0x53, 0x1a]);
  header[4] = prgBanks16k;
  header[5] = chrBanks;
  header[6] = 4 << 4;
  const prg = new Uint8Array(prgBanks16k * 0x4000);
  for (let b = 0; b < prgBanks16k * 2; b++) prg.fill(b, b * 0x2000, (b + 1) * 0x2000);
  const chr = new Uint8Array(chrBanks * 0x2000);
  for (let b = 0; b < chrBanks * 8; b++) chr.fill(b, b * 0x400, (b + 1) * 0x400);
  const rom = new Uint8Array(16 + prg.length + chr.length);
  rom.set(header);
  rom.set(prg, 16);
  rom.set(chr, 16 + prg.length);
  return new Cartridge(rom);
}

export function testMmc3Banks(): void {
  suite("mapper: MMC3 banks");
  const mapper = makeMmc3Cart(8, 2).createMapper(); // PRG 128KB = 16 x 8KB
  // $E000 は常に最終 8KB バンク (=15)
  assertEq(mapper.cpuRead(0xe000), 15, "$E000 fixed to last 8KB bank");
  // R6 に 4 を設定 → $8000 窓 (モード 0)
  mapper.cpuWrite(0x8000, 6); // バンクセレクト = R6
  mapper.cpuWrite(0x8001, 4); // データ
  assertEq(mapper.cpuRead(0x8000), 4, "$8000 window shows R6 bank");
  // R7 に 5 → $A000 窓
  mapper.cpuWrite(0x8000, 7);
  mapper.cpuWrite(0x8001, 5);
  assertEq(mapper.cpuRead(0xa000), 5, "$A000 window shows R7 bank");
  // $C000 はモード 0 で「最後から 2 番目」固定
  assertEq(mapper.cpuRead(0xc000), 14, "$C000 second-to-last in mode 0");
  // PRG モード反転 (bit6): $8000 が固定に、$C000 が R6 に
  mapper.cpuWrite(0x8000, 0x46);
  assertEq(mapper.cpuRead(0xc000), 4, "$C000 shows R6 in mode 1");
  assertEq(mapper.cpuRead(0x8000), 14, "$8000 second-to-last in mode 1");
  // CHR: R2 (1KB 窓 $1000-$13FF)
  mapper.cpuWrite(0x8000, 2);
  mapper.cpuWrite(0x8001, 9);
  assertEq(mapper.ppuRead(0x1000), 9, "CHR R2 bank");
  // ミラーリング制御
  mapper.cpuWrite(0xa000, 1);
  assertEq(mapper.mirroring(), Mirroring.Horizontal, "MMC3 horizontal mirroring");
}

export function testMmc3Irq(): void {
  suite("mapper: MMC3 IRQ");
  const mapper = makeCart(4, 2, 1).createMapper();
  mapper.cpuWrite(0xc000, 3);  // ラッチ = 3
  mapper.cpuWrite(0xc001, 0);  // リロード要求
  mapper.cpuWrite(0xe001, 0);  // IRQ 有効
  // カウンタ: リロード(3) → 2 → 1 → 0 で発火
  mapper.onScanline();
  assertEq(mapper.irqPending(), false, "no IRQ after reload");
  mapper.onScanline();
  mapper.onScanline();
  assertEq(mapper.irqPending(), false, "no IRQ at counter=1");
  mapper.onScanline();
  assertEq(mapper.irqPending(), true, "IRQ fired when counter hits 0");
  // $E000 で確認 (acknowledge) + 無効化
  mapper.cpuWrite(0xe000, 0);
  assertEq(mapper.irqPending(), false, "IRQ acknowledged");
}

export function testUnsupportedMapper(): void {
  suite("mapper: unsupported");
  let threw = false;
  try {
    makeCart(66, 2, 1).createMapper();
  } catch {
    threw = true;
  }
  assertTrue(threw, "unsupported mapper throws a clear error");
}
