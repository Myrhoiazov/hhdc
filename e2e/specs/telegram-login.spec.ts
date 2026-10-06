import { expect, test } from '@playwright/test';

// This project (`anonymous` in playwright.config.ts) has no storageState —
// the button's visibility depends only on GET /auth/providers, not on being
// logged in.
test('the Telegram login entry point is visible on the login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('button', { name: 'Войти через Telegram' })).toBeVisible();
});
