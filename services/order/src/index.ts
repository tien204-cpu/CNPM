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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
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

const listeners = new Map<string, Set<Response>>();
// Keep last known drone route/position per order so late viewers still see the route
const lastDrone: Map<string, { path?: Array<{ lat: number; lng: number; t: number }>; start?: { lat: number; lng: number }; end?: { lat: number; lng: number }; lastPos?: { lat: number; lng: number; t: number } }> = new Map();
// Track arm timers so starting delivery won't be overwritten by scheduled prep status
const armTimers: Map<string, any> = new Map();
function sendEvent(res: Response, event: string, data: any) {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {}
}
function broadcast(orderId: string, event: string, data: any) {
  const set = listeners.get(orderId);
  if (!set) return;
  for (const res of [...set]) {
    sendEvent(res, event, data);
  }
}
async function setStatus(orderId: string, status: string) {
  const o = await prisma.order.update({ where: { id: orderId }, data: { status } });
  broadcast(orderId, 'status', { id: orderId, status });
  return o;
}
function randomMs(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

// Pseudo geocode: map address string deterministically to a lat/lng near Saigon
function pseudoGeocode(address: string): { lat: number; lng: number } {
  const base = { lat: 10.776889, lng: 106.700806 }; // Bến Thành approx
  let h = 0;
  const s = address || '';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const d1 = ((h % 1000) / 1000 - 0.5) * 0.08; // ~ +/- 0.04 deg
  const d2 = ((((h / 1000) >>> 0) % 1000) / 1000 - 0.5) * 0.08;
  return { lat: base.lat + d1, lng: base.lng + d2 };
}

async function getRestaurantForOrder(orderId: string): Promise<{ lat: number; lng: number } | null> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!o || !o.items?.[0]) return null;
  const first = o.items[0];
  try {
    const prod = await axios.get(`${PRODUCT_URL}/products/${first.productId}`).then(r => r.data);
    const rid = prod?.restaurantId;
    if (!rid) return null;
    const rest = await axios.get(`${PRODUCT_URL}/restaurants/${rid}`).then(r => r.data);
    if (rest && typeof rest.lat === 'number' && typeof rest.lng === 'number') return { lat: rest.lat, lng: rest.lng };
  } catch {}
  return null;
}

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
  const { items, shipping, payment, userEmail } = req.body as { items: { productId: string; qty: number }[]; shipping?: any; payment?: any; userEmail?: string };
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

      // Create order in our DB with shipping/payment/userEmail, and store approximate shipping lat/lng
      let order;
      const paymentMethod = (payment && payment.method) || 'COD';
      const geo = pseudoGeocode(shipping?.address || 'Saigon');
      order = await prisma.order.create({
        data: {
          total,
          status: 'Điều drone tới nhà hàng',
          userEmail: userEmail || null,
          shippingName: shipping?.name || null,
          shippingPhone: shipping?.phone || null,
          shippingAddress: shipping?.address || null,
          paymentMethod,
          shippingLat: geo.lat,
          shippingLng: geo.lng,
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
  const email = (req.query?.email as string) || '';
  const all = await prisma.order.findMany({
    where: email ? { userEmail: email } : undefined,
    include: { items: true }
  });
  res.json(all);
});

app.get('/orders/:id', async (req: any, res: any) => {
  const id = req.params.id;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!o) return res.status(404).json({ error: 'not found' });
  res.json(o);
});

app.get('/orders/:id/events', async (req: any, res: any) => {
  const id = req.params.id as string;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(res);
  const onClose = () => {
    try { listeners.get(id)?.delete(res); } catch {}
  };
  req.on('close', onClose);
  const current = await prisma.order.findUnique({ where: { id } });
  if (current) sendEvent(res, 'status', { id, status: current.status });
  // replay last known drone route/pos to newly connected client
  const last = lastDrone.get(id);
  if (last && last.path && last.start && last.end) {
    sendEvent(res, 'drone', { type: 'route', path: last.path, start: last.start, end: last.end });
    if (last.lastPos) {
      sendEvent(res, 'drone', { type: 'pos', lat: last.lastPos.lat, lng: last.lastPos.lng, progress: last.lastPos.t });
    }
  }
});

