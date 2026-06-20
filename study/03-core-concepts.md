# 03. 主要概念の索引

このファイルは、Flue の主要概念を短く整理する索引です。詳細は今後、各章に分けて追記します。

## Agents

Agents は、継続的な context の中で動く model-backed な実行単位です。

`src/agents/` 配下の file が discover され、file name が agent name になります。agent file は `createAgent(...)` の default export を持ちます。

使いどころ:

- 会話が続く assistant
- 外部 event を受けて対応を続ける bot
- 過去の session context を使って次の依頼に対応する agent

## Workflows

Workflows は、明確な input を受け取り、1 つの仕事を完了して result を返す実行単位です。

`src/workflows/` 配下の file が discover され、`run(...)` function を export します。workflow 内で agent を初期化し、session に prompt を投げ、結果を加工して返せます。

使いどころ:

- document transformation
- summarization
- CI 上の review
- ticket classification
- background job

## Tools

Tools は、agent が application code を実行するための typed action です。

たとえば、注文状況を調べる、support ticket を作る、社内 DB を query する、といった操作を tool にします。Flue では `defineTool(...)` で name、description、parameters、execute を定義します。

注意点:

- tool は application code を実行する能力
- skill は instruction や知識
- filesystem や command 実行は sandbox の役割

## Skills

Skills は、agent が必要に応じて load できる再利用可能な instructions と supporting resources です。

典型例:

- code review checklist
- incident response 手順
- product support の判断基準
- 特定 domain の調査手順

Skill は executable capability ではありません。実際に外部へ作用する能力は tools や sandbox で与えます。

## Sandboxes

Sandboxes は、agent が file を読み書きし、command を実行する workspace の境界です。

Flue は default で lightweight な virtual sandbox を使えます。Node.js target では `local()` を使うと host filesystem と shell に直接触れる local sandbox を構成できます。より強い隔離が必要な場合は remote sandbox を検討します。

判断基準:

- text response だけでよい: sandbox はあまり重要でない
- file を渡して成果物を返したい: virtual sandbox が出発点
- repo checkout を直接触らせたい: trusted な環境で local sandbox
- 分離された VM/コンテナが必要: remote sandbox

## Subagents

Subagents は、親 agent が一部の作業を専門 role に委任するための仕組みです。

`defineAgentProfile(...)` で profile を定義し、親 agent の `subagents` に渡します。subagent は別 endpoint として expose される agent ではなく、親 agent の内部で delegated task を処理する child session として動きます。

使いどころ:

- 分類 specialist
- 調査 specialist
- review specialist
- planning specialist

## Durable execution

Durable execution は、server restart、deploy、connection loss、unexpected failure があっても、受け付けた作業や session history を失わずに復帰するための考え方です。

Flue では、継続的な agent と finite workflow で durability の扱いが異なります。

- Agent: session history を保存し、後続 input で同じ文脈を再開する
- Workflow: run ごとに result/error/event を持つ完了単位として扱う

Cloudflare target では Durable Object-backed agents など、platform の durable な仕組みと組み合わせた実行が説明されています。

## Project layout

Flue は project の source directory から entrypoint を discover します。新規 project では `src/` を使うのが標準です。

代表的な layout:

```text
src/
  app.ts
  cloudflare.ts
  agents/
    support-assistant.ts
  workflows/
    summarize-ticket.ts
  channels/
    github.ts
```

意味:

- `app.ts`: application routes や middleware と Flue routes を合成する entrypoint
- `cloudflare.ts`: Cloudflare target 用の module
- `agents/`: 継続的な agent
- `workflows/`: 1 回の仕事を完了する workflow
- `channels/`: provider からの verified HTTP ingress

## 概念間の関係

```text
Flue application
  ├─ agents/      continuing contexts
  ├─ workflows/   finite jobs
  ├─ tools        application actions
  ├─ skills       reusable instructions
  ├─ sandboxes    file/command workspace
  ├─ subagents    delegated specialist roles
  └─ persistence  session/run history
```

## 次に深掘りする候補

1. `createAgent(...)` の configuration fields
2. `src/agents/` と HTTP exposure
3. workflow の `run(...)` と `FlueContext`
4. tool schema と validation
5. skill directory の構造
6. virtual/local/remote sandbox の使い分け

