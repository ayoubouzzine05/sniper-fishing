/**
 * Flow 4 — Fishing Forecast page: session form (method, region preset,
 * date/times), suitability gauge + hourly score chart, per-factor
 * breakdown, best windows, missing-data disclosure and provider footer.
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, pickTangier, expectDashboardLive } from './helpers';

test('forecast page shows score, breakdown, windows and attribution', async ({ page }) => {
  await onboardEnglish(page);
  await pickTangier(page);
  await expectDashboardLive(page);

  await page.getByRole('navigation').getByRole('link', { name: 'Fishing Forecast' }).click();
  await page.waitForURL(/\/en\/forecast/, { timeout: 20_000 });

  // Form fields.
  await expect(page.getByText('Fishing Forecast').first()).toBeVisible();
  await expect(page.getByLabel('Fishing method')).toBeVisible();
  await expect(page.getByLabel('Date')).toBeVisible();
  await expect(page.getByLabel('Start time')).toBeVisible();
  await expect(page.getByLabel('End time')).toBeVisible();

  // Live score gauge + explanation + windows.
  await expect(page.getByText('Fishing suitability').first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByRole('img', { name: /\d+\/100/ }).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText('What drives this score').first()).toBeVisible();
  // The gauge reports data completeness (0..1) — confidence is applied to
  // the score internally, not shown as a separate fake metric.
  await expect(page.getByText('Data completeness').first()).toBeVisible();
  await expect(
    page.getByText(/Best estimated windows|No clearly favorable window in this period/).first()
  ).toBeVisible();

  // Provider attribution + data-as-of timestamp.
  await expect(page.getByText(/Wave & ocean data © Open-Meteo\.com/)).toBeVisible();
  await expect(page.getByText(/Weather data © Open-Meteo\.com/)).toBeVisible();
  await expect(page.getByText(/as of/i).first()).toBeVisible();
});
