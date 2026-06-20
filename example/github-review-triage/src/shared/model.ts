const defaultFreeOpenRouterModel = 'openrouter/qwen/qwen3-coder:free';

export function modelFor(kind: 'issue-triage' | 'pr-review'): string {
  if (kind === 'issue-triage') {
    return process.env.FLUE_ISSUE_TRIAGE_MODEL ?? process.env.FLUE_MODEL ?? defaultFreeOpenRouterModel;
  }

  return process.env.FLUE_PR_REVIEW_MODEL ?? process.env.FLUE_MODEL ?? defaultFreeOpenRouterModel;
}
