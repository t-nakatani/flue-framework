# GitHub Review & Triage Agents

Flue で GitHub の issue triage と pull request review を行う example です。

## What It Builds

この example には、3 つの addressable agent と 2 つの workflow が入っています。

```text
src/
  app.ts
  agents/
    github-issue-implementer.ts
    github-issue-triage.ts
    github-pr-reviewer.ts
  workflows/
    triage-issue.ts
    review-pr.ts
  shared/
    github-client.ts
    github-ref.ts
    github-tools.ts
    github-webhook.ts
    http-auth.ts
    model.ts
  skills/
    issue-triage/SKILL.md
    pr-review/SKILL.md
    repo-implementation/SKILL.md
```

### Addressable Agents

- `github-issue-implementer`
  - `agent:implement` label 付き issue から dispatch される
  - repository を読み、専用 branch に変更を作り、PR を開く
- `github-issue-triage`
  - GitHub issue webhook から dispatch される
  - issue context を読み、ラベル付けやコメントを行う
- `github-pr-reviewer`
  - Pull request webhook から dispatch される
  - PR metadata、changed files、diff を読み、レビューコメントを行う
  - PR review は head commit SHA ごとに別 agent session として実行される

### Workflows

- `triage-issue`
  - 手動で特定 issue を triage する finite job
- `review-pr`
  - 手動で特定 PR を review する finite job

## Cheapest Practical Setup

最初は次の構成が安価で安全です。

1. Cloudflare Workers target で実行
2. LLM は OpenRouter の無料 coding model
3. `GITHUB_WRITE_MODE=false` の dry-run
4. 必要なときだけ `GITHUB_WRITE_MODE=true`
5. GitHub webhook は Cloudflare Worker の公開 URL に向ける

現在の第一候補は `openrouter/qwen/qwen3-coder:free` です。OpenRouter の model id は `qwen/qwen3-coder:free` ですが、Flue/Pi の provider prefix を付けるため、この example では `openrouter/qwen/qwen3-coder:free` と指定します。

PR review の品質や安定性が足りない場合だけ、有料の小型/中型 model に切り替えます。issue triage は無料 model でも比較的回しやすいです。

Cloudflare Workers では Flue の `cloudflare` target を使います。Flue は agent/workflow の Durable Object-backed runtime を生成するため、session history、workflow run、`dispatch(...)` admission が Worker/DO 側で扱われます。

## Recommended Free OpenRouter Model

2026-06-20 時点では、PR review と issue triage の両方に使う無料 model として `openrouter/qwen/qwen3-coder:free` を推奨します。

理由:

- OpenRouter 上で prompt/completion price が `0`
- coding 向け model
- 1M token context
- tool calling 対応
- expiration date が設定されていない

代替候補:

| Model spec | 向き | 注意 |
| --- | --- | --- |
| `openrouter/qwen/qwen3-coder:free` | 第一候補。PR review / coding / agentic work | structured output は弱い可能性がある |
| `openrouter/cohere/north-mini-code:free` | 軽めの coding agent | 256K context |
| `openrouter/nvidia/nemotron-3-ultra-550b-a55b:free` | 長文 reasoning / orchestration | OpenRouter benchmark 上の coding score は Qwen Coder より低め |
| `openrouter/google/gemma-4-31b-it:free` | structured output を重視する軽作業 | coding/agentic 指標は中程度 |
| `openrouter/openrouter/free` | とにかく無料 routing | model がランダムになり、レビュー品質が安定しにくい |

この用途では、ランダム router の `openrouter/openrouter/free` は避けます。PR review は再現性と tool calling の安定性が重要なので、明示的な model を固定する方が運用しやすいです。

OpenRouter の `:free` model には利用制限があります。2026-06-20 時点の公式 docs では、無料 model variant は最大 20 requests/minute、購入 credits が $10 未満の account は 50 requests/day、$10 以上購入済みなら 1000 requests/day です。大量の webhook を受ける repo では、最初から dry-run と対象 repo 限定で運用してください。

## Required Accounts And Settings

### 1. Node.js

Flue の quickstart では Node.js `>=22.19.0` が必要です。

### 2. Cloudflare

Cloudflare account が必要です。Workers と Durable Objects を使います。

