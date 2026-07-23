// MOSS HOP — CHR-ROM (グラフィックデータ) の生成
//
// 全て本プロジェクトのために描き下ろした完全オリジナルのドット絵。
// 文字列でドット絵を書き、NES の 2 ビットプレーン形式に変換する。
//   '.' = 色0 (透明/背景色)  '1' '2' '3' = パレット色 1-3

/** 8x8 タイル (8 行の文字列) → 16 バイトの 2 ビットプレーン */
export function encodeTile(rows: string[]): Uint8Array {
  if (rows.length !== 8) throw new Error("タイルは 8 行必要");
  const out = new Uint8Array(16);
  for (let y = 0; y < 8; y++) {
    const row = rows[y].padEnd(8, ".");
    let lo = 0;
    let hi = 0;
    for (let x = 0; x < 8; x++) {
      const c = row[x] === "." ? 0 : parseInt(row[x], 10);
      lo |= (c & 1) << (7 - x);
      hi |= ((c >> 1) & 1) << (7 - x);
    }
    out[y] = lo;
    out[y + 8] = hi;
  }
  return out;
}

/** 16x16 のドット絵 (16 行 x 16 文字) → 4 タイル [TL, TR, BL, BR] */
export function encodeMetatile(rows: string[]): Uint8Array[] {
  if (rows.length !== 16) throw new Error("メタタイルは 16 行必要");
  const quad = (ox: number, oy: number) =>
    encodeTile(rows.slice(oy, oy + 8).map((r) => r.padEnd(16, ".").slice(ox, ox + 8)));
  return [quad(0, 0), quad(8, 0), quad(0, 8), quad(8, 8)];
}

// ---- タイル番号の割り当て ----
export const TILE_GROUND = 0x01;   // $01-$04: 地面ブロック
export const TILE_PLATFORM = 0x05; // $05-$08: 浮遊足場
export const TILE_SPORE = 0x09;    // $09: 胞子 (アイテム)
export const TILE_PLAYER = 0x0a;   // $0A-$0D: 主人公モス (16x16)
export const TILE_FONT = 0x20;     // $20-$39: A-Z / $3A: !

// 主人公「モス」— 森をはねる苔玉の妖精 (完全オリジナルキャラクター)
const playerArt = [
  "....22222222....",
  "..222111111222..",
  ".21111111111112.",
  ".21112111121112.",
  "2111211111121112",
  "2111333113331112",
  "2113232113231132",
  "2113333113331132",
  "2111111111111112",
  "2111111111111112",
  "2111112222111112",
  ".21111122111112.",
  ".21111111111112.",
  "..221111111122..",
  "..2.22222222.2..",
  ".22..........22.",
];

// 地面ブロック — 草の生えた土
const groundArt = [
  "1111111111111111",
  "1131113111311131",
  "1111111111111111",
  "2222222222222222",
  "2222222322222232",
  "2223222222232222",
  "2222222222222222",
  "2232222322222322",
  "2222222222222222",
  "2222232222232222",
  "2322222222222223",
  "2222222222322222",
  "2222322222222222",
  "2222222223222222",
  "2232222222222232",
  "2222222222222222",
];

// 浮遊足場 — 苔むした石のブロック
const platformArt = [
  "2222222222222222",
  "2111111111111112",
  "2131111311113112",
  "2111111111111112",
  "2222222222222222",
  "2233333333333322",
  "2333333333333332",
  "2333233333323332",
  "2333333333333332",
  "2332333333333232",
  "2333333323333332",
  "2333333333333332",
  "2233333333333322",
  "2222222222222222",
  ".22222222222222.",
  "................",
];

// 胞子 (集めるアイテム)
const sporeArt = [
  "...11...",
  "..1331..",
  ".133331.",
  "13333331",
  "13333331",
  ".133331.",
  "..1331..",
  "...11...",
];

// 5x7 フォント (A-Z のうちゲームで使う文字のみ定義、残りは空白)
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  E: ["11111", "10000", "11110", "10000", "10000", "10000", "11111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
};

function fontTile(ch: string): string[] {
  const glyph = FONT[ch];
  if (!glyph) return Array(8).fill("........");
  const rows: string[] = [];
  for (let y = 0; y < 7; y++) {
    rows.push(
      glyph[y]
        .split("")
        .map((b) => (b === "1" ? "1" : "."))
        .join("") + "...",
    );
  }
  rows.push("........");
  return rows;
}

/** CHR-ROM 8KB を組み立てる */
export function buildChr(): Uint8Array {
  const chr = new Uint8Array(0x2000);
  const put = (index: number, tile: Uint8Array) => {
    chr.set(tile, index * 16);
  };

  const ground = encodeMetatile(groundArt);
  const platform = encodeMetatile(platformArt);
  const player = encodeMetatile(playerArt);
  for (let i = 0; i < 4; i++) {
    put(TILE_GROUND + i, ground[i]);
    put(TILE_PLATFORM + i, platform[i]);
    put(TILE_PLAYER + i, player[i]);
  }
  put(TILE_SPORE, encodeTile(sporeArt));

  // フォント: A-Z を $20 から、! を $3A に
  for (let i = 0; i < 26; i++) {
    put(TILE_FONT + i, encodeTile(fontTile(String.fromCharCode(65 + i))));
  }
  put(TILE_FONT + 26, encodeTile(fontTile("!")));

  return chr;
}

/** 文字列 → ネームテーブル用タイル列 (スペース=0, 終端 $FF は含まない) */
export function encodeText(text: string): number[] {
  return text.split("").map((c) => {
    if (c === " ") return 0;
    if (c === "!") return TILE_FONT + 26;
    const code = c.toUpperCase().charCodeAt(0) - 65;
    if (code < 0 || code >= 26) throw new Error(`フォント未定義: ${c}`);
    return TILE_FONT + code;
  });
}
