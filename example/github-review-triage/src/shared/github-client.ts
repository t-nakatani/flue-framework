import { Octokit } from '@octokit/rest';

let cachedClient: Octokit | undefined;

export function githubWriteMode(): boolean {
  return process.env.GITHUB_WRITE_MODE === 'true';
}

export function getGitHubClient(): Octokit {
  if (cachedClient) return cachedClient;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required for GitHub tools.');
  }

  cachedClient = new Octokit({
    auth: token,
    userAgent: 'flue-github-review-triage-example',
  });

  return cachedClient;
}

