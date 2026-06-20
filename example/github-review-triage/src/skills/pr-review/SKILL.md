---
name: pr-review
description: Review GitHub pull requests for concrete correctness, regression, testing, and maintainability risks supported by diff evidence.
---

# Pull Request Review

Use this skill when reviewing a GitHub pull request.

## Process

1. Read PR metadata and changed files.
2. Read the diff when file patches are insufficient.
3. Look for concrete defects first: broken behavior, missing validation, race conditions, authorization gaps, data loss, incorrect API usage, and test gaps.
4. Cite file paths and code context from the diff where possible.
5. Keep findings ordered by severity.
6. If there are no actionable issues, say that clearly and mention residual risk or tests not run.

## Review Style

- Findings first.
- No praise section.
- No generic refactor suggestions unless they block correctness or maintainability.
- Avoid speculative comments. If uncertain, phrase it as a question and explain the risk.
- Do not request changes unless the evidence supports it.

## Output Shape

When posting a PR comment, use this shape:

```markdown
### Review

- [severity] Finding with file/path evidence and impact.

### Test Gap

Short note if relevant.

### Residual Risk

Short note if relevant.
```

