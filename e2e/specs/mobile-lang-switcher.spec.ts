import { expect, test } from '@playwright/test';

const languageGroup = { name: 'Выбор языка' };

test.describe('mobile viewport', () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test('language switcher lives in the sidebar menu footer, not in the navbar', async ({ page }) => {
        await page.goto('/');
        const sidebarSwitcher = page.getByTestId('sidebar-footer').getByRole('group', languageGroup);

        // The navbar copy is display: none, so the only switcher left in the
        // accessibility tree is the one in the still-closed sidebar menu.
        await expect(page.getByRole('group', languageGroup)).toHaveCount(1);
        await expect(sidebarSwitcher).not.toBeInViewport();

        await page.getByRole('button', { name: 'Menu' }).click();

        await expect(sidebarSwitcher).toBeInViewport();
        await sidebarSwitcher.getByRole('button', { name: 'EN' }).click();
        await expect(sidebarSwitcher.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    });
});

test('desktop keeps the language switcher in the navbar', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('sidebar-footer')).toBeHidden();
    await expect(page.getByRole('group', languageGroup)).toHaveCount(1);
    await expect(page.getByRole('group', languageGroup)).toBeInViewport();
});
