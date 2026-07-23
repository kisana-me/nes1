// マッパー = カセット側のアドレスデコード / バンク切り替え回路の抽象化
//
// CPU バスの $4020-$FFFF、PPU バスの $0000-$1FFF (パターンテーブル) は
// カセットに配線されており、マッパーが応答を決める。

import { Mirroring } from "../cartridge";

export interface Mapper {
  /** CPU 空間 ($4020-$FFFF) の読み出し */
  cpuRead(addr: number): number;
  /** CPU 空間への書き込み (バンク切替レジスタなど) */
  cpuWrite(addr: number, value: number): void;
  /** PPU 空間 ($0000-$1FFF) の読み出し */
  ppuRead(addr: number): number;
  /** PPU 空間への書き込み (CHR-RAM の場合のみ有効) */
  ppuWrite(addr: number, value: number): void;
  /** 現在のネームテーブルミラーリング */
  mirroring(): Mirroring;
  /** PPU のスキャンライン終端で呼ばれる (MMC3 の IRQ カウンタ用) */
  onScanline(): void;
  /** マッパーが IRQ を要求しているか */
  irqPending(): boolean;
}
