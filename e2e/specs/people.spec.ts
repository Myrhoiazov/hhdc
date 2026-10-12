import { expect, test } from '@playwright/test';

// serial: the second step edits the person the first one created.
test.describe.serial('people', () => {
    test('authenticated user creates a person that remains after reload', async ({ page }) => {
        await page.goto('/people');
        await expect(page.getByText('Найдено контактов: 0')).toBeVisible();

        await page.getByRole('button', { name: 'Добавить человека' }).click();
        const form = page.getByRole('form', { name: 'Новый человек' });
        await form.getByLabel('Имя', { exact: true }).fill('E2E');
        await form.getByLabel('Фамилия', { exact: true }).fill('Created Person');
        await form.getByLabel('Почта', { exact: true }).fill('e2e.person@example.test');
        await form.getByRole('checkbox', { name: 'PARTICIPANT' }).check();
        await form.getByRole('button', { name: 'Save' }).click();

        // A created person opens in their own card.
        await expect(page.getByRole('heading', { name: 'E2E Created Person', level: 1 })).toBeVisible();

        await page.goto('/people');
        await expect(page.getByText('Найдено контактов: 1')).toBeVisible();
        await expect(page.getByText('E2E Created Person')).toBeVisible();
    });

    test('authenticated user edits a person and the change remains after reload', async ({ page }) => {
        await page.goto('/people');
        await page.getByText('E2E Created Person').click();
        await expect(page.getByRole('heading', { name: 'E2E Created Person', level: 1 })).toBeVisible();

        await page.getByLabel('Фамилия', { exact: true }).fill('Updated Person');
        await page.getByRole('button', { name: 'Save', exact: true }).click();

        await expect(page.getByRole('heading', { name: 'E2E Updated Person', level: 1 })).toBeVisible();
        await page.reload();
        await expect(page.getByRole('heading', { name: 'E2E Updated Person', level: 1 })).toBeVisible();
    });
});
