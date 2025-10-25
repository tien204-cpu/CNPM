import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3003'

export default function App() {
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number; stock?: number; imageUrl?: string }>>([])
  const [cart, setCart] = useState<Array<{ productId: string; qty: number }>>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function load() {
      try {
        const p = await axios.get(`${API_BASE.replace(/\/$/, '')}/products`)
        setProducts(p.data)
      } catch (e) {
        console.error(e)
      }
      setLoading(false)
    }
    load()
  }, [])

  function getImageUrl(p: { id: string; name: string }) {
    // simple placeholder images using via.placeholder.com
    const seed = encodeURIComponent(p.name.replace(/\s+/g, '-').toLowerCase())
    return `https://via.placeholder.com/320x180.png?text=${seed}`
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

  async function place() {
    try {
      const res = await axios.post(`${API_BASE}/orders`, { items: cart })
      alert('Order placed: ' + JSON.stringify(res.data))
      setCart([])
    } catch (e: any) {
      alert('Order failed: ' + (e.response?.data?.error || e.message))
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>FoodFast</h1>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 2 }}>
          <h2>Products</h2>
          {loading ? <div className="loading">Loading products...</div> : (
            <div className="products-grid">
              {products.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-media">
                    <img src={p.imageUrl || getImageUrl(p)} alt={p.name} />
                  </div>
                  <div className="product-body">
                    <div className="product-name">{p.name}</div>
                    <div className="product-price">${p.price.toFixed(2)}</div>
                    <div className="product-actions">
                      <button className="btn" onClick={() => add(p.id)}>Add</button>
                      <button className="btn small" onClick={() => { setCart(c => { const found = c.find(i => i.productId === p.id); if(found) return c.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i); return [...c, { productId: p.id, qty: 1 }] }) }}>+1</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ flex: 1, borderLeft: '1px solid #eee', paddingLeft: 18 }}>
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
              <button onClick={place} disabled={cart.length === 0}>Place order</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
