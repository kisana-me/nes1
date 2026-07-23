// MOSS HOP — 完全オリジナルの 2D プラットフォーマー (NES ROM)
//
// 苔玉の妖精「モス」が森の遺跡で胞子を集めるゲーム。
// 既存ゲームのキャラクター・アセットは一切使用していない。
//
//   操作: ←→ 移動 / A (X キー) ジャンプ / START (Enter) 開始
//   ルール: 各レベルの胞子を 3 つ集めると次のレベルへ。全レベルクリアで CLEAR!
//
// tools/asm.ts のミニアセンブラで 6502 コードを組み立て、
// game/chr.ts のグラフィックと合わせて iNES ROM を出力する。

import { Asm } from "../tools/asm";
import {
  buildChr,
  encodeText,
  TILE_GROUND,
  TILE_PLATFORM,
  TILE_SPORE,
  TILE_PLAYER,
} from "./chr";

// ---- ゼロページ変数 ----
const nmiFlag = 0x00;
const pad = 0x01;
const padPrev = 0x02;
const gameState = 0x03; // 0=タイトル 1=プレイ中 2=クリア
const playerX = 0x04;
const playerY = 0x06;
const playerYlo = 0x07; // Y 座標の小数部 (1/256 ピクセル)
const velYLo = 0x08;    // 落下速度 (16bit 固定小数点)
const velYHi = 0x09;
const onGround = 0x0a;
const level = 0x0b;
const sporeCount = 0x0c;
const tmp = 0x0d;
const mapPtrLo = 0x10;  // 現在レベルのマップデータへのポインタ
const mapPtrHi = 0x11;
const tileX = 0x12;
const tileY = 0x13;
const sporeX = 0x14;    // $14-$16: 胞子 X 座標 x3
const sporeY = 0x17;    // $17-$19: 胞子 Y 座標 x3
const sporeAct = 0x1a;  // $1A-$1C: 胞子が残っているか x3
const rowBase = 0x1d;
const textPtrLo = 0x22;
const textPtrHi = 0x23;

// ---- コントローラーのビット (readPad 後の並び) ----
const BTN_A = 0x80;
const BTN_START = 0x10;
const BTN_LEFT = 0x02;
const BTN_RIGHT = 0x01;

// ---- 物理定数 (Y は 8.8 固定小数点) ----
const GRAVITY = 0x40;    // 0.25 px/frame^2
const JUMP_LO = 0x80;    // ジャンプ初速 -4.5 px/frame ($FB80)
const JUMP_HI = 0xfb;
const MAX_FALL = 6;      // 最大落下速度 6 px/frame

const NUM_LEVELS = 2;

// ---- レベルマップ (16x15 メタタイル、0=空 1=地面 2=足場) ----
function parseMap(rows: string[]): number[] {
  if (rows.length !== 15) throw new Error("マップは 15 行必要");
  const out: number[] = [];
  for (const row of rows) {
    if (row.length !== 16) throw new Error("マップは 16 列必要");
    for (const c of row) out.push(c === "." ? 0 : c === "G" ? 1 : 2);
  }
  return out;
}

// レベル 1: 「はじまりの森」
const map1 = parseMap([
  "................",
  "................",
  "................",
  "...PPP..........",
  "................",
  "........PP......",
  "................",
  "............PPP.",
  "................",
  "........PPP.....",
  "................",
  "....PPP.........",
  "................",
  "GGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGG",
]);

// レベル 2: 「くずれた遺跡」(中央に奈落)
const map2 = parseMap([
  "................",
  "................",
  "................",
  "..PP............",
  "................",
  "......PPP.......",
  "................",
  "..PP........PP..",
  "................",
  "................",
  "................",
  "......PPPP......",
  "................",
  "GGGG........GGGG",
  "GGGG........GGGG",
]);

