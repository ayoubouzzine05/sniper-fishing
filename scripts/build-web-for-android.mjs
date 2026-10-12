#!/usr/bin/env node
/**
 * Builds the static web bundle for the Android (Capacitor) app:
 *
 *   1. Temporarily moves middleware.ts aside (Next.js does not support
 *      middleware with `output: 'export'`).
 *   2. Runs `next build` with SF_STATIC_EXPORT=1 -> produces `out/`.
 *   3. Writes a root `out/index.html` that redirects to the user's saved
 *      locale (or the default, Moroccan Darija) — replacing what the
 *      middleware does on the web.
 *
 *      IMPORTANT: the redirect target must be the explicit file
 *      (`/${lang}/index.html`), NOT the bare folder (`/${lang}/`).
 *      Capacitor's WebViewLocalServer runs in html5 mode by default and
 *      serves the ROOT index.html for any extension-less path — a folder
 *      target would redirect back to the root page forever (blank screen).
 *      An extension target resolves to the real asset file instead.
 *   4. Restores middleware.ts.
 *
 * After it finishes, run:  npx cap sync android
 * then:  cd android && ./gradlew assembleDebug
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const middlewarePath = join(root, 'middleware.ts');
const middlewareBackup = join(root, 'middleware.ts.apk-bak');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: root, stdio: 'inherit', env: { ...process.env, SF_STATIC_EXPORT: '1' } });
}

if (existsSync(middlewareBackup)) {
  // Left over from a previous crashed run — clean it up.
  renameSync(middlewareBackup, middlewarePath);
}
if (!existsSync(middlewarePath)) {
  throw new Error(`middleware.ts not found at ${middlewarePath}`);
}

try {
  renameSync(middlewarePath, middlewareBackup);
  // Clean export artifacts so a fresh export is never mixed with a stale one.
  execSync('rm -rf .next-apk out', { cwd: root, stdio: 'inherit' });
  run('npx next build');

  // Next 14 writes the export into the (custom) distDir root — `.next-apk`.
  const distDir = join(root, '.next-apk');
  if (!existsSync(join(distDir, 'ary', 'index.html'))) {
    throw new Error('Static export did not produce .next-apk/ary/index.html');
  }
  const outDir = join(root, 'out');
  execSync('cp -a .next-apk out', { cwd: root, stdio: 'inherit' });
  writeFileSync(
    join(outDir, 'index.html'),
    `<!doctype html>
<html lang="ary" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>Sniper Fishing</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <script>
    (function () {
      var LOCALES = ['ary', 'ar', 'fr', 'en'];
      var lang = '';
      try {
        var raw = localStorage.getItem('sf:settings');
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && LOCALES.indexOf(parsed.language) !== -1) lang = parsed.language;
        }
      } catch (e) { /* fall back to default */ }
      if (!lang) lang = 'ary';
      location.replace('/' + lang + '/index.html');
    })();
  </script>
</head>
<body></body>
</html>
`
  );
  console.log('\n✓ Static web bundle ready in out/ (with locale-redirect index.html)');
} finally {
  if (existsSync(middlewareBackup)) {
    renameSync(middlewareBackup, middlewarePath);
    console.log('✓ middleware.ts restored');
  }
}
