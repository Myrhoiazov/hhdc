import { expect, test } from '@playwright/test';

// Runs in the `chromium` (authenticated, admin storageState) project — the
// two anonymous steps opt out of that storageState per test.use() below.
// serial: each step depends on the DB state the previous one left, and there
// is exactly one seeded admin/Telegram fixture for the whole file to share
// (server/scripts/e2e-seed.ts). The Telegram/OIDC boundary itself is replaced
// by TELEGRAM_OIDC_TEST_MODE (playwright.config.ts) — see isOidcTestMode in
// auth.telegram.oidc-client.ts — so none of this depends on real Telegram.
test.describe.serial('Telegram connect/disconnect', () => {
    test.describe('before any identity is linked', () => {
        test.use({ storageState: { cookies: [], origins: [] } });

        test('an unlinked Telegram identity is denied at login', async ({ page }) => {
            await page.goto('/login');
            await page.getByRole('button', { name: 'Войти через Telegram' }).click();

            await expect(page).toHaveURL(/telegramError=TELEGRAM_NOT_LINKED/);
            await expect(page.getByText(/не подключён к HHDC Admin/)).toBeVisible();
        });
    });

    test('an authenticated admin connects Telegram from their profile', async ({ page }) => {
        await page.goto('/profile/1');
        await expect(page.getByText('Не подключён')).toBeVisible();

        await page.getByRole('button', { name: 'Подключить Telegram' }).click();

        await expect(page).toHaveURL(/telegramStatus=linked/);
        await expect(page.getByText('Подключён')).toBeVisible();
        await expect(page.getByText('@e2e_telegram')).toBeVisible();
    });

    test.describe('after linking', () => {
        test.use({ storageState: { cookies: [], origins: [] } });

        test('the now-linked Telegram identity logs in', async ({ page }) => {
            await page.goto('/login');
            await page.getByRole('button', { name: 'Войти через Telegram' }).click();

            await expect(page).toHaveURL(/\/\?telegramStatus=success$/);
        });
    });

    test('the admin disconnects Telegram from their profile', async ({ page }) => {
        page.on('dialog', (dialog) => dialog.accept());
        await page.goto('/profile/1');
        await expect(page.getByText('Подключён')).toBeVisible();

        await page.getByRole('button', { name: 'Отключить Telegram' }).click();

        await expect(page.getByText('Не подключён')).toBeVisible();
    });
});
