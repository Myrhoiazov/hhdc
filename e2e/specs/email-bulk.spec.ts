import { expect, test } from '@playwright/test';

// Works on the three letters from server/prisma/seed-e2e.ts.
// serial: the second step acts on the letter the first one left.
test.describe.serial('email bulk actions', () => {
    test('several selected conversations are deleted together', async ({ page }) => {
        page.on('dialog', (dialog) => dialog.accept());
        await page.goto('/email');
        await expect(page.getByText('3 / 3')).toBeVisible();

        await page.getByRole('checkbox', { name: 'Выбрать переписку — E2E ticket question' }).check();
        await page.getByRole('checkbox', { name: 'Выбрать переписку — E2E prize offer' }).check();
        const actions = page.getByRole('region', { name: 'Действия с выбранными переписками' });
        await expect(actions).toContainText('Выбрано: 2');
        await actions.getByRole('button', { name: 'Удалить выбранные' }).click();

        await expect(page.getByText('1 / 1')).toBeVisible();
        await expect(actions).toBeHidden();
        await page.reload();
        await expect(page.getByText('E2E hotel booking')).toBeVisible();
        await expect(page.getByText('E2E prize offer')).toBeHidden();
    });

    test('select all moves the remaining conversations to spam', async ({ page }) => {
        page.on('dialog', (dialog) => dialog.accept());
        await page.goto('/email');
        await expect(page.getByText('1 / 1')).toBeVisible();

        await page.getByRole('checkbox', { name: 'Выбрать все загруженные переписки' }).check();
        await page.getByRole('button', { name: 'Переместить выбранные в спам' }).click();

        await expect(page.getByText('0 / 0')).toBeVisible();
    });
});
