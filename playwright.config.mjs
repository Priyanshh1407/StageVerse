import { defineConfig } from '@playwright/test';

// Browser tests (npm run test:e2e): they open the real pages, log in as each role and walk its
// screens. They only read: nothing is created, changed or deleted.
//   E2E_BASE_URL  the site to test (default: a production build started here on port 3401)
//   E2E_CHANNEL   a browser already on this machine, e.g. "msedge" (default: Playwright's Chromium)
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3401';

export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL,
        ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
        // WebGL without a graphics card (CI, headless)
        launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
        viewport: { width: 1440, height: 900 },
        trace: 'retain-on-failure',
    },
    // Without E2E_BASE_URL, start the production build (run `npm run build` first)
    webServer: process.env.E2E_BASE_URL ? undefined : { command: 'npx next start -p 3401', url: baseURL, timeout: 120000, reuseExistingServer: true },
});
