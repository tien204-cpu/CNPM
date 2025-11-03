import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3002'
const USER_BASE = import.meta.env.VITE_USER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001'
const ORDER_BASE = import.meta.env.VITE_ORDER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3003'

type Product = { id: string; name: string; price: number; stock?: number; imageUrl?: string }

export default function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<Array<{ productId: string; qty: number }>>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [user, setUser] = useState<{ id: string; email: string; token?: string } | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const [route, setRoute] = useState<string>(window.location.hash.replace('#', '') || '/')
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace('#', '') || '/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const p = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`)
        setProducts(p.data || [])
      } catch (err) {
        console.error('failed to load products', (err as any)?.message || err)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ff_user')
      if (raw) setUser(JSON.parse(raw))
    } catch (e) {}
  }, [])

  function getImageUrl(p: { id: string; name: string }) {
    const seed = encodeURIComponent(p.name.replace(/\s+/g, '-').toLowerCase())
    return `https://via.placeholder.com/320x180.png?text=${seed}`
  }

  function go(path: string) {
    window.location.hash = path
  }

  function add(productId: string) {
    setCart(c => {
      const found = c.find(i => i.productId === productId)
      if (found) return c.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i)
      return [...c, { productId, qty: 1 }]
    })
  }

  function remove(productId: string) {
    setCart(c => c.filter(i => i.productId !== productId))
  }

  function changeQty(productId: string, delta: number) {
    setCart(c => c.map(i => i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  }

  const subtotal = cart.reduce((sum, it) => {
    const p = products.find(px => px.id === it.productId)
    return sum + (p ? p.price * it.qty : 0)
  }, 0)

  async function submitAuth() {
    try {
      if (authMode === 'register') {
        await axios.post(`${USER_BASE.replace(/\/$/, '')}/register`, { email: authEmail, password: authPassword, name: authEmail.split('@')[0] })
      }
      const login = await axios.post(`${USER_BASE.replace(/\/$/, '')}/login`, { email: authEmail, password: authPassword })
      const token = login.data.token
      let me = null
      try {
        const meResp = await axios.get(`${USER_BASE.replace(/\/$/, '')}/me`, { headers: { Authorization: `Bearer ${token}` } })
        me = meResp.data
      } catch (e) {
        // ignore
      }
      const u = { id: me?.id || '', email: authEmail, token }
      setUser(u)
      localStorage.setItem('ff_user', JSON.stringify(u))
      setAuthEmail('')
      setAuthPassword('')
      go('/')
    } catch (e: any) {
      alert('Auth failed: ' + (e.response?.data?.error || e.message))
    }
  }

  function logout() {
    setUser(null)
    try { localStorage.removeItem('ff_user') } catch (e) {}
  }

  async function place() {
    if (!user) {
      alert('Please login or register before placing an order')
      go('/login')
      return
    }
    try {
      const headers: any = {}
      if (user?.token) headers.Authorization = `Bearer ${user.token}`
      const res = await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders`, { items: cart }, { headers })
      alert('Order placed: ' + JSON.stringify(res.data))
      setCart([])
      go('/')
    } catch (e: any) {
      alert('Order failed: ' + (e.response?.data?.error || e.message))
    }
  }

  function ProductList() {
    return (
      <div>
        <h2>Products</h2>
        {loading ? <div className="loading">Loading products...</div> : (
          <div className="products-grid">
            {products.map(p => (
              <div key={p.id} className="product-card">
                <div className="product-media" onClick={() => go(`/product/${p.id}`)} style={{ cursor: 'pointer' }}>
                  <img key={p.id} src={p.imageUrl || getImageUrl(p)} alt={p.name} />
                </div>
                <div className="product-body">
                  <div className="product-name">{p.name}</div>
                  <div className="product-price">${p.price.toFixed(2)}</div>
                  <div className="product-actions">
                    <button className="btn" onClick={() => add(p.id)}>Add</button>
                    <button className="btn small" onClick={() => changeQty(p.id, +1)}>+1</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function ProductDetail({ id }: { id: string }) {
    const p = products.find(px => px.id === id)
    if (!p) return <div>Product not found</div>
    return (
      <div>
        <button onClick={() => go('/')}>Back</button>
        <h2>{p.name}</h2>
        <img src={p.imageUrl || getImageUrl(p)} style={{ maxWidth: 480 }} />
        <p>Price: ${p.price.toFixed(2)}</p>
        <button onClick={() => add(p.id)}>Add to cart</button>
      </div>
    )
  }

  function CartView() {
    return (
      <div>
        <h2>Cart</h2>
        {cart.length === 0 ? <div>Cart is empty</div> : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {cart.map(it => {
              const p = products.find(px => px.id === it.productId)
              return (
                <li key={it.productId} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>{p?.name || it.productId}</div>
                    <div>
                      <button onClick={() => changeQty(it.productId, -1)}>-</button>
                      <span style={{ margin: '0 8px' }}>{it.qty}</span>
                      <button onClick={() => changeQty(it.productId, +1)}>+</button>
                      <button onClick={() => remove(it.productId)} style={{ marginLeft: 8 }}>Remove</button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Subtotal: ${subtotal.toFixed(2)}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => go('/checkout')} disabled={cart.length === 0}>Proceed to checkout</button>
          </div>
        </div>
      </div>
    )
  }

  function AuthView() {
    return (
      <div>
        <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
        <div style={{ border: '1px solid var(--border)', padding: 10, borderRadius: 6, marginBottom: 8 }}>
          <div style={{ marginBottom: 6 }}>
            <label style={{ display: 'block', fontSize: 12 }}>Mode</label>
            <select value={authMode} onChange={e => setAuthMode(e.target.value as any)}>
              <option value="login">Login</option>
              <option value="register">Register</option>
            </select>
          </div>
          <div style={{ marginBottom: 6 }}>
            <input placeholder="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
          </div>
          <div style={{ marginBottom: 6 }}>
            <input placeholder="password" type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} />
          </div>
          <div>
            <button className="btn" onClick={submitAuth}>{authMode === 'login' ? 'Login' : 'Register'}</button>
          </div>
        </div>
      </div>
    )
  }

  function CheckoutView() {
    return (
      <div>
        <h2>Checkout</h2>
        <div>Subtotal: ${subtotal.toFixed(2)}</div>
        <div style={{ marginTop: 8 }}>
          <button onClick={place} disabled={cart.length === 0}>Place order</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>FoodFast</h1>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 2 }}>
          {route.startsWith('/product/') ? (
            <ProductDetail id={route.split('/product/')[1]} />
          ) : route === '/cart' ? (
            <CartView />
          ) : route === '/login' ? (
            <AuthView />
          ) : route === '/checkout' ? (
            <CheckoutView />
          ) : (
            <ProductList />
          )}
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Cart</h2>
            <div>
              {user ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#444' }}>{user.email}</div>
                  <button className="btn" onClick={logout}>Logout</button>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#444' }}><a href="#/login">Login / Register</a></div>
              )}
            </div>
          </div>
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            {/* cart mini view */}
            {cart.length === 0 ? <div>Cart is empty</div> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {cart.map(it => {
                  const p = products.find(px => px.id === it.productId)
                  return (
                    <li key={it.productId} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>{p?.name || it.productId}</div>
                        <div>
                          <button onClick={() => changeQty(it.productId, -1)}>-</button>
                          <span style={{ margin: '0 8px' }}>{it.qty}</span>
                          <button onClick={() => changeQty(it.productId, +1)}>+</button>
                          <button onClick={() => remove(it.productId)} style={{ marginLeft: 8 }}>Remove</button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 700 }}>Subtotal: ${subtotal.toFixed(2)}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => go('/cart')} disabled={cart.length === 0}>Open cart</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