Local CLI login:

```bash
npx wrangler login
```

この example は source-root の `wrangler.jsonc` に Durable Object migrations を持ちます。deploy 時は source-root の `wrangler.jsonc` ではなく、Flue build が生成する `dist/flue_github_review_triage/wrangler.json` を使います。

### 3. LLM Provider

少なくとも 1 つの LLM provider key が必要です。最安構成では OpenRouter key を使い、無料 model を指定します。

推奨:

```env
OPENROUTER_API_KEY="..."
FLUE_MODEL="openrouter/qwen/qwen3-coder:free"
FLUE_ISSUE_TRIAGE_MODEL="openrouter/qwen/qwen3-coder:free"
FLUE_PR_REVIEW_MODEL="openrouter/qwen/qwen3-coder:free"
```

PR review の精度を上げる場合は、有料 model を別途指定します。例:

```env
FLUE_PR_REVIEW_MODEL="anthropic/claude-sonnet-4-6"
ANTHROPIC_API_KEY="..."
```

### 4. GitHub Token

最小構成では fine-grained personal access token で始められます。

Repository access:

- 対象 repo のみに限定

Permissions:

- Metadata: read
- Contents: read
- Issues: read/write
- Pull requests: read/write

この example は issue から実装 branch と PR を作るため、`Contents: write` と `Pull requests: write` が必要です。PR への summary comment は issue comment API で投稿します。GitHub では PR も issue として comment できるため、PR summary comment には `Issues: write` が必要です。implementation status label を自動作成する場合も `Issues: write` が必要です。

```env
GITHUB_TOKEN="github_pat_..."
```

長期運用では GitHub App の方が安全です。権限を repo 単位で絞り、installation token を短命にできます。

### 5. Cloudflare Secrets

Local development では `.dev.vars` を使います。

```bash
cp .dev.vars.example .dev.vars
```

Production secrets は Wrangler で登録します。

以下は `example/github-review-triage/` directory で実行してください。

```bash
npm run secret:openrouter
npm run secret:github-token
npm run secret:github-webhook
```

直接 agent HTTP route も外部に公開するなら、operator token も設定します。

```bash
npm run secret:agent-http
```

repo root から実行する場合は、Wrangler config path を明示します。

```bash
npx wrangler secret put OPENROUTER_API_KEY --config example/github-review-triage/wrangler.jsonc
npx wrangler secret put GITHUB_TOKEN --config example/github-review-triage/wrangler.jsonc
npx wrangler secret put GITHUB_WEBHOOK_SECRET --config example/github-review-triage/wrangler.jsonc
```

`GITHUB_WRITE_MODE` や model 指定などの非 secret 値は `wrangler.jsonc` の `vars` に入れています。

### 6. GitHub Webhook

GitHub repo の `Settings > Webhooks` で webhook を作ります。

Payload URL:

```text
https://flue-github-review-triage.<your-subdomain>.workers.dev/webhooks/github
```

Content type:

```text
application/json
```

Secret:

```env
GITHUB_WEBHOOK_SECRET="long-random-string"
```

Events:

- Issues
- Pull requests

### 7. Issue To PR Implementation

GitHub issue から実装依頼を投げるには、issue に `agent:implement` label を付けます。

```markdown
## 実装依頼

study/ に Flue の channel 概念を説明する章を追加してください。

## 期待する変更

- `study/05-channels.md` を追加
- `study/README.md` の学習順に追記
```

起動条件:

- `issues` webhook event
- action が `opened`, `reopened`, `edited`, `labeled`
- issue body が空ではない
- issue に `agent:implement` label がある
- issue に `agent:in-progress` / `agent:pr-opened` / `agent:failed` / `agent:needs-human` label がない

実装 agent は `issue-implement/` prefix の branch だけを作り、PR として変更を出します。`main` へ直接 push しません。

Implementation settings:

```env
FLUE_REPO_IMPLEMENTATION_MODEL="openrouter/nvidia/nemotron-3-ultra-550b-a55b:free"
IMPLEMENTATION_REPO_OWNER="t-nakatani"
IMPLEMENTATION_REPO_NAME="flue-framework"
IMPLEMENTATION_BASE_BRANCH="main"
IMPLEMENTATION_BRANCH_PREFIX="issue-implement/"
IMPLEMENTATION_TRIGGER_LABEL="agent:implement"
IMPLEMENTATION_MAX_FILE_WRITES="5"
IMPLEMENTATION_MAX_FILE_CHARS="200000"
```

