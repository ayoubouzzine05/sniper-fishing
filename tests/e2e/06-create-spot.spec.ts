/**
 * Flow 6 — Fishing Spots: create a spot with manual coordinates, type and
 * method; it appears in the list with a privacy notice; private notes are
 * never shown in the list (only in the editor).
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish } from './helpers';

test('create a spot with manual coordinates', async ({ page }) => {
  await onboardEnglish(page);
  await page.getByRole('navigation').getByRole('link', { name: 'Fishing Spots' }).click();
  await page.waitForURL(/\/en\/spots/, { timeout: 20_000 });

  await expect(page.getByText('Fishing spots').first()).toBeVisible();
  await expect(
    page.getByText('Your spots are stored on this device only. They are never shared or published.')
  ).toBeVisible();

  // "New spot" exists in the toolbar AND the empty state — target the toolbar one.
  await page.getByRole('button', { name: 'New spot' }).first().click();

  // Name
  await page.getByPlaceholder('e.g. Nord jetty — rock line').fill('E2E Rock');
  // Manual coordinates (dir=ltr inputs with known placeholders)
  await page.getByPlaceholder('35.7595').fill('35.7601');
  await page.getByPlaceholder('-5.8340').fill('-5.8337');
  // Location type
  await page.getByLabel('Location type').selectOption({ label: 'Rocks' });
  // Method chip
  await page.getByRole('button', { name: 'Surfcasting', exact: true }).click();
  // Target species
  await page.getByLabel('Target species (comma separated)').fill('sea bream, sea bass');
  // Private notes (must not leak into the list view)
  await page.getByLabel('Private notes').fill('SECRET-POSITION-42');

  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Saved confirmation + spot in the list.
  await expect(page.getByText('Spot saved')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('E2E Rock', { exact: true }).first()).toBeVisible();
  // Private notes must NOT appear in the list view.
  await expect(page.getByText('SECRET-POSITION-42')).toHaveCount(0);
});
