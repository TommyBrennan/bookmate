import { test, expect } from '@playwright/test';
import { generateTestUser, logoutUser, createListing } from './utils';

test.describe('Listing Management Flow', () => {
  let authUser: ReturnType<typeof generateTestUser>;

  test.beforeEach(async ({ page }) => {
    authUser = generateTestUser();

    // Register and login
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', authUser.email);
    await page.fill('input[name="password"]', authUser.password);
    await page.fill('input[name="confirmPassword"]', authUser.password);
    await page.fill('input[name="name"]', authUser.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should browse listings on home page', async ({ page }) => {
    await page.goto('/');

    // Should show listings heading
    await expect(page.locator('h1')).toContainText('Find Your Reading Companion');

    // Should browse listings link
    const browseLink = page.locator('a[href="/listings"]');
    await expect(browseLink).toBeVisible();
  });

  test('should create a new listing with book search', async ({ page }) => {
    await page.goto('/listings/create');

    // Search for a book
    await page.fill('input[placeholder*="Search by title or author"]', 'Pride and Prejudice');
    await page.waitForTimeout(500); // Wait for debounce

    // Should show search results
    const bookOption = page.locator('button').filter({ hasText: 'Pride and Prejudice' }).first();
    await expect(bookOption).toBeVisible({ timeout: 5000 });

    // Select a book
    await bookOption.click();

    // Should show book information
    await expect(page.locator('text=Book information loaded')).toBeVisible({ timeout: 5000 });

    // Fill form fields
    await page.selectOption('select[name="format"]', 'text');
    await page.fill('input[name="pace"]', '2 chapters per week');
    await page.fill('input[name="start_date"]', '2026-04-01');
    await page.fill('input[name="max_group_size"]', '5');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to listing detail page
    await page.waitForURL(/\/listings\/[0-9]+/);
    expect(page.url()).toMatch(/\/listings\/[0-9]+/);

    // Should show listing details
    await expect(page.locator('h1')).toContainText('Pride and Prejudice');
  });

  test('should show validation errors when creating listing', async ({ page }) => {
    await page.goto('/listings/create');

    // Try to submit without selecting a book
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Please select a book')).toBeVisible();
  });

  test('should view listing details', async ({ page }) => {
    const listingId = await createListing(page, {
      title: '1984',
      author: 'George Orwell',
      pace: '3 chapters per week',
      startDate: '2026-04-15',
      format: 'voice',
      maxGroupSize: 4,
    });

    expect(listingId).toBeTruthy();

    // Should show book title
    await expect(page.locator('h1')).toContainText('1984');

    // Should show book author
    await expect(page.locator('text=George Orwell')).toBeVisible();

    // Should show listing details
    await expect(page.locator('text=3 chapters per week')).toBeVisible();
    await expect(page.locator('text=Voice calls')).toBeVisible();

    // Should show max group size
    await expect(page.locator('text=/4.*members/')).toBeVisible();
  });

  test('should edit own listing', async ({ page }) => {
    // Create a listing
    const listingId = await createListing(page, {
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      pace: '1 chapter per week',
      startDate: '2026-05-01',
      format: 'text',
      maxGroupSize: 6,
    });

    expect(listingId).toBeTruthy();

    // Click edit button
    await page.click('button:has-text("Edit")');

    // Should be on edit page
    await page.waitForURL(/\/listings\/${listingId}\/edit/);

    // Update pace
    await page.fill('input[name="pace"]', '2 chapters per week');

    // Submit changes
    await page.click('button[type="submit"]');

    // Should redirect back to detail page
    await page.waitForURL(/\/listings\/${listingId}/);

    // Should show updated pace
    await expect(page.locator('text=2 chapters per week')).toBeVisible();
  });

  test('should not show edit button for other users listings', async ({ page, context: _context }) => {
    // Create a listing with first user
    const listingId = await createListing(page, {
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      pace: '1 chapter per week',
      startDate: '2026-06-01',
      format: 'mixed',
      maxGroupSize: 5,
    });

    expect(listingId).toBeTruthy();

    // Logout and create a different user
    await logoutUser(page);

    const secondUser = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', secondUser.email);
    await page.fill('input[name="password"]', secondUser.password);
    await page.fill('input[name="confirmPassword"]', secondUser.password);
    await page.fill('input[name="name"]', secondUser.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Navigate to the listing
    await page.goto(`/listings/${listingId}`);

    // Should not show edit button
    const editButton = page.locator('button:has-text("Edit")');
    await expect(editButton).not.toBeVisible();
  });

  test('should delete own listing', async ({ page }) => {
    // Create a listing
    const listingId = await createListing(page, {
      title: 'Brave New World',
      author: 'Aldous Huxley',
      pace: '2 chapters per week',
      startDate: '2026-07-01',
      format: 'voice',
      maxGroupSize: 4,
    });

    expect(listingId).toBeTruthy();

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Should show confirmation dialog
    await expect(page.locator('text=Are you sure you want to delete this listing?')).toBeVisible();

    // Confirm deletion
    await page.click('button:has-text("Delete")');

    // Should redirect to home page
    await page.waitForURL('/');

    // Try to navigate to deleted listing
    await page.goto(`/listings/${listingId}`);

    // Should show 404 or redirect
    await expect(page.locator('text=Listing not found')).toBeVisible();
  });
});
