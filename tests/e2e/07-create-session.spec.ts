/**
 * Flow 7 — Catch Logbook: create a session with one catch (species, weight,
 * length) for today; the session card renders with the catch summary and a
 * conditions snapshot note when live data was available.
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, pickTangier, expectDashboardLive } from './helpers';

test('create a logbook session with one catch', async ({ page }) => {
  await onboardEnglish(page);
  await pickTangier(page);
  await expectDashboardLive(page); // gives the session a live conditions snapshot

  await page.getByRole('navigation').getByRole('link', { name: 'Catch Logbook' }).click();
  await page.waitForURL(/\/en\/logbook/, { timeout: 20_000 });

  // "New session" exists in the toolbar AND the empty state — target the toolbar one.
  await page.getByRole('button', { name: 'New session' }).first().click();

  // Defaults: date=today, start/end pre-filled. Adjust the method + bait.
  await page.getByLabel('Method').selectOption({ label: 'Surfcasting' });
  await page.getByLabel('Bait / lure').fill('dead shad');

  // Add one catch.
  await page.getByRole('button', { name: 'Add catch' }).click();
  // Exact label: the form also has a "Target species" field.
  await page.getByLabel('Species', { exact: true }).fill('sea bream');
  await page.getByLabel('Weight (g)').fill('750');
  await page.getByLabel('Length (cm)').fill('36');

  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Session card renders.
  await expect(page.getByText('Session saved')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('sea bream', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('dead shad').first()).toBeVisible();
  // The session shows one catch.
  await expect(page.getByText(/1 catch|1 fish/i).first()).toBeVisible({ timeout: 10_000 });
});
