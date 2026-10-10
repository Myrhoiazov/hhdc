import { expect, test } from '@playwright/test';

const MOBILE_WIDTH = 375;

test('admin switches a Telegram notification off and it stays off after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Уведомления' }).click();

    await expect(page).toHaveURL('/settings/notifications');
    const newEmail = page.getByRole('switch', { name: 'Новое письмо', exact: true });
    await expect(newEmail).toBeChecked();
    await newEmail.click();
    await expect(newEmail).not.toBeChecked();

    await page.reload();
    await expect(page.getByRole('switch', { name: 'Новое письмо', exact: true })).not.toBeChecked();
    // The other notifications keep their own state.
    await expect(page.getByRole('switch', { name: 'Новые продажи билетов', exact: true })).toBeChecked();
});

test.describe('mobile viewport', () => {
    test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

    test('the notifications page fits a phone screen', async ({ page }) => {
        await page.goto('/settings/notifications');
        await expect(page.getByRole('switch').first()).toBeVisible();

        // Switches sit at the right edge of each row: none may be pushed past the screen.
        for (const toggle of await page.getByRole('switch').all()) {
            const box = await toggle.boundingBox();
            expect(box && box.x >= 0 && box.x + box.width <= MOBILE_WIDTH).toBe(true);
        }
    });
});
