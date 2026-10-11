/**
 * Flow 8 — Trip Planner: with a default location (set on the dashboard),
 * generate a report for a session window; the report shows a localized
 * summary, an hour-by-hour table, score chart, best windows, warnings/data
 * gaps, and an export button.
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, pickTangier, expectDashboardLive } from './helpers';

test('generate a trip report for today 06:00–10:00 kayak', async ({ page }) => {
  await onboardEnglish(page);
  await pickTangier(page);
  await expectDashboardLive(page); // sets the default location

  await page.getByRole('navigation').getByRole('link', { name: 'Trip Planner' }).click();
  await page.waitForURL(/\/en\/planner/, { timeout: 20_000 });

  // Location comes from settings (Tangier).
  await expect(page.getByText('Tangier').first()).toBeVisible({ timeout: 15_000 });

  await page.getByLabel('Start time').fill('06:00');
  await page.getByLabel('End time').fill('10:00');
  await page.getByLabel('Fishing method').selectOption({ label: 'Kayak fishing' });
  await page.getByLabel('Target species').fill('sea bass');

  await page.getByRole('button', { name: 'Generate report' }).click();

  // Report sections.
  await expect(page.getByText('Trip report').first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('Summary', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Hour-by-hour conditions').first()).toBeVisible();
  await expect(page.getByText(/Estimated suitability averages/).first()).toBeVisible();
  await expect(page.getByText(/Safety status:/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export report (JSON)' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Print/ })).toBeVisible();

  // The hourly table must have rows (real forecast data).
  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect((await rows.count()) >= 3).toBeTruthy();
});
