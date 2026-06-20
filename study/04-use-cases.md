# 04. Flue で作れるもののイメージ

Flue は「LLM に質問して答えを返す」だけの用途よりも、agent が作業環境の中で調べ、判断し、道具を使い、必要ならファイルや外部システムを変更する用途に向いています。

この章では、作れるものを具体例として整理します。

## 1. GitHub issue triage agent

### 何を作るか

GitHub issue が作られたら、内容を読み、再現性・影響範囲・優先度・担当領域を判断し、必要ならラベル付けやコメントを行う agent です。

### Flue ではどう組むか

- `src/agents/issue-triage.ts` に継続的な agent を置く
- GitHub webhook を `channels/` または `app.ts` の route で受ける
- issue 読み取り、ラベル付け、コメント投稿を `tools` として定義する
- triage 手順や severity 判断基準を `skills` にする
- repository を読む必要があるなら `sandbox` を使う
- issue ごとの対応履歴を `session` として保持する

### Flue が向いている理由

単発の分類だけなら普通の LLM API でもできます。しかし、triage は「issue を読む」「過去文脈を見る」「repo を確認する」「ラベルを付ける」「コメントを書く」「後続コメントに対応する」という継続的な作業になりやすいです。Flue の agent と session の考え方が合います。

## 2. Pull request reviewer

### 何を作るか

PR の diff を読み、リスクのある変更、bug、テスト不足、設計上の懸念を指摘する reviewer です。

### Flue ではどう組むか

- `src/workflows/review-pr.ts` として一回の review job にする
- PR 情報や diff を取得する `tools` を用意する
- repository checkout を `local()` または remote sandbox に渡す
- review checklist を `skills` にする
- 必要に応じて test command を sandbox 内で実行する
- 結果を workflow の return value として返す

### Flue が向いている理由

PR review は、diff の要約だけでは不十分です。関連ファイルを読む、型や test を確認する、変更意図と実装のズレを見る、といった行動が必要です。sandbox と tools を持つ agent にすると、実際の作業に近づきます。

## 3. Support assistant

### 何を作るか

ユーザーからの問い合わせに対し、注文状況、契約状態、過去の問い合わせ、社内 FAQ を参照しながら回答する assistant です。

### Flue ではどう組むか

- `src/agents/support-assistant.ts` に addressable agent を作る
- 注文検索、顧客情報検索、ticket 作成を `tools` にする
- support policy や escalation rule を `skills` にする
- Slack、Discord、Teams などの chat surface と接続する
- user/thread ごとに session を分ける

### Flue が向いている理由

問い合わせ対応は、会話が続きます。さらに、外部 data を参照したり、ticket を作ったり、権限に応じて操作を制限したりする必要があります。Flue の agent、tools、sessions の組み合わせが自然です。

## 4. Document processing workflow

### 何を作るか

契約書、議事録、仕様書、調査資料などを受け取り、要約、リスク抽出、形式変換、レビューコメント生成を行う workflow です。

### Flue ではどう組むか

- `src/workflows/review-document.ts` に finite workflow を作る
- 入力 document を virtual sandbox に書き込む
- agent に document を読ませ、結果 file を書かせる
- review 観点を `skills` にする
- workflow の result として structured output を返す

### Flue が向いている理由

document 処理は、明確な input と output があるため workflow に向いています。ファイルを staging して agent に作業させ、成果物を取り出すという sandbox の使い方もわかりやすいです。

## 5. Incident response assistant

### 何を作るか

障害発生時に、alert、log、runbook、dashboard 情報を読み、状況整理、初動案、影響範囲、次に確認すべきことを出す assistant です。

### Flue ではどう組むか

- `src/agents/incident-assistant.ts` に継続的な agent を作る
- alert provider や observability backend への query を `tools` にする
- incident runbook を `skills` にする
- 調査 specialist、communication specialist などを `subagents` に分ける
- incident channel ごとに session を保持する

### Flue が向いている理由

incident response は時間とともに文脈が増えます。最初の alert、調査結果、仮説、対応、未確認事項が積み重なるため、継続的な session と durable な履歴が重要になります。

## 6. Internal research agent

### 何を作るか

社内 document、repository、ticket、meeting note、外部情報を調べ、調査メモや意思決定材料を作る agent です。

### Flue ではどう組むか

- `src/agents/researcher.ts` に agent を作る
- document search、repo search、ticket search を `tools` にする
- 調査方法や citation rule を `skills` にする
- 必要に応じて sandbox 上で file を作らせる
- 調査対象ごとに session を分ける

### Flue が向いている理由

調査は「一発回答」よりも、仮説を立てる、情報を探す、矛盾を確認する、メモを更新する、追加質問に答える、という反復作業です。agent と harness の考え方にかなり近い用途です。

## 7. Code migration workflow

### 何を作るか

古い API の置き換え、dependency upgrade、framework 移行などを repo に対して実行する workflow です。

### Flue ではどう組むか

- `src/workflows/migrate-code.ts` に workflow を作る
- migration instruction を `skills` にする
- repository を local または remote sandbox に置く
- agent に検索、編集、test 実行を許可する
- 結果として patch、summary、test result を返す

### Flue が向いている理由

code migration は固定 script だけではこぼれやすい例外が多いです。agent に repo を読ませ、編集させ、test で確認させるには sandbox が必要です。

## 8. Multi-role analysis system

### 何を作るか

1 つの依頼に対して、調査担当、批判的レビュー担当、実装担当、要約担当のように複数 role で考える agent system です。

### Flue ではどう組むか

- 親 agent を `src/agents/analysis-lead.ts` に置く
- `defineAgentProfile(...)` で subagent を定義する
- 各 subagent に異なる instructions、tools、skills を与える
- 親 agent が必要なときに delegation する

### Flue が向いている理由

複雑な仕事では、1 つの prompt に全部を詰めるより、役割ごとに context と責務を分けた方が扱いやすいです。Flue の subagents はその分解に使えます。

## 最初に作るなら

最初の題材としては、次の順がよいです。

1. Document processing workflow
   - workflow、agent、virtual sandbox の関係が見えやすい
2. Support assistant
   - addressable agent と session の意味がわかりやすい
3. GitHub issue triage agent
   - tools、skills、channels、durability の必要性が見えやすい
4. PR reviewer
   - sandbox と実作業 agent の強みが見えやすい

## 判断の早見表

| 作りたいもの | Flue の中心概念 |
| --- | --- |
| 継続会話する assistant | agents, sessions, tools |
| 一回の job を完了する処理 | workflows |
| DB/API を読ませたい | tools |
| 手順や専門知識を持たせたい | skills |
| file や command を使わせたい | sandboxes |
| 役割分担させたい | subagents |
| 失敗や restart に強くしたい | durable execution |
| Slack/GitHub などから受けたい | channels, routing |

## 普通の LLM API との違い

普通の LLM API は「入力を渡して、出力を受け取る」ことが中心です。

Flue は、それに加えて次を framework として扱います。

- agent の作業環境
- session の継続
- tool 実行
- skill の packaging
- sandbox での file/command 操作
- workflow run の履歴
- deploy target
- observability

そのため、Flue は chatbot prototype よりも、「実際に仕事を受け取り、作業し、結果を残す agentic application」に向いています。

