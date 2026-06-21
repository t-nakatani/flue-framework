# Design Docs

このディレクトリは、Flue Framework example を実運用できる agent 群へ拡張していくための設計メモ置き場です。

`study/` は概念理解、`example/` は実装、`design/` は実装前に方針を固定するための文書です。

## Docs

1. `001-github-issue-to-pr.md`
   - GitHub issue から実装指示を送り、GitHub branch と pull request を作る agent の設計
2. `002-provider-subscription-tokens.md`
   - GLM / Kimi の API key と subscription / recharge を Flue から使う場合の設計

## 書き方

各 design doc では、少なくとも次を残します。

- 背景と目的
- 作るもの / 作らないもの
- 全体アーキテクチャ
- agent の責務
- 権限と安全策
- 必要なアカウント設定
- 実装ステップ
- 未決事項
