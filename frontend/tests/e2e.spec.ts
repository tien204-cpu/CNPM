import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || '';

/**
 * Navigate to the app. If APP_URL env var is provided, use it directly.
 * Otherwise try common Vite ports 5173/5174/5175.
 */
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
  // if none worked, throw an informative error
  throw new Error(`Unable to connect to app on ports ${portsToTry.join(', ')}; set APP_URL to override.`);
}

test('add to cart and place order', async ({ page }) => {
  // If backend isn't running, mock /products and /orders so the e2e test is reliable in CI/local dev.
  const mockProducts = [{ id: 'p1', name: 'Mock Pizza', price: 9.99 }];

  await page.route('**/products', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockProducts),
    });
  });

  await page.route('**/orders', async route => {
    // capture request body if needed, but respond with a mock order id
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'mock-order-1' }),
    });
  });

  await gotoWithFallback(page, APP_URL);
  // wait products to render
  await page.waitForSelector('.product-card');
  const firstCard = page.locator('.product-card').first();
  await firstCard.locator('button:has-text("Add")').click();
  // open cart and place
  await page.click('button:has-text("Place order")');

  // wait for mocked /orders response
  const [req] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/orders') && r.status() === 200),
  ]);
  const json = await req.json();
  expect(json.id).toBeTruthy();
});
