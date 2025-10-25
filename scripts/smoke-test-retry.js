const axios = require('axios');

const API = {
  product: 'http://localhost:3002',
  user: 'http://localhost:3001',
  order: 'http://localhost:3003',
  payment: 'http://localhost:3004'
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, { retries = 5, backoff = 1000 } = {}) {
  let i = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      i++;
      if (i > retries) throw err;
      const sleep = backoff * i;
      console.log(`  retry ${i}/${retries}, waiting ${sleep}ms`);
      await wait(sleep);
    }
  }
}

async function ready(url) {
  return retry(() => axios.get(url, { validateStatus: () => true }), { retries: 10, backoff: 1000 });
}

async function run() {
  try {
    console.log('1) Wait product service ready...');
    await ready(`${API.product}/products`);
    console.log('  product ready');

  console.log('2) Wait user service ready...');
  // user service doesn't have a root GET; call /register and treat any response as readiness
  await retry(() => axios.get(`${API.user}/register`).catch(() => Promise.resolve({})), { retries: 10, backoff: 1000 });
    console.log('  user ready');

    console.log('3) Wait order service ready...');
    await ready(`${API.order}/`);
    console.log('  order ready');

    console.log('4) Seed products...');
    const p = await retry(() => axios.post(`${API.product}/seed`, {}), { retries: 6, backoff: 1000 });
    console.log('  -> Seeded', p.data.products.length);

    console.log('5) List products...');
    const products = (await retry(() => axios.get(`${API.product}/products`), { retries: 6 })).data;
    console.log('  -> Found', products.length);

    console.log('6) Register user...');
    const reg = (await retry(() => axios.post(`${API.user}/register`, { email: `smoke+${Date.now()}@example.com`, password: 'password', name: 'Smoke' }), { retries: 6 })).data;
    console.log('  -> Registered', reg.id);

    console.log('7) Login...');
    const login = (await retry(() => axios.post(`${API.user}/login`, { email: reg.email, password: 'password' }), { retries: 6 })).data;
    console.log('  -> Token length', login.token.length);

    console.log('8) Place order...');
    const first = products[0];
    const order = (await retry(() => axios.post(`${API.order}/orders`, { userId: reg.id, items: [{ productId: first.id, qty: 1 }] }, { headers: { Authorization: `Bearer ${login.token}` } }), { retries: 8, backoff: 1000 })).data;
    console.log('  -> Order result', order.id || order.orderId || order);

    console.log('\nSMOKE OK');
    process.exit(0);
  } catch (err) {
    console.error('\nSMOKE FAILED');
    if (err.response) console.error(err.response.status, err.response.data);
    else console.error(err.message);
    process.exit(2);
  }
}

run();