// 胞子の配置 (メタタイル座標 → ピクセル座標に変換)
const sporesByLevel: [number, number][][] = [
  // レベル 1: 足場の上に順番に
  [
    [5, 10],  // 足場 row11 の上
    [9, 8],   // 足場 row9 の上
    [4, 2],   // 最上段 row3 の上
  ],
  // レベル 2
  [
    [7, 10],  // 中央の橋の上
    [13, 6],  // 右の足場の上
    [3, 2],   // 左上の足場の上
  ],
];

/** MOSS HOP の iNES ROM を生成する */
export function buildGameRom(): Uint8Array {
  const a = new Asm(0xc000); // PRG 16KB → $C000-$FFFF

  // ================= リセット =================
  a.label("reset");
  a.sei();
  a.cld();
  a.ldxImm(0x40);
  a.stxAbs(0x4017); // APU フレーム IRQ 無効
  a.ldxImm(0xff);
  a.txs();
  a.ldaImm(0);
  a.staAbs(0x2000); // NMI 無効
  a.staAbs(0x2001); // 描画無効
  a.staAbs(0x4010); // DMC IRQ 無効

  // VBlank を待つ (1回目)
  a.label("vwait1");
  a.bitAbs(0x2002);
  a.bpl("vwait1");

  // RAM クリア (OAM シャドウ $0200 は $F0 = 画面外)
  a.ldaImm(0);
  a.tax();
  a.label("clrRam");
  a.staZpX(0x00);
  a.staAbsX(0x0100);
  a.staAbsX(0x0300);
  a.staAbsX(0x0400);
  a.staAbsX(0x0500);
  a.staAbsX(0x0600);
  a.staAbsX(0x0700);
  a.ldaImm(0xf0);
  a.staAbsX(0x0200);
  a.ldaImm(0);
  a.inx();
  a.bne("clrRam");

  // VBlank を待つ (2回目) — PPU ウォームアップ完了
  a.label("vwait2");
  a.bitAbs(0x2002);
  a.bpl("vwait2");

  a.jsr("loadPalettes");
  a.jsr("showTitle");

  // ================= メインループ =================
  a.label("mainLoop");
  a.label("waitFrame");
  a.ldaZp(nmiFlag);
  a.beq("waitFrame");
  a.ldaImm(0);
  a.staZp(nmiFlag);
  a.jsr("readPad");
  a.ldaZp(gameState);
  a.bne("chkPlay");
  a.jmp("stateTitle");
  a.label("chkPlay");
  a.cmpImm(1);
  a.bne("chkClear");
  a.jmp("statePlay");
  a.label("chkClear");
  a.jmp("stateClear");

  // ---- タイトル画面: START でゲーム開始 ----
  a.label("stateTitle");
  a.ldaZp(pad);
  a.andImm(BTN_START);
  a.beq("stDone");
  a.ldaZp(padPrev);
  a.andImm(BTN_START);
  a.bne("stDone");
  a.ldaImm(0);
  a.staZp(level);
  a.jsr("initLevel");
  a.ldaImm(1);
  a.staZp(gameState);
  a.label("stDone");
  a.jmp("mainLoop");

  // ---- プレイ中 ----
  a.label("statePlay");
  a.jsr("movePlayer");
  a.jsr("physics");
  a.jsr("checkSpores");
  a.jsr("buildSprites");
  // 奈落に落ちたらリスポーン
  a.ldaZp(playerY);
  a.cmpImm(0xe8);
  a.bcc("spNoFall");
  a.jsr("resetPlayer");
  a.label("spNoFall");
  // 胞子を全部集めたら次のレベルへ
  a.ldaZp(sporeCount);
  a.bne("spCont");
  a.incZp(level);
  a.ldaZp(level);
  a.cmpImm(NUM_LEVELS);
  a.bcc("spNext");
  a.ldaImm(2); // 全レベルクリア
  a.staZp(gameState);
  a.jmp("mainLoop");
  a.label("spNext");
  a.jsr("initLevel");
  a.label("spCont");
  a.jmp("mainLoop");

  // ---- クリア画面: CLEAR! を表示して START でタイトルへ ----
  a.label("stateClear");
  a.jsr("buildSprites");
  a.jsr("clearTextSprites");
  a.ldaZp(pad);
  a.andImm(BTN_START);
  a.beq("scDone");
  a.ldaZp(padPrev);
  a.andImm(BTN_START);
  a.bne("scDone");
  a.jsr("showTitle");
  a.ldaImm(0);
  a.staZp(gameState);
  a.label("scDone");
  a.jmp("mainLoop");

  // ================= プレイヤー操作 =================
  a.label("movePlayer");
  // → 右移動
  a.ldaZp(pad);
  a.andImm(BTN_RIGHT);
  a.beq("mpLeft");
  a.ldaZp(playerX);
  a.cmpImm(0xe0);
  a.bcs("mpLeft");
  a.incZp(playerX);
  // 右端 (x+14) の壁チェック
  a.ldaZp(playerX);
  a.clc();
  a.adcImm(14);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileX);
  a.jsr("sideCollide");
  a.beq("mpLeft");
  a.decZp(playerX); // 壁に当たったので戻す
  a.label("mpLeft");
  // ← 左移動
  a.ldaZp(pad);
  a.andImm(BTN_LEFT);
  a.beq("mpJump");
  a.ldaZp(playerX);
  a.cmpImm(2);
  a.bcc("mpJump");
  a.decZp(playerX);
  // 左端 (x+1) の壁チェック
  a.ldaZp(playerX);
  a.clc();
  a.adcImm(1);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileX);
  a.jsr("sideCollide");
  a.beq("mpJump");
  a.incZp(playerX);
  a.label("mpJump");
  // A ボタン (押した瞬間 + 接地中) でジャンプ
  a.ldaZp(onGround);
  a.beq("mpDone");
  a.ldaZp(pad);
  a.andImm(BTN_A);
  a.beq("mpDone");
  a.ldaZp(padPrev);
  a.andImm(BTN_A);
  a.bne("mpDone");
  a.ldaImm(JUMP_LO);
  a.staZp(velYLo);
  a.ldaImm(JUMP_HI);
  a.staZp(velYHi);
  a.ldaImm(0);
  a.staZp(onGround);
  a.label("mpDone");
  a.rts();

  // 側面の当たり判定: tileX 固定で y+2 / y+13 の 2 点を調べる
  a.label("sideCollide");
  a.ldaZp(playerY);
  a.clc();
  a.adcImm(2);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileY);
  a.jsr("tileSolid");
  a.bne("scHit");
  a.ldaZp(playerY);
  a.clc();
  a.adcImm(13);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileY);
  a.jsr("tileSolid");
  a.label("scHit");
  a.rts();

  // ================= 物理 (重力・落下・着地) =================
  a.label("physics");
  // 重力を加算
  a.ldaZp(velYLo);
  a.clc();
  a.adcImm(GRAVITY);
  a.staZp(velYLo);
  a.ldaZp(velYHi);
  a.adcImm(0);
  a.staZp(velYHi);
  // 落下速度の上限
  a.bmi("phMove");
  a.cmpImm(MAX_FALL);
  a.bcc("phMove");
  a.ldaImm(MAX_FALL);
  a.staZp(velYHi);
  a.ldaImm(0);
  a.staZp(velYLo);
  a.label("phMove");
  // Y += 速度 (16bit 加算)
  a.ldaZp(playerYlo);
  a.clc();
  a.adcZp(velYLo);
  a.staZp(playerYlo);
  a.ldaZp(playerY);
  a.adcZp(velYHi);
  a.staZp(playerY);
  // 上昇中と落下中で判定を分ける
  a.ldaZp(velYHi);
  a.bmi("phUp");
  // --- 落下中: 足元 (y+16) をチェック ---
  a.ldaZp(playerY);
  a.clc();
  a.adcImm(16);
  a.cmpImm(0xf0);
  a.bcs("phAir"); // 画面外 → 空中扱い
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileY);
  a.ldaZp(playerX);
  a.clc();
  a.adcImm(2);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileX);
  a.jsr("tileSolid");
  a.bne("phLand");
  a.ldaZp(playerX);
  a.clc();
  a.adcImm(13);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileX);
  a.jsr("tileSolid");
  a.bne("phLand");
  a.label("phAir");
  a.ldaImm(0);
  a.staZp(onGround);
  a.rts();
  a.label("phLand");
  // 着地: Y をタイル境界にスナップ
  a.ldaZp(tileY);
  a.aslA(); a.aslA(); a.aslA(); a.aslA();
  a.sec();
  a.sbcImm(16);
  a.staZp(playerY);
  a.ldaImm(0);
  a.staZp(playerYlo);
  a.staZp(velYLo);
  a.staZp(velYHi);
  a.ldaImm(1);
  a.staZp(onGround);
  a.rts();
  a.label("phUp");
  // --- 上昇中: 頭上 (y) をチェック ---
  a.ldaZp(playerY);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileY);
  a.ldaZp(playerX);
  a.clc();
  a.adcImm(2);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileX);
  a.jsr("tileSolid");
  a.bne("phHead");
  a.ldaZp(playerX);
  a.clc();
  a.adcImm(13);
  a.lsrA(); a.lsrA(); a.lsrA(); a.lsrA();
  a.staZp(tileX);
  a.jsr("tileSolid");
  a.bne("phHead");
  a.rts();
  a.label("phHead");
  // 頭をぶつけた: 天井の下にスナップして上昇停止
  a.ldaZp(tileY);
  a.clc();
  a.adcImm(1);
  a.aslA(); a.aslA(); a.aslA(); a.aslA();
  a.staZp(playerY);
  a.ldaImm(0);
  a.staZp(playerYlo);
  a.staZp(velYLo);
  a.staZp(velYHi);
  a.rts();

  // tileSolid: (tileX, tileY) のマップ値を A に返す (0=空)
  a.label("tileSolid");
  a.ldaZp(tileY);
  a.cmpImm(15);
  a.bcs("tsEmpty");
  a.aslA(); a.aslA(); a.aslA(); a.aslA();
  a.clc();
  a.adcZp(tileX);
  a.tay();
  a.ldaIndY(mapPtrLo);
  a.rts();
  a.label("tsEmpty");
  a.ldaImm(0);
  a.rts();

  // ================= 胞子の収集判定 =================
  a.label("checkSpores");
  a.ldxImm(0);
  a.label("csLoop");
  a.ldaZpX(sporeAct);
  a.beq("csNext");
  // |playerX+5 - sporeX| <= 11 ?
  a.ldaZp(playerX);
  a.clc();
  a.adcImm(5);
  a.sec();
  a.sbcZpX(sporeX);
  a.clc();
  a.adcImm(11);
  a.cmpImm(23);
  a.bcs("csNext");
  // |playerY+8 - sporeY| <= 11 ?
  a.ldaZp(playerY);
  a.clc();
  a.adcImm(8);
  a.sec();
  a.sbcZpX(sporeY);
  a.clc();
  a.adcImm(11);
  a.cmpImm(23);
  a.bcs("csNext");
  // 収集!
  a.ldaImm(0);
  a.staZpX(sporeAct);
  a.decZp(sporeCount);
  a.label("csNext");
  a.inx();
  a.cpxImm(3);
  a.bne("csLoop");
  a.rts();

  // ================= スプライト構築 (OAM シャドウ $0200) =================
  a.label("buildSprites");
  // プレイヤー (スプライト 0-3, 16x16)
  a.ldaZp(playerY);
  a.sec();
  a.sbcImm(1);
  a.staAbs(0x0200);
  a.staAbs(0x0204);
  a.clc();
  a.adcImm(8);
  a.staAbs(0x0208);
  a.staAbs(0x020c);
  a.ldaImm(TILE_PLAYER);
  a.staAbs(0x0201);
  a.ldaImm(TILE_PLAYER + 1);
  a.staAbs(0x0205);
  a.ldaImm(TILE_PLAYER + 2);
  a.staAbs(0x0209);
  a.ldaImm(TILE_PLAYER + 3);
  a.staAbs(0x020d);
  a.ldaImm(0); // 属性: パレット 0
  a.staAbs(0x0202);
  a.staAbs(0x0206);
  a.staAbs(0x020a);
  a.staAbs(0x020e);
  a.ldaZp(playerX);
  a.staAbs(0x0203);
  a.staAbs(0x020b);
  a.clc();
  a.adcImm(8);
  a.staAbs(0x0207);
  a.staAbs(0x020f);
  // 胞子 (スプライト 4-6)
  a.ldxImm(0);
  a.label("bsSpore");
  a.txa();
  a.aslA();
  a.aslA();
  a.tay(); // Y = x*4
  a.ldaZpX(sporeAct);
  a.beq("bsHide");
  a.ldaZpX(sporeY);
  a.sec();
  a.sbcImm(1);
  a.staAbsY(0x0210);
  a.ldaImm(TILE_SPORE);
  a.staAbsY(0x0211);
  a.ldaImm(1); // パレット 1
  a.staAbsY(0x0212);
  a.ldaZpX(sporeX);
  a.staAbsY(0x0213);
  a.jmp("bsNext");
  a.label("bsHide");
  a.ldaImm(0xf0);
  a.staAbsY(0x0210);
  a.label("bsNext");
  a.inx();
  a.cpxImm(3);
  a.bne("bsSpore");
  a.rts();

  // CLEAR! の文字をスプライト 7-12 で表示
  a.label("clearTextSprites");
  a.ldxImm(0);
  a.label("ctLoop");
  a.txa();
  a.aslA();
  a.aslA();
  a.tay();
  a.ldaImm(103); // Y=104
  a.staAbsY(0x021c);
  a.ldaAbsX("clearTiles");
  a.staAbsY(0x021d);
  a.ldaImm(2); // パレット 2 (白)
  a.staAbsY(0x021e);
  a.txa();
  a.aslA(); a.aslA(); a.aslA();
  a.clc();
  a.adcImm(104);
  a.staAbsY(0x021f);
  a.inx();
  a.cpxImm(6);
  a.bne("ctLoop");
  a.rts();

  // ================= レベル初期化 =================
  a.label("initLevel");
  a.ldaImm(0);
  a.staAbs(0x2000); // NMI 無効
  a.staAbs(0x2001); // 描画無効
  // マップポインタ設定
  a.ldxZp(level);
  a.ldaAbsX("mapLo");
  a.staZp(mapPtrLo);
  a.ldaAbsX("mapHi");
  a.staZp(mapPtrHi);
  a.jsr("drawLevel");
  a.ldaImm(0x00); // 属性: 全て BG パレット 0
  a.jsr("fillAttr");
  // 胞子の座標をロード (テーブルは level*3 から 3 件)
  a.ldaZp(level);
  a.aslA();
  a.clc();
  a.adcZp(level);
  a.tax();
  a.ldyImm(0);
  a.label("ilSpore");
  a.ldaAbsX("sporeXT");
  a.staAbsY(sporeX);
  a.ldaAbsX("sporeYT");
  a.staAbsY(sporeY);
  a.ldaImm(1);
  a.staAbsY(sporeAct);
  a.inx();
  a.iny();
  a.cpyImm(3);
  a.bne("ilSpore");
  a.ldaImm(3);
  a.staZp(sporeCount);
  a.jsr("resetPlayer");
  a.jsr("hideAllSprites");
  // VBlank を待ってから描画再開
  a.label("ilVwait");
  a.bitAbs(0x2002);
  a.bpl("ilVwait");
  a.ldaAbs(0x2002); // w トグルをリセット
  a.ldaImm(0);
  a.staAbs(0x2005);
  a.staAbs(0x2005);
  a.ldaImm(0x80); // NMI 有効
  a.staAbs(0x2000);
  a.ldaImm(0x1e); // BG+スプライト表示
  a.staAbs(0x2001);
  a.rts();

  a.label("resetPlayer");
  a.ldaImm(0x18);
  a.staZp(playerX);
  a.ldaImm(0x60);
  a.staZp(playerY);
  a.ldaImm(0);
  a.staZp(playerYlo);
  a.staZp(velYLo);
  a.staZp(velYHi);
  a.staZp(onGround);
  a.rts();

  a.label("hideAllSprites");
  a.ldxImm(0);
  a.ldaImm(0xf0);
  a.label("hsLoop");
  a.staAbsX(0x0200);
  a.inx(); a.inx(); a.inx(); a.inx();
  a.bne("hsLoop");
  a.rts();

  // ================= 画面描画 (描画 OFF 中に呼ぶ) =================

  // レベルマップ → ネームテーブル (メタタイル 1 個 = 2x2 タイル)
  a.label("drawLevel");
  a.ldaAbs(0x2002); // w リセット
  a.ldaImm(0);
  a.staZp(tileY);
  a.label("dlRow");
  a.ldxZp(tileY);
  a.ldaAbsX("rowHi");
  a.staAbs(0x2006);
  a.ldaAbsX("rowLo");
  a.staAbs(0x2006);
  a.txa();
  a.aslA(); a.aslA(); a.aslA(); a.aslA();
  a.staZp(rowBase);
  // 上段 (TL, TR)
  a.ldaImm(0);
  a.staZp(tileX);
  a.label("dlTop");
  a.ldaZp(rowBase);
  a.clc();
  a.adcZp(tileX);
  a.tay();
  a.ldaIndY(mapPtrLo);
  a.tax();
  a.ldaAbsX("metaTL");
  a.staAbs(0x2007);
  a.ldaAbsX("metaTR");
  a.staAbs(0x2007);
  a.incZp(tileX);
  a.ldaZp(tileX);
  a.cmpImm(16);
  a.bne("dlTop");
  // 下段 (BL, BR)
  a.ldxZp(tileY);
  a.ldaAbsX("rowHi");
  a.staAbs(0x2006);
  a.ldaAbsX("rowLo");
  a.clc();
  a.adcImm(32);
  a.staAbs(0x2006);
  a.ldaImm(0);
  a.staZp(tileX);
  a.label("dlBot");
  a.ldaZp(rowBase);
  a.clc();
  a.adcZp(tileX);
  a.tay();
  a.ldaIndY(mapPtrLo);
  a.tax();
  a.ldaAbsX("metaBL");
  a.staAbs(0x2007);
  a.ldaAbsX("metaBR");
  a.staAbs(0x2007);
  a.incZp(tileX);
  a.ldaZp(tileX);
  a.cmpImm(16);
  a.bne("dlBot");
  a.incZp(tileY);
  a.ldaZp(tileY);
  a.cmpImm(15);
  a.bne("dlRow");
  a.rts();

  // 属性テーブルを A の値で埋める
  a.label("fillAttr");
  a.staZp(tmp);
  a.ldaAbs(0x2002);
  a.ldaImm(0x23);
  a.staAbs(0x2006);
  a.ldaImm(0xc0);
  a.staAbs(0x2006);
  a.ldxImm(64);
  a.label("faLoop");
  a.ldaZp(tmp);
  a.staAbs(0x2007);
  a.dex();
  a.bne("faLoop");
  a.rts();

  // タイトル画面を描く
  a.label("showTitle");
  a.ldaImm(0);
  a.staAbs(0x2000);
  a.staAbs(0x2001);
  // ネームテーブルをクリア (960 バイト)
  a.ldaAbs(0x2002);
  a.ldaImm(0x20);
  a.staAbs(0x2006);
  a.ldaImm(0x00);
  a.staAbs(0x2006);
  a.ldyImm(4);
  a.label("stClrOuter");
  a.ldxImm(240);
  a.ldaImm(0);
  a.label("stClrInner");
  a.staAbs(0x2007);
  a.dex();
  a.bne("stClrInner");
  a.dey();
  a.bne("stClrOuter");
  a.ldaImm(0x55); // 全て BG パレット 1 (白文字)
  a.jsr("fillAttr");
  // タイトルロゴ "MOSS HOP" (row 10, col 12)
  a.ldaImmLo("txtTitle");
  a.staZp(textPtrLo);
  a.ldaImmHi("txtTitle");
  a.staZp(textPtrHi);
  a.ldaImm(0x21);
  a.ldxImm(0x4c);
  a.jsr("writeText");
  // "PUSH START" (row 16, col 11)
  a.ldaImmLo("txtStart");
  a.staZp(textPtrLo);
  a.ldaImmHi("txtStart");
  a.staZp(textPtrHi);
  a.ldaImm(0x22);
  a.ldxImm(0x0b);
  a.jsr("writeText");
  a.jsr("hideAllSprites");
  // 描画再開
  a.label("stVwait");
  a.bitAbs(0x2002);
  a.bpl("stVwait");
  a.ldaAbs(0x2002);
  a.ldaImm(0);
  a.staAbs(0x2005);
  a.staAbs(0x2005);
  a.ldaImm(0x80);
  a.staAbs(0x2000);
  a.ldaImm(0x1e);
  a.staAbs(0x2001);
  a.rts();

  // writeText: A=VRAM上位 X=VRAM下位, textPtr に $FF 終端の文字列
  a.label("writeText");
  a.pha();
  a.ldaAbs(0x2002);
  a.pla();
  a.staAbs(0x2006);
  a.stxAbs(0x2006);
  a.ldyImm(0);
  a.label("wtLoop");
  a.ldaIndY(textPtrLo);
  a.cmpImm(0xff);
  a.beq("wtDone");
  a.staAbs(0x2007);
  a.iny();
  a.bne("wtLoop");
  a.label("wtDone");
  a.rts();

  // ================= パレット =================
  a.label("loadPalettes");
  a.ldaAbs(0x2002);
  a.ldaImm(0x3f);
  a.staAbs(0x2006);
  a.ldaImm(0x00);
  a.staAbs(0x2006);
  a.ldxImm(0);
  a.label("lpLoop");
  a.ldaAbsX("palData");
  a.staAbs(0x2007);
  a.inx();
  a.cpxImm(32);
  a.bne("lpLoop");
  a.rts();

  // ================= コントローラー読み取り =================
  a.label("readPad");
  a.ldaZp(pad);
  a.staZp(padPrev);
  a.ldaImm(1);
  a.staAbs(0x4016); // ストローブ ON
  a.ldaImm(0);
  a.staAbs(0x4016); // ストローブ OFF → 読み出し開始
  a.ldxImm(8);
  a.label("rpLoop");
  a.ldaAbs(0x4016);
  a.lsrA();       // bit0 → キャリー
  a.rolZp(pad);   // キャリー → pad へシフトイン
  a.dex();
  a.bne("rpLoop");
  a.rts();

  // ================= NMI (毎フレーム VBlank) =================
  a.label("nmi");
  a.pha();
  a.txa();
  a.pha();
  a.tya();
  a.pha();
  // OAM DMA (スプライト転送)
  a.ldaImm(0x00);
  a.staAbs(0x2003);
  a.ldaImm(0x02);
  a.staAbs(0x4014);
  // スクロールを毎フレーム (0,0) に固定
  a.ldaAbs(0x2002);
  a.ldaImm(0);
  a.staAbs(0x2005);
  a.staAbs(0x2005);
  a.ldaImm(0x80);
  a.staAbs(0x2000);
  a.incZp(nmiFlag);
  a.pla();
  a.tay();
  a.pla();
  a.tax();
  a.pla();
  a.rti();

  a.label("irq");
  a.rti();

  // ================= データ =================
  a.label("palData");
  // BG: 空色を背景に、草/土、白文字、予備 x2
  a.db(0x21, 0x29, 0x17, 0x0f); // パレット0: 草緑・土茶・こげ茶
  a.db(0x21, 0x30, 0x30, 0x30); // パレット1: 白 (文字)
  a.db(0x21, 0x27, 0x17, 0x0f);
  a.db(0x21, 0x1a, 0x09, 0x0f);
  // スプライト
  a.db(0x21, 0x2a, 0x0b, 0x30); // パレット0: モス (苔緑・深緑・白目)
  a.db(0x21, 0x04, 0x24, 0x34); // パレット1: 胞子 (紫〜桃)
  a.db(0x21, 0x30, 0x30, 0x30); // パレット2: 白 (CLEAR!)
  a.db(0x21, 0x16, 0x27, 0x18);

  // メタタイル値 → タイル番号 (0=空, 1=地面, 2=足場)
  a.label("metaTL");
  a.db(0x00, TILE_GROUND, TILE_PLATFORM);
  a.label("metaTR");
  a.db(0x00, TILE_GROUND + 1, TILE_PLATFORM + 1);
  a.label("metaBL");
  a.db(0x00, TILE_GROUND + 2, TILE_PLATFORM + 2);
  a.label("metaBR");
  a.db(0x00, TILE_GROUND + 3, TILE_PLATFORM + 3);

  // ネームテーブル行アドレス ($2000 + ty*64)
  a.label("rowLo");
  for (let ty = 0; ty < 15; ty++) a.db((ty * 64) & 0xff);
  a.label("rowHi");
  for (let ty = 0; ty < 15; ty++) a.db(0x20 + ((ty * 64) >> 8));

  // レベルマップ
  a.label("mapLo");
  a.db(0, 0); // 後で解決するためプレースホルダ → dw で書き直す
  a.label("mapHi");
  a.db(0, 0);
  a.label("map1data");
  a.db(...map1);
  a.label("map2data");
  a.db(...map2);

  // 胞子座標 (ピクセル): x = col*16+4, y = row*16+4
  a.label("sporeXT");
  for (const lv of sporesByLevel) for (const [cx] of lv) a.db(cx * 16 + 4);
  a.label("sporeYT");
  for (const lv of sporesByLevel) for (const [, cy] of lv) a.db(cy * 16 + 4);

  // テキスト ($FF 終端)
  a.label("txtTitle");
  a.db(...encodeText("MOSS HOP"), 0xff);
  a.label("txtStart");
  a.db(...encodeText("PUSH START"), 0xff);
  a.label("clearTiles");
  a.db(...encodeText("CLEAR!"));

  // ---- 割り込みベクタ ----
  a.padTo(0xfffa);
  a.dw("nmi");
  a.dw("reset");
  a.dw("irq");

  const prg = a.assemble();

  // mapLo/mapHi テーブルをラベル解決後の実アドレスで埋める
  const mapLoOff = a.addr("mapLo") - 0xc000;
  const mapHiOff = a.addr("mapHi") - 0xc000;
  const m1 = a.addr("map1data");
  const m2 = a.addr("map2data");
  prg[mapLoOff] = m1 & 0xff;
  prg[mapLoOff + 1] = m2 & 0xff;
  prg[mapHiOff] = m1 >> 8;
  prg[mapHiOff + 1] = m2 >> 8;

  // ---- iNES ファイルに組み立て ----
  const chr = buildChr();
  const rom = new Uint8Array(16 + 0x4000 + 0x2000);
  rom.set([0x4e, 0x45, 0x53, 0x1a]); // "NES\x1A"
  rom[4] = 1; // PRG 16KB x1
  rom[5] = 1; // CHR 8KB x1
  rom[6] = 0; // マッパー 0, 水平ミラー
  rom.set(prg, 16);
  rom.set(chr, 16 + 0x4000);
  return rom;
}
