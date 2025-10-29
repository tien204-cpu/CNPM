import { test, expect } from '@playwright/test';
// Allow overriding APP_URL from environment (CI/local). If not provided, use fallback ports.
const APP_URL = process.env.APP_URL || '';

test('full user flow: register, add to cart and place order', async ({ page }) => {
  const base = await gotoWithFallback(page, APP_URL);

  // Wait for products API to respond and for products to render
  await page.waitForResponse(r => r.url().includes('/products') && r.status() === 200, { timeout: 60000 });
  await page.waitForSelector('.product-card', { timeout: 10000 });
  const firstCard = page.locator('.product-card').first();
  await firstCard.locator('button:has-text("Add")').click();

  // fill register form in cart area
  await page.fill('input[placeholder="email"]', `e2e+${Date.now()}@example.com`);
  await page.fill('input[placeholder="password"]', 'password');
  // ensure register mode selected
  await page.selectOption('select', 'register');
  await page.click('button:has-text("Register")');

  // small wait for login to complete
  await page.waitForTimeout(500);

  // Place order
  await page.click('button:has-text("Place order")');

  // Wait for orders endpoint response
  const resp = await page.waitForResponse(r => r.url().includes('/orders') && r.status() === 200);
  const json = await resp.json();
  expect(json.id || json.orderId).toBeTruthy();
});

// Define gotoWithFallback function to navigate to the app using APP_URL or try common Vite ports
async function gotoWithFallback(page: any, urlBase: string) {
  if (APP_URL) {
    await page.goto(APP_URL, { waitUntil: 'load', timeout: 10000 });
    return APP_URL;
  }

  const portsToTry = ['5173', '5174', '5175'];
  for (const p of portsToTry) {
    const tryUrl = urlBase.includes(':') ? urlBase.replace(/:\d+/, `:${p}`) : `http://localhost:${p}`;
    try {
      await page.goto(tryUrl, { waitUntil: 'load', timeout: 5000 });
      return tryUrl;
    } catch (err) {
      // continue to next port
    }
  }

  throw new Error(`Unable to connect to app on ports ${portsToTry.join(', ')}; set APP_URL to override.`);
}



