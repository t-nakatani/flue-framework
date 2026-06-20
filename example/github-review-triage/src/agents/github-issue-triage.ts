import { createAgent } from '@flue/runtime';
import issueTriage from '../skills/issue-triage/SKILL.md' with { type: 'skill' };
import { createIssueTriageTools } from '../shared/github-tools.ts';
import { parseGitHubRef } from '../shared/github-ref.ts';
import { protectAgentHttp } from '../shared/http-auth.ts';
import { modelFor } from '../shared/model.ts';

export const description = 'Triages one GitHub issue, optionally labeling and commenting on it.';
export const route = protectAgentHttp;

export default createAgent(({ id }) => {
  const ref = parseGitHubRef(id);

  return {
    model: modelFor('issue-triage'),
    instructions: [
      `You are triaging GitHub issue ${id}.`,
      'Always inspect the bound issue context before deciding.',
      'Use the issue-triage skill.',
      'When confidence is high, use tools to add labels and post a concise operational comment.',
      'Never close issues. Never add labels outside the allowed label list.',
      'If write tools report dry-run, summarize the actions that would have been taken.',
    ].join('\n'),
    tools: createIssueTriageTools(ref),
    skills: [issueTriage],
  };
});

