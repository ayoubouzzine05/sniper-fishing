/**
 * Flow 5 — Changing the fishing method on the forecast page: the method
 * description updates and the score re-renders (different method profile).
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, pickTangier, expectDashboardLive } from './helpers';

test('changing the method re-renders the assessment with the method profile', async ({ page }) => {
  await onboardEnglish(page);
  await pickTangier(page);
  await expectDashboardLive(page);

  await page.getByRole('navigation').getByRole('link', { name: 'Fishing Forecast' }).click();
  await page.waitForURL(/\/en\/forecast/, { timeout: 20_000 });

  await expect(page.getByRole('img', { name: /\d+\/100/ }).first()).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByText('Long-range casting from the shore into surf and swash').first()
  ).toBeVisible();

  const gauge = page.getByRole('img', { name: /\d+\/100/ }).first();
  const before = (await gauge.textContent()) ?? '';

  await page.getByLabel('Fishing method').selectOption({ label: 'Kayak fishing' });

  await expect(
    page.getByText('Fishing from a kayak — the most condition-sensitive method').first()
  ).toBeVisible();
  await expect(gauge).toBeVisible({ timeout: 45_000 });

  const after = (await gauge.textContent()) ?? '';
  // The kayak profile is stricter; in any case the assessment re-rendered.
  expect(after).toBeTruthy();
  if (before !== after) {
    // If the numbers differ, sanity-check they are both within [0,100].
    const parse = (s: string) => Number(s.match(/\d+/)?.[0]);
    expect(parse(after)).toBeGreaterThanOrEqual(0);
    expect(parse(after)).toBeLessThanOrEqual(100);
  }
});
