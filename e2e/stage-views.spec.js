import { expect, test } from '@playwright/test';
import { login, watchErrors } from './helpers';

// The 3D stage inside the dashboards: a fan watching a live show, and a crew member seeing a patch
// as a rig. Read-only: each test opens the view and closes it.

test('a fan can open the live stage and close it with Escape', async ({ page }) => {
    test.setTimeout(120000);
    const errors = watchErrors(page);
    await login(page, 'fan');
    const open = page.getByRole('button', { name: 'Watch the stage' });
    test.skip(!(await open.waitFor({ state: 'visible', timeout: 30000 }).then(() => true, () => false)), 'this fan has no upcoming show');
    await open.click();
    const view = page.getByRole('dialog');
    await expect(view.locator('canvas')).toBeVisible({ timeout: 30000 });
    await expect(view.getByText(/STANDBY|LIVE|PAUSED/)).toBeVisible();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/live-stage.png' });
    await page.keyboard.press('Escape');
    await expect(view).toBeHidden();
    expect(errors).toEqual([]);
});

test('the crew can see a patch on the 3D stage', async ({ page }) => {
    test.setTimeout(180000);
    const errors = watchErrors(page);
    await login(page, 'crew');
    const link = page.locator('a[href*="/patch-studio/"]').first();
    test.skip(!(await link.waitFor({ state: 'attached', timeout: 30000 }).then(() => true, () => false)), 'no show with a patch on the crew dashboard');
    await page.goto(await link.getAttribute('href'));
    await page.getByRole('button', { name: 'View on stage' }).click();
    const view = page.getByRole('dialog');
    await expect(view.locator('canvas')).toBeVisible({ timeout: 30000 });
    await expect(view.getByText(/fixtures in/)).toBeVisible();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/patch-stage.png' });
    await page.keyboard.press('Escape');
    await expect(view).toBeHidden();
    expect(errors).toEqual([]);
});
