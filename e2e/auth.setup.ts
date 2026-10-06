import { expect, test as setup } from '@playwright/test';

const authFile = 'playwright/.auth/admin.json';

setup('admin signs in through the user interface', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Электронная почта').fill('e2e.admin@example.test');
    await page.getByLabel('Пароль').fill('e2e-password-2026');
    // exact: true — 'Войти' is now also a substring of the "Войти через
    // Telegram" button added below the form, which would otherwise make this
    // locator ambiguous (Playwright's default name match is substring-based).
    await page.getByRole('button', { name: 'Войти', exact: true }).click();

    await expect(page).toHaveURL('/');
    await page.context().storageState({ path: authFile });
});
