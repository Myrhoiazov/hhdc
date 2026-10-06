import { expect, test } from '@playwright/test';

test('authenticated user sees the seeded client from the database', async ({ page }) => {
    await page.goto('/clients');

    await expect(page.getByText('E2E Seed Client', { exact: true })).toBeVisible();
});

test('authenticated user creates a client that remains after reload', async ({ page }) => {
    const clientName = 'E2E Created Client';

    await page.goto('/clients');
    // The persistent navbar and the page filters both offer this action.
    await page.getByRole('button', { name: 'Добавить клиента', exact: true }).first().click();
    await page.getByLabel('Имя', { exact: true }).fill('E2E');
    await page.getByLabel('Фамилия', { exact: true }).fill('Created Client');
    await page.getByRole('button', { name: 'Добавить', exact: true }).click();

    await expect(page.getByText(clientName, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(clientName, { exact: true })).toBeVisible();
});

test('authenticated user edits a client and the change remains after reload', async ({ page }) => {
    await page.goto('/clients');
    await page.getByText('E2E Seed Client', { exact: true }).click();
    await page.getByRole('button', { name: 'Редактировать' }).click();
    await page.getByLabel('Фамилия', { exact: true }).fill('Updated Client');
    await page.getByRole('button', { name: 'Сохранить', exact: true }).click();

    await expect(page.getByText('E2E Updated Client', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('E2E Updated Client', { exact: true })).toBeVisible();
});
