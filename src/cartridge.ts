// iNES フォーマット (.nes) のパースとカートリッジの抽象化
//
// iNES ファイル構造:
//   [0-3]  マジックナンバー "NES\x1A"
//   [4]    PRG-ROM サイズ (16KB 単位)
//   [5]    CHR-ROM サイズ (8KB 単位、0 なら CHR-RAM 8KB)
//   [6]    フラグ6: 下位4bit=マッパー番号下位, ミラーリング, バッテリー, トレーナー
//   [7]    フラグ7: 上位4bit=マッパー番号上位
//   [8-15] ほぼ未使用
//   その後: (トレーナー 512B) + PRG-ROM + CHR-ROM

import { Mapper } from "./mappers/mapper";
import { NromMapper } from "./mappers/nrom";
import { Mmc1Mapper } from "./mappers/mmc1";
import { UxromMapper } from "./mappers/uxrom";
import { CnromMapper } from "./mappers/cnrom";
import { Mmc3Mapper } from "./mappers/mmc3";

export const enum Mirroring {
  Horizontal, // 水平ミラー (縦スクロール向き)
  Vertical,   // 垂直ミラー (横スクロール向き)
  FourScreen,
  SingleScreenLower,
  SingleScreenUpper,
}

export class Cartridge {
  readonly prgRom: Uint8Array;
  readonly chrRom: Uint8Array;
  readonly chrIsRam: boolean;
  readonly mapperId: number;
  readonly mirroring: Mirroring;
  readonly hasBattery: boolean;
  /** カセット上の拡張 RAM ($6000-$7FFF) */
  readonly prgRam = new Uint8Array(0x2000);

  constructor(data: Uint8Array) {
    if (data.length < 16 || data[0] !== 0x4e || data[1] !== 0x45 || data[2] !== 0x53 || data[3] !== 0x1a) {
      throw new Error("iNES フォーマットではありません (NES\\x1A ヘッダがない)");
    }
    const prgBanks = data[4];
    const chrBanks = data[5];
    const flags6 = data[6];
    const flags7 = data[7];

    this.mapperId = (flags6 >> 4) | (flags7 & 0xf0);
    this.hasBattery = (flags6 & 0x02) !== 0;
    if (flags6 & 0x08) {
      this.mirroring = Mirroring.FourScreen;
    } else {
      this.mirroring = flags6 & 0x01 ? Mirroring.Vertical : Mirroring.Horizontal;
    }

    let offset = 16;
    if (flags6 & 0x04) offset += 512; // トレーナーはスキップ

    const prgSize = prgBanks * 0x4000;
    const chrSize = chrBanks * 0x2000;
    if (data.length < offset + prgSize + chrSize) {
      throw new Error("ROM ファイルが壊れています (サイズ不足)");
    }

    this.prgRom = data.slice(offset, offset + prgSize);
    if (chrBanks === 0) {
      // CHR-RAM: ゲーム側が実行時に絵を書き込む
      this.chrRom = new Uint8Array(0x2000);
      this.chrIsRam = true;
    } else {
      this.chrRom = data.slice(offset + prgSize, offset + prgSize + chrSize);
      this.chrIsRam = false;
    }
  }

  /** マッパー番号に応じた Mapper 実装を生成する */
  createMapper(): Mapper {
    switch (this.mapperId) {
      case 0:
        return new NromMapper(this);
      case 1:
        return new Mmc1Mapper(this);
      case 2:
        return new UxromMapper(this);
      case 3:
        return new CnromMapper(this);
      case 4:
        return new Mmc3Mapper(this);
      default:
        throw new Error(
          `マッパー ${this.mapperId} は未対応です (対応: 0=NROM, 1=MMC1, 2=UxROM, 3=CNROM, 4=MMC3)`,
        );
    }
  }
}
