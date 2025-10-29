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
