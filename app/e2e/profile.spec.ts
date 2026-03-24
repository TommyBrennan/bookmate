import { test, expect } from '@playwright/test';
import { generateTestUser } from './utils';

test.describe('Profile Flow', () => {
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

  test('should view profile page', async ({ page }) => {
    // Navigate to profile
    await page.click('button[aria-label="Open menu"]');
    await page.click('text=Profile');

    // Should be on profile page
    await page.waitForURL('/profile');
    expect(page.url()).toContain('/profile');

    // Should show user's name
    await expect(page.locator(`text=${authUser.name}`)).toBeVisible();

    // Should show profile tabs
    await expect(page.locator('text=About')).toBeVisible();
    await expect(page.locator('text=Reading')).toBeVisible();
  });

  test('should update profile', async ({ page }) => {
    // Navigate to profile
    await page.click('button[aria-label="Open menu"]');
    await page.click('text=Profile');
    await page.waitForURL('/profile');

    // Click edit button
    await page.click('button:has-text("Edit Profile")');

    // Update name
    const newName = 'Updated Name';
    await page.fill('input[name="name"]', newName);

    // Update bio
    const newBio = 'This is my updated bio.';
    await page.fill('textarea[name="bio"]', newBio);

    // Submit changes
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Profile updated successfully')).toBeVisible();

    // Should show updated name
    await expect(page.locator(`text=${newName}`)).toBeVisible();

    // Should show updated bio
    await expect(page.locator(`text=${newBio}`)).toBeVisible();
  });

  test('should show validation errors for invalid profile data', async ({ page }) => {
    // Navigate to profile
    await page.click('button[aria-label="Open menu"]');
    await page.click('text=Profile');
    await page.waitForURL('/profile');

    // Click edit button
    await page.click('button:has-text("Edit Profile")');

    // Try to submit empty name
    await page.fill('input[name="name"]', '');
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('text=Name is required')).toBeVisible();
  });

  test('should access notifications page', async ({ page }) => {
    // Navigate to notifications
    await page.click('button[aria-label="Open menu"]');
    await page.click('text=Notifications');

    // Should be on notifications page
    await page.waitForURL('/notifications');
    expect(page.url()).toContain('/notifications');

    // Should show notifications heading
    await expect(page.locator('h1')).toContainText('Notifications');
  });

  test('should show user menu with correct options', async ({ page }) => {
    // Click menu button
    await page.click('button[aria-label="Open menu"]');

    // Should show menu items
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('text=Notifications')).toBeVisible();
    await expect(page.locator('text=Logout')).toBeVisible();

    // Should show user's name initial
    await expect(page.locator(`text=${authUser.name.charAt(0)}`)).toBeVisible();
  });
});
