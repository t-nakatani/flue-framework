import { dispatch } from '@flue/runtime';
import { flue } from '@flue/runtime/routing';
import { Hono } from 'hono';
import issueTriageAgent from './agents/github-issue-triage.ts';
import prReviewerAgent from './agents/github-pr-reviewer.ts';
import type { AppEnv } from './shared/env.ts';
import { envValue } from './shared/env.ts';
import { encodeGitHubRef } from './shared/github-ref.ts';
import { verifyGitHubWebhookSignature } from './shared/github-webhook.ts';

const app = new Hono<{ Bindings: AppEnv }>();

app.get('/health', (c) => c.json({ ok: true }));

app.post('/webhooks/github', async (c) => {
  const secret = envValue(c.env, 'GITHUB_WEBHOOK_SECRET');
  if (!secret) return c.json({ error: 'GITHUB_WEBHOOK_SECRET is not configured.' }, 500);

  const body = await c.req.text();
  const valid = await verifyGitHubWebhookSignature({
    secret,
    body,
    signature256: c.req.header('x-hub-signature-256'),
  });

  if (!valid) return c.json({ error: 'Invalid GitHub webhook signature.' }, 401);

  const eventName = c.req.header('x-github-event') ?? '';
  const deliveryId = c.req.header('x-github-delivery') ?? '';
  const payload = JSON.parse(body) as GitHubWebhookPayload;

  if (eventName === 'issues' && shouldTriageIssue(payload)) {
    const id = encodeGitHubRef({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      number: payload.issue.number,
    });

    const receipt = await dispatch(issueTriageAgent, {
      id,
      input: {
        type: 'github.issue',
        deliveryId,
        action: payload.action,
        title: payload.issue.title,
        url: payload.issue.html_url,
      },
    });

    return c.json({ accepted: true, agent: 'github-issue-triage', id, receipt }, 202);
  }

  if (eventName === 'pull_request' && shouldReviewPullRequest(payload)) {
    const id = encodeGitHubRef({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      number: payload.pull_request.number,
    });

    const receipt = await dispatch(prReviewerAgent, {
      id,
      input: {
        type: 'github.pull_request',
        deliveryId,
        action: payload.action,
        title: payload.pull_request.title,
        url: payload.pull_request.html_url,
      },
    });

    return c.json({ accepted: true, agent: 'github-pr-reviewer', id, receipt }, 202);
  }

  return c.json({ accepted: false, reason: `Ignored ${eventName}:${payload.action ?? 'unknown'}` });
});

app.route('/', flue());

export default app;

type GitHubWebhookPayload = {
  action?: string;
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
  issue?: {
    number: number;
    title: string;
    html_url: string;
  };
  pull_request?: {
    number: number;
    title: string;
    html_url: string;
    draft?: boolean;
  };
};

function shouldTriageIssue(payload: GitHubWebhookPayload): payload is GitHubWebhookPayload & {
  issue: NonNullable<GitHubWebhookPayload['issue']>;
} {
  return ['opened', 'reopened', 'edited'].includes(payload.action ?? '') && Boolean(payload.issue);
}

function shouldReviewPullRequest(payload: GitHubWebhookPayload): payload is GitHubWebhookPayload & {
  pull_request: NonNullable<GitHubWebhookPayload['pull_request']>;
} {
  const pullRequest = payload.pull_request;

  return (
    ['opened', 'reopened', 'synchronize', 'ready_for_review'].includes(payload.action ?? '') &&
    pullRequest !== undefined &&
    pullRequest.draft !== true
  );
}
