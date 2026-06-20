import { Octokit } from '@octokit/rest';
import type { AppEnv } from './env.ts';
import { envValue } from './env.ts';

let cachedClient: Octokit | undefined;
let cachedToken: string | undefined;

export function githubWriteMode(env?: AppEnv): boolean {
  return envValue(env, 'GITHUB_WRITE_MODE') === 'true';
}

export function getGitHubClient(env?: AppEnv): Octokit {
  const token = envValue(env, 'GITHUB_TOKEN');

  if (cachedClient && cachedToken === token) return cachedClient;

  if (!token) {
    throw new Error('GITHUB_TOKEN is required for GitHub tools.');
  }

  cachedClient = new Octokit({
    auth: token,
    userAgent: 'flue-github-review-triage-example',
  });
  cachedToken = token;

  return cachedClient;
}
