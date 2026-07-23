// 標準コントローラー (ファミコンの十字キー+ABセレクトスタート)
//
// 実機のコントローラーは 8bit シフトレジスタ (4021 相当)。
//   $4016 に 1→0 と書く (ストローブ) と現在のボタン状態をラッチし、
//   $4016/$4017 を読むたびに A, B, Select, Start, 上, 下, 左, 右 の順に
//   1 ビットずつ出てくる。

import { ControllerPort } from "./bus";

export const enum Button {
  A = 0x01,
  B = 0x02,
  Select = 0x04,
  Start = 0x08,
  Up = 0x10,
  Down = 0x20,
  Left = 0x40,
  Right = 0x80,
}

export class StandardController implements ControllerPort {
  /** 1P のボタン状態 (Button のビット和) */
  buttons1 = 0;
  /** 2P のボタン状態 */
  buttons2 = 0;

  private strobe = false;
  private index1 = 0;
  private index2 = 0;

  write(value: number): void {
    this.strobe = (value & 1) !== 0;
    if (this.strobe) {
      this.index1 = 0;
      this.index2 = 0;
    }
  }

  read1(): number {
    return this.shift(1);
  }

  read2(): number {
    return this.shift(2);
  }

  private shift(player: 1 | 2): number {
    const buttons = player === 1 ? this.buttons1 : this.buttons2;
    if (this.strobe) {
      // ストローブ中は常に A ボタンの状態
      return buttons & 1;
    }
    const index = player === 1 ? this.index1 : this.index2;
    // 8 回読み切った後は 1 が返り続ける (実機仕様)
    const bit = index < 8 ? (buttons >> index) & 1 : 1;
    if (player === 1) this.index1++;
    else this.index2++;
    return bit;
  }
}
