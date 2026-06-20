import { createAgent, type FlueContext } from '@flue/runtime';
import * as v from 'valibot';
import issueTriage from '../skills/issue-triage/SKILL.md' with { type: 'skill' };
import { createIssueTriageTools } from '../shared/github-tools.ts';
import type { GitHubRef } from '../shared/github-ref.ts';
import { modelFor } from '../shared/model.ts';
import type { AppEnv } from '../shared/env.ts';

type Payload = {
  owner: string;
  repo: string;
  issueNumber: number;
  apply?: boolean;
};

const triageAgent = createAgent<Payload, AppEnv>(({ env }) => ({
  model: modelFor('issue-triage', env),
  instructions: [
    'You triage one GitHub issue.',
    'Inspect issue context first.',
    'Return structured triage data.',
    'Only call write tools when the workflow payload explicitly says apply=true.',
  ].join('\n'),
  skills: [issueTriage],
}));

const resultSchema = v.object({
  summary: v.string(),
  category: v.picklist(['bug', 'enhancement', 'documentation', 'question', 'needs-repro', 'other']),
  priority: v.picklist(['low', 'medium', 'high']),
  labels: v.array(v.string()),
  comment: v.string(),
  needsHuman: v.boolean(),
});

export async function run({ init, payload, env }: FlueContext<Payload, AppEnv>) {
  const ref: GitHubRef = {
    owner: payload.owner,
    repo: payload.repo,
    number: payload.issueNumber,
  };

  const harness = await init(triageAgent, {
    tools: createIssueTriageTools(ref, env),
  });
  const session = await harness.session();

  const response = await session.prompt(
    [
      `Triage ${payload.owner}/${payload.repo}#${payload.issueNumber}.`,
      `apply=${payload.apply === true}`,
      'If apply=false, do not call mutating tools. Return the labels and comment you recommend.',
    ].join('\n'),
    { result: resultSchema },
  );

  return response.data;
}
