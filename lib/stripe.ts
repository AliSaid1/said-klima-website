import 'server-only';
import Stripe from 'stripe';

// Lazily construct the Stripe client on first use rather than at module load,
// so a missing STRIPE_SECRET_KEY doesn't break `next build` (which evaluates
// API route modules while collecting page data). The error still surfaces at
// request time if the key is genuinely missing in production.
let client: Stripe | null = null;

function getClient(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    client = new Stripe(key, { apiVersion: '2026-02-25.clover' });
  }
  return client;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const c = getClient();
    const value = Reflect.get(c, prop, c);
    return typeof value === 'function' ? value.bind(c) : value;
  },
});


