import { createAgent } from '@flue/runtime';
import prReview from '../skills/pr-review/SKILL.md' with { type: 'skill' };
import { createPullRequestReviewTools } from '../shared/github-tools.ts';
import { parseGitHubRef } from '../shared/github-ref.ts';
import { protectAgentHttp } from '../shared/http-auth.ts';
import { modelFor } from '../shared/model.ts';

export const description = 'Reviews one GitHub pull request and optionally posts a PR summary comment.';
export const route = protectAgentHttp;

export default createAgent(({ id }) => {
  const ref = parseGitHubRef(id);

  return {
    model: modelFor('pr-review'),
    instructions: [
      `You are reviewing GitHub pull request ${id}.`,
      'Use the pr-review skill.',
      'Read PR context and diff before producing findings.',
      'Report only actionable findings supported by evidence from the diff or PR context.',
      'If there are no actionable findings, say that clearly.',
      'Post a concise review summary comment through the bound tool.',
      'If write tools report dry-run, summarize the comment that would have been posted.',
    ].join('\n'),
    tools: createPullRequestReviewTools(ref),
    skills: [prReview],
  };
});

