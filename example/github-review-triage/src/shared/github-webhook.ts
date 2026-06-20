const encoder = new TextEncoder();

export async function verifyGitHubWebhookSignature(args: {
  secret: string;
  body: string;
  signature256: string | undefined;
}): Promise<boolean> {
  if (!args.signature256?.startsWith('sha256=')) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(args.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(args.body));
  const expected = `sha256=${toHex(new Uint8Array(digest))}`;

  return timingSafeEqual(expected, args.signature256);
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return out === 0;
}

