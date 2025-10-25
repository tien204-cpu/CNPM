const axios = require('axios');

const API = {
  product: 'http://localhost:3002',
  user: 'http://localhost:3001',
  order: 'http://localhost:3003',
  payment: 'http://localhost:3004'
};

async function run() {
  try {
    console.log('1) Seed products...');
    const p = await axios.post(`${API.product}/seed`);
    console.log('  -> Seeded', p.data.products.length);

    console.log('2) List products...');
    const products = (await axios.get(`${API.product}/products`)).data;
    console.log('  -> Found', products.length);

    console.log('3) Register user...');
    const reg = (await axios.post(`${API.user}/register`, { email: 'test@example.com', password: 'password', name: 'Tester' })).data;
    console.log('  -> Registered', reg.id);

    console.log('4) Login...');
    const login = (await axios.post(`${API.user}/login`, { email: 'test@example.com', password: 'password' })).data;
    console.log('  -> Token length', login.token.length);

    console.log('5) Place order...');
    const first = products[0];
    const order = (await axios.post(`${API.order}/orders`, { userId: reg.id, items: [{ productId: first.id, qty: 1 }] }, { headers: { Authorization: `Bearer ${login.token}` } })).data;
    console.log('  -> Order result', order.id || order.orderId || order);

    console.log('\nSMOKE OK');
    process.exit(0);
  } catch (err) {
    console.error('\nSMOKE FAILED');
    if (err.response) console.error(err.response.status, err.response.data); else console.error(err.message);
    process.exit(2);
  }
}

run();
