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
  const { amount, orderId, bankCode, language, description } = req.body as any;
  appendLog({ route: '/vnpay/create', req: { amount, orderId, bankCode, language } });
  const amt = Number(amount);
  if (!orderId || !Number.isFinite(amt) || amt <= 0) {
    const out = { error: 'invalid amount or orderId' };
    appendLog({ route: '/vnpay/create', res: out });
    return res.status(400).json(out);
  }
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol || 'http');
  const base = `${proto}://${host}`;
  const bn = String(bankCode || 'NCB');
  const lang = String(language || 'vn');
  const desc = String(description || `Thanh toan don hang ${orderId || ''}`);
  const url = `${base}/vnpay/demo?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amt))}&bankCode=${encodeURIComponent(bn)}&language=${encodeURIComponent(lang)}&desc=${encodeURIComponent(desc)}`;
  const out = { url };
  appendLog({ route: '/vnpay/create', res: out });
  res.json(out);
});

app.get('/vnpay/demo', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const amount = String(req.query.amount || '0');
  const bankCode = String(req.query.bankCode || 'NCB');
  const language = String(req.query.language || 'vn');
  const desc = String(req.query.desc || `Thanh toan don hang ${orderId}`);
  const succeed = `/vnpay/return?orderId=${encodeURIComponent(orderId)}&vnp_ResponseCode=00&vnp_BankCode=${encodeURIComponent(bankCode)}&vnp_Locale=${encodeURIComponent(language)}`;
  const failed = `/vnpay/return?orderId=${encodeURIComponent(orderId)}&vnp_ResponseCode=24&vnp_BankCode=${encodeURIComponent(bankCode)}&vnp_Locale=${encodeURIComponent(language)}`;
  const html = `<!doctype html>
  <html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>VNPay (DEMO)</title>
  <style>
    :root{--fg:#0f172a;--muted:#475569;--border:#e2e8f0;--bg:#f8fafc;--primary:#0ea5e9}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif;color:var(--fg);background:#fff;max-width:920px;margin:40px auto;padding:0 16px}
    h1,h2,h3{margin:0 0 10px 0}
    .card{background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;margin-top:16px}
    .row{display:flex;gap:16px;flex-wrap:wrap}
    .field{display:flex;flex-direction:column;gap:6px;flex:1;min-width:240px}
    label{font-weight:600}
    input,select,textarea{padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:14px}
    .actions{display:flex;gap:10px;margin-top:16px}
    .btn{display:inline-block;padding:10px 14px;border-radius:8px;text-decoration:none;border:1px solid var(--border);color:var(--fg);background:#fff}
    .btn.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
    .bank-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
    .bank-option{border:1px solid var(--border);border-radius:10px;padding:10px;display:flex;gap:8px;align-items:center}
    .bank-option input{margin:0}
    .lang-group{display:flex;gap:12px;align-items:center}
  </style>
  </head><body>
  <h2>VNPay Sandbox (Demo)</h2>
  <div class="card">
    <div class="row">
      <div class="field"><label>Mã đơn</label><input value="${orderId}" readonly /></div>
      <div class="field"><label>Số tiền</label><input value="${amount}" readonly /></div>
    </div>
    <div class="field"><label>Ngân hàng</label>
      <div class="bank-grid">
        ${['NCB','VCB','AGRIBANK','SACOMBANK','TECHCOMBANK'].map(code => `
          <label class=\"bank-option\"><input type=\"radio\" name=\"bank\" value=\"${code}\" ${code===bankCode?'checked':''}/> <span>${code}</span></label>
        `).join('')}
      </div>
    </div>
    <div class="field"><label>Ngôn ngữ</label>
      <div class="lang-group">
        <label><input type="radio" name="locale" value="vn" ${language==='vn'?'checked':''}/> Tiếng Việt</label>
        <label><input type="radio" name="locale" value="en" ${language==='en'?'checked':''}/> English</label>
      </div>
    </div>
    <div class="field"><label>Nội dung đơn hàng</label><textarea rows="3" placeholder="${desc}">${desc}</textarea></div>
    <div class="actions">
      <a id="success" class="btn primary" href="#">Thanh toán</a>
      <a id="failed" class="btn" href="#">Huỷ</a>
    </div>
  </div>
  <script>
   const qs = new URLSearchParams(location.search);
   function selected(name){ const el = document.querySelector('input[name="'+name+'"]:checked'); return el ? el.value : null }
   function u(code){
     const bank = selected('bank') || 'NCB';
     const loc = selected('locale') || 'vn';
     const p = new URLSearchParams(qs);
     p.set('vnp_ResponseCode', code);
     p.set('vnp_BankCode', bank);
     p.set('vnp_Locale', loc);
     return '/vnpay/return?' + p.toString();
   }
   document.getElementById('success').href = u('00');
   document.getElementById('failed').href = u('24');
  </script>
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
