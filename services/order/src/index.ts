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

// Fetch unique restaurants for an order's items, preserving item order
async function getRestaurantsForOrder(orderId: string): Promise<Array<{ id: string; name?: string; address?: string; lat: number; lng: number }>> {
  const out: Array<{ id: string; name?: string; address?: string; lat: number; lng: number }> = [];
  const seen = new Set<string>();
  try {
    const o = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o || !Array.isArray(o.items)) return out;
    for (const it of o.items) {
      try {
        const prod = await axios.get(`${PRODUCT_URL}/products/${it.productId}`).then(r => r.data);
        const rid = prod?.restaurantId;
        if (rid && !seen.has(rid)) {
          seen.add(rid);
          try {
            const rest = await axios.get(`${PRODUCT_URL}/restaurants/${rid}`).then(r => r.data);
            if (rest && typeof rest.lat === 'number' && typeof rest.lng === 'number') {
              out.push({ id: rid, name: rest.name, address: rest.address, lat: rest.lat, lng: rest.lng });
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}
  return out;
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
const lastDrone: Map<string, { path?: Array<{ lat: number; lng: number; t: number }>; start?: { lat: number; lng: number }; end?: { lat: number; lng: number }; lastPos?: { lat: number; lng: number; t: number }; stops?: Array<{ lat: number; lng: number; name?: string; address?: string }>; phase?: 'pickup' | 'delivery' }> = new Map();
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
  broadcast(orderId, 'status', {
    id: orderId,
    status,
    droneName: (o as any).droneName,
    droneSpeed: (o as any).droneSpeed,
    deliveryTimeSeconds: (o as any).deliveryTimeSeconds,
  });
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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371; // km
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
function estimatePathDistanceKm(path: Array<{ lat: number; lng: number }>): number {
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    sum += haversineKm(path[i - 1], path[i]);
  }
  return sum;
}

async function ensureDefaultDrones() {
  try {
    const count = await prisma.drone.count();
    if (count > 0) return;
    await prisma.drone.createMany({
      data: [
        { name: 'Drone 1', imageUrl: null, status: 'ready', isActive: true, speedKmh: 40 },
        { name: 'Drone 2', imageUrl: null, status: 'ready', isActive: true, speedKmh: 40 },
        { name: 'Drone 3', imageUrl: null, status: 'ready', isActive: true, speedKmh: 40 },
      ],
    });
  } catch (e: any) {
    try { appendLog({ action: 'seed-drones-error', error: e?.message || String(e) }); } catch {}
  }
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

        const paymentMethod = (payment && payment.method) || 'COD';
        let pay: any = { data: { success: true } };
        if (paymentMethod !== 'VNPay') {
          pay = await axiosWithRetry('post', `${PAYMENT_URL}/pay`, { amount: total });
        }
        appendLog({ action: 'payment-attempt', total, resp: pay?.data, status: pay?.status, method: paymentMethod });
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

      // Create order and store precise shipping lat/lng if provided; fallback to pseudoGeocode
      let order;
      let sLat = typeof shipping?.lat === 'number' ? Number(shipping.lat) : NaN;
      let sLng = typeof shipping?.lng === 'number' ? Number(shipping.lng) : NaN;
      if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) {
        const g = pseudoGeocode(shipping?.address || 'Saigon');
        sLat = g.lat; sLng = g.lng;
      }
      order = await prisma.order.create({
        data: {
          total,
          status: 'Điều drone tới nhà hàng',
          userEmail: userEmail || null,
          shippingName: shipping?.name || null,
          shippingPhone: shipping?.phone || null,
          shippingAddress: shipping?.address || null,
          paymentMethod,
          shippingLat: sLat,
          shippingLng: sLng,
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
  try {
    const email = (req.query?.email as string) || '';
    const page = Math.max(1, parseInt((req.query?.page as string) || '1'));
    const limRaw = parseInt((req.query?.limit as string) || '20');
    const limit = Math.min(100, Math.max(1, isNaN(limRaw) ? 20 : limRaw));
    const fromDateStr = (req.query?.fromDate as string) || (req.query?.from as string) || '';
    const toDateStr = (req.query?.toDate as string) || (req.query?.to as string) || '';

    const where: any = {};
    if (email) where.userEmail = email;
    const andArr: any[] = [];
    if (fromDateStr) {
      const d = new Date(fromDateStr);
      if (!isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        andArr.push({ createdAt: { gte: start } });
      }
    }
    if (toDateStr) {
      const d = new Date(toDateStr);
      if (!isNaN(d.getTime())) {
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        andArr.push({ createdAt: { lte: end } });
      }
    }
    if (andArr.length) where.AND = andArr;

    const usePaging = !!(req.query?.page || req.query?.limit || fromDateStr || toDateStr || email);
    if (usePaging) {
      const total = await prisma.order.count({ where });
      const list = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { items: true }
      });
      return res.json({ data: list, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
    } else {
      const all = await prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(all);
    }
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/orders/:id', async (req: any, res: any) => {
  const id = req.params.id;
  const o = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!o) return res.status(404).json({ error: 'not found' });
  res.json(o);
});

app.get('/drones', async (req: any, res: any) => {
  try {
    const where: any = {};
    const q = (req.query?.active ?? req.query?.isActive) as string | undefined;
    if (typeof q === 'string') {
      const v = q.toLowerCase();
      if (v === '1' || v === 'true' || v === 'yes') where.isActive = true;
    }
    const list = await prisma.drone.findMany({ where, orderBy: { name: 'asc' } });
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post('/drones', async (req: any, res: any) => {
  try {
    const { name, imageUrl, speedKmh } = req.body || {};
    if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name required' });
    const d = await prisma.drone.create({
      data: {
        name: name.trim(),
        imageUrl: imageUrl || null,
        speedKmh: typeof speedKmh === 'number' ? speedKmh : null,
      }
    });
    res.json(d);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.patch('/drones/:id', async (req: any, res: any) => {
  const id = req.params.id as string;
  try {
    const { name, imageUrl, speedKmh, status, isActive } = req.body || {};
    const data: any = {};
    if (typeof name === 'string') data.name = name;
    if (typeof imageUrl === 'string') data.imageUrl = imageUrl;
    if (typeof speedKmh === 'number') data.speedKmh = speedKmh;
    if (typeof status === 'string') data.status = status;
    if (typeof isActive === 'boolean') data.isActive = isActive;
    const d = await prisma.drone.update({ where: { id }, data });
    res.json(d);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete('/drones/:id', async (req: any, res: any) => {
  const id = req.params.id as string;
  try {
    // Không cho xoá nếu drone đang được gán cho đơn hàng chưa giao xong
    const active = await prisma.order.findFirst({
      where: {
        droneId: id,
        status: { not: 'Đã giao đồ ăn tới nhà' },
      },
    });
    if (active) {
      return res.status(400).json({ error: 'Drone đang được sử dụng cho đơn hàng chưa hoàn tất' });
    }

    // Gỡ liên kết drone khỏi các đơn đã hoàn tất (nếu có) để tránh lỗi ràng buộc
    try {
      await prisma.order.updateMany({ where: { droneId: id }, data: { droneId: null } });
    } catch {}

    await prisma.drone.delete({ where: { id } });
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
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
  if (current) {
    sendEvent(res, 'status', {
      id,
      status: current.status,
      droneName: (current as any).droneName,
      droneSpeed: (current as any).droneSpeed,
      deliveryTimeSeconds: (current as any).deliveryTimeSeconds,
    });
  }
  // replay last known drone route/pos to newly connected client
  const last = lastDrone.get(id);
  if (last && last.path) {
    const payload: any = { type: 'route', path: last.path };
    if (last.start) payload.start = last.start;
    if (last.end) payload.end = last.end;
    if (last.stops) payload.stops = last.stops;
    sendEvent(res, 'drone', payload);
    if (last.lastPos) sendEvent(res, 'drone', { type: 'pos', lat: last.lastPos.lat, lng: last.lastPos.lng, progress: last.lastPos.t });
  }
});

app.post('/orders/:id/drone/select', async (req: any, res: any) => {
  const id = req.params.id as string;
  const { droneId } = req.body || {};
  if (!droneId || typeof droneId !== 'string') return res.status(400).json({ error: 'droneId required' });
  try {
    const [order, drone] = await Promise.all([
      prisma.order.findUnique({ where: { id } }),
      prisma.drone.findUnique({ where: { id: droneId } }),
    ]);
    if (!order) return res.status(404).json({ error: 'order not found' });
    if (!drone) return res.status(404).json({ error: 'drone not found' });

    // Enforce one active order per drone (not yet delivered)
    const conflict = await prisma.order.findFirst({
      where: {
        droneId,
        id: { not: id },
        status: { not: 'Đã giao đồ ăn tới nhà' },
      },
    });
    if (conflict) return res.status(400).json({ error: 'Drone đang được sử dụng cho đơn khác' });

    const speed = typeof drone.speedKmh === 'number' ? drone.speedKmh : null;
    const updated = await prisma.order.update({
      where: { id },
      data: {
        drone: { connect: { id: drone.id } },
        droneName: drone.name,
        droneSpeed: speed,
      },
    });
    try {
      await prisma.drone.update({ where: { id: drone.id }, data: { status: 'waiting', isActive: true } });
    } catch {}
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// Arm the drone: move status to "Bắt đầu lấy đồ ăn", then after 20-30s to "Chuẩn bị giao hàng" unless already delivering/delivered
app.post('/orders/:id/drone/arm', async (req: any, res: any) => {
  const id = req.params.id as string;
  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true, drone: true } });
    if (!order) return res.status(404).json({ error: 'not found' });
    if (!order.droneId) return res.status(400).json({ error: 'drone_not_assigned' });
    if (order.status === 'Chuẩn bị giao hàng' || order.status === 'Đang giao đồ ăn bằng drone' || order.status === 'Đã giao đồ ăn tới nhà') {
      return res.json({ ok: true, status: order.status });
    }
    if (order.status === 'Điều drone tới nhà hàng') {
      await setStatus(id, 'Bắt đầu lấy đồ ăn');
    }
    if (armTimers.has(id)) { try { clearTimeout(armTimers.get(id)); } catch {} armTimers.delete(id); }

    // Build pickup route across all restaurants in the order
    const rests = await getRestaurantsForOrder(id);
    let points: Array<{ lat: number; lng: number }> = [];
    for (let i = 0; i < rests.length; i++) {
      const cur = { lat: rests[i].lat, lng: rests[i].lng };
      const prev = i === 0 ? cur : { lat: rests[i - 1].lat, lng: rests[i - 1].lng };
      const segN = 30;
      for (let k = 0; k <= segN; k++) {
        const t = k / segN;
        points.push({ lat: prev.lat * (1 - t) + cur.lat * t, lng: prev.lng * (1 - t) + cur.lng * t });
      }
    }
    if (points.length === 0) {
      // fallback: no restaurants with coords -> simulate tiny loop near center
      const center = pseudoGeocode(order.shippingAddress || 'Saigon');
      points = [center, { lat: center.lat + 0.005, lng: center.lng + 0.003 }, { lat: center.lat, lng: center.lng }];
    }
    const path = points.map((p, idx) => ({ lat: p.lat, lng: p.lng, t: points.length <= 1 ? 1 : idx / (points.length - 1) }));
    const stops = rests.map(r => ({ lat: r.lat, lng: r.lng, name: r.name, address: r.address }));
    lastDrone.set(id, { path, lastPos: path[0], stops, phase: 'pickup' });
    broadcast(id, 'drone', { type: 'route', path, stops });

    // simulate movement along pickup path
    let idx = 0;
    const tick = async () => {
      if (idx >= path.length) {
        await setStatus(id, 'Chuẩn bị giao hàng');
        return;
      }
      const p = path[idx++];
      const last = lastDrone.get(id) || {} as any;
      last.lastPos = p; if (!last.path) last.path = path; if (!last.stops) last.stops = stops; last.phase = 'pickup';
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

// Start drone simulation with map route and phased statuses
app.post('/orders/:id/drone/start', async (req: any, res: any) => {
  const id = req.params.id as string;
  try {
    const order = await prisma.order.findUnique({ where: { id }, include: { drone: true } });
    if (!order) return res.status(404).json({ error: 'not found' });
    if (!order.droneId) return res.status(400).json({ error: 'drone_not_assigned' });
    // Cancel any pending arm timer so it won't overwrite delivering status
    if (armTimers.has(id)) { try { clearTimeout(armTimers.get(id)); } catch {} armTimers.delete(id); }
    // Pre-compute route immediately so client can see the path right away once starting delivery
    let start = null as any;
    const last = lastDrone.get(id);
    if (last && last.lastPos) start = { lat: last.lastPos.lat, lng: last.lastPos.lng } as any;
    if (!start) start = await getRestaurantForOrder(id);
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

    // Estimate delivery time from path length and drone speed
    let estSeconds: number | null = null;
    try {
      const simplePath = path.map(p => ({ lat: p.lat, lng: p.lng }));
      const distKm = estimatePathDistanceKm(simplePath);
      const speed = typeof ord?.drone?.speedKmh === 'number' && ord.drone.speedKmh! > 0 ? ord.drone.speedKmh! : 40;
      if (distKm > 0 && speed > 0) {
        estSeconds = Math.round((distKm / speed) * 3600);
      }
      if (estSeconds && order.droneId) {
        try {
          await prisma.order.update({
            where: { id },
            data: {
              droneSpeed: speed,
              deliveryTimeSeconds: estSeconds,
              droneName: ord?.drone?.name || ord?.droneName || null,
            },
          });
        } catch {}
      }
      if (order.droneId) {
        try { await prisma.drone.update({ where: { id: order.droneId }, data: { status: 'in_use' } }); } catch {}
      }
    } catch {}

    const cur = lastDrone.get(id) || {} as any;
    cur.path = path; cur.start = start as any; cur.end = end; cur.lastPos = path[0]; cur.phase = 'delivery';
    lastDrone.set(id, cur);
    // append delivery segment to existing pickup route on client
    broadcast(id, 'drone', { type: 'route', path, start, end, append: true });
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
    if (status === 'Đã giao đồ ăn tới nhà' && o?.droneId) {
      try {
        await prisma.drone.update({ where: { id: o.droneId as string }, data: { status: 'ready' } });
      } catch {}
    }
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

app.listen(PORT, () => {
  console.log(`Order service running on ${PORT}`);
  ensureDefaultDrones().catch(() => {});
});
