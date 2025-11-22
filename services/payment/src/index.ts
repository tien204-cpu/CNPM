import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import * as crypto from 'crypto';

const app = express();
app.use(express.json());
// serve static files placed under services/payment/dist/public when built
app.use('/static', express.static(path.join(__dirname, 'public')));

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
const ORDERS_PATH = process.env.VNP_ORDERS_PATH || '/tmp/vnp-orders.json';

function appendLog(entry: any) {
  try {
    const line = typeof entry === 'string' ? entry : JSON.stringify(entry);
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    console.error('failed to append log', e);
  }
}

type VnpOrder = {
  id: string;
  amount: number;
  desc?: string;
  bankCode?: string;
  language?: string;
  status: 'created' | 'success' | 'canceled';
  createdAt: string;
  updatedAt: string;
};

function readOrders(): VnpOrder[] {
  try {
    if (fs.existsSync(ORDERS_PATH)) {
      const raw = fs.readFileSync(ORDERS_PATH, 'utf8');
      return JSON.parse(raw || '[]');
    }
  } catch {}
  return [];
}

function writeOrders(list: VnpOrder[]) {
  try { fs.writeFileSync(ORDERS_PATH, JSON.stringify(list, null, 2)); } catch {}
}

function upsertOrder(o: VnpOrder) {
  const list = readOrders();
  const i = list.findIndex((x: VnpOrder) => x.id === o.id);
  if (i >= 0) list[i] = o; else list.unshift(o);
  writeOrders(list);
}

function formatYMDHMS(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function buildVnpSignedUrl(params: Record<string, string>, secretKey: string, vnpUrl: string): string {
  const keys = Object.keys(params).sort();
  const encodedPairs: string[] = [];
  for (const key of keys) {
    const encodedKey = encodeURIComponent(key);
    const encodedVal = encodeURIComponent(params[key]).replace(/%20/g, '+');
    encodedPairs.push(`${encodedKey}=${encodedVal}`);
  }
  const signData = encodedPairs.join('&');
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  const query = `${signData}&vnp_SecureHash=${signed}`;
  return `${vnpUrl}?${query}`;
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

  const tmnCode = process.env.VNP_TMN_CODE || '';
  const secretKey = process.env.VNP_HASH_SECRET || '';
  const vnpUrl = process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  if (!tmnCode || !secretKey) {
    const out = { error: 'VNPAY config missing (VNP_TMN_CODE / VNP_HASH_SECRET)' };
    appendLog({ route: '/vnpay/create', res: out });
    return res.status(500).json(out);
  }

  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol || 'http');
  const base = `${proto}://${host}`;
  const returnUrl = process.env.VNP_RETURN_URL || `${base}/vnpay/return`;

  const date = new Date();
  const createDate = formatYMDHMS(date);
  const ipAddr = (req.headers['x-forwarded-for'] as string) ||
    (req as any).connection?.remoteAddress ||
    (req as any).socket?.remoteAddress || '';

  const bn = String(bankCode || '').trim();
  const lang = String(language || 'vn');
  const desc = (String(description || '').trim() || `Thanh toan don hang ${orderId || ''}`);

  const vnpParams: Record<string, string> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: lang || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: desc,
    vnp_OrderType: 'other',
    vnp_Amount: String(Math.round(amt * 100)),
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };
  if (bn) vnpParams['vnp_BankCode'] = bn;

  const url = buildVnpSignedUrl(vnpParams, secretKey, vnpUrl);
  const out = { url };
  appendLog({ route: '/vnpay/create', res: out });
  const now = new Date().toISOString();
  upsertOrder({ id: String(orderId), amount: amt, desc, bankCode: bn || undefined, language: lang || undefined, status: 'created', createdAt: now, updatedAt: now });
  res.json(out);
});

