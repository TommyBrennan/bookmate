import { test, expect } from '@playwright/test';
import { generateTestUser, logoutUser } from './utils';

test.describe('Authentication Flow', () => {
  test('should register a new user', async ({ page }) => {
    const user = generateTestUser();

    await page.goto('/auth/register');

    // Fill registration form
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.fill('input[name="name"]', user.name);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to home page
    await page.waitForURL('/');
    expect(page.url()).toContain('http://localhost:3000/');

    // Should show user's name in navbar
    await expect(page.locator('button[aria-label="Open menu"]')).toContainText(user.name.charAt(0));
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.goto('/auth/register');

    // Try to submit with empty fields
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should not register with password mismatch', async ({ page }) => {
    const user = generateTestUser();

    await page.goto('/auth/register');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.fill('input[name="name"]', user.name);

    await page.click('button[type="submit"]');

    // Should show password mismatch error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    // First, register a user
    const user = generateTestUser();
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.fill('input[name="name"]', user.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Logout
    await logoutUser(page);

    // Now login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');

    // Should redirect to home page
    await page.waitForURL('/');
    expect(page.url()).toContain('http://localhost:3000/');
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    const user = generateTestUser();

    // Register and login
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.fill('input[name="confirmPassword"]', user.password);
    await page.fill('input[name="name"]', user.name);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Logout
    await page.click('button[aria-label="Open menu"]');
    await page.click('text=Logout');

    // Should redirect to login page
    await page.waitForURL('/auth/login');
    expect(page.url()).toContain('/auth/login');
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access create listing page without auth
    await page.goto('/listings/create');

    // Should redirect to login
    await page.waitForURL('/auth/login');
    expect(page.url()).toContain('/auth/login');
  });
});
