import React, { useEffect, useState, useRef } from 'react'

import axios from 'axios'
import './App.css'
import { getMappedImage } from './image-map'

const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3002'
const USER_BASE = import.meta.env.VITE_USER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001'
const ORDER_BASE = import.meta.env.VITE_ORDER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3003'

type Product = { id: string; name: string; price: number; stock?: number; imageUrl?: string; description?: string }

function ImageWithPlaceholder({ src, srcList = [], alt, className, style }: { src?: string; srcList?: string[]; alt?: string; className?: string; style?: any }) {
  const name = String(alt || '').slice(0,40)
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#a78bfa' offset='0'/><stop stop-color='#60a5fa' offset='1'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Poppins,Arial' font-size='28' fill='white' opacity='0.9'>${name || 'Food'}</text></svg>`
  const instant = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  const chain = [src, ...srcList, instant].filter(Boolean) as string[]
  const [idx, setIdx] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const current = chain[idx]
  useEffect(() => { setIdx(0); setLoaded(false) }, [src])
  if (!current) return <div className={"img-skeleton " + (className || '')} style={style} />
  return (
    <div style={{ position: 'relative' }}>
      {!loaded && <div className="img-skeleton" />}
      <img
        src={current}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={className}
        style={{ ...(loaded ? {} : { display: 'none' }), ...(style || {}) }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (idx < chain.length - 1) setIdx(idx + 1)
          else setIdx(chain.length) // renders skeleton
        }}
      />
    </div>
  )
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<Array<{ productId: string; qty: number }>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [user, setUser] = useState<{ id: string; email: string; token?: string } | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authName, setAuthName] = useState('')
  const [authPhone, setAuthPhone] = useState('')
  const [authAddress, setAuthAddress] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [inStockOnly, setInStockOnly] = useState<boolean>(false)
  const searchRef = useRef<HTMLInputElement>(null)
  // inputs & UX helpers
  const [isComposing, setIsComposing] = useState<boolean>(false)
  const [minPriceInput, setMinPriceInput] = useState<string>('')
  const [maxPriceInput, setMaxPriceInput] = useState<string>('')

  // checkout info
  const [shipName, setShipName] = useState<string>('')
  const [shipPhone, setShipPhone] = useState<string>('')
  const [shipAddress, setShipAddress] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPay'>('COD')
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [showAll, setShowAll] = useState<boolean>(false)
  const [recoSeed, setRecoSeed] = useState<number>(() => {
    // rotate suggestions by day so mỗi lần quay lại (ngày khác) sẽ thấy món khác
    const daySeed = Math.floor(Date.now() / 86400000) % 100000
    return daySeed
  })

  const [route, setRoute] = useState<string>(window.location.hash.replace('#', '') || '/')
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const addressRef = useRef<HTMLInputElement>(null)
  const minRef = useRef<HTMLInputElement>(null)
  const maxRef = useRef<HTMLInputElement>(null)
  const shipNameRef = useRef<HTMLInputElement>(null)
  const shipPhoneRef = useRef<HTMLInputElement>(null)
  const shipAddressRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace('#', '') || '/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // Note: giá min/max chỉ áp dụng khi bấm nút "Áp dụng" để tránh mất focus trên Edge

  

  useEffect(() => {
    if (route === '/register') setAuthMode('register')
    else if (route === '/login') setAuthMode('login')
  }, [route])

  // Removed auto-focus to avoid input blur issues on typing

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        const res = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`)
        setProducts(res.data || [])
      } catch (e) {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function slugify(name: string) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  function categoryOf(name: string) {
    const n = (name || '').toLowerCase()
    if (/pizza/.test(n)) return 'Pizza'
    if (/burger|hamburger|cheeseburger/.test(n)) return 'Burger'
    if (/sushi|nigiri|maki/.test(n)) return 'Sushi'
    if (/spaghetti|pasta|lasagna/.test(n)) return 'Pasta'
    if (/salad|caesar/.test(n)) return 'Salad'
    if (/phở|pho|bún|bun|bánh mì|banh mi|cơm|com/.test(n)) return 'Vietnamese'
    if (/ramen/.test(n)) return 'Japanese'
    if (/taco|burrito/.test(n)) return 'Mexican'
    if (/fries/.test(n)) return 'Sides'
    if (/coke|soda|drink/.test(n)) return 'Drinks'
    if (/steak/.test(n)) return 'Steak'
    if (/chicken|gà|ga/.test(n)) return 'Chicken'
    return 'Khác'
  }

  function getImageUrl(p: { id: string; name: string }) {
    const name = (p.name || '').toLowerCase()
    const seed = encodeURIComponent(name.replace(/\s+/g, '-'))
    if (/pizza/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/pizza,food`
    if (/burger|hamburger|cheeseburger/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/burger,fastfood`
    if (/sushi|maki|nigiri/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/sushi,fish`
    if (/salad|caesar/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/salad,vegetable`
    if (/pasta|spaghetti|lasagna/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/pasta,italian`
    if (/chicken|gà|ga|fried chicken|wings/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/chicken`
    if (/ramen/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/ramen,noodle`
    if (/taco|burrito/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/mexican,food`
    if (/steak/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/steak,meat`
    if (/coke|soda|drink|tea|milk/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/drink,beverage`
    if (/rice|cơm|com|risotto|nasi/.test(name)) return `https://loremflickr.com/seed/${seed}/640/360/rice,food`
    // fallback deterministic
    return `https://picsum.photos/seed/${seed}/640/360`
  }

  function imageFor(p?: Product | null, id?: string) {
    const prodId = p?.id || id || ''
    const name = p?.name || ''
    const mapped = getMappedImage({ id: prodId, name })
    if (mapped) return mapped
    const cat = getImageUrl({ id: prodId, name })
    if (cat) return cat
    return p?.imageUrl || ''
  }

  function pickRecommended(list: Product[], count = 9) {
    const seedStr = String(recoSeed)
    function score(id: string) {
      let h = 0
      const s = seedStr
      const t = id
      const L = Math.max(s.length, t.length)
      for (let i = 0; i < L; i++) {
        const a = s.charCodeAt(i % s.length) || 0
        const b = t.charCodeAt(i % t.length) || 0
        h = (h * 31 + a + b) >>> 0
      }
      return h
    }
    return list.slice().sort((a,b) => score(a.id) - score(b.id)).slice(0, count)
  }

  function go(path: string) { window.location.hash = path }

  function add(productId: string) {
    setCart(c => {
      const found = c.find(i => i.productId === productId)
      if (found) return c.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i)
      return [...c, { productId, qty: 1 }]
    })
  }

  function remove(productId: string) { setCart(c => c.filter(i => i.productId !== productId)) }
  function changeQty(productId: string, delta: number) { setCart(c => c.map(i => i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)) }

  const subtotal = cart.reduce((sum, it) => {
    const p = products.find(px => px.id === it.productId)
    return sum + (p ? p.price * it.qty : 0)
  }, 0)

  async function submitAuth() {
    setAuthError(null)
    try {
      const email = emailRef.current?.value || authEmail
      const pass = passwordRef.current?.value || authPassword
      const name = nameRef.current?.value || authName
      const phone = phoneRef.current?.value || authPhone
      const address = addressRef.current?.value || authAddress
      if (authMode === 'register') {
        if (!email || !pass) { setAuthError('Vui lòng nhập email và mật khẩu'); return }
        await axios.post(`${USER_BASE.replace(/\/$/, '')}/register`, { email, password: pass, name })
      }
      const login = await axios.post(`${USER_BASE.replace(/\/$/, '')}/login`, { email, password: pass })
      const token = login.data.token
      let me = null
      try {
        const meResp = await axios.get(`${USER_BASE.replace(/\/$/, '')}/me`, { headers: { Authorization: `Bearer ${token}` } })
        me = meResp.data
      } catch (e) {}
      const u = { id: me?.id || '', email, token }
      setUser(u)
      localStorage.setItem('ff_user', JSON.stringify(u))
      setAuthEmail('')
      setAuthPassword('')
      setAuthName('')
      setAuthPhone('')
      setAuthAddress('')
      go('/')
    } catch (e: any) {
      const status = e?.response?.status
      const serverMsg = e?.response?.data?.error || e.message
      let msg = serverMsg || 'Đăng nhập/Đăng ký thất bại'
      if (authMode === 'login') {
        if (status === 400 || status === 401) msg = 'Tài khoản hoặc mật khẩu không đúng'
        else if (!status && /network/i.test(String(e?.message || ''))) msg = 'Tài khoản hoặc mật khẩu không đúng'
      }
      setAuthError(String(msg))
    }
  }

  function logout() { setUser(null); try { localStorage.removeItem('ff_user') } catch (e) {} }

  async function place() {
    if (!user) { alert('Vui lòng đăng nhập hoặc đăng ký trước khi đặt hàng'); go('/login'); return }
    const sName = shipNameRef.current?.value ?? shipName
    const sPhone = shipPhoneRef.current?.value ?? shipPhone
    const sAddress = shipAddressRef.current?.value ?? shipAddress
    if (!sAddress.trim()) { alert('Vui lòng nhập địa chỉ giao hàng'); return }
    try {
      const headers: any = {}
      if (user?.token) headers.Authorization = `Bearer ${user.token}`
      const res = await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders`, {
        items: cart,
        shipping: { name: sName, phone: sPhone, address: sAddress },
        payment: { method: paymentMethod },
        userEmail: user.email
      }, { headers })
      const order = res.data
      setLastOrder(order)
      setCart([])
      go(`/bill/${order?.id || ''}`)
    } catch (e: any) { alert('Đặt hàng thất bại: ' + (e.response?.data?.error || e.message)) }
  }

  function ProductList() {
    const cats = Array.from(new Set(products.map(p => categoryOf(p.name))))
    let filtered = products.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()))
    if (selectedCategory && selectedCategory !== 'Tất cả') {
      filtered = filtered.filter(p => categoryOf(p.name) === selectedCategory)
    }
    const min = minPrice ? parseFloat(minPrice) : undefined
    const max = maxPrice ? parseFloat(maxPrice) : undefined
    if (typeof min === 'number' && !Number.isNaN(min)) filtered = filtered.filter(p => (p.price || 0) >= min)
    if (typeof max === 'number' && !Number.isNaN(max)) filtered = filtered.filter(p => (p.price || 0) <= max)
    if (inStockOnly) filtered = filtered.filter(p => (p.stock ?? 0) > 0)
    const noUserFilters = !search.trim() && (selectedCategory === 'Tất cả') && !minPrice && !maxPrice && !inStockOnly
    let list = filtered
    if (route === '/' && noUserFilters && !showAll) {
      list = pickRecommended(products, 9)
    } else {
      list = filtered.slice().sort((a,b) => (a.name||'').localeCompare(b.name||''))
    }
    return (
      <div>
        {route === '/' && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="filters">
              <div className="chips">
                {['Tất cả', ...cats].map(cat => (
                  <button key={cat} className={"chip" + (selectedCategory === cat ? ' active' : '')} onClick={() => setSelectedCategory(cat)}>{cat}</button>
                ))}
              </div>
              <div className="range">
                <input type="text" className="input" placeholder="Giá min" inputMode="decimal" defaultValue={minPrice} ref={minRef} />
                <input type="text" className="input" placeholder="Giá max" inputMode="decimal" defaultValue={maxPrice} ref={maxRef} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="checkbox" checked={inStockOnly} onChange={e => setInStockOnly(e.target.checked)} /> Còn hàng
                </label>
                <button className="btn primary" onClick={() => { setMinPrice(minRef.current?.value || ''); setMaxPrice(maxRef.current?.value || ''); }}>Áp dụng</button>
                <button className="btn ghost" onClick={() => { setSelectedCategory('Tất cả'); setMinPrice(''); setMaxPrice(''); if (minRef.current) minRef.current.value = ''; if (maxRef.current) maxRef.current.value = ''; setInStockOnly(false); }}>Reset</button>
              </div>
            </div>
            {route === '/' && noUserFilters && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {!showAll ? (
                  <>
                    <span className="loading" style={{ padding: 0 }}>Đang hiển thị gợi ý hôm nay</span>
                    <button className="btn ghost" onClick={() => { const ns = (recoSeed + 1) % 100000; setRecoSeed(ns); try { localStorage.setItem('ff_reco_seed', String(ns)) } catch {} }}>Gợi ý khác</button>
                    <button className="btn ghost" onClick={() => setShowAll(true)}>Xem tất cả</button>
                  </>
                ) : (
                  <button className="btn ghost" onClick={() => setShowAll(false)}>Chỉ hiển thị gợi ý</button>
                )}
              </div>
            )}
          </div>
        )}
        {loading ? <div className="loading">Đang tải sản phẩm...</div> : (
          list.length === 0 ? <div className="loading">Không tìm thấy món phù hợp</div> : (
            <div className="products-grid">
              {list.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-media" onClick={() => go(`/product/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="badge">{categoryOf(p.name)}</div>
                    <ImageWithPlaceholder key={p.id} src={imageFor(p)} srcList={[p.imageUrl || '', getImageUrl(p)]} alt={p.name} />
                  </div>
                  <div className="product-body">
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">${p.price.toFixed(2)}</div>
                    {p.description && <div className="product-desc">{p.description}</div>}
                    <div className="product-actions">
                      <button className="btn primary" onClick={() => add(p.id)}>Thêm</button>
                      <button className="btn small" onClick={() => changeQty(p.id, +1)}>+1</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    )
  }

  function AuthPage() {
    return (
      <div className="auth-page">
        <h2>{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</h2>
        <div className="card">
          {authError && <div className="error">{authError}</div>}
          <div className="form-row">
            <label>Chế độ</label>
            <select value={authMode} onChange={e => { const v = e.target.value as any; setAuthMode(v); go(v === 'login' ? '/login' : '/register') }}>
              <option value="login">Đăng nhập</option>
              <option value="register">Đăng ký</option>
            </select>
          </div>
          <div className="form-row">
            <label>Email</label>
            <input className="input" placeholder="email" type="email" name="email" inputMode="email" autoComplete={authMode === 'login' ? 'username' : 'email'} defaultValue={authEmail} ref={emailRef} />
          </div>
          {authMode === 'register' && (
            <>
              <div className="form-row">
                <label>Họ tên</label>
                <input className="input" placeholder="họ tên" name="name" autoComplete="name" defaultValue={authName} ref={nameRef} />
              </div>
              <div className="form-row">
                <label>Số điện thoại</label>
                <input className="input" placeholder="số điện thoại" type="tel" name="tel" inputMode="tel" autoComplete="tel" defaultValue={authPhone} ref={phoneRef} />
              </div>
              <div className="form-row">
                <label>Địa chỉ</label>
                <input className="input" placeholder="địa chỉ" name="street-address" autoComplete="street-address" defaultValue={authAddress} ref={addressRef} />
              </div>
            </>
          )}
          <div className="form-row">
            <label>Mật khẩu</label>
            <input className="input" placeholder="mật khẩu" type="password" name={authMode === 'login' ? 'current-password' : 'new-password'} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} defaultValue={authPassword} ref={passwordRef} />
          </div>
          <div>
            <button className="btn primary" onClick={submitAuth}>{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
          </div>
          {authMode === 'register' && <div className="required-fields">* Các trường bắt buộc</div>}
        </div>
      </div>
    )
  }

  function BillPage({ id }: { id: string }) {
    const [order, setOrder] = useState<any>(lastOrder && lastOrder?.id === id ? lastOrder : null)
    useEffect(() => {
      if (!order && id) {
        axios.get(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}`).then(r => setOrder(r.data)).catch(() => {})
      }
    }, [id])
    if (!order) return <div className="page"><div className="card"><div className="loading">Đang tải đơn hàng...</div></div></div>
    const items: Array<{ productId: string; qty: number }> = order.items || []
    const total = order.total || 0
    return (
      <div className="page">
        <h2>Hóa đơn</h2>
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><b>Mã đơn:</b> {order.id}</div>
            {order.createdAt && <div><b>Thời gian:</b> {new Date(order.createdAt).toLocaleString()}</div>}
            <div><b>Người nhận:</b> {order.shippingName || order?.shipping?.name || shipName}</div>
            <div><b>Điện thoại:</b> {order.shippingPhone || order?.shipping?.phone || shipPhone}</div>
            <div><b>Địa chỉ:</b> {order.shippingAddress || order?.shipping?.address || shipAddress}</div>
            <div><b>Thanh toán:</b> {(order.paymentMethod || order?.payment?.method || paymentMethod) === 'COD' ? 'COD (Thanh toán khi nhận hàng)' : 'VNPay'}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Sản phẩm</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((it, idx) => {
                const p = products.find(px => px.id === it.productId)
                return (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <img src={imageFor(p, it.productId)} style={{ width: 70, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{p?.name || it.productId}</div>
                      <div style={{ color: 'var(--muted)' }}>SL: {it.qty}</div>
                    </div>
                    <div style={{ fontWeight: 600 }}>{p ? `$${(p.price * it.qty).toFixed(2)}` : ''}</div>
                  </li>
                )
              })}
            </ul>
            <div style={{ marginTop: 8, fontWeight: 700 }}>Tổng cộng: ${Number(total).toFixed(2)}</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <a className="btn ghost" href="#/">Về trang chủ</a>
            <a className="btn primary" href="#/history">Xem lịch sử mua hàng</a>
          </div>
        </div>
      </div>
    )
  }

  function HistoryPage() {
    const [orders, setOrders] = useState<any[]>([])
    useEffect(() => {
      const email = user?.email || ''
      const url = `${ORDER_BASE.replace(/\/$/, '')}/orders` + (email ? `?email=${encodeURIComponent(email)}` : '')
      axios.get(url).then(r => setOrders(r.data || [])).catch(() => setOrders([]))
    }, [user])
    return (
      <div className="page">
        <h2>Lịch sử mua hàng</h2>
        <div className="card">
          {orders.length === 0 ? (
            <div className="loading">Chưa có đơn hàng</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {orders.map((o: any) => (
                <li key={o.id} style={{ padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Đơn #{o.id.slice(0,6)} • ${Number(o.total).toFixed(2)}</div>
                    <div style={{ color: 'var(--muted)' }}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''} • {o.paymentMethod || 'COD'}</div>
                    <div style={{ color: 'var(--muted)' }}>Địa chỉ: {o.shippingAddress || ''}</div>
                  </div>
                  <a className="btn small ghost" href={`#/bill/${o.id}`}>Xem hoá đơn</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  function CartPage() {
    return (
      <div className="page">
        <h2>Giỏ hàng</h2>
        <div className="card">
          {cart.length === 0 ? <div>Giỏ hàng trống</div> : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cart.map(it => {
                const p = products.find(px => px.id === it.productId)
                return (
                  <li key={it.productId} style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <img src={imageFor(p, it.productId)} style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>{p?.name || it.productId}</div>
                      <div style={{ color: 'var(--muted)' }}>${(p?.price || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <button className="btn ghost small" onClick={() => changeQty(it.productId, -1)}>-</button>
                      <span style={{ margin: '0 8px' }}>{it.qty}</span>
                      <button className="btn ghost small" onClick={() => changeQty(it.productId, +1)}>+</button>
                      <button className="btn ghost small" onClick={() => remove(it.productId)} style={{ marginLeft: 8 }}>Xoá</button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>Tạm tính: ${subtotal.toFixed(2)}</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn primary" onClick={() => go('/checkout')} disabled={cart.length === 0}>Thanh toán</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function CheckoutPage() {
    return (
      <div className="page">
        <h2>Thanh toán</h2>
        <div className="card">
          <div>Tạm tính: ${subtotal.toFixed(2)}</div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <label>Họ tên người nhận</label>
            <input className="input" placeholder="Nguyễn Văn A" name="name" autoComplete="shipping name" defaultValue={shipName} ref={shipNameRef} onBlur={e => setShipName(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Số điện thoại</label>
            <input className="input" placeholder="09xx xxx xxx" type="tel" inputMode="tel" name="tel" autoComplete="shipping tel" defaultValue={shipPhone} ref={shipPhoneRef} onBlur={e => setShipPhone(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Địa chỉ giao hàng</label>
            <input className="input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" name="street-address" autoComplete="shipping street-address" defaultValue={shipAddress} ref={shipAddressRef} onBlur={e => setShipAddress(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Phương thức thanh toán</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" name="payment" checked={paymentMethod==='COD'} onChange={() => setPaymentMethod('COD')} /> COD (Thanh toán khi nhận hàng)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5 }}>
                <input type="radio" name="payment" disabled checked={paymentMethod==='VNPay'} onChange={() => {}} /> VNPay (tạm thời chưa hỗ trợ)
              </label>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn primary" onClick={place} disabled={cart.length === 0}>Đặt hàng</button>
          </div>
        </div>
      </div>
    )
  }

  function ProductDetail({ id }: { id: string }) {
    const p = products.find(px => px.id === id)
    if (!p) return <div>Không tìm thấy sản phẩm</div>
    return (
      <div>
        <button className="btn ghost" onClick={() => go('/')}>Quay lại</button>
        <h2>{p.name}</h2>
        <div className="product-hero">
          <ImageWithPlaceholder src={imageFor(p)} srcList={[p.imageUrl || '', getImageUrl(p)]} alt={p.name} />
        </div>
        <p>Giá: ${p.price.toFixed(2)}</p>
        {p.description && <p>{p.description}</p>}
        <button className="btn primary" onClick={() => add(p.id)}>Thêm vào giỏ</button>
      </div>
    )
  }

  return (
    <div>
      <div className="app-container">
        <header className="site-header">
          <div className="site-title"><span className="logo">FF</span></div>
          <nav className="nav-links">
            <a href="#/">Trang chủ</a>
            <a href="#/cart">Giỏ hàng</a>
            <a href="#/history">Lịch sử</a>
            {user ? (
              <>
                <span className="user-email">{user.email}</span>
                <button className="btn ghost small" onClick={logout}>Đăng xuất</button>
              </>
            ) : (
              <>
                <a href="#/login">Đăng nhập</a>
                <a href="#/register">Đăng ký</a>
              </>
            )}
          </nav>
        </header>

        <div className="hero">
          <div className="hero-content">
            <h1>Ngon, nhanh, tận nơi</h1>
            <p>Đặt món ăn yêu thích và giao tận nhà trong tích tắc</p>
            {route === '/' && (
              <div className="hero-search">
                <input ref={searchRef} className="input" placeholder="Tìm món ăn..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <main>
          {route.startsWith('/product/') ? (
            <ProductDetail id={route.split('/product/')[1]} />
          ) : route.startsWith('/bill/') ? (
            <BillPage id={route.split('/bill/')[1]} />
          ) : route === '/history' ? (
            <HistoryPage />
          ) : route === '/cart' ? (
            <CartPage />
          ) : (route === '/login' || route === '/register') ? (
            <AuthPage />
          ) : route === '/checkout' ? (
            <CheckoutPage />
          ) : (
            <ProductList />
          )}
        </main>
      </div>
    </div>
  )
}
