import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

// very small CORS middleware for browser-based frontend
app.use((req: any, res: any, next: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// request logging middleware: log every incoming request body/headers/path
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    appendLog({ type: 'request', method: req.method, path: req.path, headers: req.headers, body: req.body });
  } catch (e) {
    console.error('request log failed', e);
  }
  next();
});

const PORT = process.env.PORT || 3002;
const prisma = new PrismaClient();
const LOG_PATH = process.env.DEBUG_LOG_PATH || '/tmp/product-debug.log';

function appendLog(entry: any) {
  try {
    const line = typeof entry === 'string' ? entry : JSON.stringify(entry);
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    console.error('failed to append log', e);
  }
}

app.post('/seed', async (req: Request, res: Response) => {
  const sample = [
    { name: 'Cheeseburger', price: 5.99, stock: 50, imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=60' },
    { name: 'Fries', price: 2.99, stock: 100, imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=60' },
    { name: 'Soda', price: 1.5, stock: 200, imageUrl: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=800&q=60' }
  ];
  try {
    await prisma.product.deleteMany();
    const created = [] as any[];
    for (const p of sample) {
      const c = await prisma.product.create({ data: p as any });
      created.push(c);
    }
    res.json({ ok: true, products: created });
  } catch (e: any) {
    console.error('seed error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    const all = await prisma.product.findMany();
    res.json(all);
  } catch (e: any) {
    console.error('products error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
  } catch (e: any) {
    console.error('product id error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post('/products', async (req: Request, res: Response) => {
  try {
    const { name, price, stock } = req.body;
    const p = await prisma.product.create({ data: { name, price: Number(price), stock: Number(stock) } });
    res.json(p);
  } catch (e: any) {
    console.error('create product error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// decrement endpoint used by Order service
app.post('/decrement', async (req: Request, res: Response) => {
  const { productId, qty } = req.body as { productId: string; qty: number };
  if (!productId || !qty) return res.status(400).json({ error: 'productId and qty required' });
  try {
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(404).json({ error: 'not found' });
    if (prod.stock < qty) return res.status(400).json({ error: 'insufficient stock' });
    const updated = await prisma.product.update({ where: { id: productId }, data: { stock: prod.stock - qty } });
    console.debug('decremented', { productId, qty, newStock: updated.stock });
    const out = { success: true, product: updated };
    appendLog({ route: '/decrement', req: { productId, qty }, res: out });
    res.json(out);
  } catch (e: any) {
    console.error('decrement error', e);
    const out = { success: false, error: e?.message || String(e) };
    appendLog({ route: '/decrement', req: { productId, qty }, res: out, error: e?.message || String(e) });
    res.status(500).json(out);
  }
});

// increment endpoint used by Order service for compensation (restore stock)
app.post('/increment', async (req: Request, res: Response) => {
  const { productId, qty } = req.body as { productId: string; qty: number };
  if (!productId || !qty) return res.status(400).json({ error: 'productId and qty required' });
  try {
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(404).json({ error: 'not found' });
    const updated = await prisma.product.update({ where: { id: productId }, data: { stock: prod.stock + qty } });
    console.debug('incremented', { productId, qty, newStock: updated.stock });
    const out = { success: true, product: updated };
    appendLog({ route: '/increment', req: { productId, qty }, res: out });
    res.json(out);
  } catch (e: any) {
    console.error('increment error', e);
    const out = { success: false, error: e?.message || String(e) };
    appendLog({ route: '/increment', req: { productId, qty }, res: out, error: e?.message || String(e) });
    res.status(500).json(out);
  }
});

// debug endpoint to read recent logs
app.get('/debug/logs', async (req: Request, res: Response) => {
  try {
    const tail = Number(req.query.tail) || 20000;
    const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
    const out = raw.slice(-tail);
    res.set('content-type', 'text/plain').send(out);
  } catch (e: any) {
    res.status(500).send(String(e));
  }
});

app.listen(PORT, () => console.log(`Product service running on ${PORT}`));
