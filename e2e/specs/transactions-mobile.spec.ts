import { expect, test } from '@playwright/test';

const MOBILE_WIDTH = 375;

test.use({ viewport: { width: MOBILE_WIDTH, height: 812 } });

test('income, expense and balance cards fit the mobile viewport', async ({ page }) => {
    await page.goto('/transactions');

    const boxes = [];
    for (const title of ['Приход', 'Расход', 'Баланс']) {
        const heading = page.getByRole('heading', { name: title, exact: true });
        await expect(heading).toBeVisible();
        boxes.push(await heading.boundingBox());
    }

    // Stacked one under another, none pushed past the right edge of the screen.
    expect(boxes.every((box) => box && box.x >= 0 && box.x + box.width <= MOBILE_WIDTH)).toBe(true);
    expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
    expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y);
});
