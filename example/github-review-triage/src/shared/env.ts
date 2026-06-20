export type AppEnv = {
  OPENROUTER_API_KEY?: string;
  FLUE_MODEL?: string;
  FLUE_ISSUE_TRIAGE_MODEL?: string;
  FLUE_PR_REVIEW_MODEL?: string;
  GITHUB_TOKEN?: string;
  GITHUB_WEBHOOK_SECRET?: string;
  GITHUB_WRITE_MODE?: string;
  TRIAGE_LABELS?: string;
  GITHUB_MAX_BODY_CHARS?: string;
  GITHUB_MAX_DIFF_CHARS?: string;
  AGENT_HTTP_TOKEN?: string;
  NODE_ENV?: string;
};

export function envValue(env: AppEnv | undefined, name: keyof AppEnv): string | undefined {
  return env?.[name] ?? globalThis.process?.env?.[name];
}
