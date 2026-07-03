import { Resend } from 'resend';

// Lazily construct the Resend client on first use rather than at module load.
// The Resend constructor throws on a missing key, which would otherwise break
// `next build` (it evaluates API route modules while collecting page data)
// whenever RESEND_API_KEY isn't present in the build environment.
let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    client = new Resend(key);
  }
  return client;
}

export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop, c);
    return typeof value === 'function' ? value.bind(c) : value;
  },
});

