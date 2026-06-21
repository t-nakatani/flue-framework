# Flue Framework Lab

Flue Framework を学習しながら、実際に使える agent 群へ発展させるための専用ディレクトリです。

## Directory

```text
flue-framework/
  design/
    README.md
    001-github-issue-to-pr.md
  study/
    README.md
    01-overview.md
    02-agent-and-harness.md
    03-core-concepts.md
    04-use-cases.md
  example/
    github-review-triage/
      README.md
      src/
        agents/
        workflows/
        shared/
        skills/
```

## What This Is For

`design/` は、実装前に設計方針を固定するための Markdown です。

`study/` は概念理解用の Markdown です。

`example/` は Flue の考え方を実コードに落とした実験場です。最初の example として、GitHub 上の issue triage と pull request review を行う agent suite を置いています。

## Current Example

[example/github-review-triage](./example/github-review-triage) は、次の 2 つの agent を含みます。

- `github-issue-triage`: GitHub issue を読み、分類、優先度判断、ラベル案、コメント案を作る
- `github-pr-reviewer`: Pull request の diff と file list を読み、レビューコメントを作る

どちらも初期状態では dry-run です。`GITHUB_WRITE_MODE=true` を設定すると、GitHub にコメント投稿やラベル追加を行います。
