import React, { useEffect, useState, useRef } from 'react'

import axios from 'axios'
import '../assets/App.css'
import trackasiagl from 'trackasia-gl'
import 'trackasia-gl/dist/trackasia-gl.css'
import { getMappedImage } from './image-map'
import Admin, { AdminProductCreate, AdminRestaurantCreate } from '../admin/Admin'

const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3002'
const USER_BASE = import.meta.env.VITE_USER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001'
const ORDER_BASE = import.meta.env.VITE_ORDER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3003'
const PAYMENT_BASE = (import.meta as any).env.VITE_PAYMENT_BASE || (import.meta as any).env.VITE_API_BASE || 'http://localhost:3004'
const TRACKASIA_KEY = (import.meta as any).env.VITE_TRACKASIA_KEY || 'a8da2e51d0a720ef81a1762860280f15fa'

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
        width={640}
        height={360}
        decoding="async"
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
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false)
  const [forgotMode, setForgotMode] = useState<boolean>(false)
  const [forgotStep, setForgotStep] = useState<'email' | 'newpass'>('email')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [inStockOnly, setInStockOnly] = useState<boolean>(false)
  const [catRefs, setCatRefs] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)
  // inputs & UX helpers
  const [isComposing, setIsComposing] = useState<boolean>(false)
  const [minPriceInput, setMinPriceInput] = useState<string>('')
  const [maxPriceInput, setMaxPriceInput] = useState<string>('')

  // checkout info
  const [shipName, setShipName] = useState<string>('')
  const [shipPhone, setShipPhone] = useState<string>('')
  const [shipAddress, setShipAddress] = useState<string>('')
  const [shipLat, setShipLat] = useState<number | null>(null)
  const [shipLng, setShipLng] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'VNPay'>('COD')
  const [vnpBank, setVnpBank] = useState<string>('NCB')
  const [vnpLocale, setVnpLocale] = useState<string>('vn')
  const [vnpDesc, setVnpDesc] = useState<string>('')
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
  const newPassRef = useRef<HTMLInputElement>(null)
  const confirmPassRef = useRef<HTMLInputElement>(null)
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
        const [res, cres] = await Promise.all([
          axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`),
          axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`)
        ])
        setProducts(res.data || [])
        const names = Array.isArray(cres?.data) ? (cres.data as any[]).map((c: any) => String(c?.name || '')).filter(Boolean) : []
        setCatRefs(Array.from(new Set(names.map(n => normCat(n)).filter(Boolean))))
      } catch (e) {
        setProducts([])
        setCatRefs([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ff_user')
      if (raw) {
        const u = JSON.parse(raw)
        if (u && u.email) setUser(u)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const r = route || '/'
    const isAuthPage = r === '/login' || r === '/register'
    if ((user as any)?.role === 'admin' && isAuthPage) {
      go('/admin')
    }
  }, [user, route])

  function slugify(name: string) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  function slugifyName(name: string) {
    return (name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  function localVariants(name: string, id?: string) {
    const s = slugifyName(name)
    const v: string[] = []
    if (s) v.push(`/images/${s}.webp`, `/images/${s}.jpg`, `/images/${s}.png`, `/images/${s}.jpeg`)
    if (id) v.push(`/images/${id}.webp`, `/images/${id}.jpg`, `/images/${id}.png`, `/images/${id}.jpeg`)
    return v
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

  function normCat(c?: string) {
    const t = (c || '').trim()
    if (!t) return t
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
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

  function imageCandidates(p: Product) {
    const locals = localVariants(p.name, p.id)
    const mapped = getMappedImage({ id: p.id, name: p.name }) || ''
    const explicit = p.imageUrl || ''
    const cat = getImageUrl({ id: p.id, name: p.name })
    const chain = [...locals, explicit, mapped, cat]
    return chain.filter(Boolean)
  }

  function removeAccents(s: string) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
  }

  function normalizeAddressInput(addr: string) {
    let a = String(addr || '').trim()
    if (!a) return a
    let x = removeAccents(a)
    // light cleanup only; do not force any city to keep nationwide compatibility
    x = x.replace(/\s{2,}/g, ' ').trim()
    if (!/vietnam/i.test(x)) x = x + ', Vietnam'
    return x
  }

  async function geocodeAddress(query: string): Promise<Array<{ lat: number; lon: number; display_name?: string }>> {
    const variants: string[] = []
    const base = String(query || '').trim()
    if (base) variants.push(base)
    const norm = normalizeAddressInput(base)
    if (norm && norm !== base) variants.push(norm)
    const ascii = removeAccents(base)
    if (ascii && ascii !== base && ascii !== norm) variants.push(ascii)
    // Reordered variant to help Nominatim parse better
    const parts = base.split(',').map(s => s.trim()).filter(Boolean)
    if (parts.length >= 3) variants.push(parts.slice(0,2).join(' ') + ', ' + parts.slice(2).join(', '))
    // Strip leading housenumber token (e.g., "F1/12M,") to allow street-level match as fallback
    if (parts.length >= 2) {
      const first = parts[0]
      if (/^[a-z0-9][a-z0-9\/\-]{0,12}$/i.test(first)) {
        const noHouse = parts.slice(1).join(', ')
        if (noHouse && !variants.includes(noHouse)) variants.push(noHouse)
        const noHouseNorm = normalizeAddressInput(noHouse)
        if (noHouseNorm && !variants.includes(noHouseNorm)) variants.push(noHouseNorm)
      }
    }
    const bbox = '106.36,11.16,107.20,10.37' // HCMC bias

    // Heuristic structured search for HCMC addresses (helps with formats like F1/12M Huong lo 80, Vinh Loc A, Binh Chanh)
    const lower = removeAccents(base).toLowerCase()
    const hasHousePattern = /\d/.test(lower) || /\//.test(lower)
    const qTokens = Array.from(new Set(lower.split(/[^a-z0-9]+/).filter(w => w.length >= 3)))
    function scoreDisplay(s?: string) {
      const t = removeAccents(String(s || '')).toLowerCase()
      let sc = 0
      if (/viet\s*nam/.test(t) || /vietnam/.test(t)) sc += 1
      // token coverage
      let matched = 0
      for (const w of qTokens) { if (t.includes(w)) matched++ }
      sc += Math.min(matched, 6) // cap
      // house number expectation
      const tHasNum = /\d/.test(t)
      const tHasSlash = /\//.test(t)
      if (hasHousePattern) {
        if (tHasNum) sc += 2
        if (tHasSlash) sc += 1
      }
      return sc
    }
    function sortByScore(list: Array<{ lat:number; lon:number; display_name?: string }>) {
      return list.slice().sort((a,b) => scoreDisplay(b.display_name) - scoreDisplay(a.display_name))
    }
    let street = undefined as string | undefined
    let house = undefined as string | undefined

    const structuredQueries: string[] = []

    // Primary: TrackAsia (VN-wide)
    for (const q of variants) {
      try {
        if (TRACKASIA_KEY) {
          const url = `https://maps.track-asia.com/api/v2/place/textsearch/json?language=vi&key=${encodeURIComponent(TRACKASIA_KEY)}&query=${encodeURIComponent(q)}&new_admin=true&include_old_admin=true`
          const r = await fetch(url, { method: 'GET' })
          const data: any = await r.json()
          const results = Array.isArray(data?.results) ? data.results : []
          let list: Array<{ lat:number; lon:number; display_name?: string }> = results.map((it: any) => ({ lat: Number(it?.geometry?.location?.lat), lon: Number(it?.geometry?.location?.lng), display_name: it?.formatted_address || it?.name }))
            .filter((p: { lat:number; lon:number }) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
          list = sortByScore(list)
          if (list.length > 0) return list
        }
      } catch {}
    }

    for (const q of variants) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=7&addressdetails=1&accept-language=vi,en&countrycodes=vn&q=${encodeURIComponent(q)}`
        const r = await fetch(url, { method: 'GET' })
        const arr: any[] = await r.json()
        let list: Array<{ lat:number; lon:number; display_name?: string }> = (Array.isArray(arr) ? arr : []).filter((it: any) => it && it.lat && it.lon).map((it: any) => ({ lat: parseFloat(it.lat), lon: parseFloat(it.lon), display_name: it.display_name }))
        list = sortByScore(list)
        if (list.length > 0) return list
      } catch {}
    }
    // Try structured queries (currently empty; reserved for future structured calls)
    for (const qs of structuredQueries) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?${qs}`
        const r = await fetch(url, { method: 'GET' })
        const arr: any[] = await r.json()
        const list = sortByScore((Array.isArray(arr) ? arr : []).filter((it: any) => it && it.lat && it.lon).map((it: any) => ({ lat: parseFloat(it.lat), lon: parseFloat(it.lon), display_name: it.display_name })))
        if (list.length > 0) return list
      } catch {}
    }
    return []
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
        if (!agreeTerms) { setAuthError('Bạn phải đồng ý với các điều khoản'); return }
        await axios.post(`${USER_BASE.replace(/\/$/, '')}/register`, { email, password: pass, name })
      }
      const login = await axios.post(`${USER_BASE.replace(/\/$/, '')}/login`, { email, password: pass })
      const token = login.data.token
      let me = null
      try {
        const meResp = await axios.get(`${USER_BASE.replace(/\/$/, '')}/me`, { headers: { Authorization: `Bearer ${token}` } })
        me = meResp.data
      } catch (e) {}
      const u = { id: me?.id || '', email, token, role: me?.role || 'user' }
      setUser(u)
      localStorage.setItem('ff_user', JSON.stringify(u))
      setAuthEmail('')
      setAuthPassword('')
      setAuthName('')
      setAuthPhone('')
      setAuthAddress('')
      if ((u as any).role === 'admin') go('/admin')
      else go('/')
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

  async function verifyEmail() {
    setAuthError(null)
    try {
      const email = emailRef.current?.value || authEmail
      if (!email) { setAuthError('Vui lòng nhập email'); return }
      const r = await axios.get(`${USER_BASE.replace(/\/$/, '')}/exists`, { params: { email } })
      const ok = !!(r?.data?.exists)
      if (ok) { setAuthEmail(email); setForgotStep('newpass') }
      else { setAuthError('Email không tồn tại') }
    } catch (e: any) {
      setAuthError('Email không tồn tại')
    }
  }

  async function resetPassword() {
    setAuthError(null)
    try {
      const email = emailRef.current?.value || authEmail
      const np = newPassRef.current?.value || ''
      const cf = confirmPassRef.current?.value || ''
      if (!email || !np || !cf) { setAuthError('Vui lòng nhập đầy đủ'); return }
      if (np !== cf) { setAuthError('Mật khẩu mới không khớp'); return }
      await axios.post(`${USER_BASE.replace(/\/$/, '')}/reset`, { email, password: np })
      setForgotMode(false)
      setAuthPassword('')
      alert('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.')
    } catch (e: any) {
      setAuthError(String(e?.response?.data?.error || e.message || 'Đặt lại mật khẩu thất bại'))
    }
  }

  function logout() {
    setUser(null)
    setCart([])
    setLastOrder(null)
    try { localStorage.removeItem('ff_user') } catch (e) {}
    go('/')
  }

  async function place() {
    if (!user) { alert('Vui lòng đăng nhập hoặc đăng ký trước khi đặt hàng'); go('/login'); return }
    const sName = shipNameRef.current?.value ?? shipName
    const sPhone = shipPhoneRef.current?.value ?? shipPhone
    const sAddress = shipAddressRef.current?.value ?? shipAddress
    if (!sAddress.trim()) { alert('Vui lòng nhập địa chỉ giao hàng'); return }
    try {
      const headers: any = {}
      if (user?.token) headers.Authorization = `Bearer ${user.token}`
      let latPayload = shipLat
      let lngPayload = shipLng
      if (!(typeof latPayload === 'number' && typeof lngPayload === 'number')) {
        const cands = await geocodeAddress(sAddress)
        if (cands[0]) { latPayload = cands[0].lat; lngPayload = cands[0].lon; try { setShipLat(latPayload); setShipLng(lngPayload) } catch {} }
      }
      if (!(typeof latPayload === 'number' && typeof lngPayload === 'number')) {
        alert('Không xác định được vị trí giao hàng từ địa chỉ. Vui lòng bấm "Định vị" hoặc chọn điểm trên bản đồ (click hoặc kéo marker), rồi thử lại.')
        return
      }
      const res = await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders`, {
        items: cart,
        shipping: { name: sName, phone: sPhone, address: sAddress, lat: latPayload, lng: lngPayload },
        payment: { method: paymentMethod },
        userEmail: user.email
      }, { headers })
      const order = res.data
      setLastOrder(order)
      setCart([])
      if (paymentMethod === 'VNPay') {
        try {
          const pr = await axios.post(`${PAYMENT_BASE.replace(/\/$/, '')}/vnpay/create`, {
            amount: Number(order?.total || 0),
            orderId: order?.id
          })
          const url = pr?.data?.url
          if (url) { window.location.href = url; return }
          else { alert('Không tạo được liên kết VNPay, chuyển sang hoá đơn'); }
        } catch (e: any) {
          alert('Tạo thanh toán VNPay thất bại: ' + (e?.response?.data?.error || e?.message || ''))
        }
      }
      go(`/bill/${order?.id || ''}`)
    } catch (e: any) { alert('Đặt hàng thất bại: ' + (e.response?.data?.error || e.message)) }
  }

  function ProductList() {
    const catsProd = Array.from(new Set(products.map(p => normCat((p as any).category || categoryOf(p.name)))))
    const cats = Array.from(new Set([...(catRefs || []), ...catsProd]))
    let filtered = products.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()))
    if (selectedCategory && selectedCategory !== 'Tất cả') {
      const want = normCat(selectedCategory)
      filtered = filtered.filter(p => normCat(((p as any).category) || categoryOf(p.name)) === want)
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
                    <div className="badge">{normCat((p as any).category || categoryOf(p.name))}</div>
                    {(() => { const c = imageCandidates(p); return <ImageWithPlaceholder key={p.id} src={c[0]} srcList={c.slice(1)} alt={p.name} /> })()}
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
          {/* bỏ lựa chọn chế độ, dùng đường dẫn /login hoặc /register */}
          {authMode === 'login' && forgotMode ? (
            forgotStep === 'email' && (
              <div className="form-row">
                <label>Email</label>
                <input className="input" placeholder="email" type="email" name="email" inputMode="email" autoComplete="username" defaultValue={authEmail} ref={emailRef} />
              </div>
            )
          ) : (
            <div className="form-row">
              <label>Email</label>
              <input className="input" placeholder="email" type="email" name="email" inputMode="email" autoComplete={authMode === 'login' ? 'username' : 'email'} defaultValue={authEmail} ref={emailRef} />
            </div>
          )}
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
          {!(authMode === 'login' && forgotMode) && (
            <div className="form-row">
              <label>Mật khẩu</label>
              <input className="input" placeholder="mật khẩu" type="password" name={authMode === 'login' ? 'current-password' : 'new-password'} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} defaultValue={authPassword} ref={passwordRef} />
            </div>
          )}
          {authMode === 'login' && !forgotMode && (
            <div style={{ marginBottom: 8 }}>
              <button className="btn ghost" onClick={() => { setAuthEmail(emailRef.current?.value || authEmail); setForgotMode(true); setForgotStep('email'); }}>Quên mật khẩu?</button>
            </div>
          )}
          {authMode === 'login' && forgotMode && forgotStep === 'email' && (
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn primary" onClick={verifyEmail}>Tiếp tục</button>
              <button className="btn ghost" onClick={() => { setForgotMode(false); setForgotStep('email'); }}>Huỷ</button>
            </div>
          )}
          {authMode === 'login' && forgotMode && forgotStep === 'newpass' && (
            <>
              <div className="form-row">
                <label>Mật khẩu mới</label>
                <input className="input" type="password" ref={newPassRef} placeholder="mật khẩu mới" />
              </div>
              <div className="form-row">
                <label>Nhập lại mật khẩu mới</label>
                <input className="input" type="password" ref={confirmPassRef} placeholder="nhập lại mật khẩu mới" />
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn primary" onClick={resetPassword}>Đặt lại mật khẩu</button>
                <button className="btn ghost" onClick={() => { setForgotMode(false); setForgotStep('email'); }}>Huỷ</button>
              </div>
            </>
          )}
          {authMode === 'register' && (
            <div className="form-row">
              <label style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'flex-start' }}>
                <input id="agree-terms" type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                <span>Tôi đồng ý với các điều khoản</span>
              </label>
            </div>
          )}
          {!(authMode === 'login' && forgotMode) && (
            <div>
              <button className="btn primary" onClick={submitAuth} disabled={authMode === 'register' && !agreeTerms}>{authMode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</button>
            </div>
          )}
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
    useEffect(() => {
      if (!id) return
      let es: EventSource | null = null
      try {
        es = new EventSource(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}/events`)
        es.addEventListener('status', (ev: any) => {
          try {
            const data = JSON.parse(ev.data || '{}')
            setOrder((o: any) => ({ ...(o || {}), status: data.status }))
          } catch {}
        })
      } catch {}
      return () => { try { es && es.close() } catch {} }
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
            {order.status && <div><b>Trạng thái:</b> {order.status}</div>}
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
            <a className="btn primary" href={`#/track/${id}`}>Theo dõi đơn hàng</a>
            <a className="btn ghost" href="#/history">Lịch sử</a>
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
      axios.get(url).then(r => {
        const data = r.data
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
        setOrders(list || [])
      }).catch(() => setOrders([]))
    }, [user])
    const esRef = useRef<Record<string, EventSource>>({})
    useEffect(() => {
      // attach SSE listeners per order to update status realtime
      const current = esRef.current || {}
      const activeIds = new Set(orders.map(o => o.id))
      // close removed
      for (const id of Object.keys(current)) {
        if (!activeIds.has(id)) { try { current[id].close() } catch {}; delete current[id] }
      }
      // open new
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
            current[o.id] = es
          } catch {}
        }
      }
      esRef.current = current
      return () => {
        for (const id of Object.keys(current)) { try { current[id].close() } catch {} }
      }
    }, [orders])
    return (
      <div className="page">
        <h2>Lịch sử mua hàng</h2>
        <div className="card">
          {orders.length === 0 ? (
            <div className="loading">Chưa có đơn hàng</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {orders.map((o: any) => (
                <li key={o.id} style={{ padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, justifyContent:'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Đơn #{o.id.slice(0,6)} • ${Number(o.total).toFixed(2)}</div>
                    <div style={{ color: 'var(--muted)' }}>{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''} • {o.paymentMethod || 'COD'}</div>
                    <div style={{ color: 'var(--muted)' }}>Địa chỉ: {o.shippingAddress || ''}</div>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <a className="btn small ghost" href={`#/bill/${o.id}`}>Hóa đơn</a>
                    <a className="btn small primary" href={`#/track/${o.id}`}>Theo dõi</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  function StepBar({ status }: { status?: string }) {
    const steps = [
      { key: 'to_rest', label: 'Điều drone tới nhà hàng', icon: '🚁' },
      { key: 'pickup', label: 'Bắt đầu lấy đồ ăn', icon: '🥡' },
      { key: 'ready', label: 'Chuẩn bị giao hàng', icon: '📦' },
      { key: 'shipping', label: 'Đang giao đồ ăn bằng drone', icon: '🚁' },
      { key: 'done', label: 'Đã giao đồ ăn tới nhà', icon: '🏠' }
    ]
    // map our service statuses to step index
    const map: Record<string, number> = {
      'Điều drone tới nhà hàng': 0,
      'Bắt đầu lấy đồ ăn': 1,
      'Chuẩn bị giao hàng': 2,
      'Đang giao đồ ăn bằng drone': 3,
      'Đã giao đồ ăn tới nhà': 4
    }
    const idx = typeof status === 'string' && status in map ? map[status] : 0
    const progressPct = Math.max(0, Math.min(100, (idx / (steps.length - 1)) * 100))
    return (
      <div className="steps">
        <div className="rail"><div className="fill" style={{ width: `${progressPct}%` }} /></div>
        {steps.map((s, i) => (
          <div key={s.key} className={`step${i < idx ? ' completed' : (i===idx ? ' active' : '')}`}>
            <div className="circle" aria-hidden>{s.icon}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>
    )
  }

  function TrackPage({ id }: { id: string }) {
    const [order, setOrder] = useState<any>(null)
    const mapRef = useRef<any>(null)
    const markerRef = useRef<any>(null)
    const routeRef = useRef<any>(null)
    const stopMarkersRef = useRef<any[]>([])
    const stopsDataRef = useRef<Array<{ lat:number; lng:number; name?: string; address?: string }>>([])
    const shownStopsRef = useRef<Set<number>>(new Set())
    useEffect(() => {
      // init map immediately so user sees base map even before route events
      try {
        if ((window as any).L && !mapRef.current) {
          const L = (window as any).L
          const center = [10.776889, 106.700806]
          mapRef.current = L.map('trackmap').setView(center, 13)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current)
        }
      } catch {}
      axios.get(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}`).then(r => setOrder(r.data)).catch(() => {})
      let es: EventSource | null = null
      try {
        es = new EventSource(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}/events`)
        es.addEventListener('status', (ev: any) => {
          try { const data = JSON.parse(ev.data || '{}'); setOrder((o: any) => ({ ...(o||{}), status: data.status })); } catch {}
        })
        es.addEventListener('drone', (ev: any) => {
          try {
            const data = JSON.parse(ev.data || '{}')
            if (!(window as any).L) return
            const L = (window as any).L
            if (!mapRef.current) {
              const center = [10.776889, 106.700806]
              mapRef.current = L.map('trackmap').setView(center, 13)
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current)
            }
            if (data.type === 'route' && Array.isArray(data.path)) {
              const latlngs = data.path.map((p: any) => [p.lat, p.lng])
              if (data.append && routeRef.current) {
                try {
                  const existing = routeRef.current.getLatLngs() || []
                  const merged = existing.concat(latlngs.map((ll: any) => L.latLng(ll[0], ll[1])))
                  routeRef.current.setLatLngs(merged)
                } catch {
                  try { routeRef.current = L.polyline(latlngs, { color: '#7c3aed' }).addTo(mapRef.current) } catch {}
                }
              } else {
                if (routeRef.current) { try { mapRef.current.removeLayer(routeRef.current) } catch {} }
                routeRef.current = L.polyline(latlngs, { color: '#7c3aed' }).addTo(mapRef.current)
                // reset shown stops when drawing a new route (pickup phase)
                shownStopsRef.current = new Set()
                // clear old stop markers
                for (const m of stopMarkersRef.current) { try { mapRef.current.removeLayer(m) } catch {} }
                stopMarkersRef.current = []
              }
              // fit bounds to new/updated route
              try { mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [20, 20] }) } catch {}
              // place or update stops markers if provided
              if (Array.isArray(data.stops)) {
                stopsDataRef.current = data.stops
                for (const m of stopMarkersRef.current) { try { mapRef.current.removeLayer(m) } catch {} }
                stopMarkersRef.current = []
                data.stops.forEach((s: any) => {
                  try {
                    const mk = L.marker([s.lat, s.lng]).addTo(mapRef.current)
                    const html = `<div><strong>${(s.name||'Nhà hàng')}</strong><div>${(s.address||'')}</div></div>`
                    mk.bindPopup(html)
                    stopMarkersRef.current.push(mk)
                  } catch {}
                })
              }
              // ensure drone marker at start of the new segment
              const head = latlngs[0]
              if (head) {
                if (!markerRef.current) markerRef.current = L.marker(head).addTo(mapRef.current)
                else markerRef.current.setLatLng(head)
              }
            } else if (data.type === 'pos' && typeof data.lat === 'number' && typeof data.lng === 'number') {
              if (!markerRef.current) {
                markerRef.current = (window as any).L.marker([data.lat, data.lng]).addTo(mapRef.current)
              } else { markerRef.current.setLatLng([data.lat, data.lng]) }
              // auto open popup when nearing a stop (once per stop)
              try {
                const pt = L.latLng(data.lat, data.lng)
                const stops = stopsDataRef.current || []
                for (let i = 0; i < stops.length; i++) {
                  if (shownStopsRef.current.has(i)) continue
                  const s = stops[i]
                  const d = pt.distanceTo(L.latLng(s.lat, s.lng))
                  if (d < 200) { // within 200m
                    shownStopsRef.current.add(i)
                    const mk = stopMarkersRef.current[i]
                    try { mk && mk.openPopup() } catch {}
                    break
                  }
                }
              } catch {}
            } else if (data.type === 'arrived') {
              // nothing, user waits for admin to confirm delivered
            }
          } catch {}
        })
      } catch {}
      return () => { try { es && es.close() } catch {} }
    }, [id])
    return (
      <div className="page">
        <h2>Theo dõi đơn hàng</h2>
        <div className="card">
          <div id="trackmap" style={{ width:'100%', height: 360, borderRadius: 12 }} />
          <div style={{ marginTop: 12 }}>
            <StepBar status={order?.status} />
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <a className="btn ghost" href={`#/bill/${id}`}>Xem hoá đơn</a>
          </div>
        </div>
      </div>
    )
  }

  function RestaurantsPage() {
    const [list, setList] = useState<any[]>([])
    useEffect(() => { axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`).then(r => setList(r.data||[])).catch(() => setList([])) }, [])
    return (
      <div className="page">
        <h2>Nhà hàng</h2>
        <div className="card">
          {list.length === 0 ? <div className="loading">Chưa có nhà hàng</div> : (
            <div className="restaurants-grid">
              {list.map(r => (
                <div key={r.id} className="restaurant-card">
                  <div className="restaurant-body">
                    <div className="restaurant-name">{r.name}</div>
                    {r.address && <div className="restaurant-addr">{r.address}</div>}
                    <div style={{ marginTop: 10 }}>
                      <a className="btn primary" href={`#/restaurant/${r.id}`}>Xem menu</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  function RestaurantDetailPage({ id }: { id: string }) {
    const [restaurant, setRestaurant] = useState<any>(null)
    const [list, setList] = useState<Product[]>([])
    useEffect(() => {
      axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${id}`).then(r => setRestaurant(r.data)).catch(() => setRestaurant(null))
      axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`).then(r => setList(r.data||[])).catch(() => setList([]))
    }, [id])
    const items = list.filter((p: any) => (p.restaurantId || '') === id)
    return (
      <div className="page">
        <h2>{restaurant?.name || 'Nhà hàng'}</h2>
        <div className="card">
          {restaurant?.address && <div style={{ marginBottom: 12, color: 'var(--muted)' }}>Địa chỉ: {restaurant.address}</div>}
          {items.length === 0 ? <div className="loading">Nhà hàng chưa có món</div> : (
            <div className="products-grid">
              {items.map(p => (
                <div key={p.id} className="product-card">
                  <div className="product-media" onClick={() => go(`/product/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <div className="badge">{normCat((p as any).category || categoryOf(p.name))}</div>
                    {(() => { const c = imageCandidates(p); return <ImageWithPlaceholder key={p.id} src={c[0]} srcList={c.slice(1)} alt={p.name} /> })()}
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
    const mapRef = useRef<any>(null)
    const markerRef = useRef<any>(null)
    const [geoLoading, setGeoLoading] = useState(false)
    const [geoError, setGeoError] = useState<string | null>(null)
    const [geoCands, setGeoCands] = useState<Array<{ lat: number; lon: number; display_name?: string }>>([])
    const [mapBoot, setMapBoot] = useState(0)
    const bootTimerRef = useRef<any>(null)

    async function geocode(addr?: string) {
      try {
        const q = (((addr ?? shipAddressRef.current?.value ?? shipAddress)) || '').trim()
        if (!q) return
        setGeoLoading(true)
        setGeoError(null)
        const list = await geocodeAddress(q)
        setGeoCands(list)
        if (list[0]) { setShipLat(list[0].lat); setShipLng(list[0].lon) }
        else { setGeoError('Không tìm thấy vị trí phù hợp') }
      } catch (e: any) {
        setGeoError('Định vị thất bại')
      } finally { setGeoLoading(false) }
    }

    useEffect(() => {
      try {
        const TA = trackasiagl as any
        if (!TA) { return }
        const hasLL = typeof shipLat === 'number' && typeof shipLng === 'number'
        if (!mapRef.current) {
          const center = [hasLL ? shipLng! : 106.700806, hasLL ? shipLat! : 10.776889]
          mapRef.current = new TA.Map({
            container: 'shipmap',
            style: `https://maps.track-asia.com/styles/v2/streets.json?key=${encodeURIComponent(TRACKASIA_KEY || 'a8da2e51d0a720ef81a1762860280f15fa')}`,
            center,
            zoom: hasLL ? 16 : 13
          })
          mapRef.current.on('click', (ev: any) => {
            try {
              const { lng, lat } = ev?.lngLat || {}
              if (typeof lat === 'number' && typeof lng === 'number') {
                setShipLat(lat); setShipLng(lng)
                if (markerRef.current) markerRef.current.setLngLat([lng, lat])
              }
            } catch {}
          })
        }
        if (hasLL) {
          if (!markerRef.current) {
            markerRef.current = new TA.Marker({ draggable: true }).setLngLat([shipLng!, shipLat!]).addTo(mapRef.current)
            markerRef.current.on('dragend', () => {
              try { const c = markerRef.current.getLngLat(); setShipLat(c.lat); setShipLng(c.lng) } catch {}
            })
          } else { markerRef.current.setLngLat([shipLng!, shipLat!]) }
          if (mapRef.current && mapRef.current.flyTo) {
            mapRef.current.flyTo({ center: [shipLng!, shipLat!], zoom: 16 })
          }
        }
      } catch {}
      return () => { try { if (bootTimerRef.current) { clearTimeout(bootTimerRef.current); bootTimerRef.current = null } } catch {} }
    }, [shipLat, shipLng, mapBoot])

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
            <input className="input" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" name="street-address" autoComplete="shipping street-address" defaultValue={shipAddress} ref={shipAddressRef} onBlur={e => { setShipAddress(e.target.value); geocode(e.target.value) }} />
          </div>
          <div className="form-row" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button className="btn small" onClick={(e) => { e.preventDefault(); geocode() }}>Định vị</button>
            {geoLoading && <div className="loading" style={{ padding:0 }}>Đang định vị...</div>}
            {geoError && <div className="error">{geoError}</div>}
          </div>
          <div style={{ marginTop: 8 }}>
            <div id="shipmap" style={{ width:'100%', height: 260, borderRadius: 12 }} />
          </div>
          {geoCands.length >= 1 && (
            <div className="form-row">
              <label>Gợi ý</label>
              <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                {geoCands.slice(0,5).map((c, i) => (
                  <li key={i}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setShipLat(c.lat); setShipLng(c.lon); try { if (markerRef.current && mapRef.current && mapRef.current.flyTo) { markerRef.current.setLngLat([c.lon, c.lat]); mapRef.current.flyTo({ center: [c.lon, c.lat], zoom: 16 }) } } catch {} }}>{c.display_name || `${c.lat},${c.lon}`}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="form-row">
            <label>Phương thức thanh toán</label>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" name="payment" checked={paymentMethod==='COD'} onChange={() => setPaymentMethod('COD')} /> COD (Thanh toán khi nhận hàng)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="radio" name="payment" checked={paymentMethod==='VNPay'} onChange={() => setPaymentMethod('VNPay')} /> VNPay
              </label>
            </div>
          </div>
          {paymentMethod === 'VNPay' && (<></>)}
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
    const [rest, setRest] = useState<any>(null)
    useEffect(() => {
      const rid = (p as any)?.restaurantId
      if (rid) {
        axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${rid}`).then(r => setRest(r.data)).catch(() => setRest(null))
      } else {
        setRest(null)
      }
    }, [id])
    return (
      <div>
        <button className="btn ghost" onClick={() => go('/')}>Quay lại</button>
        <h2>{p.name}</h2>
        <div className="product-hero">
          {(() => { const c = imageCandidates(p); return <ImageWithPlaceholder src={c[0]} srcList={c.slice(1)} alt={p.name} /> })()}
        </div>
        <p>Giá: ${p.price.toFixed(2)}</p>
        {rest?.name && (
          <p>Nhà hàng: <a href={`#/restaurant/${rest.id}`}>{rest.name}</a></p>
        )}
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
            <a href="#/restaurants">Nhà hàng</a>
            <a href="#/cart">Giỏ hàng</a>
            <a href="#/history">Lịch sử</a>
            {user && (user as any).role === 'admin' && <a href="#/admin">Admin</a>}
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
          ) : route.startsWith('/track/') ? (
            <TrackPage id={route.split('/track/')[1]} />
          ) : route === '/restaurants' ? (
            <RestaurantsPage />
          ) : route.startsWith('/restaurant/') ? (
            <RestaurantDetailPage id={route.split('/restaurant/')[1]} />
          ) : route === '/history' ? (
            <HistoryPage />
          ) : route === '/cart' ? (
            <CartPage />
          ) : (route === '/login' || route === '/register') ? (
            <AuthPage />
          ) : route === '/checkout' ? (
            <CheckoutPage />
          ) : route === '/admin' ? (
            <Admin />
          ) : route === '/admin/restaurants/new' ? (
            <AdminRestaurantCreate />
          ) : route === '/admin/products/new' ? (
            <AdminProductCreate />
          ) : (
            <ProductList />
          )}
        </main>
      </div>
    </div>
  )
}
