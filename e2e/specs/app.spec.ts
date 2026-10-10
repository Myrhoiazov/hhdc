import { expect, test } from '@playwright/test';

test('anonymous user sees the login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'С возвращением! Войдите в аккаунт' })).toBeVisible();
});

test('anonymous user is redirected from a protected route', async ({ page }) => {
    await page.goto('/people');

    await expect(page).toHaveURL('/login');
});

test('a wrong password is refused and the user stays on the login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Электронная почта').fill('e2e.admin@example.test');
    await page.getByLabel('Пароль').fill('not-the-e2e-password');
    await page.getByRole('button', { name: 'Войти', exact: true }).click();

    await expect(page.getByText('Вы ввели неверный логин или пароль')).toBeVisible();
    await expect(page).toHaveURL('/login');
});
