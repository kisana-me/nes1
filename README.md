# nes1 — TypeScript で作る Web ブラウザ NES エミュレータ

言語(TypeScript)とコンピュータアーキテクチャの学習を目的として、
NES(ファミコン)エミュレータをゼロから章立てで開発するプロジェクトです。

## 特徴

- **TypeScript + Canvas API** — ブラウザだけで動作、プラグイン不要
- **6502 互換 CPU / PPU / APU / コントローラー入力**を全て自前実装
- **iNES フォーマット (.nes) 対応** — NROM から始めて MMC1 / MMC3 等へ拡張
- **完全オリジナルのテスト用 2D プラットフォーマーゲーム**を同梱(既存の商用アセットは一切不使用)
- 章ごとの**初心者向け解説ドキュメント**を `docs/` に同梱(GitHub Pages で公開)

## 使い方

```bash
npm install
npm run build     # docs/app.js を生成
npm run serve     # 開発サーバー起動 → ブラウザで開く
npm test          # ヘッドレステスト実行
npm run typecheck # 型チェック
```

## 章立て

| 章 | 内容 | ブランチ |
|----|------|----------|
| 1 | プロジェクト概要と NES アーキテクチャ | `feature/01-project-setup` |
| 2 | 6502 CPU コア実装 | `feature/02-cpu-core` |
| 3 | PPU(グラフィック)実装 | `feature/03-ppu` |
| 4 | 入力・コントローラー対応 + オリジナルゲーム ROM | `feature/04-controller` |
| 5 | APU(音声)実装 | `feature/05-apu` |
| 6 | ROM ローダーとマッパー対応拡張 | `feature/06-mappers` |
| 7 | デバッグ UI・パフォーマンス最適化 | `feature/07-debug-ui` |

解説は `docs/chapters/` 配下(GitHub Pages で公開)。

## GitHub Pages

リポジトリ設定で Pages のソースを「ブランチ / `docs` フォルダ」にすると、
エミュレータ本体と解説サイトがそのまま公開されます。

## ライセンス・注意

- 同梱のゲーム ROM(`game/`)は本プロジェクトのために新規作成した完全オリジナル作品です
- 既存の商用ゲーム ROM の使用・配布は行いません
