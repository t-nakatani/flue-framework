# 01. Flue の全体像

## Flue とは

Flue は、AI agent と workflow を TypeScript で作るための framework です。

公式サイトでは、Flue を「durable AI agents and workflows」を作るための programmable TypeScript harness と説明しています。つまり、LLM にただ質問を投げる SDK ではなく、LLM が継続的に作業するための実行環境をアプリケーション側から組み立てる framework です。

## 何を作るためのものか

Flue が向いているのは、次のようなものです。

- ユーザーや外部イベントから継続的に入力を受ける agent
- バックグラウンドで一回きりの処理を完了する workflow
- ファイルを読んだり、コマンドを実行したり、外部 API を呼んだりする agent
- GitHub、Slack、Discord、Teams などの作業場所とつながる agent
- Node.js、Cloudflare、CI、ローカル環境などに deploy したい agent

## Flue の中心思想

公式ドキュメントでは、Flue の設計思想として次の 3 つが強調されています。

### 1. Harness-first

Flue は、agent を「LLM に harness を与えたもの」と考えます。

ここでいう harness は、モデルが現実の作業をするための周辺環境です。たとえば、instructions、tools、skills、sessions、files、sandbox、MCP server などが含まれます。

重要なのは、開発者がすべての手順を script として書くのではなく、agent が作業できる環境を用意するという点です。モデルには目的を与え、手段の探索は harness 内で行わせます。

### 2. Open by default

Flue は、特定の model、sandbox、deploy 先に閉じない設計を目指しています。

モデルは対応 provider から選べます。sandbox は組み込みの virtual sandbox だけでなく、local や remote sandbox を選べます。deploy 先も Node.js や Cloudflare などを想定しています。

### 3. AI-first

Flue は、開発者が Codex や Claude Code のような coding agent と一緒に使う前提で設計されています。

セットアップや scaffolding も、手作業だけでなく coding agent に prompt を渡して進める流れが想定されています。この点は、通常の library というより、agent 開発そのものを agent と進めるための framework だと見ると理解しやすいです。

## Flue が解こうとしている問題

通常の LLM API 呼び出しでは、モデルは一回の request/response の中でしか動けません。記憶、作業場所、ファイル、コマンド実行、外部 API、失敗からの復帰などは、アプリケーション側が個別に実装する必要があります。

Flue はこの周辺部分を agent harness としてまとめます。

その結果、開発者が書くものは「手順の script」から「agent が作業できる環境の定義」に寄ります。

## 最小イメージ

Flue の agent は、概念的には次のような形です。

```ts
import { createAgent } from '@flue/runtime';

export default createAgent(() => ({
  model: 'anthropic/claude-sonnet-4-6',
  instructions: '与えられた問い合わせを調査し、根拠つきで回答する。',
  tools: [],
  skills: [],
}));
```

これは「モデルを呼ぶ関数」というより、「この agent はどの model を使い、どんな指示を持ち、どんな能力を持つか」を宣言するものです。

## 次に読む

次は `02-agent-and-harness.md` で、Flue がいう agent と harness をもう少し分解します。

