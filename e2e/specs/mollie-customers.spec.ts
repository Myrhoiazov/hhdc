import { expect, test } from '@playwright/test';

test('new Mollie customer modal starts with identity fields only', async ({ page }) => {
    await page.goto('/mollie/customers');
    await page.getByRole('button', { name: 'Добавить клиента', exact: true }).last().click();

    await expect(page.getByPlaceholder('Имя', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Фамилия', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('example@gmail.com', { exact: true })).toBeVisible();

    await expect(page.getByPlaceholder('cst_bhiubi', { exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Consumer Name', { exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Consumer Account', { exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Consumer Bic', { exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Deventer', { exact: true })).toHaveCount(0);
});
