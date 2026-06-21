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

export function createIssueImplementationTools(ref: GitHubRef, env?: AppEnv) {
  const repo = implementationRepo(ref, env);
  const maxBodyChars = Number(envValue(env, 'GITHUB_MAX_BODY_CHARS') ?? 12_000);
  const maxFileWrites = Number(envValue(env, 'IMPLEMENTATION_MAX_FILE_WRITES') ?? 5);
  const maxFileChars = Number(envValue(env, 'IMPLEMENTATION_MAX_FILE_CHARS') ?? 200_000);
  let createdBranch: string | undefined;
  let writeCount = 0;

  return [
    defineTool({
      name: 'get_bound_implementation_issue',
      description: 'Read the GitHub issue that requested implementation, including recent comments and labels.',
      parameters: v.object({}),
      async execute() {
        const client = getGitHubClient(env);
        const [issue, comments] = await Promise.all([
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
          targetRepository: repo,
          limits: {
            maxFileWrites,
            maxFileChars,
            branchPrefix: repo.branchPrefix,
          },
        });
      },
    }),
    defineTool({
      name: 'get_repository_tree',
      description: 'List text-oriented files in the implementation repository base branch.',
      parameters: v.object({}),
      async execute() {
        const client = getGitHubClient(env);
        const branch = await client.rest.repos.getBranch({
          owner: repo.owner,
          repo: repo.name,
          branch: repo.baseBranch,
        });
        const tree = await client.rest.git.getTree({
          owner: repo.owner,
          repo: repo.name,
          tree_sha: branch.data.commit.sha,
          recursive: 'true',
        });

        return stringifyForModel({
          owner: repo.owner,
          repo: repo.name,
          baseBranch: repo.baseBranch,
          files: tree.data.tree
            .filter((item) => item.type === 'blob' && item.path && !isDeniedPath(item.path))
            .map((item) => item.path)
            .slice(0, 1_000),
        });
      },
    }),
    defineTool({
      name: 'read_repository_file',
      description: 'Read a UTF-8 file from the implementation repository.',
      parameters: v.object({
        path: v.pipe(v.string(), v.description('Repository-relative file path to read.')),
        ref: v.optional(v.pipe(v.string(), v.description('Optional branch or commit ref. Defaults to the base branch.'))),
      }),
      async execute({ path, ref: fileRef }) {
        assertSafePath(path);
        const content = await readFileContent({
          env,
          owner: repo.owner,
          repo: repo.name,
          path,
          ref: fileRef ?? repo.baseBranch,
        });

        return truncate(content, maxFileChars);
      },
    }),
    defineTool({
      name: 'create_implementation_branch',
      description: 'Create a new implementation branch from the configured base branch.',
      parameters: v.object({
        slug: v.optional(v.pipe(v.string(), v.description('Short slug for the branch name.'))),
      }),
      async execute({ slug }) {
        const branch = `${repo.branchPrefix}${ref.number}-${sanitizeBranchSlug(slug ?? 'implementation')}`;

        if (createdBranch && createdBranch !== branch) {
          return `Implementation branch already created: ${createdBranch}`;
        }

        if (!githubWriteMode(env)) {
          createdBranch = branch;
          return `[dry-run] Would create branch ${branch} from ${repo.baseBranch}.`;
        }

        const client = getGitHubClient(env);
        const base = await client.rest.repos.getBranch({
          owner: repo.owner,
          repo: repo.name,
          branch: repo.baseBranch,
        });

        try {
          await client.rest.git.createRef({
            owner: repo.owner,
            repo: repo.name,
            ref: `refs/heads/${branch}`,
            sha: base.data.commit.sha,
          });
        } catch (error) {
          if (!isAlreadyExistsError(error)) throw error;
        }

        createdBranch = branch;
        return `Created branch ${branch} from ${repo.baseBranch}.`;
      },
    }),
    defineTool({
      name: 'write_file_to_branch',
      description: 'Create or update one UTF-8 text file on the implementation branch.',
      parameters: v.object({
        branch: v.pipe(v.string(), v.description('Implementation branch created by create_implementation_branch.')),
        path: v.pipe(v.string(), v.description('Repository-relative file path to write.')),
        content: v.pipe(v.string(), v.description('Full UTF-8 file content to write.')),
        message: v.optional(v.pipe(v.string(), v.description('Commit message for this file write.'))),
      }),
      async execute({ branch, path, content, message }) {
        assertImplementationBranch(branch, repo.branchPrefix, createdBranch);
        assertSafePath(path);

        if (writeCount >= maxFileWrites) {
          throw new Error(`File write limit exceeded. Maximum is ${maxFileWrites} files per issue.`);
        }

        if (content.length > maxFileChars) {
          throw new Error(`File is too large. Maximum is ${maxFileChars} characters.`);
        }

        if (looksBinary(content)) {
          throw new Error('Binary-looking content is not allowed.');
        }

        writeCount += 1;

        if (!githubWriteMode(env)) {
          return `[dry-run] Would write ${path} to ${branch} (${content.length} chars).`;
        }

        const client = getGitHubClient(env);
        const existing = await getExistingFileSha({
          env,
          owner: repo.owner,
          repo: repo.name,
          path,
          ref: branch,
        });

        await client.rest.repos.createOrUpdateFileContents({
          owner: repo.owner,
          repo: repo.name,
          path,
          branch,
          message: message ?? `Update ${path} from issue #${ref.number}`,
          content: Buffer.from(content, 'utf8').toString('base64'),
          sha: existing,
        });

        return `Wrote ${path} to ${branch}.`;
      },
    }),
    defineTool({
      name: 'create_pull_request',
      description: 'Open a pull request from the implementation branch to the configured base branch.',
      parameters: v.object({
        branch: v.pipe(v.string(), v.description('Implementation branch created by create_implementation_branch.')),
        title: v.pipe(v.string(), v.description('Pull request title.')),
        body: v.pipe(v.string(), v.description('Pull request body in Markdown.')),
      }),
      async execute({ branch, title, body }) {
        assertImplementationBranch(branch, repo.branchPrefix, createdBranch);

        if (writeCount === 0) {
          throw new Error('Refusing to open a pull request before at least one file has been written.');
        }

        const finalBody = `${body.trim()}\n\nCloses ${formatRef(ref)}`;

        if (!githubWriteMode(env)) {
          return `[dry-run] Would create PR from ${branch} to ${repo.baseBranch}:\n\n${title}\n\n${finalBody}`;
        }

        const pull = await getGitHubClient(env).rest.pulls.create({
          owner: repo.owner,
          repo: repo.name,
          head: branch,
          base: repo.baseBranch,
          title,
          body: finalBody,
        });

        return stringifyForModel({
          number: pull.data.number,
          title: pull.data.title,
          url: pull.data.html_url,
        });
      },
    }),
    defineTool({
      name: 'comment_on_implementation_issue',
      description: 'Post a status comment on the issue that requested implementation.',
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
    defineTool({
      name: 'mark_implementation_status',
      description: 'Add and remove implementation status labels on the bound issue.',
      parameters: v.object({
        add: v.optional(v.array(v.string())),
        remove: v.optional(v.array(v.string())),
      }),
      async execute({ add, remove }) {
        const allowed = implementationStatusLabels(env);
        const labelsToAdd = (add ?? []).filter((label) => allowed.includes(label));
        const labelsToRemove = (remove ?? []).filter((label) => allowed.includes(label));

        if (!githubWriteMode(env)) {
          return `[dry-run] Would add labels [${labelsToAdd.join(', ')}] and remove labels [${labelsToRemove.join(', ')}] on ${formatRef(ref)}.`;
        }

        const client = getGitHubClient(env);
        await Promise.all(labelsToAdd.map((label) => ensureLabel(client, ref.owner, ref.repo, label)));

        if (labelsToAdd.length > 0) {
          await client.rest.issues.addLabels({
            owner: ref.owner,
            repo: ref.repo,
            issue_number: ref.number,
            labels: labelsToAdd,
          });
        }

        for (const label of labelsToRemove) {
          try {
            await client.rest.issues.removeLabel({
              owner: ref.owner,
              repo: ref.repo,
              issue_number: ref.number,
              name: label,
            });
          } catch (error) {
            if (!isNotFoundError(error)) throw error;
          }
        }

        return `Updated implementation status labels on ${formatRef(ref)}.`;
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

function implementationStatusLabels(env?: AppEnv): string[] {
  return [
    implementationTriggerLabel(env),
    'agent:in-progress',
    'agent:pr-opened',
    'agent:failed',
    'agent:needs-human',
  ];
}

function implementationTriggerLabel(env?: AppEnv): string {
  return envValue(env, 'IMPLEMENTATION_TRIGGER_LABEL') ?? 'agent:implement';
}

type ImplementationRepo = {
  owner: string;
  name: string;
  baseBranch: string;
  branchPrefix: string;
};

function implementationRepo(ref: GitHubRef, env?: AppEnv): ImplementationRepo {
  return {
    owner: envValue(env, 'IMPLEMENTATION_REPO_OWNER') ?? ref.owner,
    name: envValue(env, 'IMPLEMENTATION_REPO_NAME') ?? ref.repo,
    baseBranch: envValue(env, 'IMPLEMENTATION_BASE_BRANCH') ?? 'main',
    branchPrefix: envValue(env, 'IMPLEMENTATION_BRANCH_PREFIX') ?? 'issue-implement/',
  };
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

async function readFileContent(args: {
  env?: AppEnv;
  owner: string;
  repo: string;
  path: string;
  ref: string;
}): Promise<string> {
  const response = await getGitHubClient(args.env).rest.repos.getContent({
    owner: args.owner,
    repo: args.repo,
    path: args.path,
    ref: args.ref,
  });

  if (Array.isArray(response.data) || response.data.type !== 'file' || !('content' in response.data)) {
    throw new Error(`${args.path} is not a readable file.`);
  }

  return Buffer.from(response.data.content, 'base64').toString('utf8');
}

async function getExistingFileSha(args: {
  env?: AppEnv;
  owner: string;
  repo: string;
  path: string;
  ref: string;
}): Promise<string | undefined> {
  try {
    const response = await getGitHubClient(args.env).rest.repos.getContent({
      owner: args.owner,
      repo: args.repo,
      path: args.path,
      ref: args.ref,
    });

    if (Array.isArray(response.data) || response.data.type !== 'file') return undefined;
    return response.data.sha;
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    throw error;
  }
}

function assertSafePath(path: string): void {
  const normalized = path.replaceAll('\\', '/').replace(/^\/+/, '');
  const segments = normalized.split('/');

  if (path !== normalized || segments.includes('..') || segments.includes('')) {
    throw new Error(`Unsafe path: ${path}`);
  }

  if (isDeniedPath(normalized)) {
    throw new Error(`Writes to ${path} are not allowed.`);
  }
}

function isDeniedPath(path: string): boolean {
  return (
    path === '.env' ||
    path.startsWith('.env.') ||
    path === '.dev.vars' ||
    path.startsWith('.dev.vars.') ||
    path === 'package-lock.json' ||
    path === 'pnpm-lock.yaml' ||
    path === 'yarn.lock' ||
    path === 'bun.lock' ||
    path === 'bun.lockb' ||
    path === '.git' ||
    path.startsWith('.git/') ||
    path === 'node_modules' ||
    path.startsWith('node_modules/') ||
    path === 'dist' ||
    path.startsWith('dist/') ||
    path === '.wrangler' ||
    path.startsWith('.wrangler/')
  );
}

function assertImplementationBranch(branch: string, branchPrefix: string, createdBranch: string | undefined): void {
  if (!branch.startsWith(branchPrefix)) {
    throw new Error(`Branch must start with ${branchPrefix}.`);
  }

  if (createdBranch && branch !== createdBranch) {
    throw new Error(`Branch must match the branch created by this run: ${createdBranch}.`);
  }
}

function sanitizeBranchSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return slug || 'implementation';
}

function looksBinary(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    const allowedWhitespace = code === 9 || code === 10 || code === 13;

    if ((code < 32 && !allowedWhitespace) || code === 127) {
      return true;
    }
  }

  return false;
}

async function ensureLabel(
  client: ReturnType<typeof getGitHubClient>,
  owner: string,
  repo: string,
  name: string,
): Promise<void> {
  try {
    await client.rest.issues.getLabel({ owner, repo, name });
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    await client.rest.issues.createLabel({
      owner,
      repo,
      name,
      color: implementationLabelColor(name),
      description: 'Managed by Flue implementation agents.',
    });
  }
}

function implementationLabelColor(name: string): string {
  if (name.endsWith('failed')) return 'd73a4a';
  if (name.endsWith('needs-human')) return 'fbca04';
  if (name.endsWith('pr-opened')) return '0e8a16';
  if (name.endsWith('in-progress')) return '1d76db';
  return '5319e7';
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 404;
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 422;
}
