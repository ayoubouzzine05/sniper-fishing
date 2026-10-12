/**
 * Flow 9 — Guest-mode persistence: a created spot and a changed setting
 * (wind unit → knots) survive a full page reload (IndexedDB/localStorage,
 * no account required).
 */
import { test, expect } from '@playwright/test';
import { onboardEnglish, TINY_JPEG } from './helpers';

test('spots and settings persist across reloads without an account', async ({ page }) => {
  await onboardEnglish(page);

  // Create a spot.
  await page.getByRole('navigation').getByRole('link', { name: 'Fishing Spots' }).click();
  await page.waitForURL(/\/en\/spots/, { timeout: 20_000 });
  // "New spot" exists in the toolbar AND the empty state — target the toolbar one.
  await page.getByRole('button', { name: 'New spot' }).first().click();
  await page.getByPlaceholder('e.g. Nord jetty — rock line').fill('Persistent Spot');
  await page.getByPlaceholder('35.7595').fill('35.80');
  await page.getByPlaceholder('-5.8340').fill('-5.90');
  await page.getByTestId('spot-photos').setInputFiles(TINY_JPEG);
  // Upload is async (FileReader) — wait for the preview to land in the form.
  await expect(page.getByRole('button', { name: 'Remove photo' }).first()).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Persistent Spot', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // Change a setting.
  await page.getByRole('navigation').getByRole('link', { name: 'Settings' }).click();
  await page.waitForURL(/\/en\/settings/, { timeout: 20_000 });
  await page.getByLabel('Wind speed unit').selectOption('knots');

  // Reload → everything still there.
  await page.reload();
  await expect(page.getByLabel('Wind speed unit')).toHaveValue('knots', { timeout: 20_000 });

  await page.getByRole('navigation').getByRole('link', { name: 'Fishing Spots' }).click();
  await expect(page.getByText('Persistent Spot', { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  // The spot photo survived the reload too.
  await expect(page.getByRole('img', { name: 'Persistent Spot' })).toBeVisible({ timeout: 20_000 });
});