Status labels:

| Label | Meaning |
| --- | --- |
| `agent:implement` | 実装依頼として agent を起動する |
| `agent:in-progress` | agent が処理中 |
| `agent:pr-opened` | PR 作成済み |
| `agent:failed` | agent 実行失敗 |
| `agent:needs-human` | 依頼が曖昧、大きすぎる、または権限外 |

### 8. Write Mode

初期値は dry-run です。

```env
GITHUB_WRITE_MODE=false
```

実際に GitHub にコメントやラベルを反映する場合:

```env
GITHUB_WRITE_MODE=true
```

## Install

```bash
npm install
```

## Environment

Cloudflare local development:

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars` に provider key、GitHub token、webhook secret を入れます。`.dev.vars` は commit しないでください。

Node workflow を CLI で手動検証したい場合だけ、`.env.example` から `.env` を作ります。

## Run Locally On Cloudflare

```bash
npm run dev:cloudflare
```

Health check:

```bash
curl http://localhost:3583/health
```

GitHub webhook の local test は、GitHub webhook signature が必要なので、実際には `cloudflared tunnel` や `ngrok` で `localhost:3583` を公開して GitHub から送るのが楽です。

## Build And Deploy To Cloudflare

Build:

```bash
npm run build:cloudflare
```

Dry run:

```bash
npm run dry-run:cloudflare
```

Deploy:

```bash
npm run deploy:cloudflare
```

The deploy command uses:

```text
dist/flue_github_review_triage/wrangler.json
```

Do not deploy the source-root `wrangler.jsonc` directly; Flue writes generated Worker entrypoints, Durable Object bindings, and Vite output under `dist/`.

## Run Manually With Node Target

These commands are useful for one-shot local workflow debugging, but they do not exercise the Cloudflare Durable Object runtime.

Issue triage workflow:

```bash
npx flue run triage-issue --target node --payload '{"owner":"OWNER","repo":"REPO","issueNumber":123,"apply":false}'
```

PR review workflow:

```bash
npx flue run review-pr --target node --payload '{"owner":"OWNER","repo":"REPO","pullNumber":123,"apply":false}'
```

`apply:true` を指定しても、`GITHUB_WRITE_MODE=true` でない限り GitHub への書き込み tool は dry-run になります。

## Direct Agent Access

agent は次の ID 形式で GitHub resource に bind します。

```text
OWNER/REPO#123
```

例:

```bash
npx flue connect github-issue-triage OWNER/REPO#123
npx flue connect github-pr-reviewer OWNER/REPO#123
```

deployed HTTP access を公開する場合は、`AGENT_HTTP_TOKEN` を設定してください。未設定の production では直接 HTTP route は拒否されます。

## Safety Notes

- `GITHUB_WRITE_MODE=false` で挙動を確認してから write mode にする
- token は対象 repo のみに限定する
- `TRIAGE_LABELS` で agent が追加できる label を制限する
- PR review は最初 `openrouter/qwen/qwen3-coder:free` で試し、品質や安定性が足りない場合だけ有料 model に切り替える
- 大きな diff は `GITHUB_MAX_DIFF_CHARS` で切り詰める
- Cloudflare Durable Object recovery は少なくとも一度の処理になり得るため、コメント投稿など外部 side effect は重複に注意する

## Official Docs Used

- Flue Getting Started: https://flueframework.com/docs/getting-started/quickstart/
- Agents: https://flueframework.com/docs/guide/building-agents/
- Workflows: https://flueframework.com/docs/guide/workflows/
- Tools: https://flueframework.com/docs/guide/tools/
- Skills: https://flueframework.com/docs/guide/skills/
- Sandboxes: https://flueframework.com/docs/guide/sandboxes/
- Channels: https://flueframework.com/docs/guide/channels/
- Cloudflare Deploy: https://flueframework.com/docs/ecosystem/deploy/cloudflare/
