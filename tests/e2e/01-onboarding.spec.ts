/**
 * Flow 1 — First launch: language onboarding (default locale is Moroccan
 * Darija), native-script language names, continue lands in the chosen
 * locale, and the choice is persisted.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test, expect } from '@playwright/test';

const ARY = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../messages/ary.json'), 'utf8')
) as { onboarding: { continue: string } };

test('first launch shows onboarding in the default locale and persists the choice', async ({ page }) => {
  await page.goto('/');

  // Fresh guest → redirected to the welcome screen (default locale: ary).
  await expect(page).toHaveURL(/\/ary\/welcome/, { timeout: 30_000 });

  // Native-script language names, no flags.
  await expect(page.getByRole('radio', { name: 'الدارجة المغربية' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'العربية' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Français' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'English' })).toBeVisible();

  // Choose English → continue (button label rendered in the default locale).
  await page.getByRole('radio', { name: 'English' }).click();
  await page.getByRole('button', { name: ARY.onboarding.continue }).click();

  await expect(page).toHaveURL(/\/en(?=\/|$)/, { timeout: 30_000 });

  // Language persisted: reloading must NOT return to the onboarding screen.
  await page.reload();
  await expect(page).toHaveURL(/\/en(?=\/|$)/, { timeout: 30_000 });
  await expect(page.getByRole('radio', { name: 'English' })).toHaveCount(0);
});
