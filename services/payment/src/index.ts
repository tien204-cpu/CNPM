import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';

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

// log all incoming requests into debug log
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    appendLog({ type: 'request', method: req.method, path: req.path, headers: req.headers, body: req.body });
  } catch (e) {
    console.error('request log failed', e);
  }
  next();
});

const PORT = process.env.PORT || 3004;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const ORDER_URL = process.env.ORDER_URL || 'http://order:3003';
const LOG_PATH = process.env.DEBUG_LOG_PATH || '/tmp/payment-debug.log';

function appendLog(entry: any) {
  try {
    const line = typeof entry === 'string' ? entry : JSON.stringify(entry);
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    console.error('failed to append log', e);
  }
}

app.post('/pay', (req: Request, res: Response) => {
  const { amount } = req.body;
  appendLog({ route: '/pay', req: { amount } });
  if (typeof amount !== 'number') {
    const out = { success: false, error: 'invalid amount' };
    appendLog({ route: '/pay', res: out });
    return res.status(400).json(out);
  }
  // Simple mock: succeed if amount < 10000
  if (amount > 10000) {
    const out = { success: false, error: 'insufficient funds' };
    appendLog({ route: '/pay', res: out });
    return res.json(out);
  }
  const tx = `tx_${Date.now()}`;
  console.debug('payment processed', { amount, tx });
  const out = { success: true, transactionId: tx };
  appendLog({ route: '/pay', res: out });
  res.json(out);
});

app.post('/vnpay/create', (req: Request, res: Response) => {
  const { amount, orderId } = req.body as any;
  appendLog({ route: '/vnpay/create', req: { amount, orderId } });
  const amt = Number(amount);
  if (!orderId || !Number.isFinite(amt) || amt <= 0) {
    const out = { error: 'invalid amount or orderId' };
    appendLog({ route: '/vnpay/create', res: out });
    return res.status(400).json(out);
  }
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol || 'http');
  const base = `${proto}://${host}`;
  const url = `${base}/vnpay/demo?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amt))}`;
  const out = { url };
  appendLog({ route: '/vnpay/create', res: out });
  res.json(out);
});

app.get('/vnpay/demo', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const amount = String(req.query.amount || '0');
  const succeed = `/vnpay/return?orderId=${encodeURIComponent(orderId)}&vnp_ResponseCode=00`;
  const failed = `/vnpay/return?orderId=${encodeURIComponent(orderId)}&vnp_ResponseCode=24`;
  const html = `<!doctype html>
  <html><head><meta charset="utf-8" /><title>VNPay (DEMO)</title>
  <style>body{font-family:sans-serif;max-width:640px;margin:40px auto;padding:0 16px} .btn{display:inline-block;padding:10px 14px;border-radius:8px;text-decoration:none} .primary{background:#0ea5e9;color:#fff} .ghost{border:1px solid #cbd5e1;color:#0f172a} .row{display:flex;gap:8px;margin-top:12px}</style>
  </head><body>
  <h2>Thanh toán VNPay (DEMO)</h2>
  <div>Mã đơn: <b>${orderId}</b></div>
  <div>Số tiền: <b>${amount}</b></div>
  <div class="row">
    <a class="btn primary" href="${succeed}">Thanh toán thành công</a>
    <a class="btn ghost" href="${failed}">Thanh toán thất bại</a>
  </div>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.get('/vnpay/return', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const code = String(req.query.vnp_ResponseCode || '');
  appendLog({ route: '/vnpay/return', orderId, code });
  const url = `${FRONTEND_URL.replace(/\/$/, '')}/#/bill/${encodeURIComponent(orderId)}?vnp_ResponseCode=${encodeURIComponent(code)}`;
  res.redirect(302, url);
});

// debug endpoint
app.get('/debug/logs', (req: Request, res: Response) => {
  try {
    const tail = Number(req.query.tail) || 20000;
    const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
    res.set('content-type', 'text/plain').send(raw.slice(-tail));
  } catch (e: any) {
    res.status(500).send(String(e));
  }
});

app.listen(PORT, () => console.log(`Payment service running on ${PORT}`));
