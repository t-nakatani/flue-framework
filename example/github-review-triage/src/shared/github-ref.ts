export type GitHubRef = {
  owner: string;
  repo: string;
  number: number;
};

export function encodeGitHubRef(ref: GitHubRef): string {
  return `${ref.owner}/${ref.repo}#${ref.number}`;
}

export function parseGitHubRef(id: string): GitHubRef {
  const match = /^([^/]+)\/([^#]+)#(\d+)$/.exec(id);

  if (!match) {
    throw new Error(`Invalid GitHub agent id "${id}". Expected OWNER/REPO#NUMBER.`);
  }

  return {
    owner: match[1],
    repo: match[2],
    number: Number(match[3]),
  };
}

