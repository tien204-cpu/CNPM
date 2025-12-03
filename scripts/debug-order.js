const axios = require('axios');
(async ()=>{
  try{
    const API = { product: 'http://localhost:3002', user: 'http://localhost:3001', order: 'http://localhost:3003', payment: 'http://localhost:3004' };
    console.log('GET /products');
    const prods = (await axios.get(`${API.product}/products`)).data;
    console.log('products=', prods.map(p=>({id:p.id,name:p.name,stock:p.stock})).slice(0,5));
    const email = `debug+${Date.now()}@example.com`;
    console.log('Register', email);
    const reg = (await axios.post(`${API.user}/register`, { email, password: 'password', name: 'Debug' })).data;
    console.log('reg=', reg);
    const login = (await axios.post(`${API.user}/login`, { email, password: 'password' })).data;
    console.log('token len=', (login.token||'').length);
    const first = prods[0];
    console.log('Post order for product', first.id);
    const resp = await axios.post(`${API.order}/orders`, { userId: reg.id, items: [{ productId: first.id, qty: 1 }] }, { headers: { Authorization: `Bearer ${login.token}` }, validateStatus: () => true });
    console.log('ORDER RESPONSE STATUS=', resp.status);
    console.log('ORDER RESPONSE DATA=', JSON.stringify(resp.data, null, 2));
  }catch(e){
    if(e.response) console.error('ERROR', e.response.status, e.response.data);
    else console.error('ERR', e.message);
    process.exit(2);
  }
})();
