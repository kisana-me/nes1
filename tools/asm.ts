// ミニ 6502 アセンブラ (TypeScript の EDSL として実装)
//
// テキストのアセンブリ言語をパースする代わりに、メソッド呼び出しで
// 機械語を組み立てる。ラベルは 2 パス方式 (先に位置を記録し、最後に解決)。
//
//   const a = new Asm(0x8000);
//   a.label("reset");
//   a.ldaImm(0x00);
//   a.staAbs(0x2001);
//   a.jmp("reset");
//   const bin = a.assemble();

type Fixup = {
  pos: number; // buf 内の位置
  label: string;
  kind: "abs" | "rel" | "lo" | "hi";
};

export class Asm {
  private buf: number[] = [];
  private labels = new Map<string, number>();
  private fixups: Fixup[] = [];

  constructor(readonly origin: number) {}

  /** 現在のアドレス */
  get pc(): number {
    return this.origin + this.buf.length;
  }

  label(name: string): void {
    if (this.labels.has(name)) throw new Error(`ラベル二重定義: ${name}`);
    this.labels.set(name, this.pc);
  }

  addr(name: string): number {
    const v = this.labels.get(name);
    if (v === undefined) throw new Error(`未定義ラベル: ${name}`);
    return v;
  }

  // ---- 生データ ----
  db(...bytes: number[]): void {
    for (const b of bytes) this.buf.push(b & 0xff);
  }

  dw(value: number | string): void {
    if (typeof value === "string") {
      this.fixups.push({ pos: this.buf.length, label: value, kind: "abs" });
      this.buf.push(0, 0);
    } else {
      this.buf.push(value & 0xff, (value >> 8) & 0xff);
    }
  }

  /** 指定アドレスまで 0 で埋める */
  padTo(address: number): void {
    while (this.pc < address) this.buf.push(0);
  }

  // ---- オペランドヘルパ ----
  private emitAbs(op: number, target: number | string): void {
    this.buf.push(op);
    if (typeof target === "string") {
      this.fixups.push({ pos: this.buf.length, label: target, kind: "abs" });
      this.buf.push(0, 0);
    } else {
      this.buf.push(target & 0xff, (target >> 8) & 0xff);
    }
  }

  private emitRel(op: number, target: string): void {
    this.buf.push(op);
    this.fixups.push({ pos: this.buf.length, label: target, kind: "rel" });
    this.buf.push(0);
  }

  /** ラベルの下位バイトを即値として使う (ポインタ設定用) */
  ldaImmLo(label: string): void {
    this.buf.push(0xa9);
    this.fixups.push({ pos: this.buf.length, label, kind: "lo" });
    this.buf.push(0);
  }

  ldaImmHi(label: string): void {
    this.buf.push(0xa9);
    this.fixups.push({ pos: this.buf.length, label, kind: "hi" });
    this.buf.push(0);
  }

  // ---- ロード / ストア ----
  ldaImm(v: number): void { this.db(0xa9, v); }
  ldaZp(a: number): void { this.db(0xa5, a); }
  ldaZpX(a: number): void { this.db(0xb5, a); }
  ldaAbs(a: number | string): void { this.emitAbs(0xad, a); }
  ldaAbsX(a: number | string): void { this.emitAbs(0xbd, a); }
  ldaAbsY(a: number | string): void { this.emitAbs(0xb9, a); }
  ldaIndY(zp: number): void { this.db(0xb1, zp); }
  ldxImm(v: number): void { this.db(0xa2, v); }
  ldxZp(a: number): void { this.db(0xa6, a); }
  ldxAbs(a: number | string): void { this.emitAbs(0xae, a); }
  ldyImm(v: number): void { this.db(0xa0, v); }
  ldyZp(a: number): void { this.db(0xa4, a); }
  ldyAbs(a: number | string): void { this.emitAbs(0xac, a); }
  staZp(a: number): void { this.db(0x85, a); }
  staZpX(a: number): void { this.db(0x95, a); }
  staAbs(a: number | string): void { this.emitAbs(0x8d, a); }
  staAbsX(a: number | string): void { this.emitAbs(0x9d, a); }
  staAbsY(a: number | string): void { this.emitAbs(0x99, a); }
  staIndY(zp: number): void { this.db(0x91, zp); }
  stxZp(a: number): void { this.db(0x86, a); }
  stxAbs(a: number | string): void { this.emitAbs(0x8e, a); }
  styZp(a: number): void { this.db(0x84, a); }
  styAbs(a: number | string): void { this.emitAbs(0x8c, a); }

