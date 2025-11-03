import { test, expect } from '@playwright/test';
// Allow overriding APP_URL from environment (CI/local). If not provided, use fallback ports.
const APP_URL = process.env.APP_URL || '';

test('full user flow: register, add to cart and place order', async ({ page }) => {
  const base = await gotoWithFallback(page, APP_URL);

  // Mirror page console logs to the test runner to help debugging render errors
  page.on('console', msg => console.log('PAGE LOG[' + msg.type() + ']:', msg.text()));
  // Log network responses for /products to ensure the browser actually receives the payload
  page.on('response', async r => {
    try {
      if (r.url().includes('/products')) {
        const txt = await r.text();
        console.log('NETWORK /products response', r.status(), txt.substring(0, 1000));
      }
    } catch (e) {
      console.log('failed to read response body', (e as any)?.message || e);
    }
  });

  // Wait for products API to respond and for products to render
  await page.waitForResponse(r => r.url().includes('/products') && r.status() === 200, { timeout: 60000 });
  // Dump page HTML for debugging if rendering doesn't happen
  const snapshotHtml = await page.content();
  console.log('PAGE HTML START');
  console.log(snapshotHtml.slice(0, 3000));
  console.log('PAGE HTML END');
  await page.waitForSelector('.product-card', { timeout: 30000 });
  const firstCard = page.locator('.product-card').first();
  // ensure the product card has an image and name
  const productName = await firstCard.locator('.product-name').innerText();
  const img = firstCard.locator('img');
  await expect(img).toHaveAttribute('alt', productName);
  const imgSrc = await img.getAttribute('src');
  expect(imgSrc).toBeTruthy();
  // try waiting for the image network response (best-effort)
  try {
    await page.waitForResponse(r => r.url() === imgSrc && r.status() === 200, { timeout: 5000 });
  } catch (e) {
    console.log('Image response not captured or timed out for', imgSrc);
  }
  await firstCard.locator('button:has-text("Add")').click();

  // fill register form in cart area
  await page.fill('input[placeholder="email"]', `e2e+${Date.now()}@example.com`);
  await page.fill('input[placeholder="password"]', 'password');
  // ensure register mode selected
  await page.selectOption('select', 'register');
  await page.click('button:has-text("Register")');

  // small wait for login to complete
  await page.waitForTimeout(500);

  // Place order and handle the alert dialog produced by the app (order success message)
  const dialogPromise = page.waitForEvent('dialog', { timeout: 60000 });
  await page.click('button:has-text("Place order")');
  const dialog = await dialogPromise;
  // app shows JSON in an alert: parse it
  let payload = null;
  const msg = dialog.message();
  console.log('DIALOG MESSAGE:', msg);
  try {
    payload = JSON.parse(msg.replace(/^Order placed:\s*/i, ''));
  } catch (e) {
    // not JSON — still assert dialog shown
  }
  await dialog.accept();
  expect(payload && (payload.id || payload.orderId)).toBeTruthy();
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



