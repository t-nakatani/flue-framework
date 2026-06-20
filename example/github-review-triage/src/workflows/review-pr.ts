import { createAgent, type FlueContext } from '@flue/runtime';
import * as v from 'valibot';
import prReview from '../skills/pr-review/SKILL.md' with { type: 'skill' };
import { createPullRequestReviewTools } from '../shared/github-tools.ts';
import type { GitHubRef } from '../shared/github-ref.ts';
import { modelFor } from '../shared/model.ts';
import type { AppEnv } from '../shared/env.ts';

type Payload = {
  owner: string;
  repo: string;
  pullNumber: number;
  apply?: boolean;
};

const reviewerAgent = createAgent<Payload, AppEnv>(({ env }) => ({
  model: modelFor('pr-review', env),
  instructions: [
    'You review one GitHub pull request.',
    'Inspect PR context and diff before giving findings.',
    'Return structured review data.',
    'Only call write tools when the workflow payload explicitly says apply=true.',
  ].join('\n'),
  skills: [prReview],
}));

const resultSchema = v.object({
  summary: v.string(),
  findings: v.array(
    v.object({
      severity: v.picklist(['low', 'medium', 'high']),
      title: v.string(),
      evidence: v.string(),
      recommendation: v.string(),
    }),
  ),
  testGap: v.string(),
  residualRisk: v.string(),
  comment: v.string(),
});

export async function run({ init, payload, env }: FlueContext<Payload, AppEnv>) {
  const ref: GitHubRef = {
    owner: payload.owner,
    repo: payload.repo,
    number: payload.pullNumber,
  };

  const harness = await init(reviewerAgent, {
    tools: createPullRequestReviewTools(ref, env),
  });
  const session = await harness.session();

  const response = await session.prompt(
    [
      `Review PR ${payload.owner}/${payload.repo}#${payload.pullNumber}.`,
      `apply=${payload.apply === true}`,
      'If apply=false, do not call mutating tools. Return the review comment you recommend.',
    ].join('\n'),
    { result: resultSchema },
  );

  return response.data;
}
