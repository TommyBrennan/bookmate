import { test, expect } from '@playwright/test';
import { generateTestUser, logoutUser, createListing } from './utils';

test.describe('Group Formation Flow', () => {
  test('should join an open listing', async ({ page, context: _context }) => {
    // Create a listing with first user
    const author = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', author.email);
    await page.fill('input[name="password"]', author.password);
    await page.fill('input[name="confirmPassword"]', author.password);
    await page.fill('input[name="name"]', author.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    const listingId = await createListing(page, {
      title: 'The Catcher in the Rye',
      author: 'J.D. Salinger',
      pace: '1 chapter per week',
      startDate: '2026-08-01',
      format: 'text',
      maxGroupSize: 3,
    });

    expect(listingId).toBeTruthy();

    // Logout and create second user
    await logoutUser(page);

    const joiner = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', joiner.email);
    await page.fill('input[name="password"]', joiner.password);
    await page.fill('input[name="confirmPassword"]', joiner.password);
    await page.fill('input[name="name"]', joiner.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to listing
    await page.goto(`/listings/${listingId}`);

    // Click join button
    await page.click('button:has-text("Join Group")');

    // Should show success message
    await expect(page.locator('text=Successfully joined the group')).toBeVisible();

    // Should show as member
    await expect(page.locator('text=Members')).toBeVisible();
    await expect(page.locator(`text=${joiner.name}`)).toBeVisible();
  });

  test('should not join own listing', async ({ page }) => {
    const user = generateTestUser();

    // Register and login
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.fill('input[name="name"]', user.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Create a listing
    const listingId = await createListing(page, {
      title: 'Animal Farm',
      author: 'George Orwell',
      pace: '2 chapters per week',
      startDate: '2026-09-01',
      format: 'voice',
      maxGroupSize: 4,
    });

    expect(listingId).toBeTruthy();

    // Should not show join button for own listing
    const joinButton = page.locator('button:has-text("Join Group")');
    await expect(joinButton).not.toBeVisible();

    // Should show "You are the author" text
    await expect(page.locator('text=You are the author')).toBeVisible();
  });

  test('should close listing when full', async ({ page, context: _context }) => {
    // Create a listing with max size of 2
    const author = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', author.email);
    await page.fill('input[name="password"]', author.password);
    await page.fill('input[name="confirmPassword"]', author.password);
    await page.fill('input[name="name"]', author.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    const listingId = await createListing(page, {
      title: 'Fahrenheit 451',
      author: 'Ray Bradbury',
      pace: '3 chapters per week',
      startDate: '2026-10-01',
      format: 'mixed',
      maxGroupSize: 2,
    });

    expect(listingId).toBeTruthy();

    // Logout and create second user
    await logoutUser(page);

    const joiner1 = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', joiner1.email);
    await page.fill('input[name="password"]', joiner1.password);
    await page.fill('input[name="confirmPassword"]', joiner1.password);
    await page.fill('input[name="name"]', joiner1.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Join the listing
    await page.goto(`/listings/${listingId}`);
    await page.click('button:has-text("Join Group")');
    await expect(page.locator('text=Successfully joined the group')).toBeVisible();

    // Listing should now be full (author + 1 member = 2 total)
    // Check if listing shows as full
    await page.reload();

    // Should show "Group is full" message
    await expect(page.locator('text=This group is now full')).toBeVisible();

    // Logout and create third user
    await logoutUser(page);

    const joiner2 = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', joiner2.email);
    await page.fill('input[name="password"]', joiner2.password);
    await page.fill('input[name="confirmPassword"]', joiner2.password);
    await page.fill('input[name="name"]', joiner2.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Try to join full listing
    await page.goto(`/listings/${listingId}`);

    // Should not show join button
    const joinButton = page.locator('button:has-text("Join Group")');
    await expect(joinButton).not.toBeVisible();

    // Should show "Group is full" message
    await expect(page.locator('text=This group is now full')).toBeVisible();
  });

  test('should leave a listing', async ({ page, context: _context }) => {
    // Create a listing with first user
    const author = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', author.email);
    await page.fill('input[name="password"]', author.password);
    await page.fill('input[name="confirmPassword"]', author.password);
    await page.fill('input[name="name"]', author.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    const listingId = await createListing(page, {
      title: 'The Hobbit',
      author: 'J.R.R. Tolkien',
      pace: '1 chapter per week',
      startDate: '2026-11-01',
      format: 'text',
      maxGroupSize: 4,
    });

    expect(listingId).toBeTruthy();

    // Logout and create second user
    await logoutUser(page);

    const joiner = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', joiner.email);
    await page.fill('input[name="password"]', joiner.password);
    await page.fill('input[name="confirmPassword"]', joiner.password);
    await page.fill('input[name="name"]', joiner.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Join the listing
    await page.goto(`/listings/${listingId}`);
    await page.click('button:has-text("Join Group")');
    await expect(page.locator('text=Successfully joined the group')).toBeVisible();

    // Click leave button
    await page.click('button:has-text("Leave Group")');

    // Should show confirmation
    await expect(page.locator('text=Are you sure you want to leave this group?')).toBeVisible();

    // Confirm leaving
    await page.click('button:has-text("Leave")');

    // Should show success message
    await expect(page.locator('text=Successfully left the group')).toBeVisible();

    // Should show join button again
    await expect(page.locator('button:has-text("Join Group")')).toBeVisible();
  });
});
