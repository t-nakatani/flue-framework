import { createAgent } from '@flue/runtime';
import repoImplementation from '../skills/repo-implementation/SKILL.md' with { type: 'skill' };
import { createIssueImplementationTools } from '../shared/github-tools.ts';
import { parseGitHubRef } from '../shared/github-ref.ts';
import { protectAgentHttp } from '../shared/http-auth.ts';
import { modelFor } from '../shared/model.ts';
import type { AppEnv } from '../shared/env.ts';

export const description = 'Implements one GitHub issue by opening a pull request with constrained repository edits.';
export const route = protectAgentHttp;

export default createAgent<unknown, AppEnv>(({ id, env }) => {
  const ref = parseGitHubRef(id);

  return {
    model: modelFor('repo-implementation', env),
    instructions: [
      `You are implementing GitHub issue ${id}.`,
      'Use the repo-implementation skill.',
      'Always inspect the bound issue before making changes.',
      'Keep the implementation small and aligned with the repository style.',
      'Use only the provided GitHub repository tools. Do not ask for shell access.',
      'Create exactly one implementation branch before writing files.',
      'Open a pull request only after writing at least one file.',
      'If the request is too ambiguous, too large, or requires forbidden paths, mark the issue as agent:needs-human and explain why.',
      'On success, mark the issue as agent:pr-opened and remove agent:in-progress and agent:failed.',
      'On failure that you can report, mark the issue as agent:failed and comment with the blocker.',
      'If write tools report dry-run, summarize the actions that would have been taken.',
    ].join('\n'),
    tools: createIssueImplementationTools(ref, env),
    skills: [repoImplementation],
  };
});
