/**
 * Flow 2 — Dashboard with a REAL forecast: pick Tangier (quick pick), the
 * dashboard fetches Open-Meteo Marine + Forecast live and renders current
 * conditions, an hourly strip, a suitability score with per-factor
 * explanation, a safety assessment and provider attributions with data age.
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, pickTangier, expectDashboardLive } from './helpers';

test('dashboard renders a real live forecast for Tangier', async ({ page }) => {
  await onboardEnglish(page);

  // No location yet → onboarding card with quick picks.
  await expect(page.getByText('How is the sea today?').first()).toBeVisible();
  await pickTangier(page);

  await expectDashboardLive(page);

  // Hourly strip present.
  await expect(page.getByText('Next 24 hours').first()).toBeVisible();

  // Per-factor score explanation.
  await expect(page.getByText('What drives this score').first()).toBeVisible();
  await expect(page.getByText('Wind speed').first()).toBeVisible();

  // Safety section with status + disclaimer (app-generated, not official).
  await expect(page.getByText('Safety assessment').first()).toBeVisible();
  await expect(
    page.getByText('App-generated assessment based on configurable thresholds — not an official forecast').first()
  ).toBeVisible();

  // Data age disclosure (provider footer shows "as of" time + attribution).
  await expect(page.getByText(/as of/i).first()).toBeVisible({ timeout: 15_000 });

  // The score is NOT a catch guarantee: the disclaimer must be reachable in
  // Settings (asserted via the about section text on the settings page).
  await page.getByRole('navigation').getByRole('link', { name: 'Settings' }).click();
  await expect(
    page
      .getByText('The suitability score is a configurable heuristic, not a scientifically validated model. It never guarantees a catch.')
      .first()
  ).toBeVisible({ timeout: 20_000 });
});
