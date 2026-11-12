import { expect, test } from '@playwright/test';
import { expectRendered, watchErrors } from './helpers';

test.describe('public pages', () => {
    test('the homepage loads with the show and no script errors', async ({ page }) => {
        const errors = watchErrors(page);
        await page.goto('/');
        await expect(page).toHaveTitle(/StageVerse/);
        await expect(page.getByRole('region', { name: 'StageVerse live show' })).toBeVisible();
        await expect(page.getByRole('link', { name: /login/i }).first()).toBeVisible();
        await page.waitForTimeout(4000);
        expect(errors).toEqual([]);
    });

    test('a shared link offers the song at its moment', async ({ page }) => {
        const index = await (await page.request.get('/shows/index.json')).json();
        const demo = index.demos?.[0];
        test.skip(!demo, 'no demo songs built');
        await page.goto(`/?song=${demo.slug}&t=75`);
        await expect(page.getByRole('button', { name: /^Play .+ from 1:15$/ })).toBeVisible({ timeout: 30000 });
    });

    test('the social card, robots.txt and the sitemap are served', async ({ request, page }) => {
        expect((await request.get('/robots.txt')).status()).toBe(200);
        expect(await (await request.get('/sitemap.xml')).text()).toContain('<urlset');
        expect((await request.get('/opengraph-image.jpg')).headers()['content-type']).toContain('image/jpeg');
        await page.goto('/');
        await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/);
    });

    for (const path of ['/login', '/signup', '/events', '/about', '/contact', '/explore']) {
        test(`${path} renders`, async ({ page }) => {
            const errors = watchErrors(page);
            const response = await page.goto(path);
            expect(response.status()).toBeLessThan(400);
            await expectRendered(page);
            expect(errors).toEqual([]);
        });
    }

    for (const stage of ['mainstage', 'desert', 'warehouse']) {
        test(`the ${stage} layout page draws its stage`, async ({ page }) => {
            const errors = watchErrors(page);
            await page.goto(`/lab/${stage}`);
            await expect(page.locator('canvas')).toBeVisible({ timeout: 30000 });
            await expect(page.getByText(/Lights · \d+ in all/)).toBeVisible();
            expect(errors).toEqual([]);
        });
    }

    test('a dashboard sends a visitor who is not logged in to the login page', async ({ page }) => {
        await page.goto('/manage/dashboard');
        await expect(page).toHaveURL(/\/login/);
    });
});
