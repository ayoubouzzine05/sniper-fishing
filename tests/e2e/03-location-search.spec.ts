/**
 * Flow 3 — Selecting a location by search (Open-Meteo geocoding) from the
 * dashboard onboarding card.
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, expectDashboardLive } from './helpers';

test('location can be chosen via geocoding search (Essaouira)', async ({ page }) => {
  await onboardEnglish(page);

  const search = page.getByPlaceholder('Search a place (e.g. Essaouira)');
  await search.fill('Essaouira');
  await page.getByRole('button', { name: 'Search a place (e.g. Essaouira)' }).click();

  // Real geocoding results render.
  const results = page.locator('ul button');
  await expect(results.first()).toBeVisible({ timeout: 30_000 });

  // First result should be the city itself.
  await results.first().click();

  // Dashboard now renders a live forecast for that location.
  await expectDashboardLive(page);
  await expect(page.getByText('Essaouira').first()).toBeVisible();
});
