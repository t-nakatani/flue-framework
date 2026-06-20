import type { AgentRouteHandler } from '@flue/runtime';

export const protectAgentHttp: AgentRouteHandler = async (c, next) => {
  const expected = process.env.AGENT_HTTP_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
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

