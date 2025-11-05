  import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'

const PRODUCT_BASE = (import.meta as any).env.VITE_PRODUCT_BASE || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3002'
const USER_BASE = (import.meta as any).env.VITE_USER_BASE || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3001'
const ORDER_BASE = (import.meta as any).env.VITE_ORDER_BASE || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3003'

function val(id: string) {
  const el = document.getElementById(id) as HTMLInputElement | null
  return el ? el.value : ''
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

export default function Admin() {
  const { token, role, ready } = useAuth()
  const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token])
  const [tab, setTab] = useState<'products'|'users'|'orders'>('products')

  const [products, setProducts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])

  const pNameRef = useRef<HTMLInputElement>(null)
  const pPriceRef = useRef<HTMLInputElement>(null)
  const pCategoryRef = useRef<HTMLInputElement>(null)
  const pImageRef = useRef<HTMLInputElement>(null)
  const pDescRef = useRef<HTMLInputElement>(null)
  const pStockRef = useRef<HTMLInputElement>(null)

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
  async function refreshUsers() {
    const r = await axios.get(`${USER_BASE.replace(/\/$/, '')}/users`, { headers })
    setUsers(r.data || [])
  }
  async function refreshOrders() {
    const r = await axios.get(`${ORDER_BASE.replace(/\/$/, '')}/orders`)
    setOrders(r.data || [])
  }

  useEffect(() => { refreshProducts() }, [])
  useEffect(() => { if (role==='admin') refreshUsers() }, [role])
  useEffect(() => { refreshOrders() }, [])

  async function addProduct() {
    const name = pNameRef.current?.value?.trim() || ''
    const price = Number(pPriceRef.current?.value || 0)
    const category = pCategoryRef.current?.value?.trim() || ''
    const imageUrl = pImageRef.current?.value?.trim() || ''
    const description = pDescRef.current?.value?.trim() || ''
    const stock = Number(pStockRef.current?.value || 100)
    if (!name || !price) { alert('Vui lòng nhập tên và giá'); return }
    await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/products`, { name, price, stock, imageUrl, description, category })
    await refreshProducts()
    if (pNameRef.current) pNameRef.current.value = ''
    if (pPriceRef.current) pPriceRef.current.value = ''
    if (pCategoryRef.current) pCategoryRef.current.value = ''
    if (pImageRef.current) pImageRef.current.value = ''
    if (pDescRef.current) pDescRef.current.value = ''
    if (pStockRef.current) pStockRef.current.value = ''
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
          </div>
        </div>
      </div>

      {tab==='products' && (
        <>
          <Section title="Thêm sản phẩm">
            <div className="form-row"><label>Tên</label><input className="input" placeholder="Tên món" ref={pNameRef} autoComplete="off" /></div>
            <div className="form-row"><label>Giá</label><input className="input" placeholder="Giá" inputMode="decimal" ref={pPriceRef} autoComplete="off" /></div>
            <div className="form-row"><label>Danh mục</label><input className="input" placeholder="Danh mục" ref={pCategoryRef} autoComplete="off" /></div>
            <div className="form-row"><label>Ảnh (URL hoặc /images/...)</label><input className="input" placeholder="/images/pho-bo.jpg" ref={pImageRef} autoComplete="off" /></div>
            <div className="form-row"><label>Mô tả</label><input className="input" placeholder="Mô tả chi tiết" ref={pDescRef} autoComplete="off" /></div>
            <div className="form-row"><label>Tồn kho</label><input className="input" placeholder="100" inputMode="numeric" ref={pStockRef} autoComplete="off" /></div>
            <button className="btn primary" onClick={addProduct}>Thêm</button>
          </Section>

          <Section title="Danh sách sản phẩm">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th align="left">Tên</th>
                    <th align="left">Giá</th>
                    <th align="left">Danh mục</th>
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
                        <td><input id={`p-stock-${p.id}`} className="input" defaultValue={String(p.stock)} /></td>
                        <td><input id={`p-image-${p.id}`} className="input" defaultValue={p.imageUrl || ''} /></td>
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
                      <select value={o.status || ''} onChange={e => updateOrderStatus(o, e.target.value)}>
                        <option>Bắt đầu giao</option>
                        <option>Đang giao</option>
                        <option>Đã giao đồ ăn</option>
                      </select>
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
    </div>
  )
}
