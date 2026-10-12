/**
 * E2E helpers.
 *
 * A fresh browser context = a fresh guest: no IndexedDB data, so the app
 * redirects to the language onboarding screen first (in the default locale,
 * Moroccan Darija). We read the localized labels from the actual message
 * files so the helpers never hardcode translations.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { expect, type Page } from '@playwright/test';

const ARY = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../messages/ary.json'), 'utf8')
) as { onboarding: { continue: string } };

/**
 * Wait until the browser URL has stopped changing.
 *
 * Fresh guests experience a two-step redirect (middleware locale redirect,
 * then the client-side onboarding bounce), and `page.goto` can resolve while
 * the second step is still in flight. Polling for a *stable* URL guarantees
 * the app has settled before the test asserts on it.
 */
async function waitForStableUrl(page: Page, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = page.url();
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    await page.waitForTimeout(200);
    const now = page.url();
    if (now !== last) {
      last = now;
      stableSince = Date.now();
    } else if (Date.now() - stableSince >= 900) {
      return;
    }
  }
  throw new Error(`URL did not stabilize within ${timeoutMs} ms (last: ${last})`);
}

/**
 * Navigate to the app and complete onboarding in English.
 * Idempotent: if onboarding is already done (storage state), lands on the
 * dashboard directly.
 */
export async function onboardEnglish(page: Page): Promise<void> {
  await page.goto('/');
  await waitForStableUrl(page);
  if (page.url().includes('/welcome')) {
    await page.getByRole('radio', { name: 'English' }).click();
    await page.getByRole('button', { name: ARY.onboarding.continue }).click();
    await page.waitForURL(/\/en(\/|$)/, { timeout: 30_000 });
    await waitForStableUrl(page);
  }
}

/** Dashboard onboarding card → quick-pick Tangier (no geocoding call). */
export async function pickTangier(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Tanger (Tangier)', exact: true }).first().click();
}

/** Wait until the dashboard shows real provider data (not a stub). */
export async function expectDashboardLive(page: Page): Promise<void> {
  await expect(page.getByText('Current conditions', { exact: true }).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Fishing suitability').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Safety assessment').first()).toBeVisible({ timeout: 30_000 });
  // Both provider attributions must be visible (source disclosure).
  // Open-Meteo's required credit is "Open-Meteo.com" — marine and weather
  // are attributed separately.
  await expect(page.getByText(/Wave & ocean data © Open-Meteo\.com/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Weather data © Open-Meteo\.com/)).toBeVisible({ timeout: 30_000 });
  // A numeric score must be rendered: the gauge exposes "NN/100" as its
  // accessible name (role=img).
  await expect(page.getByRole('img', { name: /\d+\/100/ }).first()).toBeVisible({ timeout: 30_000 });
}

/** A tiny valid 1x1 JPEG used for photo-upload e2e steps. */
export const TINY_JPEG = {
  name: 'e2e-photo.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==',
    'base64'
  )
};
