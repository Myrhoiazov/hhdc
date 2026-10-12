import { expect, test } from '@playwright/test';

// Works on the two AI providers from server/prisma/seed-e2e.ts; neither is ever called.
test('the provider that writes answers is switched and the choice survives a reload', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/settings/providers');
    const options = page.getByRole('radiogroup', { name: 'Модель для ответов' });
    const local = options.getByRole('radio', { name: /E2E local model/ });
    const cloud = options.getByRole('radio', { name: /E2E cloud model/ });

    await expect(local).toBeChecked();
    await expect(local).toContainText('Пишет ответы');
    await cloud.click();
    await expect(cloud).toBeChecked();

    await page.reload();
    await expect(cloud).toBeChecked();
    await expect(cloud).toContainText('e2e-cloud');
    await expect(local).not.toBeChecked();
});
