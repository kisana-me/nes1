// テスト用の iNES ROM をメモリ上で組み立てるヘルパ

export interface RomSpec {
  /** $8000 に配置されるプログラム */
  prg: number[] | Uint8Array;
  /** CHR-ROM 8KB (省略時は空) */
  chr?: Uint8Array;
  mapper?: number;
  /** flags6 のミラーリングビット (0=水平, 1=垂直) */
  vertical?: boolean;
  /** PRG バンク数 (16KB 単位、省略時 2 = 32KB) */
  prgBanks?: number;
}

export function buildRom(spec: RomSpec): Uint8Array {
  const prgBanks = spec.prgBanks ?? 2;
  const prgSize = prgBanks * 0x4000;
  const prg = new Uint8Array(prgSize);
  prg.set(spec.prg);
  // リセットベクタ → $8000
  prg[prgSize - 4] = 0x00; // $FFFC lo
  prg[prgSize - 3] = 0x80; // $FFFC hi
  // NMI ベクタ → $8000 (デフォルト。プログラム側で上書き可)
  if (prg[prgSize - 6] === 0 && prg[prgSize - 5] === 0) {
    prg[prgSize - 6] = 0x00;
    prg[prgSize - 5] = 0x80;
  }

  const chr = new Uint8Array(0x2000);
  if (spec.chr) chr.set(spec.chr);

  const header = new Uint8Array(16);
  header.set([0x4e, 0x45, 0x53, 0x1a]); // "NES\x1A"
  header[4] = prgBanks;
  header[5] = 1; // CHR 8KB x1
  header[6] = ((spec.mapper ?? 0) << 4) | (spec.vertical ? 1 : 0);
  header[7] = (spec.mapper ?? 0) & 0xf0;

  const rom = new Uint8Array(16 + prgSize + chr.length);
  rom.set(header, 0);
  rom.set(prg, 16);
  rom.set(chr, 16 + prgSize);
  return rom;
}

/** NMI ベクタを指定して PRG 末尾に書き込む */
export function setVectors(prg: Uint8Array, prgSize: number, nmi: number, reset: number): void {
  prg[prgSize - 6] = nmi & 0xff;
  prg[prgSize - 5] = nmi >> 8;
  prg[prgSize - 4] = reset & 0xff;
  prg[prgSize - 3] = reset >> 8;
}
