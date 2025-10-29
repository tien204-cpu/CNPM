import { test, expect } from '@playwright/test';
const APP_URL = 'http://localhost:3000'; // giá trị mặc định cho APP_URL

// Define mock data for /products and /orders API responses
const mockProducts = [{ id: 'p1', name: 'Mock Pizza', price: 9.99 }];
const mockOrders = [{ id: 'mock-order-1' }];

test('add to cart and place order', async ({ page }) => {
  // Set up mock API responses for /products and /orders
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
      body: JSON.stringify(mockOrders[0]),
    });
  });

  // Navigate to the app using APP_URL or try common Vite ports (5173/5174/5175)
  await gotoWithFallback(page, APP_URL);

  // Wait for products to render
  await page.waitForSelector('.product-card');
  const firstCard = page.locator('.product-card').first();
  await firstCard.locator('button:has-text("Add")').click();

  // Open cart and place order
  await page.click('button:has-text("Place order")');

  // Wait for mocked /orders response
  const [req] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/orders') && r.status() === 200),
  ]);
  const json = await req.json();
  expect(json.id).toBeTruthy();
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



