import { defineTool } from '@flue/runtime';
import * as v from 'valibot';
import { getGitHubClient, githubWriteMode } from './github-client.ts';
import type { GitHubRef } from './github-ref.ts';
import type { AppEnv } from './env.ts';
import { envValue } from './env.ts';

export function createIssueTriageTools(ref: GitHubRef, env?: AppEnv) {
  const maxBodyChars = Number(envValue(env, 'GITHUB_MAX_BODY_CHARS') ?? 12_000);
  return [
    defineTool({
      name: 'get_bound_issue_context',
      description: 'Read the GitHub issue bound to this agent, including recent comments and repository labels.',
      parameters: v.object({}),
      async execute() {
        const client = getGitHubClient(env);
        const [issue, comments, labels] = await Promise.all([
          client.rest.issues.get({
            owner: ref.owner,
            repo: ref.repo,
            issue_number: ref.number,
          }),
          client.rest.issues.listComments({
            owner: ref.owner,
            repo: ref.repo,
            issue_number: ref.number,
            per_page: 20,
          }),
          client.rest.issues.listLabelsForRepo({
            owner: ref.owner,
            repo: ref.repo,
            per_page: 100,
          }),
        ]);

        return stringifyForModel({
          issue: {
            number: issue.data.number,
            title: issue.data.title,
            state: issue.data.state,
            author: issue.data.user?.login,
            labels: issue.data.labels.map((label) => (typeof label === 'string' ? label : label.name)),
            body: truncate(issue.data.body ?? '', maxBodyChars),
          },
          recentComments: comments.data.map((comment) => ({
            author: comment.user?.login,
            body: truncate(comment.body ?? '', 4_000),
          })),
          repositoryLabels: labels.data.map((label) => label.name),
          allowedLabels: allowedTriageLabels(env),
        });
      },
    }),
    defineTool({
      name: 'add_issue_labels',
      description: 'Add allowed labels to the GitHub issue bound to this agent.',
      parameters: v.object({
        labels: v.array(v.pipe(v.string(), v.description('Repository label to add. Must be an allowed triage label.'))),
      }),
      async execute({ labels }) {
        const allowed = allowedTriageLabels(env);
        const selected = labels.filter((label) => allowed.length === 0 || allowed.includes(label));

        if (selected.length === 0) {
          return `No labels were added. Allowed labels: ${allowed.join(', ') || '(not restricted)'}`;
        }

        if (!githubWriteMode(env)) {
          return `[dry-run] Would add labels to ${formatRef(ref)}: ${selected.join(', ')}`;
        }

        await getGitHubClient(env).rest.issues.addLabels({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: ref.number,
          labels: selected,
        });

        return `Added labels to ${formatRef(ref)}: ${selected.join(', ')}`;
      },
    }),
    defineTool({
      name: 'comment_on_issue',
      description: 'Post a triage comment on the GitHub issue bound to this agent.',
      parameters: v.object({
        body: v.pipe(v.string(), v.description('Markdown body for the issue comment.')),
      }),
      async execute({ body }) {
        if (!githubWriteMode(env)) {
          return `[dry-run] Would comment on ${formatRef(ref)}:\n\n${body}`;
        }

        await getGitHubClient(env).rest.issues.createComment({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: ref.number,
          body,
        });

        return `Comment posted on ${formatRef(ref)}.`;
      },
    }),
  ];
}

export function createPullRequestReviewTools(ref: GitHubRef, env?: AppEnv) {
  const maxBodyChars = Number(envValue(env, 'GITHUB_MAX_BODY_CHARS') ?? 12_000);
  const maxDiffChars = Number(envValue(env, 'GITHUB_MAX_DIFF_CHARS') ?? 60_000);

  return [
    defineTool({
      name: 'get_bound_pull_request_context',
      description: 'Read the GitHub pull request bound to this agent, including changed files.',
      parameters: v.object({}),
      async execute() {
        const client = getGitHubClient(env);
        const [pull, files] = await Promise.all([
          client.rest.pulls.get({
            owner: ref.owner,
            repo: ref.repo,
            pull_number: ref.number,
          }),
          client.rest.pulls.listFiles({
            owner: ref.owner,
            repo: ref.repo,
            pull_number: ref.number,
            per_page: 100,
          }),
        ]);

        return stringifyForModel({
          pullRequest: {
            number: pull.data.number,
            title: pull.data.title,
            state: pull.data.state,
            draft: pull.data.draft,
            author: pull.data.user?.login,
            base: pull.data.base.ref,
            head: pull.data.head.ref,
            body: truncate(pull.data.body ?? '', maxBodyChars),
          },
          files: files.data.map((file) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            patch: truncate(file.patch ?? '', 8_000),
          })),
        });
      },
    }),
    defineTool({
      name: 'get_bound_pull_request_diff',
      description: 'Read the raw unified diff for the GitHub pull request bound to this agent.',
      parameters: v.object({}),
      async execute() {
        const diff = await getGitHubClient(env).request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
          owner: ref.owner,
          repo: ref.repo,
          pull_number: ref.number,
          mediaType: {
            format: 'diff',
          },
        });

        return truncate(String(diff.data), maxDiffChars);
      },
    }),
    defineTool({
      name: 'comment_on_pull_request',
      description: 'Post a pull request review summary comment on the GitHub PR bound to this agent.',
      parameters: v.object({
        body: v.pipe(v.string(), v.description('Markdown body for the pull request comment.')),
      }),
      async execute({ body }) {
        if (!githubWriteMode(env)) {
          return `[dry-run] Would comment on PR ${formatRef(ref)}:\n\n${body}`;
        }

        await getGitHubClient(env).rest.issues.createComment({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: ref.number,
          body,
        });

        return `Comment posted on PR ${formatRef(ref)}.`;
      },
    }),
    defineTool({
      name: 'add_pull_request_labels',
      description: 'Add allowed triage labels to the GitHub pull request bound to this agent.',
      parameters: v.object({
        labels: v.array(v.pipe(v.string(), v.description('Repository label to add. Must be an allowed triage label.'))),
      }),
      async execute({ labels }) {
        const allowed = allowedTriageLabels(env);
        const selected = labels.filter((label) => allowed.length === 0 || allowed.includes(label));

        if (selected.length === 0) {
          return `No labels were added. Allowed labels: ${allowed.join(', ') || '(not restricted)'}`;
        }

        if (!githubWriteMode(env)) {
          return `[dry-run] Would add labels to PR ${formatRef(ref)}: ${selected.join(', ')}`;
        }

        await getGitHubClient(env).rest.issues.addLabels({
          owner: ref.owner,
          repo: ref.repo,
          issue_number: ref.number,
          labels: selected,
        });

        return `Added labels to PR ${formatRef(ref)}: ${selected.join(', ')}`;
      },
    }),
  ];
}

function allowedTriageLabels(env?: AppEnv): string[] {
  return (envValue(env, 'TRIAGE_LABELS') ?? '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
}

function formatRef(ref: GitHubRef): string {
  return `${ref.owner}/${ref.repo}#${ref.number}`;
}

function stringifyForModel(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n\n[truncated ${value.length - maxChars} chars]`;
}
