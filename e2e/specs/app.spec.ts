import { expect, test } from '@playwright/test';

test('anonymous user sees the login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Ритм школы под вашим контролем' })).toBeVisible();
});

test('anonymous user is redirected from a protected route', async ({ page }) => {
    await page.goto('/clients');

    await expect(page).toHaveURL('/login');
});
