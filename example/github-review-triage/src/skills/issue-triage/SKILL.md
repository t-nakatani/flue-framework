---
name: issue-triage
description: Triage GitHub issues by severity, reproducibility, ownership hints, and next action, using only evidence from the issue context.
---

# Issue Triage

Use this skill when handling a GitHub issue.

## Process

1. Read the bound issue context before making a decision.
2. Identify the user-visible problem or request in one sentence.
3. Decide whether the issue is a bug, enhancement, documentation request, question, or needs more reproduction detail.
4. Choose the lowest sufficient priority label.
5. Ask for missing reproduction details only when they block progress.
6. If writing a comment, keep it short and operational.

## Label Guidance

- `bug`: something appears broken against expected behavior.
- `enhancement`: new behavior or product improvement.
- `documentation`: docs are missing, confusing, or stale.
- `question`: the issue is primarily a usage question.
- `needs-repro`: the issue cannot be acted on without reproduction details.
- `priority-high`: severe user impact, data loss, security concern, production outage, or many users blocked.
- `priority-medium`: real product impact but workaround exists or scope is limited.
- `priority-low`: minor issue, unclear impact, cleanup, or low urgency.

## Rules

- Do not close issues.
- Do not invent repository-specific ownership if the context does not show it.
- Do not add labels outside the allowed label list returned by tools.
- Prefer no comment over a noisy comment when the issue is already clear.
- If tool output says dry-run, still complete the reasoning and report what would have happened.

