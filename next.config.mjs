import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Static export mode is used ONLY for the Android (Capacitor) web bundle —
  // enabled via SF_STATIC_EXPORT=1 in scripts/build-web-for-android.mjs.
  // It also gets its own distDir so the web deployment's .next is untouched.
  ...(process.env.SF_STATIC_EXPORT === '1'
    ? {
        output: 'export',
        distDir: '.next-apk',
        // Folder-per-URL (ary/index.html) so the static file server inside
        // the Capacitor WebView resolves clean URLs.
        trailingSlash: true
      }
    : {}),
  // No remote image optimization: the app renders map tiles and user photos as plain
  // elements to keep the deployment self-contained (no image CDN required).
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' }
        ]
      },
      {
        source: '/manifest.webmanifest',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }]
      }
    ];
  }
};

export default withNextIntl(nextConfig);