// Arm the drone: move status to "Bắt đầu lấy đồ ăn", then after 20-30s to "Chuẩn bị giao hàng" unless already delivering/delivered
app.post('/orders/:id/drone/arm', async (req: any, res: any) => {
  const id = req.params.id as string;
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'not found' });
    if (order.status === 'Chuẩn bị giao hàng' || order.status === 'Đang giao đồ ăn bằng drone' || order.status === 'Đã giao đồ ăn tới nhà') {
      return res.json({ ok: true, status: order.status });
    }
    if (order.status === 'Điều drone tới nhà hàng') {
      await setStatus(id, 'Bắt đầu lấy đồ ăn');
    }
    if (armTimers.has(id)) { try { clearTimeout(armTimers.get(id)); } catch {} }
    const t = setTimeout(async () => {
      try {
        const cur = await prisma.order.findUnique({ where: { id } });
        if (cur && cur.status !== 'Đang giao đồ ăn bằng drone' && cur.status !== 'Đã giao đồ ăn tới nhà') {
          await setStatus(id, 'Chuẩn bị giao hàng');
        }
      } catch {}
      finally { armTimers.delete(id); }
    }, randomMs(20000, 30000));
    armTimers.set(id, t);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Start drone simulation with map route and phased statuses
app.post('/orders/:id/drone/start', async (req: any, res: any) => {
  const id = req.params.id as string;
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: 'not found' });
    // Cancel any pending arm timer so it won't overwrite delivering status
    if (armTimers.has(id)) { try { clearTimeout(armTimers.get(id)); } catch {} armTimers.delete(id); }
    // Pre-compute route immediately so client can see the path right away once starting delivery
    let start = await getRestaurantForOrder(id);
    const ord: any = order as any;
    const ship = { lat: ord?.shippingLat, lng: ord?.shippingLng };
    const end = { lat: (typeof ship.lat === 'number' ? ship.lat : pseudoGeocode(ord?.shippingAddress || '').lat), lng: (typeof ship.lng === 'number' ? ship.lng : pseudoGeocode(ord?.shippingAddress || '').lng) };
    if (!start) {
      const center = pseudoGeocode('Ben Thanh');
      start = center as any;
    }
    const N = 60;
    const path = Array.from({ length: N + 1 }, (_, i) => ({
      lat: ((start as any).lat * (N - i) + end.lat * i) / N,
      lng: ((start as any).lng * (N - i) + end.lng * i) / N,
      t: i / N
    }));
    lastDrone.set(id, { path, start: start as any, end, lastPos: path[0] });
    broadcast(id, 'drone', { type: 'route', path, start, end });
    // begin moving -> set to Đang giao ngay khi bấm bắt đầu
    await setStatus(id, 'Đang giao đồ ăn bằng drone');
    let idx = 0;
    const tick = () => {
      if (idx >= path.length) {
        broadcast(id, 'drone', { type: 'arrived', at: end });
        return;
      }
      const p = path[idx++];
      // update last position and broadcast
      const last = lastDrone.get(id) || {} as any;
      last.lastPos = p;
      if (!last.path) last.path = path;
      if (!last.start) last.start = start as any;
      if (!last.end) last.end = end;
      lastDrone.set(id, last);
      broadcast(id, 'drone', { type: 'pos', lat: p.lat, lng: p.lng, progress: p.t });
      setTimeout(tick, 500);
    };
    setTimeout(tick, 500);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.patch('/orders/:id', async (req: any, res: any) => {
  const id = req.params.id as string;
  const { status } = req.body as any;
  if (!status) return res.status(400).json({ error: 'status required' });
  try {
    const o = await setStatus(id, status);
    res.json(o);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete('/orders/:id', async (req: any, res: any) => {
  const id = req.params.id as string;
  try {
    await prisma.orderItem.deleteMany({ where: { orderId: id } });
    await prisma.order.delete({ where: { id } });
    broadcast(id, 'deleted', { id });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.listen(PORT, () => console.log(`Order service running on ${PORT}`));
