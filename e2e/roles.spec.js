import { expect, test } from '@playwright/test';
import { ROLES, expectRendered, login, watchErrors } from './helpers';

// Each role logs in and opens every one of its screens. Read-only: nothing is submitted.
for (const [role, { home, pages }] of Object.entries(ROLES)) {
    test.describe(role, () => {
        test(`logs in, lands on ${home} and every screen renders`, async ({ page }) => {
            test.setTimeout(240000);
            const errors = watchErrors(page);
            await login(page, role);
            for (const path of pages) {
                const response = await page.goto(path);
                expect(response.status(), path).toBeLessThan(400);
                expect(page.url(), path).not.toContain('/login');
                await expectRendered(page);
                await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
            }
            expect(errors).toEqual([]);
        });

        test("cannot open another role's dashboard", async ({ page }) => {
            await login(page, role);
            const other = Object.values(ROLES).find((r) => r.home !== home).home;
            await page.goto(other);
            expect(new URL(page.url()).pathname).not.toBe(other);
        });
    });
}