  // ---- 転送 ----
  tax(): void { this.db(0xaa); }
  tay(): void { this.db(0xa8); }
  txa(): void { this.db(0x8a); }
  tya(): void { this.db(0x98); }
  txs(): void { this.db(0x9a); }

  // ---- 算術 / 論理 ----
  adcImm(v: number): void { this.db(0x69, v); }
  adcZp(a: number): void { this.db(0x65, a); }
  sbcImm(v: number): void { this.db(0xe9, v); }
  sbcZp(a: number): void { this.db(0xe5, a); }
  sbcZpX(a: number): void { this.db(0xf5, a); }
  cmpImm(v: number): void { this.db(0xc9, v); }
  cmpZp(a: number): void { this.db(0xc5, a); }
  cmpAbs(a: number | string): void { this.emitAbs(0xcd, a); }
  cpxImm(v: number): void { this.db(0xe0, v); }
  cpyImm(v: number): void { this.db(0xc0, v); }
  andImm(v: number): void { this.db(0x29, v); }
  andZp(a: number): void { this.db(0x25, a); }
  oraImm(v: number): void { this.db(0x09, v); }
  oraZp(a: number): void { this.db(0x05, a); }
  eorImm(v: number): void { this.db(0x49, v); }
  incZp(a: number): void { this.db(0xe6, a); }
  decZp(a: number): void { this.db(0xc6, a); }
  incAbs(a: number | string): void { this.emitAbs(0xee, a); }
  inx(): void { this.db(0xe8); }
  iny(): void { this.db(0xc8); }
  dex(): void { this.db(0xca); }
  dey(): void { this.db(0x88); }
  aslA(): void { this.db(0x0a); }
  lsrA(): void { this.db(0x4a); }
  rolA(): void { this.db(0x2a); }
  rorA(): void { this.db(0x6a); }
  aslZp(a: number): void { this.db(0x06, a); }
  lsrZp(a: number): void { this.db(0x46, a); }
  rolZp(a: number): void { this.db(0x26, a); }
  bitAbs(a: number | string): void { this.emitAbs(0x2c, a); }

  // ---- フラグ / スタック ----
  clc(): void { this.db(0x18); }
  sec(): void { this.db(0x38); }
  sei(): void { this.db(0x78); }
  cld(): void { this.db(0xd8); }
  pha(): void { this.db(0x48); }
  pla(): void { this.db(0x68); }

  // ---- 制御 ----
  jmp(target: number | string): void { this.emitAbs(0x4c, target); }
  jsr(target: number | string): void { this.emitAbs(0x20, target); }
  rts(): void { this.db(0x60); }
  rti(): void { this.db(0x40); }
  nop(): void { this.db(0xea); }
  bpl(t: string): void { this.emitRel(0x10, t); }
  bmi(t: string): void { this.emitRel(0x30, t); }
  bcc(t: string): void { this.emitRel(0x90, t); }
  bcs(t: string): void { this.emitRel(0xb0, t); }
  bne(t: string): void { this.emitRel(0xd0, t); }
  beq(t: string): void { this.emitRel(0xf0, t); }

  // ---- 解決 ----
  assemble(): Uint8Array {
    const out = new Uint8Array(this.buf);
    for (const f of this.fixups) {
      const target = this.labels.get(f.label);
      if (target === undefined) throw new Error(`未定義ラベル: ${f.label}`);
      switch (f.kind) {
        case "abs":
          out[f.pos] = target & 0xff;
          out[f.pos + 1] = (target >> 8) & 0xff;
          break;
        case "lo":
          out[f.pos] = target & 0xff;
          break;
        case "hi":
          out[f.pos] = (target >> 8) & 0xff;
          break;
        case "rel": {
          const from = this.origin + f.pos + 1; // 分岐命令の次のアドレス
          const diff = target - from;
          if (diff < -128 || diff > 127) {
            throw new Error(`分岐が届きません: ${f.label} (距離 ${diff})`);
          }
          out[f.pos] = diff & 0xff;
          break;
        }
      }
    }
    return out;
  }
}
