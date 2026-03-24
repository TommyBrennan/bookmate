/**
 * E2E Test Utilities
 */

import type { Page } from '@playwright/test';

/**
 * Generate a random test user with unique email
 */
export function generateTestUser() {
  return {
    email: `e2e-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'E2E Test User',
  };
}

/**
 * Register a new user
 */
export async function registerUser(page: Page, user: ReturnType<typeof generateTestUser>) {
  await page.goto('/auth/register');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);
  await page.fill('input[name="name"]', user.name);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

/**
 * Login with existing user
 */
export async function loginUser(page: Page, user: { email: string; password: string }) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

/**
 * Logout
 */
export async function logoutUser(page: Page) {
  await page.click('button[aria-label="Open menu"]');
  await page.click('text=Logout');
  await page.waitForURL('/auth/login');
}

/**
 * Create a test listing
 */
export async function createListing(page: Page, listingData: {
  title: string;
  author: string;
  pace: string;
  startDate: string;
  format: string;
  maxGroupSize: number;
}) {
  await page.goto('/listings/create');

  // Search for book
  await page.fill('input[placeholder*="Search by title or author"]', listingData.title);
  await page.click(`text="${listingData.title}"`);
  await page.waitForSelector('text=Book information loaded', { timeout: 5000 });

  // Fill form
  await page.selectOption('select[name="format"]', listingData.format);
  await page.fill('input[name="pace"]', listingData.pace);
  await page.fill('input[name="start_date"]', listingData.startDate);
  await page.fill('input[name="max_group_size"]', String(listingData.maxGroupSize));

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/listings\/[0-9]+/);

  // Get listing ID from URL
  const url = page.url();
  const match = url.match(/\/listings\/([0-9]+)/);
  return match ? match[1] : null;
}
