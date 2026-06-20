# 02. Agent と Harness

## Flue における agent の定義

Flue の説明では、agent は「LLM が harness の中で動いているもの」として扱われます。

LLM 単体は、入力 text を受け取り、出力 text を返すだけです。LLM 自体には、永続的な記憶、ファイルシステム、コマンド実行、外部 API 呼び出し、作業状態の保存、安全な実行境界はありません。

それらを与えるのが harness です。

## Harness とは

Harness は、モデルが現実のタスクを進めるための作業環境です。

主な構成要素は次の通りです。

- `model`: どの LLM を使うか
- `instructions`: agent の役割、制約、作業方針
- `tools`: application code を呼び出すための typed action
- `skills`: 再利用可能な専門知識や手順
- `sandbox`: ファイル操作やコマンド実行の境界
- `sessions`: 会話や作業文脈の単位
- `cwd`: agent が作業する workspace の位置
- `subagents`: 親 agent が委任できる専門 role

## なぜ harness が重要か

手順をすべて code に書く workflow は、入力が予測可能なときには強いです。しかし、現実のタスクでは、調査、試行、失敗、再確認、修正が必要になります。

Flue の harness-first な考え方では、開発者は細かい手順を固定するのではなく、agent が自律的に作業できる条件を整えます。

たとえば、bug triage agent なら、次のように考えます。

- issue を読む tool が必要
- repo を読む sandbox が必要
- 再現手順を試す command 実行環境が必要
- review や triage の skill が必要
- 回答方針を instructions に書く必要がある
- session history を保存して後続対応を続けられる必要がある

## Addressable agent と workflow 内 agent

Flue では、agent の使われ方に大きく 2 種類あります。

### Addressable agent

`src/agents/` に置かれる agent です。ファイル名が agent 名になり、継続的な interaction を受けられます。

例:

```text
src/agents/support-assistant.ts
```

この場合、`support-assistant` という agent として discover されます。

向いている用途:

- サポート assistant
- Slack/Discord/GitHub issue とつながる bot
- 継続的な会話や状態を持つ agent

### Workflow 内 agent

`src/workflows/` の `run(...)` 内で agent を初期化して、一回の処理を完了させる使い方です。

向いている用途:

- document summary
- code review job
- CI task
- ticket 分類
- background processing

## Agent と workflow の違い

ざっくり言うと、agent は「続く会話」、workflow は「完了する仕事」です。

| 種類 | 性質 | 例 |
| --- | --- | --- |
| Agent | 継続的な session を持つ | support assistant, issue triage bot |
| Workflow | 1 回の input から result を返す | summarize, review, classify |

どちらも内部では `createAgent(...)` を使えますが、外から見た lifecycle が違います。

## 重要な理解

Flue では、agent の価値は prompt の巧さだけでは決まりません。

重要なのは、次の組み合わせです。

1. 何を目的にするか
2. どの model を使うか
3. どんな指示を与えるか
4. どんな tool を許すか
5. どんな skill を持たせるか
6. どんな sandbox で作業させるか
7. どの session を継続させるか

この組み合わせ全体が harness です。

