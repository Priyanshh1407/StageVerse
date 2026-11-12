import { expect } from '@playwright/test';

// The public demo accounts (README). In CI the seed script creates them in CI's own database.
export const PASSWORD = process.env.E2E_PASSWORD || 'stageverse-demo';
export const ROLES = {
    fan: { email: 'recruiter.fan@stageverse.demo', home: '/dashboard', pages: ['/dashboard', '/discover', '/memory-vault', '/social', '/ticket'] },
    artist: { email: 'recruiter.artist@stageverse.demo', home: '/artist-dashboard', pages: ['/artist-dashboard', '/day-sheet', '/guest-list', '/live-show', '/setlist-builder', '/tech-rider'] },
    organizer: { email: 'recruiter.organizer@stageverse.demo', home: '/manage/dashboard', pages: ['/manage/dashboard', '/events', '/analysis', '/reports', '/ticketing', '/create-event'] },
    crew: { email: 'recruiter.crew@stageverse.demo', home: '/prod-dashboard', pages: ['/prod-dashboard', '/tasks', '/live'] },
};

/** Collect the page's own script errors (not failed network requests). */
export function watchErrors(page) {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    return errors;
}

/** A page that rendered: not the 404 page, not the framework's error screen. */
export async function expectRendered(page) {
    await expect(page.locator('body')).not.toContainText('This page could not be found');
    await expect(page.locator('body')).not.toContainText('Application error');
}

export async function login(page, role) {
    await page.goto('/login');
    await page.getByPlaceholder('Email Address').fill(ROLES[role].email);
    await page.getByPlaceholder('Password').fill(PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`**${ROLES[role].home}`, { timeout: 30000 });
}
