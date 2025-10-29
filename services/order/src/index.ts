import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const LOG_PATH = process.env.DEBUG_LOG_PATH || '/tmp/order-debug.log';
function appendLog(entry: any) {
  try {
    const line = typeof entry === 'string' ? entry : JSON.stringify(entry);
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    console.error('failed to append log', e);
  }
}

const app = express();
app.use(express.json());

// allow CORS for browser-based frontend
app.use((req: any, res: any, next: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// log all incoming requests to /tmp/order-debug.log for easier tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    appendLog({ type: 'request', method: req.method, path: req.path, headers: req.headers, body: req.body });
  } catch (e) {
    console.error('request log failed', e);
  }
  next();
});

const PORT = process.env.PORT || 3003;
const PRODUCT_URL = process.env.PRODUCT_URL || 'http://product:3002';
const PAYMENT_URL = process.env.PAYMENT_URL || 'http://payment:3004';

const prisma = new PrismaClient();

const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
async function axiosWithRetry(method: 'get'|'post', url: string, data?: any, config: any = {}, retries = 3, backoff = 300): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const attempt = i + 1;
      console.debug(`HTTP ${method.toUpperCase()} ${url} attempt ${attempt}/${retries}`);
      appendLog({ type: 'http-attempt', method, url, attempt, retries, data });
      let resp;
      if (method === 'get') resp = await axios.get(url, config);
      else resp = await axios.post(url, data, config);
      console.debug(`HTTP ${method.toUpperCase()} ${url} response status=${resp.status} data=${JSON.stringify(resp.data)}`);
      appendLog({ type: 'http-response', method, url, status: resp.status, data: resp.data });
      return resp;
    } catch (err: any) {
      const last = i === retries - 1;
      const status = err?.response?.status;
      const respData = err?.response?.data;
      console.warn(`HTTP ${method.toUpperCase()} ${url} failed (attempt ${i+1}/${retries}) status=${status} error=${err?.message}`);
      appendLog({ type: 'http-error', method, url, attempt: i+1, status, error: err?.message, respData });
      if (respData) console.warn(`  response data: ${JSON.stringify(respData)}`);
      if (last) throw err;
      await wait(backoff * (i + 1));
    }
  }
}

app.post('/orders', async (req: any, res: any) => {
  const { items } = req.body as { items: { productId: string; qty: number }[] };
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'items required' });

  try {
    // Calculate total and check stock via product service
    let total = 0;
    for (const it of items) {
      console.log('Checking product', it.productId);
      const r: any = await axiosWithRetry('get', `${PRODUCT_URL}/products/${it.productId}`);
      const product = r.data;
      if (!product) return res.status(502).json({ error: `product service returned empty for ${it.productId}` });
      if (product.stock < it.qty) return res.status(400).json({ error: `insufficient stock for ${product.name}` });
      total += product.price * it.qty;
    }

    // Reserve stock first (call decrement). If any decrement fails, roll back previous decrements.
    const decremented: Array<{ productId: string; qty: number }> = [];
      try {
        for (const it of items) {
            console.log('Reserving stock', it.productId, it.qty);
            appendLog({ action: 'reserve-attempt', productId: it.productId, qty: it.qty });
            const decResp: any = await axiosWithRetry('post', `${PRODUCT_URL}/decrement`, { productId: it.productId, qty: it.qty });
            // validate decrement response
            if (!decResp || decResp.status >= 400) {
              console.warn('decrement returned non-success', decResp?.status, decResp?.data);
              appendLog({ action: 'reserve-failed', productId: it.productId, resp: decResp?.data, status: decResp?.status });
              throw new Error(`decrement failed for ${it.productId}`);
            }
            decremented.push({ productId: it.productId, qty: it.qty });
            appendLog({ action: 'reserve-success', productId: it.productId, qty: it.qty, resp: decResp?.data });
          }

        // call payment
        const pay: any = await axiosWithRetry('post', `${PAYMENT_URL}/pay`, { amount: total });
        appendLog({ action: 'payment-attempt', total, resp: pay?.data, status: pay?.status });
        if (!pay || !pay.data || !pay.data.success) {
          console.warn('payment failed or returned falsy success', pay?.status, pay?.data);
          // payment failed -> restore stock
          appendLog({ action: 'payment-failed', total, resp: pay?.data, status: pay?.status });
          for (const d of decremented) {
            // best-effort restore via product service (add back qty)
            try {
              console.log('Restoring stock for', d.productId, d.qty);
              const incResp: any = await axiosWithRetry('post', `${PRODUCT_URL}/increment`, { productId: d.productId, qty: d.qty });
              console.debug('restore response', incResp?.status, incResp?.data);
              appendLog({ action: 'restore-response', productId: d.productId, status: incResp?.status, resp: incResp?.data });
            } catch (er: any) {
              console.error('Failed to restore stock for', d.productId, er?.message || er);
                appendLog({ action: 'restore-failed', productId: d.productId, error: er?.message || er });
            }
          }
          return res.status(402).json({ error: 'payment failed' });
        }

      // Create order in our DB
      let order;
      // Create order without writing `status` field to avoid schema mismatch across environments
      order = await prisma.order.create({
        data: {
          total,
          items: { create: items.map(i => ({ productId: i.productId, qty: i.qty })) }
        },
        include: { items: true }
      });

      res.json(order);
  } catch (err: any) {
      // if any error after partial decrements, try to roll them back
      if (decremented.length > 0) {
        for (const d of decremented) {
          try {
            const inc = await axiosWithRetry('post', `${PRODUCT_URL}/increment`, { productId: d.productId, qty: d.qty });
            appendLog({ action: 'rollback-restore', productId: d.productId, resp: inc?.data, status: inc?.status });
          } catch (er: any) {
            console.error('Failed to restore stock for', d.productId, er?.message || er);
            appendLog({ action: 'rollback-restore-failed', productId: d.productId, error: er?.message || er });
          }
        }
      }
      appendLog({ action: 'order-error', error: err?.message || String(err) });
      throw err;
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/orders', async (req: any, res: any) => {
  const all = await prisma.order.findMany({ include: { items: true } });
  res.json(all);
});

app.listen(PORT, () => console.log(`Order service running on ${PORT}`));
