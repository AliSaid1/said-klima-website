import type {NextConfig} from 'next';

// ── TLS workaround for SSL-inspecting proxies (development only) ───────────────
// Some networks with SSL inspection re-sign outbound HTTPS using a custom CA that
// Node.js doesn't trust, so every server-side fetch (e.g. to Supabase) fails with
// SELF_SIGNED_CERT_IN_CHAIN. Setting NODE_TLS_REJECT_UNAUTHORIZED=0 here — before
// any fetch is made — tells Node.js to accept any certificate in development.
//
// ⚠️  NEVER set this in production. The guard below ensures it is stripped at
//     build/deploy time; in production real certificates are trusted.
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
// ───────────────────────────────────────────────────────────────────────────────

const securityHeaders = [
  {key: 'X-Content-Type-Options', value: 'nosniff'},
  {key: 'X-Frame-Options', value: 'DENY'},
  {key: 'X-XSS-Protection', value: '1; mode=block'},
  {key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin'},
  {key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()'},
  {key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains'},
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co https://api.stripe.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [{source: '/(.*)', headers: securityHeaders}];
  },
  // Allow access to Supabase Storage images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
