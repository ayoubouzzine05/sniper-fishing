import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the native Android wrapper.
 *
 * The web app is built as a static export (see scripts/build-web-for-android.mjs)
 * into `out/`, which is bundled into the APK. The root index.html (generated
 * in that script) redirects to the user's saved locale (default: Moroccan
 * Darija) — the web app's middleware is intentionally excluded from the
 * static export because Next.js does not support middleware with
 * `output: 'export'`.
 */
const config: CapacitorConfig = {
  appId: 'com.sniperfishing.app',
  appName: 'Sniper Fishing',
  webDir: 'out',
  backgroundColor: '#0b2545',
  // https scheme so the service worker (offline shell) can register.
  server: { androidScheme: 'https' },
  android: {
    // Map tiles and provider APIs are loaded over https from the network;
    // nothing sensitive is mixed in.
    allowMixedContent: false
  }
};

export default config;
