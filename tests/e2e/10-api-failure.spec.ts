/**
 * Flow 10 — API failure: all Open-Meteo requests are intercepted and
 * aborted. The dashboard must show a useful error state with a retry
 * action (never a crash, never fake data).
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, pickTangier } from './helpers';

test('dashboard degrades gracefully when the provider is unreachable', async ({ page }) => {
  // Deterministic failure: abort every Open-Meteo request (all hosts).
  await page.route(/.*open-meteo\.com.*/i, (route) => route.abort('blockedbyclient'));

  await onboardEnglish(page);
  await pickTangier(page);

  // Error state with a real message + retry button. Aborted requests are
  // classified as a network error by the provider layer; any of the real
  // error messages is acceptable (never a crash, never fake data).
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 60_000 });
  await expect(
    page
      .getByText(
        /Could not load data from the provider|Network error|did not respond in time|unexpected response/
      )
      .first()
  ).toBeVisible();
  await expect(page.getByText('Check your connection, then retry.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();

  // No score is invented while there is no data (the gauge is absent).
  await expect(page.getByRole('img', { name: /\d+\/100/ })).toHaveCount(0);
});