app.get('/vnpay/demo', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const amount = String(req.query.amount || '0');
  const bankCode = String(req.query.bankCode || '');
  const language = String(req.query.language || 'vn');
  const desc = String(req.query.desc || `Thanh toan don hang ${orderId}`);
  const html = `<!doctype html>
  <html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>VNPAY DEMO</title>
  <style>
    :root{--fg:#111827;--muted:#6b7280;--border:#e5e7eb;--bg:#f9fafb;--primary:#2563eb}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial,"Noto Sans","Liberation Sans",sans-serif;color:var(--fg);background:#fff;max-width:980px;margin:24px auto;padding:0 16px}
    header{padding:12px 0;border-bottom:1px solid var(--border);color:#111}
    nav a{color:#374151;text-decoration:none;margin-right:12px}
    h1{font-size:20px;margin:0}
    .title{font-weight:700}
    .card{background:#fff;border:1px solid var(--border);border-radius:8px;padding:16px;margin-top:12px}
    .field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
    label{font-weight:600}
    input,select,textarea{padding:10px 12px;border:1px solid var(--border);border-radius:6px;font-size:14px}
    .actions{display:flex;gap:10px;margin-top:16px}
    .btn{display:inline-block;padding:10px 14px;border-radius:6px;text-decoration:none;border:1px solid var(--border);color:#111;background:#fff}
    .btn.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
  </style>
  </head><body>
    <header>
      <div class="title">VNPAY DEMO</div>
      <nav><a href="/vnpay/list">Danh sách</a> <span>/</span> <a href="/vnpay/demo?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}">Tạo mới</a></nav>
    </header>
    <div class="card">
      <h2 style="margin:0 0 12px 0">Tạo mới đơn hàng</h2>
      <div class="field">
        <label>Loại hàng hóa</label>
        <select id="ordertype">
          <option value="billpayment" selected>Thanh toán hóa đơn</option>
          <option value="topup">Nạp tiền</option>
        </select>
      </div>
      <div class="field">
        <label>Số tiền</label>
        <input id="amount" type="text" value="${amount}" />
      </div>
      <div class="field">
        <label>Nội dung thanh toán</label>
        <textarea id="orderdesc" rows="3" placeholder="${desc}">${desc}</textarea>
      </div>
      <div class="field">
        <label>Ngân hàng</label>
        <select id="bank">
          <option value="">Không chọn</option>
          <option value="VNPAYQR" ${(!bankCode || bankCode==='VNPAYQR')?'selected':''}>VNPAYQR</option>
        </select>
      </div>
      <div class="field">
        <label>Ngôn ngữ</label>
        <select id="locale">
          <option value="vn" ${language==='vn'?'selected':''}>Tiếng Việt</option>
          <option value="en" ${language==='en'?'selected':''}>English</option>
        </select>
      </div>
      <div class="actions">
        <a id="redirect" class="btn primary" href="#">Thanh toán Redirect</a>
        <a id="cancel" class="btn" href="#">Huỷ</a>
      </div>
    </div>
    <script>
      const qs = new URLSearchParams(location.search);
      function methodUrl(){
        const p = new URLSearchParams(qs);
        const bank = document.getElementById('bank').value || 'VNPAYQR';
        const loc = document.getElementById('locale').value || 'vn';
        const amt = document.getElementById('amount').value || '';
        const desc = document.getElementById('orderdesc').value || '';
        p.set('bankCode', bank);
        p.set('language', loc);
        p.set('amount', amt);
        p.set('desc', desc);
        const logo = qs.get('logo') || '';
        const brand = qs.get('brand') || '';
        const flag = qs.get('flag') || '';
        const qrImg = qs.get('qrImg') || '';
        if (logo) p.set('logo', logo);
        if (brand) p.set('brand', brand);
        if (flag) p.set('flag', flag);
        if (qrImg) p.set('qrImg', qrImg);
        return '/vnpay/qr?' + p.toString();
      }
      function returnUrl(code){
        const p = new URLSearchParams(qs);
        const bank = document.getElementById('bank').value || '';
        const loc = document.getElementById('locale').value || 'vn';
        p.set('vnp_ResponseCode', code);
        p.set('vnp_BankCode', bank);
        p.set('vnp_Locale', loc);
        return '/vnpay/return?' + p.toString();
      }
      document.getElementById('redirect').href = methodUrl();
      document.getElementById('cancel').href = returnUrl('24');
    </script>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.get('/vnpay/method', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const amount = String(req.query.amount || '0');
  const bankCode = String(req.query.bankCode || 'VNPAYQR');
  const language = String(req.query.language || 'vn');
  const desc = String(req.query.desc || `Thanh toan don hang ${orderId}`);
  const params = new URLSearchParams({ orderId, amount, bankCode, language, desc }).toString();
  res.redirect(302, `/vnpay/qr?${params}`);
});

app.get('/vnpay/list', (req: Request, res: Response) => {
  const list = readOrders();
  const rows = list.map(o => `<tr>
    <td>${o.id}</td>
    <td>${(o.amount||0).toLocaleString('vi-VN')}</td>
    <td>${o.status}</td>
    <td>${new Date(o.createdAt).toLocaleString('vi-VN')}</td>
    <td><a href="/vnpay/result?orderId=${encodeURIComponent(o.id)}&amount=${encodeURIComponent(String(o.amount))}&vnp_ResponseCode=${o.status==='success'?'00':'24'}">Xem</a></td>
  </tr>`).join('');
  const html = `<!doctype html>
  <html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Danh sách đơn hàng</title>
  <style>
    :root{--fg:#111827;--muted:#6b7280;--border:#e5e7eb;--bg:#f9fafb;--primary:#2563eb}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial;max-width:980px;margin:24px auto;padding:0 16px;color:var(--fg)}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid var(--border);padding:10px;text-align:left}
    th{background:#f3f4f6}
    .btn{display:inline-block;padding:10px 14px;border-radius:6px;border:1px solid var(--border);text-decoration:none;color:inherit}
  </style></head><body>
  <header>
    <div class="title">VNPAY DEMO</div>
    <nav><a href="/vnpay/list">Danh sách</a> <span>/</span> <a href="/vnpay/demo">Tạo mới</a></nav>
  </header>
  <h2 style="margin:12px 0">Danh sách đơn hàng</h2>
  <table>
    <tr><th>Mã đơn</th><th>Số tiền</th><th>Trạng thái</th><th>Thời gian</th><th>Hành động</th></tr>
    ${rows || ''}
  </table>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.get('/vnpay/qr', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const amount = String(req.query.amount || '0');
  const bankCode = String(req.query.bankCode || '');
  const language = String(req.query.language || 'vn');
  const desc = String(req.query.desc || `Thanh toan don hang ${orderId}`);
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
  const proto = (req.headers['x-forwarded-proto'] as string) || (req.protocol || 'http');
  const base = `${proto}://${host}`;
  const effBank = bankCode || 'VNPAYQR';
  const imgQS = `${String(req.query.logo||'')?`&logo=${encodeURIComponent(String(req.query.logo))}`:''}${String(req.query.brand||'')?`&brand=${encodeURIComponent(String(req.query.brand))}`:''}${String(req.query.flag||'')?`&flag=${encodeURIComponent(String(req.query.flag))}`:''}${String(req.query.qrImg||'')?`&qrImg=${encodeURIComponent(String(req.query.qrImg))}`:''}`;
  const back = `${base}/vnpay/demo?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}&bankCode=${encodeURIComponent(effBank)}&language=${encodeURIComponent(language)}&desc=${encodeURIComponent(desc)}${imgQS}`;
  const cancel = `${base}/vnpay/return?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}&vnp_ResponseCode=24&vnp_BankCode=${encodeURIComponent(effBank)}&vnp_Locale=${encodeURIComponent(language)}`;
  const amountUSD = '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const logoUrl = String(req.query.logo || '');
  const brandUrl = String(req.query.brand || '');
  const flagUrl = String(req.query.flag || '');
  const qrImgUrl = String(req.query.qrImg || `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent('ORDER:'+orderId+';AMOUNT:'+amount)}`);
  const html = `<!doctype html>
  <html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Quét mã qua App Ngân hàng/Ví điện tử</title>
  <style>
    :root{--fg:#111827;--muted:#6b7280;--border:#e5e7eb;--bg:#f9fafb;--primary:#2563eb}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial;max-width:980px;margin:24px auto;padding:0 16px;color:var(--fg)}
    .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
    .hdr .logo{height:32px}
    .hdr .right{display:flex;gap:10px;align-items:center}
    .hdr .brand{height:22px}
    .hdr .flag{height:18px}
    .wrap{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .card{background:#fff;border:1px solid var(--border);border-radius:8px;padding:16px}
    .muted{color:var(--muted)}
    .qrbox{display:flex;align-items:center;justify-content:center;border:1px dashed var(--border);border-radius:10px;height:340px}
    .btn{display:inline-block;padding:10px 14px;border-radius:6px;border:1px solid var(--border);text-decoration:none;color:inherit}
    .btn.primary{background:var(--primary);border-color:var(--primary);color:#fff}
    #expired-modal{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center}
    #expired-modal .box{background:#fff;border-radius:10px;padding:20px;max-width:440px;text-align:center}
  </style></head><body>
  <div class="hdr">
    <div>
      <a href="${back}" style="text-decoration:none;margin-right:12px">← Quay lại</a>
      ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="VNPAYQR" onerror="this.style.display='none'"/>` : `<strong>Cổng thanh toán VNPAYQR</strong>`}
    </div>
    <div class="right">
      ${brandUrl ? `<img class="brand" src="${brandUrl}" alt="brand" onerror="this.style.display='none'"/>` : ''}
      ${flagUrl ? `<img class="flag" src="${flagUrl}" alt="lang" onerror="this.style.display='none'"/>` : ''}
      <a href="${base}/vnpay/qr?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}&bankCode=${encodeURIComponent(effBank)}&language=vn&desc=${encodeURIComponent(desc)}${imgQS}">Vi</a>
      <a href="${base}/vnpay/qr?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}&bankCode=${encodeURIComponent(effBank)}&language=en&desc=${encodeURIComponent(desc)}${imgQS}">En</a>
      <span class="muted">Giao dịch hết hạn sau <span id="countdown">15:00</span></span>
    </div>
  </div>
  <div class="wrap" style="margin-top:12px">
    <div class="card">
      <h3>Thông tin đơn hàng (Test)</h3>
      <div class="muted">Số tiền thanh toán</div>
      <div style="font-size:28px;font-weight:700">${amountUSD}</div>
      <div class="muted" style="margin-top:10px">Giá trị đơn hàng</div>
      <div>${amountUSD}</div>
      <div class="muted" style="margin-top:10px">Mã đơn hàng</div>
      <div>${orderId}</div>
      <div class="muted" style="margin-top:10px">Nhà cung cấp</div>
      <div>MC CTT VNPAY</div>
    </div>
    <div class="card">
      <h3>Quét mã qua App Ngân hàng/Ví điện tử</h3>
      <div class="qrbox">
        <img alt="QR" src="${qrImgUrl}" onerror="this.onerror=null; this.src='https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent('ORDER:'+orderId+';AMOUNT:'+amount)}'"/>
      </div>
      <div style="margin-top:12px" class="muted">Scan to Pay</div>
      <div style="margin-top:12px">
        <a class="btn" href="${cancel}">Huỷ thanh toán</a>
      </div>
    </div>
  </div>
  <div id="expired-modal"><div class="box">
    <h3>Hết thời gian giao dịch</h3>
    <p class="muted">Giao dịch đã hết hạn sau 15 phút. Vui lòng thực hiện lại.</p>
    <a id="goDemo" class="btn primary" href="#">Quay lại trang demo thanh toán</a>
  </div></div>
  <script>
    (function(){
      const end = Date.now() + 15*60*1000;
      const el = document.getElementById('countdown');
      const modal = document.getElementById('expired-modal');
      function fmt(ms){ const m=Math.floor(ms/60000); const s=Math.floor((ms%60000)/1000); return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0'); }
      const it = setInterval(()=>{
        const left = end - Date.now();
        if (left <= 0){ clearInterval(it); el.textContent = '00:00'; modal.style.display='flex'; return; }
        el.textContent = fmt(left);
      },1000);
      document.getElementById('goDemo').addEventListener('click', function(e){ e.preventDefault(); window.location.href = '${base}/vnpay/demo?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}${imgQS}'; });
    })();
  </script>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.get('/vnpay/result', (req: Request, res: Response) => {
  const orderId = String(req.query.orderId || '');
  const amount = String(req.query.amount || '0');
  const bank = String(req.query.vnp_BankCode || 'VNPAY');
  const code = String(req.query.vnp_ResponseCode || '00');
  const message = code === '00' ? 'Giao dịch thành công.' : 'Giao dịch không thành công do: Khách hàng hủy giao dịch.';
  const html = `<!doctype html>
  <html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Kết quả giao dịch</title>
  <style>
    :root{--fg:#111827;--muted:#6b7280;--border:#e5e7eb;--bg:#f9fafb;--primary:#2563eb}
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial;max-width:980px;margin:24px auto;padding:0 16px;color:var(--fg)}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid var(--border);padding:10px;text-align:left}
    th{background:#f3f4f6}
    .muted{color:var(--muted)}
    .center{text-align:center;margin:12px 0}
    .btn{display:inline-block;padding:10px 14px;border-radius:6px;border:1px solid var(--border);text-decoration:none;color:inherit}
  </style></head><body>
  <div class="center">${message}</div>
  <table>
    <tr><th>Name</th><th>Value</th><th>Description</th></tr>
    <tr><td>Merchant ID</td><td>CTTVNP01</td><td>Được cấp bởi VNPAY</td></tr>
    <tr><td>Merchant Name</td><td>VNPAY Demo</td><td>Tên Website Merchant</td></tr>
    <tr><td>Merchant Transaction Reference</td><td>${orderId || '—'}</td><td>Mã GD của website merchant</td></tr>
    <tr><td>Transaction Info</td><td>Thanh toan don hang</td><td>Thông tin mô tả từ website merchant</td></tr>
    <tr><td>Amount</td><td>${Number(amount || '0').toLocaleString('vi-VN')}</td><td>Số tiền được thanh toán</td></tr>
    <tr><td>Current Code</td><td>VND</td><td>Đơn vị tiền tệ được thanh toán</td></tr>
    <tr><td>Transaction Response Code</td><td>${code}</td><td>Trạng thái GD</td></tr>
    <tr><td>Message</td><td>${message}</td><td>Thông báo từ cổng thanh toán</td></tr>
    <tr><td>Transaction Number</td><td>0</td><td>Mã GD trên cổng thanh toán</td></tr>
    <tr><td>Bank</td><td>${bank || 'VNPAY'}</td><td>Ngân hàng GD</td></tr>
  </table>
  <div class="center" style="margin-top:12px">
    <a class="btn" href="/vnpay/demo?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(amount)}">Về danh sách</a>
    <a class="btn" style="margin-left:8px" href="${FRONTEND_URL.replace(/\/$/, '')}/#/bill/${encodeURIComponent(orderId)}?vnp_ResponseCode=${encodeURIComponent(code)}">Về trang hoá đơn</a>
  </div>
  </body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
});

app.get('/vnpay/return', (req: Request, res: Response) => {
  const qp: any = req.query || {};
  const orderId = String(qp.vnp_TxnRef || qp.orderId || '');
  const code = String(qp.vnp_ResponseCode || '');
  const rawAmount = String(qp.vnp_Amount || qp.amount || '');
  let amount = '';
  if (rawAmount) {
    const n = Number(rawAmount);
    amount = Number.isFinite(n) && n > 0 ? String(n / 100) : rawAmount;
  }
  appendLog({ route: '/vnpay/return', orderId, code, rawAmount });
  const params = new URLSearchParams({
    orderId,
    vnp_ResponseCode: code,
    vnp_BankCode: String(qp.vnp_BankCode || ''),
    amount,
  }).toString();
  try {
    const list = readOrders();
    const i = list.findIndex(x => x.id === orderId);
    if (i >= 0) {
      list[i].status = code === '00' ? 'success' : 'canceled';
      list[i].updatedAt = new Date().toISOString();
      writeOrders(list);
    }
  } catch {}
  res.redirect(302, `/vnpay/result?${params}`);
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
