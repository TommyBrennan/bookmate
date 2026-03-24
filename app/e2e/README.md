# E2E Tests with Playwright

This directory contains end-to-end tests for Bookmate using Playwright.

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run in debug mode
```bash
npm run test:e2e:debug
```

### Run a specific test file
```bash
npm run test:e2e -- auth.spec.ts
```

### Run tests matching a pattern
```bash
npm run test:e2e -- -g "should login"
```

## Test Coverage

### Authentication Flow (`auth.spec.ts`)
- User registration
- Validation errors for invalid registration
- Password mismatch validation
- Login with valid credentials
- Error for invalid login credentials
- Logout functionality
- Protected route redirects

### Listing Management Flow (`listings.spec.ts`)
- Browse listings on home page
- Create new listing with book search
- Validation errors when creating listing
- View listing details
- Edit own listing
- Access control (no edit button for others' listings)
- Delete own listing

### Group Formation Flow (`group-formation.spec.ts`)
- Join an open listing
- Cannot join own listing
- Listing closes when full
- Leave a listing

### Profile Flow (`profile.spec.ts`)
- View profile page
- Update profile
- Validation errors for invalid profile data
- Access notifications page
- User menu functionality

## Test Data

Tests use dynamically generated test data with unique emails to avoid conflicts:
- Email format: `e2e-test-${Date.now()}@example.com`
- Password: `TestPassword123!`
- Name: `E2E Test User`

## CI/CD

E2E tests run automatically in GitHub Actions CI on every push and pull request to `main`.

The test suite:
1. Starts the dev server
2. Installs Playwright browsers
3. Runs all E2E tests
4. Uploads test results as artifacts
5. Continues even if tests fail (`continue-on-error: true`)

## Troubleshooting

### Tests timeout
- Increase timeout in `playwright.config.ts` or individual tests
- Check if dev server is starting correctly

### Book search not working
- Tests rely on Open Library API being available
- If API is down, book search tests may fail

### Browser not installed
```bash
npx playwright install chromium
```

## Adding New Tests

1. Create a new test file in `app/e2e/`
2. Import utilities from `./utils.ts`
3. Use `test.describe()` for grouping
4. Use `test()` for individual test cases
5. Run `npm run test:e2e` to verify

Example:
```typescript
import { test, expect } from '@playwright/test';
import { generateTestUser } from './utils';

test.describe('My Feature', () => {
  test('should do something', async ({ page }) => {
    const user = generateTestUser();
    // Test code here
  });
});
```
