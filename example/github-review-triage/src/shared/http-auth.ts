import type { AgentRouteHandler } from '@flue/runtime';
import type { AppEnv } from './env.ts';
import { envValue } from './env.ts';

export const protectAgentHttp: AgentRouteHandler = async (c, next) => {
  const env = c.env as AppEnv;
  const expected = envValue(env, 'AGENT_HTTP_TOKEN');

  if (!expected) {
    if (envValue(env, 'NODE_ENV') === 'production') {
      return c.json({ error: 'AGENT_HTTP_TOKEN is required in production.' }, 403);
    }

    await next();
    return;
  }

  const authorization = c.req.header('authorization');
  if (authorization !== `Bearer ${expected}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
};
