# Flue Framework Study

このディレクトリは、Flue を主要概念から順に理解するための学習メモです。

公式サイトと公式ドキュメントを読み、まずは「Flue が何を抽象化しているのか」をつかむことを優先します。細かい API や CLI は、概念が見えてから後続の章で扱います。

## 学習順

1. `01-overview.md`
   - Flue の位置づけ
   - なぜ agent framework なのか
   - Flue が重視する設計思想
2. `02-agent-and-harness.md`
   - agent の定義
   - harness とは何か
   - agent を構成する部品
3. `03-core-concepts.md`
   - agents
   - workflows
   - tools
   - skills
   - sandboxes
   - subagents
   - durable execution
4. `04-use-cases.md`
   - Flue で作れるものの具体例
   - どの概念を使うのか
   - 最初に作るなら何がよいか

## まず押さえる一文

Flue は、TypeScript で AI agent と workflow を構築するための framework です。単なる LLM 呼び出しラッパーではなく、モデルに「作業環境、道具、記憶、指示、専門知識」を与える harness を中心に agent を作る設計です。

## 公式情報

- 公式サイト: https://flueframework.com/
- Getting Started: https://flueframework.com/docs/getting-started/quickstart/
- Why Flue?: https://flueframework.com/docs/introduction/why-flue/
- What is an agent?: https://flueframework.com/docs/concepts/agents/
- Durable Agents: https://flueframework.com/docs/concepts/durable-execution/
- Project Layout: https://flueframework.com/docs/guide/project-layout/
- Agents: https://flueframework.com/docs/guide/building-agents/
- Workflows: https://flueframework.com/docs/guide/workflows/
- Tools: https://flueframework.com/docs/guide/tools/
- Skills: https://flueframework.com/docs/guide/skills/
- Subagents: https://flueframework.com/docs/guide/subagents/
- Sandboxes: https://flueframework.com/docs/guide/sandboxes/
