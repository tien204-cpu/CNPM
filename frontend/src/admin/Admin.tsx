  import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'

const PRODUCT_BASE = (import.meta as any).env.VITE_PRODUCT_BASE || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3002'
const USER_BASE = (import.meta as any).env.VITE_USER_BASE || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3001'
const ORDER_BASE = (import.meta as any).env.VITE_ORDER_BASE || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3003'

function val(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null
  return el ? el.value : ''
}
function fileOf(id: string): File | null {
  const el = document.getElementById(id) as HTMLInputElement | null
  const f = el && el.files && el.files[0]
  return (f as any) || null
}
async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const r = await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  return r?.data?.path || ''
}

function useAuth() {
  const initial = (() => {
    try {
      const raw = localStorage.getItem('ff_user')
      if (raw) {
        const u = JSON.parse(raw)
        return { token: u?.token || '', role: u?.role || 'user', email: u?.email || '' }
      }
    } catch {}
    return { token: '', role: 'user', email: '' }
  })()
  const [token, setToken] = useState<string>(initial.token)
  const [role, setRole] = useState<string>(initial.role)
  const [email, setEmail] = useState<string>(initial.email)
  const [ready, setReady] = useState<boolean>(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ff_user')
      if (raw) {
        const u = JSON.parse(raw)
        setToken(u?.token || '')
        setEmail(u?.email || '')
        setRole(u?.role || 'user')
      }
    } catch {}
  }, [])
  useEffect(() => {
    async function verify() {
      try {
        if (!token) { setReady(true); return }
        const me = await axios.get(`${USER_BASE.replace(/\/$/, '')}/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (me?.data) {
          setRole(me.data.role || role)
          setEmail(me.data.email || email)
        }
      } catch {}
      setReady(true)
    }
    verify()
  }, [token])
  return { token, role, email, ready }
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  )
}

export function AdminProductCreate() {
  const { token, role, ready } = useAuth()
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const nameRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const catRef = useRef<HTMLSelectElement>(null)
  const restRef = useRef<HTMLSelectElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const stockRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`).then(r => setRestaurants(r.data||[])).catch(() => setRestaurants([]))
    axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`).then(r => setCategories(r.data||[])).catch(() => setCategories([]))
  }, [])
  useEffect(() => {
    if (!ready) return
    if (role !== 'admin') { window.location.hash = '/' }
  }, [ready, role])
  async function submit() {
    const name = nameRef.current?.value?.trim() || ''
    const price = Number(priceRef.current?.value || 0)
    const category = catRef.current?.value || ''
    let imageUrl = imgRef.current?.value?.trim() || ''
    const description = descRef.current?.value?.trim() || ''
    const stock = Number(stockRef.current?.value || 100)
    const restaurantId = restRef.current?.value || ''
    if (!name || !price) { alert('Vui lòng nhập tên và giá'); return }
    try {
      const f = fileRef.current?.files && fileRef.current.files[0]
      if (f) {
        const up = await uploadImage(f)
        if (up) imageUrl = up
      }
    } catch {}
    await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/products`, { name, price, stock, imageUrl, description, category, restaurantId }, { headers })
    window.location.hash = '#/admin'
  }
  return (
    <div className="page">
      <h2>Thêm sản phẩm</h2>
      <div className="card">
        <div className="form-row"><label>Tên</label><input className="input" placeholder="Tên món" ref={nameRef} autoComplete="off" /></div>
        <div className="form-row"><label>Giá</label><input className="input" placeholder="Giá" inputMode="decimal" ref={priceRef} autoComplete="off" /></div>
        <div className="form-row"><label>Danh mục</label>
          <select ref={catRef} defaultValue="">
            <option value="">-- chọn danh mục --</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="form-row"><label>Nhà hàng</label>
          <select ref={restRef} defaultValue="">
            <option value="">-- chọn nhà hàng --</option>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-row"><label>Ảnh (URL hoặc /images/...)</label><input className="input" placeholder="/images/pho-bo.jpg" ref={imgRef} autoComplete="off" /></div>
        <div className="form-row"><label>Tải ảnh</label><input type="file" accept="image/*" ref={fileRef} /></div>
        <div className="form-row"><label>Mô tả</label><input className="input" placeholder="Mô tả chi tiết" ref={descRef} autoComplete="off" /></div>
        <div className="form-row"><label>Tồn kho</label><input className="input" placeholder="100" inputMode="numeric" ref={stockRef} autoComplete="off" /></div>
        <div style={{ display:'flex', gap:8, marginTop: 8 }}>
          <button className="btn" onClick={() => { window.location.hash = '#/admin' }}>Quay lại</button>
          <button className="btn primary" onClick={submit}>Lưu</button>
        </div>
      </div>
    </div>
  )
}

export default function Admin() {
  const { token, role, ready } = useAuth()
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])
  const [tab, setTab] = useState<'products'|'users'|'orders'|'restaurants'|'categories'>('orders')

  const [products, setProducts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [restaurants, setRestaurants] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [armed, setArmed] = useState<Record<string, boolean>>({})

  const pNameRef = useRef<HTMLInputElement>(null)
  const pPriceRef = useRef<HTMLInputElement>(null)
  const pCategoryRef = useRef<HTMLSelectElement>(null)
  const pImageRef = useRef<HTMLInputElement>(null)
  const pDescRef = useRef<HTMLInputElement>(null)
  const pStockRef = useRef<HTMLInputElement>(null)
  const pFileRef = useRef<HTMLInputElement>(null)
  const pRestaurantRef = useRef<HTMLSelectElement>(null)

  // refs for Restaurants/Categories management
  const rNameRef = useRef<HTMLInputElement>(null)
  const rAddrRef = useRef<HTMLInputElement>(null)
  const rLatRef = useRef<HTMLInputElement>(null)
  const rLngRef = useRef<HTMLInputElement>(null)
  const cNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!ready) return
    if (role !== 'admin') {
      window.location.hash = '/'
    }
  }, [ready, role])

  async function refreshProducts() {
    const r = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`)
    setProducts(r.data || [])
  }
  async function refreshRestaurants() {
    const r = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`)
    setRestaurants(r.data || [])
  }
  async function refreshCategories() {
    const r = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`)
    setCategories(r.data || [])
  }
  async function refreshUsers() {
    const r = await axios.get(`${USER_BASE.replace(/\/$/, '')}/users`, { headers })
    setUsers(r.data || [])
  }
  async function refreshOrders() {
    const r = await axios.get(`${ORDER_BASE.replace(/\/$/, '')}/orders`)
    setOrders(r.data || [])
  }

  useEffect(() => { refreshProducts(); refreshRestaurants(); refreshCategories() }, [])
  useEffect(() => { if (role==='admin') refreshUsers() }, [role])
  useEffect(() => { refreshOrders() }, [])

  // Realtime updates for orders via SSE
  const esOrdersRef = useRef<Record<string, EventSource>>({})
  useEffect(() => {
    const current = esOrdersRef.current || {}
    const ids = new Set(orders.map(o => o.id))
    // close listeners for orders no longer listed
    for (const id of Object.keys(current)) {
      if (!ids.has(id)) { try { current[id].close() } catch {}; delete current[id] }
    }
    // attach listeners for new orders
    for (const o of orders) {
      if (!current[o.id]) {
        try {
          const es = new EventSource(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}/events`)
          es.addEventListener('status', (ev: any) => {
            try {
              const data = JSON.parse(ev.data || '{}')
              setOrders(prev => prev.map(px => px.id === o.id ? { ...px, status: data.status } : px))
            } catch {}
          })
          es.addEventListener('deleted', () => {
            setOrders(prev => prev.filter(px => px.id !== o.id))
          })
          current[o.id] = es
        } catch {}
      }
    }
    esOrdersRef.current = current
    return () => {
      for (const id of Object.keys(current)) { try { current[id].close() } catch {} }
    }
  }, [orders])

  async function addProduct() {
    const name = pNameRef.current?.value?.trim() || ''
    const price = Number(pPriceRef.current?.value || 0)
    const category = pCategoryRef.current?.value || ''
    let imageUrl = pImageRef.current?.value?.trim() || ''
    const description = pDescRef.current?.value?.trim() || ''
    const stock = Number(pStockRef.current?.value || 100)
    const restaurantId = pRestaurantRef.current?.value || ''
    if (!name || !price) { alert('Vui lòng nhập tên và giá'); return }
    try {
      const file = pFileRef.current?.files && pFileRef.current.files[0]
      if (file) {
        const path = await uploadImage(file)
        if (path) imageUrl = path
      }
    } catch {}
    await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/products`, { name, price, stock, imageUrl, description, category, restaurantId })
    await refreshProducts()
    if (pNameRef.current) pNameRef.current.value = ''
    if (pPriceRef.current) pPriceRef.current.value = ''
    if (pCategoryRef.current) pCategoryRef.current.value = ''
    if (pImageRef.current) pImageRef.current.value = ''
    if (pDescRef.current) pDescRef.current.value = ''
    if (pStockRef.current) pStockRef.current.value = ''
    if (pFileRef.current) pFileRef.current.value = ''
    if (pRestaurantRef.current) pRestaurantRef.current.value = ''
  }

  async function updateProduct(p: any) {
    const payload: any = {
      name: val(`p-name-${p.id}`),
      price: Number(val(`p-price-${p.id}`) || p.price),
      category: val(`p-category-${p.id}`),
      imageUrl: val(`p-image-${p.id}`),
      description: val(`p-desc-${p.id}`),
      stock: Number(val(`p-stock-${p.id}`) || p.stock),
    }
    try {
      const el = document.getElementById(`p-rest-${p.id}`) as HTMLSelectElement | null
      if (el) payload.restaurantId = el.value || null
    } catch {}
    try {
      const f = fileOf(`p-file-${p.id}`)
      if (f) {
        const up = await uploadImage(f)
        if (up) payload.imageUrl = up
      }
    } catch {}
    await axios.put(`${PRODUCT_BASE.replace(/\/$/, '')}/products/${p.id}`, payload)
    await refreshProducts()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Xoá sản phẩm này?')) return
    await axios.delete(`${PRODUCT_BASE.replace(/\/$/, '')}/products/${id}`)
    await refreshProducts()
  }

  async function changeUserRole(u: any, role: string) {
    await axios.patch(`${USER_BASE.replace(/\/$/, '')}/users/${u.id}`, { role }, { headers })
    await refreshUsers()
  }
  async function updateUser(u: any) {
    const payload: any = {
      email: val(`u-email-${u.id}`),
      name: val(`u-name-${u.id}`),
    }
    const pw = val(`u-pass-${u.id}`)
    if (pw) payload.password = pw
    await axios.patch(`${USER_BASE.replace(/\/$/, '')}/users/${u.id}`, payload, { headers })
    await refreshUsers()
  }
  async function deleteUser(id: string) {
    if (!confirm('Xoá tài khoản này?')) return
    await axios.delete(`${USER_BASE.replace(/\/$/, '')}/users/${id}`, { headers })
    await refreshUsers()
  }

  async function updateOrderStatus(o: any, status: string) {
    await axios.patch(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}`, { status })
    await refreshOrders()
  }
  async function deleteOrder(id: string) {
    if (!confirm('Xoá đơn hàng này?')) return
    await axios.delete(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}`)
    await refreshOrders()
  }

  return (
    <div className="page">
      <h2>Admin</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="filters" style={{ justifyContent: 'flex-start' }}>
          <div className="chips">
            <button className={`chip${tab==='products'?' active':''}`} onClick={() => setTab('products')}>Sản phẩm</button>
            <button className={`chip${tab==='users'?' active':''}`} onClick={() => setTab('users')}>Người dùng</button>
            <button className={`chip${tab==='orders'?' active':''}`} onClick={() => setTab('orders')}>Đơn hàng</button>
            <button className={`chip${tab==='restaurants'?' active':''}`} onClick={() => setTab('restaurants')}>Nhà hàng</button>
            <button className={`chip${tab==='categories'?' active':''}`} onClick={() => setTab('categories')}>Danh mục</button>
          </div>
        </div>
      </div>

      {tab==='products' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom: 8 }}>
            <a className="btn primary" href="#/admin/products/new">Thêm</a>
          </div>

          <Section title="Danh sách sản phẩm">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th align="left">Tên</th>
                    <th align="left">Giá</th>
                    <th align="left">Danh mục</th>
                    <th align="left">Nhà hàng</th>
                    <th align="left">Tồn</th>
                    <th align="left">Ảnh</th>
                    <th align="left">Mô tả</th>
                    <th align="left">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    return (
                      <tr key={p.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td><input id={`p-name-${p.id}`} className="input" defaultValue={p.name} /></td>
                        <td><input id={`p-price-${p.id}`} className="input" defaultValue={String(p.price)} /></td>
                        <td><input id={`p-category-${p.id}`} className="input" defaultValue={p.category || ''} /></td>
                        <td>
                          <select id={`p-rest-${p.id}`} defaultValue={p.restaurantId || ''}>
                            <option value="">--</option>
                            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </td>
                        <td><input id={`p-stock-${p.id}`} className="input" defaultValue={String(p.stock)} /></td>
                        <td>
                          <input id={`p-image-${p.id}`} className="input" defaultValue={p.imageUrl || ''} />
                          <div style={{ marginTop: 6 }}>
                            <input id={`p-file-${p.id}`} type="file" accept="image/*" />
                          </div>
                        </td>
                        <td><input id={`p-desc-${p.id}`} className="input" defaultValue={p.description || ''} /></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="btn small" onClick={() => updateProduct(p)}>Lưu</button>
                          <button className="btn small ghost" onClick={() => deleteProduct(p.id)} style={{ marginLeft: 6 }}>Xoá</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {tab==='users' && (
        <Section title="Danh sách người dùng">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">Email</th>
                  <th align="left">Tên</th>
                  <th align="left">Quyền</th>
                  <th align="left">Mật khẩu mới</th>
                  <th align="left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  return (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td><input id={`u-email-${u.id}`} className="input" defaultValue={u.email} /></td>
                      <td><input id={`u-name-${u.id}`} className="input" defaultValue={u.name || ''} /></td>
                      <td>
                        <select value={u.role} onChange={e => changeUserRole(u, e.target.value)}>
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td><input id={`u-pass-${u.id}`} className="input" placeholder="(tuỳ chọn)" type="password" /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn small" onClick={() => updateUser(u)}>Lưu</button>
                        <button className="btn small ghost" onClick={() => deleteUser(u.id)} style={{ marginLeft: 6 }}>Xoá</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab==='orders' && (
        <Section title="Danh sách đơn hàng">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th align="left">Mã đơn</th>
                  <th align="left">Email</th>
                  <th align="left">Thời gian</th>
                  <th align="left">Tổng</th>
                  <th align="left">Trạng thái</th>
                  <th align="left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td>{o.id.slice(0,6)}</td>
                    <td>{o.userEmail || ''}</td>
                    <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</td>
                    <td>${Number(o.total || 0).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="pill">{o.status || ''}</span>
                        <button className="btn small" style={{ background: (armed[o.id] ? 'var(--accent)' : ''), color: (armed[o.id] ? '#fff' : '') }} onClick={async () => { const next = !armed[o.id]; if (next) { try { await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}/drone/arm`); } catch {} } setArmed(a => ({ ...a, [o.id]: next })); }} title="Bật/tắt drone">🛸</button>
                        <button className="btn small primary" disabled={!armed[o.id]} onClick={async () => { await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}/drone/start`); }}>Bắt đầu drone</button>
                        <button className="btn small" onClick={() => updateOrderStatus(o, 'Đã giao đồ ăn tới nhà')}>Xác nhận đã giao</button>
                        <a className="btn small ghost" href={`#/track/${o.id}`}>Theo dõi</a>
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn small ghost" onClick={() => deleteOrder(o.id)}>Xoá</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab==='restaurants' && (
        <>
          <Section title="Thêm nhà hàng">
            <div className="form-row"><label>Tên</label><input className="input" placeholder="Tên nhà hàng" ref={rNameRef} /></div>
            <div className="form-row"><label>Địa chỉ</label><input className="input" placeholder="Địa chỉ" ref={rAddrRef} /></div>
            <div className="form-row" style={{ display:'flex', gap:8 }}>
              <div style={{ flex:1 }}><label>Lat</label><input className="input" placeholder="10.77" ref={rLatRef} /></div>
              <div style={{ flex:1 }}><label>Lng</label><input className="input" placeholder="106.69" ref={rLngRef} /></div>
            </div>
            <button className="btn primary" onClick={async () => { const name = rNameRef.current?.value || ''; if (!name) { alert('Nhập tên'); return } const address = rAddrRef.current?.value || ''; const lat = Number(rLatRef.current?.value || ''); const lng = Number(rLngRef.current?.value || ''); await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`, { name, address, lat: isNaN(lat)? undefined: lat, lng: isNaN(lng)? undefined: lng }); await refreshRestaurants(); if (rNameRef.current) rNameRef.current.value=''; if (rAddrRef.current) rAddrRef.current.value=''; if (rLatRef.current) rLatRef.current.value=''; if (rLngRef.current) rLngRef.current.value=''; }}>Thêm</button>
          </Section>
          <Section title="Gán món vào nhà hàng">
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <button className="btn" onClick={async () => {
                try {
                  await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/assign-restaurants`)
                  await refreshProducts()
                  alert('Đã gán tất cả món vào các nhà hàng (vòng tròn).')
                } catch (e: any) {
                  alert('Thất bại: ' + (e?.response?.data?.error || e?.message))
                }
              }}>Gán tất cả món</button>
              <div className="loading" style={{ padding:0 }}>Yêu cầu đã có nhà hàng được tạo/seed trước đó.</div>
            </div>
          </Section>
          <Section title="Danh sách nhà hàng">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr><th align="left">Tên</th><th align="left">Địa chỉ</th><th align="left">Toạ độ</th><th align="left">Hành động</th></tr></thead>
                <tbody>
                  {restaurants.map(r => (
                    <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td><input id={`r-name-${r.id}`} className="input" defaultValue={r.name} /></td>
                      <td><input id={`r-addr-${r.id}`} className="input" defaultValue={r.address || ''} /></td>
                      <td style={{ display:'flex', gap:6 }}>
                        <input id={`r-lat-${r.id}`} className="input" defaultValue={String(r.lat ?? '')} />
                        <input id={`r-lng-${r.id}`} className="input" defaultValue={String(r.lng ?? '')} />
                      </td>
                      <td>
                        <button className="btn small" onClick={async () => { const payload: any = { name: val(`r-name-${r.id}`), address: val(`r-addr-${r.id}`) }; const latV = parseFloat(val(`r-lat-${r.id}`)); if (!isNaN(latV)) payload.lat = latV; const lngV = parseFloat(val(`r-lng-${r.id}`)); if (!isNaN(lngV)) payload.lng = lngV; await axios.put(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${r.id}`, payload); await refreshRestaurants(); }}>Lưu</button>
                        <button className="btn small ghost" style={{ marginLeft:6 }} onClick={async () => { if (!confirm('Xoá nhà hàng này?')) return; await axios.delete(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${r.id}`); await refreshRestaurants(); }}>Xoá</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {tab==='categories' && (
        <>
          <Section title="Thêm danh mục">
            <div className="form-row"><label>Tên danh mục</label><input className="input" placeholder="Ví dụ: Vietnamese" ref={cNameRef} /></div>
            <button className="btn primary" onClick={async () => { const name = cNameRef.current?.value?.trim() || ''; if (!name) { alert('Nhập tên danh mục'); return } await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`, { name }); await refreshCategories(); if (cNameRef.current) cNameRef.current.value=''; }}>Thêm</button>
          </Section>
          <Section title="Danh sách danh mục">
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead><tr><th align="left">Tên</th><th align="left">Hành động</th></tr></thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td>{c.name}</td>
                      <td><button className="btn small ghost" onClick={async () => { if(!confirm('Xoá danh mục này?')) return; await axios.delete(`${PRODUCT_BASE.replace(/\/$/, '')}/categories/${c.id}`); await refreshCategories(); }}>Xoá</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  )
}
