import { expect, test } from '@playwright/test';

test('admin switches a Telegram notification on and it stays on after reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Компания' }).click();
    await page.getByRole('link', { name: 'Уведомления' }).click();

    await expect(page).toHaveURL('/notifications');
    await expect(page.getByRole('switch')).toHaveCount(11);
    // Existing notifications stay on by default; the two new ones start switched off.
    await expect(page.getByRole('switch', { name: 'Платежи Mollie' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Новый клиент Mollie' })).not.toBeChecked();

    const newStudent = page.getByRole('switch', { name: 'Новый ученик' });
    await expect(newStudent).not.toBeChecked();
    await newStudent.click();
    await expect(newStudent).toBeChecked();

    await page.reload();
    await expect(page.getByRole('switch', { name: 'Новый ученик' })).toBeChecked();
    await expect(page.getByText(/e2e\.admin@example\.test/)).toBeVisible();
});

test.describe('mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('the notifications page fits a phone screen', async ({ page }) => {
        await page.goto('/notifications');
        await expect(page.getByRole('switch')).toHaveCount(11);

        // Switches sit at the right edge of each row: none may be pushed past the screen.
        for (const toggle of await page.getByRole('switch').all()) {
            const box = await toggle.boundingBox();
            expect(box && box.x >= 0 && box.x + box.width <= 375).toBe(true);
        }
    });
});
