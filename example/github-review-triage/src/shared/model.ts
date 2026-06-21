import type { AppEnv } from './env.ts';
import { envValue } from './env.ts';

const defaultFreeOpenRouterModel = 'openrouter/qwen/qwen3-coder:free';

export function modelFor(kind: 'issue-triage' | 'pr-review' | 'repo-implementation', env?: AppEnv): string {
  if (kind === 'issue-triage') {
    return envValue(env, 'FLUE_ISSUE_TRIAGE_MODEL') ?? envValue(env, 'FLUE_MODEL') ?? defaultFreeOpenRouterModel;
  }

  if (kind === 'repo-implementation') {
    return envValue(env, 'FLUE_REPO_IMPLEMENTATION_MODEL') ?? envValue(env, 'FLUE_MODEL') ?? defaultFreeOpenRouterModel;
  }

  return envValue(env, 'FLUE_PR_REVIEW_MODEL') ?? envValue(env, 'FLUE_MODEL') ?? defaultFreeOpenRouterModel;
}
