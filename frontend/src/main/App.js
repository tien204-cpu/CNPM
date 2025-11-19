import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import '../assets/App.css';
import trackasiagl from 'trackasia-gl';
import 'trackasia-gl/dist/trackasia-gl.css';
import { getMappedImage } from './image-map';
import Admin, { AdminProductCreate, AdminRestaurantCreate } from '../admin/Admin';
const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3002';
const USER_BASE = import.meta.env.VITE_USER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const ORDER_BASE = import.meta.env.VITE_ORDER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3003';
const PAYMENT_BASE = import.meta.env.VITE_PAYMENT_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3004';
const TRACKASIA_KEY = import.meta.env.VITE_TRACKASIA_KEY || 'a8da2e51d0a720ef81a1762860280f15fa';
function ImageWithPlaceholder({ src, srcList = [], alt, className, style }) {
    const name = String(alt || '').slice(0, 40);
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#a78bfa' offset='0'/><stop stop-color='#60a5fa' offset='1'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='Poppins,Arial' font-size='28' fill='white' opacity='0.9'>${name || 'Food'}</text></svg>`;
    const instant = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    const chain = [src, ...srcList, instant].filter(Boolean);
    const [idx, setIdx] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const current = chain[idx];
    useEffect(() => { setIdx(0); setLoaded(false); }, [src]);
    if (!current)
        return _jsx("div", { className: "img-skeleton " + (className || ''), style: style });
    return (_jsxs("div", { style: { position: 'relative' }, children: [!loaded && _jsx("div", { className: "img-skeleton" }), _jsx("img", { src: current, alt: alt, loading: "lazy", width: 640, height: 360, decoding: "async", referrerPolicy: "no-referrer", className: className, style: { ...(loaded ? {} : { display: 'none' }), ...(style || {}) }, onLoad: () => setLoaded(true), onError: () => {
                    if (idx < chain.length - 1)
                        setIdx(idx + 1);
                    else
                        setIdx(chain.length); // renders skeleton
                } })] }));
}
export default function App() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [authMode, setAuthMode] = useState('login');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState(null);
    const [authName, setAuthName] = useState('');
    const [authPhone, setAuthPhone] = useState('');
    const [authAddress, setAuthAddress] = useState('');
    const [agreeTerms, setAgreeTerms] = useState(false);
    const [forgotMode, setForgotMode] = useState(false);
    const [forgotStep, setForgotStep] = useState('email');
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [inStockOnly, setInStockOnly] = useState(false);
    const [catRefs, setCatRefs] = useState([]);
    const searchRef = useRef(null);
    // inputs & UX helpers
    const [isComposing, setIsComposing] = useState(false);
    const [minPriceInput, setMinPriceInput] = useState('');
    const [maxPriceInput, setMaxPriceInput] = useState('');
    // checkout info
    const [shipName, setShipName] = useState('');
    const [shipPhone, setShipPhone] = useState('');
    const [shipAddress, setShipAddress] = useState('');
    const [shipLat, setShipLat] = useState(null);
    const [shipLng, setShipLng] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [vnpBank, setVnpBank] = useState('NCB');
    const [vnpLocale, setVnpLocale] = useState('vn');
    const [vnpDesc, setVnpDesc] = useState('');
    const [lastOrder, setLastOrder] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [recoSeed, setRecoSeed] = useState(() => {
        // rotate suggestions by day so mỗi lần quay lại (ngày khác) sẽ thấy món khác
        const daySeed = Math.floor(Date.now() / 86400000) % 100000;
        return daySeed;
    });
    const [route, setRoute] = useState(window.location.hash.replace('#', '') || '/');
    const emailRef = useRef(null);
    const passwordRef = useRef(null);
    const nameRef = useRef(null);
    const phoneRef = useRef(null);
    const addressRef = useRef(null);
    const minRef = useRef(null);
    const maxRef = useRef(null);
    const shipNameRef = useRef(null);
    const shipPhoneRef = useRef(null);
    const shipAddressRef = useRef(null);
    const newPassRef = useRef(null);
    const confirmPassRef = useRef(null);
    useEffect(() => {
        const onHash = () => setRoute(window.location.hash.replace('#', '') || '/');
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    // Note: giá min/max chỉ áp dụng khi bấm nút "Áp dụng" để tránh mất focus trên Edge
    useEffect(() => {
        if (route === '/register')
            setAuthMode('register');
        else if (route === '/login')
            setAuthMode('login');
    }, [route]);
    // Removed auto-focus to avoid input blur issues on typing
    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                const [res, cres] = await Promise.all([
                    axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`),
                    axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`)
                ]);
                setProducts(res.data || []);
                const names = Array.isArray(cres?.data) ? cres.data.map((c) => String(c?.name || '')).filter(Boolean) : [];
                setCatRefs(Array.from(new Set(names.map(n => normCat(n)).filter(Boolean))));
            }
            catch (e) {
                setProducts([]);
                setCatRefs([]);
            }
            finally {
                setLoading(false);
            }
        }
        load();
    }, []);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('ff_user');
            if (raw) {
                const u = JSON.parse(raw);
                if (u && u.email)
                    setUser(u);
            }
        }
        catch { }
    }, []);
    useEffect(() => {
        const r = route || '/';
        const isAuthPage = r === '/login' || r === '/register';
        if (user?.role === 'admin' && isAuthPage) {
            go('/admin');
        }
    }, [user, route]);
    function slugify(name) {
        return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    function slugifyName(name) {
        return (name || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    function localVariants(name, id) {
        const s = slugifyName(name);
        const v = [];
        if (s)
            v.push(`/images/${s}.webp`, `/images/${s}.jpg`, `/images/${s}.png`, `/images/${s}.jpeg`);
        if (id)
            v.push(`/images/${id}.webp`, `/images/${id}.jpg`, `/images/${id}.png`, `/images/${id}.jpeg`);
        return v;
    }
    function categoryOf(name) {
        const n = (name || '').toLowerCase();
        if (/pizza/.test(n))
            return 'Pizza';
        if (/burger|hamburger|cheeseburger/.test(n))
            return 'Burger';
        if (/sushi|nigiri|maki/.test(n))
            return 'Sushi';
        if (/spaghetti|pasta|lasagna/.test(n))
            return 'Pasta';
        if (/salad|caesar/.test(n))
            return 'Salad';
        if (/phở|pho|bún|bun|bánh mì|banh mi|cơm|com/.test(n))
            return 'Vietnamese';
        if (/ramen/.test(n))
            return 'Japanese';
        if (/taco|burrito/.test(n))
            return 'Mexican';
        if (/fries/.test(n))
            return 'Sides';
        if (/coke|soda|drink/.test(n))
            return 'Drinks';
        if (/steak/.test(n))
            return 'Steak';
        if (/chicken|gà|ga/.test(n))
            return 'Chicken';
        return 'Khác';
    }
    function normCat(c) {
        const t = (c || '').trim();
        if (!t)
            return t;
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    }
    function getImageUrl(p) {
        const name = (p.name || '').toLowerCase();
        const seed = encodeURIComponent(name.replace(/\s+/g, '-'));
        if (/pizza/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/pizza,food`;
        if (/burger|hamburger|cheeseburger/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/burger,fastfood`;
        if (/sushi|maki|nigiri/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/sushi,fish`;
        if (/salad|caesar/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/salad,vegetable`;
        if (/pasta|spaghetti|lasagna/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/pasta,italian`;
        if (/chicken|gà|ga|fried chicken|wings/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/chicken`;
        if (/ramen/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/ramen,noodle`;
        if (/taco|burrito/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/mexican,food`;
        if (/steak/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/steak,meat`;
        if (/coke|soda|drink|tea|milk/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/drink,beverage`;
        if (/rice|cơm|com|risotto|nasi/.test(name))
            return `https://loremflickr.com/seed/${seed}/640/360/rice,food`;
        // fallback deterministic
        return `https://picsum.photos/seed/${seed}/640/360`;
    }
    function imageFor(p, id) {
        const prodId = p?.id || id || '';
        const name = p?.name || '';
        const mapped = getMappedImage({ id: prodId, name });
        if (mapped)
            return mapped;
        const cat = getImageUrl({ id: prodId, name });
        if (cat)
            return cat;
        return p?.imageUrl || '';
    }
    function imageCandidates(p) {
        const locals = localVariants(p.name, p.id);
        const mapped = getMappedImage({ id: p.id, name: p.name }) || '';
        const explicit = p.imageUrl || '';
        const cat = getImageUrl({ id: p.id, name: p.name });
        const chain = [...locals, explicit, mapped, cat];
        return chain.filter(Boolean);
    }
    function removeAccents(s) {
        return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    }
    function normalizeAddressInput(addr) {
        let a = String(addr || '').trim();
        if (!a)
            return a;
        let x = removeAccents(a);
        // light cleanup only; do not force any city to keep nationwide compatibility
        x = x.replace(/\s{2,}/g, ' ').trim();
        if (!/vietnam/i.test(x))
            x = x + ', Vietnam';
        return x;
    }
    async function geocodeAddress(query) {
        const variants = [];
        const base = String(query || '').trim();
        if (base)
            variants.push(base);
        const norm = normalizeAddressInput(base);
        if (norm && norm !== base)
            variants.push(norm);
        const ascii = removeAccents(base);
        if (ascii && ascii !== base && ascii !== norm)
            variants.push(ascii);
        // Reordered variant to help Nominatim parse better
        const parts = base.split(',').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 3)
            variants.push(parts.slice(0, 2).join(' ') + ', ' + parts.slice(2).join(', '));
        // Strip leading housenumber token (e.g., "F1/12M,") to allow street-level match as fallback
        if (parts.length >= 2) {
            const first = parts[0];
            if (/^[a-z0-9][a-z0-9\/\-]{0,12}$/i.test(first)) {
                const noHouse = parts.slice(1).join(', ');
                if (noHouse && !variants.includes(noHouse))
                    variants.push(noHouse);
                const noHouseNorm = normalizeAddressInput(noHouse);
                if (noHouseNorm && !variants.includes(noHouseNorm))
                    variants.push(noHouseNorm);
            }
        }
        const bbox = '106.36,11.16,107.20,10.37'; // HCMC bias
        // Heuristic structured search for HCMC addresses (helps with formats like F1/12M Huong lo 80, Vinh Loc A, Binh Chanh)
        const lower = removeAccents(base).toLowerCase();
        const hasHousePattern = /\d/.test(lower) || /\//.test(lower);
        const qTokens = Array.from(new Set(lower.split(/[^a-z0-9]+/).filter(w => w.length >= 3)));
        function scoreDisplay(s) {
            const t = removeAccents(String(s || '')).toLowerCase();
            let sc = 0;
            if (/viet\s*nam/.test(t) || /vietnam/.test(t))
                sc += 1;
            // token coverage
            let matched = 0;
            for (const w of qTokens) {
                if (t.includes(w))
                    matched++;
            }
            sc += Math.min(matched, 6); // cap
            // house number expectation
            const tHasNum = /\d/.test(t);
            const tHasSlash = /\//.test(t);
            if (hasHousePattern) {
                if (tHasNum)
                    sc += 2;
                if (tHasSlash)
                    sc += 1;
            }
            return sc;
        }
        function sortByScore(list) {
            return list.slice().sort((a, b) => scoreDisplay(b.display_name) - scoreDisplay(a.display_name));
        }
        let street = undefined;
        let house = undefined;
        const structuredQueries = [];
        // Primary: TrackAsia (VN-wide)
        for (const q of variants) {
            try {
                if (TRACKASIA_KEY) {
                    const url = `https://maps.track-asia.com/api/v2/place/textsearch/json?language=vi&key=${encodeURIComponent(TRACKASIA_KEY)}&query=${encodeURIComponent(q)}&new_admin=true&include_old_admin=true`;
                    const r = await fetch(url, { method: 'GET' });
                    const data = await r.json();
                    const results = Array.isArray(data?.results) ? data.results : [];
                    let list = results.map((it) => ({ lat: Number(it?.geometry?.location?.lat), lon: Number(it?.geometry?.location?.lng), display_name: it?.formatted_address || it?.name }))
                        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
                    list = sortByScore(list);
                    if (list.length > 0)
                        return list;
                }
            }
            catch { }
        }
        for (const q of variants) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&limit=7&addressdetails=1&accept-language=vi,en&countrycodes=vn&q=${encodeURIComponent(q)}`;
                const r = await fetch(url, { method: 'GET' });
                const arr = await r.json();
                let list = (Array.isArray(arr) ? arr : []).filter((it) => it && it.lat && it.lon).map((it) => ({ lat: parseFloat(it.lat), lon: parseFloat(it.lon), display_name: it.display_name }));
                list = sortByScore(list);
                if (list.length > 0)
                    return list;
            }
            catch { }
        }
        // Try structured queries (currently empty; reserved for future structured calls)
        for (const qs of structuredQueries) {
            try {
                const url = `https://nominatim.openstreetmap.org/search?${qs}`;
                const r = await fetch(url, { method: 'GET' });
                const arr = await r.json();
                const list = sortByScore((Array.isArray(arr) ? arr : []).filter((it) => it && it.lat && it.lon).map((it) => ({ lat: parseFloat(it.lat), lon: parseFloat(it.lon), display_name: it.display_name })));
                if (list.length > 0)
                    return list;
            }
            catch { }
        }
        return [];
    }
    function pickRecommended(list, count = 9) {
        const seedStr = String(recoSeed);
        function score(id) {
            let h = 0;
            const s = seedStr;
            const t = id;
            const L = Math.max(s.length, t.length);
            for (let i = 0; i < L; i++) {
                const a = s.charCodeAt(i % s.length) || 0;
                const b = t.charCodeAt(i % t.length) || 0;
                h = (h * 31 + a + b) >>> 0;
            }
            return h;
        }
        return list.slice().sort((a, b) => score(a.id) - score(b.id)).slice(0, count);
    }
    function go(path) { window.location.hash = path; }
    function add(productId) {
        setCart(c => {
            const found = c.find(i => i.productId === productId);
            if (found)
                return c.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i);
            return [...c, { productId, qty: 1 }];
        });
    }
    function remove(productId) { setCart(c => c.filter(i => i.productId !== productId)); }
    function changeQty(productId, delta) { setCart(c => c.map(i => i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i)); }
    const subtotal = cart.reduce((sum, it) => {
        const p = products.find(px => px.id === it.productId);
        return sum + (p ? p.price * it.qty : 0);
    }, 0);
    async function submitAuth() {
        setAuthError(null);
        try {
            const email = emailRef.current?.value || authEmail;
            const pass = passwordRef.current?.value || authPassword;
            const name = nameRef.current?.value || authName;
            const phone = phoneRef.current?.value || authPhone;
            const address = addressRef.current?.value || authAddress;
            if (authMode === 'register') {
                if (!email || !pass) {
                    setAuthError('Vui lòng nhập email và mật khẩu');
                    return;
                }
                if (!agreeTerms) {
                    setAuthError('Bạn phải đồng ý với các điều khoản');
                    return;
                }
                await axios.post(`${USER_BASE.replace(/\/$/, '')}/register`, { email, password: pass, name });
            }
            const login = await axios.post(`${USER_BASE.replace(/\/$/, '')}/login`, { email, password: pass });
            const token = login.data.token;
            let me = null;
            try {
                const meResp = await axios.get(`${USER_BASE.replace(/\/$/, '')}/me`, { headers: { Authorization: `Bearer ${token}` } });
                me = meResp.data;
            }
            catch (e) { }
            const u = { id: me?.id || '', email, token, role: me?.role || 'user' };
            setUser(u);
            localStorage.setItem('ff_user', JSON.stringify(u));
            setAuthEmail('');
            setAuthPassword('');
            setAuthName('');
            setAuthPhone('');
            setAuthAddress('');
            if (u.role === 'admin')
                go('/admin');
            else
                go('/');
        }
        catch (e) {
            const status = e?.response?.status;
            const serverMsg = e?.response?.data?.error || e.message;
            let msg = serverMsg || 'Đăng nhập/Đăng ký thất bại';
            if (authMode === 'login') {
                if (status === 400 || status === 401)
                    msg = 'Tài khoản hoặc mật khẩu không đúng';
                else if (!status && /network/i.test(String(e?.message || '')))
                    msg = 'Tài khoản hoặc mật khẩu không đúng';
            }
            setAuthError(String(msg));
        }
    }
    async function verifyEmail() {
        setAuthError(null);
        try {
            const email = emailRef.current?.value || authEmail;
            if (!email) {
                setAuthError('Vui lòng nhập email');
                return;
            }
            const r = await axios.get(`${USER_BASE.replace(/\/$/, '')}/exists`, { params: { email } });
            const ok = !!(r?.data?.exists);
            if (ok) {
                setAuthEmail(email);
                setForgotStep('newpass');
            }
            else {
                setAuthError('Email không tồn tại');
            }
        }
        catch (e) {
            setAuthError('Email không tồn tại');
        }
    }
    async function resetPassword() {
        setAuthError(null);
        try {
            const email = emailRef.current?.value || authEmail;
            const np = newPassRef.current?.value || '';
            const cf = confirmPassRef.current?.value || '';
            if (!email || !np || !cf) {
                setAuthError('Vui lòng nhập đầy đủ');
                return;
            }
            if (np !== cf) {
                setAuthError('Mật khẩu mới không khớp');
                return;
            }
            await axios.post(`${USER_BASE.replace(/\/$/, '')}/reset`, { email, password: np });
            setForgotMode(false);
            setAuthPassword('');
            alert('Đặt lại mật khẩu thành công. Vui lòng đăng nhập.');
        }
        catch (e) {
            setAuthError(String(e?.response?.data?.error || e.message || 'Đặt lại mật khẩu thất bại'));
        }
    }
    function logout() {
        setUser(null);
        setCart([]);
        setLastOrder(null);
        try {
            localStorage.removeItem('ff_user');
        }
        catch (e) { }
        go('/');
    }
    async function place() {
        if (!user) {
            alert('Vui lòng đăng nhập hoặc đăng ký trước khi đặt hàng');
            go('/login');
            return;
        }
        const sName = shipNameRef.current?.value ?? shipName;
        const sPhone = shipPhoneRef.current?.value ?? shipPhone;
        const sAddress = shipAddressRef.current?.value ?? shipAddress;
        if (!sAddress.trim()) {
            alert('Vui lòng nhập địa chỉ giao hàng');
            return;
        }
        try {
            const headers = {};
            if (user?.token)
                headers.Authorization = `Bearer ${user.token}`;
            let latPayload = shipLat;
            let lngPayload = shipLng;
            if (!(typeof latPayload === 'number' && typeof lngPayload === 'number')) {
                const cands = await geocodeAddress(sAddress);
                if (cands[0]) {
                    latPayload = cands[0].lat;
                    lngPayload = cands[0].lon;
                    try {
                        setShipLat(latPayload);
                        setShipLng(lngPayload);
                    }
                    catch { }
                }
            }
            if (!(typeof latPayload === 'number' && typeof lngPayload === 'number')) {
                alert('Không xác định được vị trí giao hàng từ địa chỉ. Vui lòng bấm "Định vị" hoặc chọn điểm trên bản đồ (click hoặc kéo marker), rồi thử lại.');
                return;
            }
            const res = await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders`, {
                items: cart,
                shipping: { name: sName, phone: sPhone, address: sAddress, lat: latPayload, lng: lngPayload },
                payment: { method: paymentMethod },
                userEmail: user.email
            }, { headers });
            const order = res.data;
            setLastOrder(order);
            setCart([]);
            if (paymentMethod === 'VNPay') {
                try {
                    const pr = await axios.post(`${PAYMENT_BASE.replace(/\/$/, '')}/vnpay/create`, {
                        amount: Number(order?.total || 0),
                        orderId: order?.id
                    });
                    const url = pr?.data?.url;
                    if (url) {
                        window.location.href = url;
                        return;
                    }
                    else {
                        alert('Không tạo được liên kết VNPay, chuyển sang hoá đơn');
                    }
                }
                catch (e) {
                    alert('Tạo thanh toán VNPay thất bại: ' + (e?.response?.data?.error || e?.message || ''));
                }
            }
            go(`/bill/${order?.id || ''}`);
        }
        catch (e) {
            alert('Đặt hàng thất bại: ' + (e.response?.data?.error || e.message));
        }
    }
    function ProductList() {
        const catsProd = Array.from(new Set(products.map(p => normCat(p.category || categoryOf(p.name)))));
        const cats = Array.from(new Set([...(catRefs || []), ...catsProd]));
        let filtered = products.filter(p => (p.name || '').toLowerCase().includes(search.toLowerCase()));
        if (selectedCategory && selectedCategory !== 'Tất cả') {
            const want = normCat(selectedCategory);
            filtered = filtered.filter(p => normCat((p.category) || categoryOf(p.name)) === want);
        }
        const min = minPrice ? parseFloat(minPrice) : undefined;
        const max = maxPrice ? parseFloat(maxPrice) : undefined;
        if (typeof min === 'number' && !Number.isNaN(min))
            filtered = filtered.filter(p => (p.price || 0) >= min);
        if (typeof max === 'number' && !Number.isNaN(max))
            filtered = filtered.filter(p => (p.price || 0) <= max);
        if (inStockOnly)
            filtered = filtered.filter(p => (p.stock ?? 0) > 0);
        const noUserFilters = !search.trim() && (selectedCategory === 'Tất cả') && !minPrice && !maxPrice && !inStockOnly;
        let list = filtered;
        if (route === '/' && noUserFilters && !showAll) {
            list = pickRecommended(products, 9);
        }
        else {
            list = filtered.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return (_jsxs("div", { children: [route === '/' && (_jsxs("div", { className: "card", style: { marginBottom: 12 }, children: [_jsxs("div", { className: "filters", children: [_jsx("div", { className: "chips", children: ['Tất cả', ...cats].map(cat => (_jsx("button", { className: "chip" + (selectedCategory === cat ? ' active' : ''), onClick: () => setSelectedCategory(cat), children: cat }, cat))) }), _jsxs("div", { className: "range", children: [_jsx("input", { type: "text", className: "input", placeholder: "Gi\u00E1 min", inputMode: "decimal", defaultValue: minPrice, ref: minRef }), _jsx("input", { type: "text", className: "input", placeholder: "Gi\u00E1 max", inputMode: "decimal", defaultValue: maxPrice, ref: maxRef }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("input", { type: "checkbox", checked: inStockOnly, onChange: e => setInStockOnly(e.target.checked) }), " C\u00F2n h\u00E0ng"] }), _jsx("button", { className: "btn primary", onClick: () => { setMinPrice(minRef.current?.value || ''); setMaxPrice(maxRef.current?.value || ''); }, children: "\u00C1p d\u1EE5ng" }), _jsx("button", { className: "btn ghost", onClick: () => { setSelectedCategory('Tất cả'); setMinPrice(''); setMaxPrice(''); if (minRef.current)
                                                minRef.current.value = ''; if (maxRef.current)
                                                maxRef.current.value = ''; setInStockOnly(false); }, children: "Reset" })] })] }), route === '/' && noUserFilters && (_jsx("div", { style: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }, children: !showAll ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "loading", style: { padding: 0 }, children: "\u0110ang hi\u1EC3n th\u1ECB g\u1EE3i \u00FD h\u00F4m nay" }), _jsx("button", { className: "btn ghost", onClick: () => { const ns = (recoSeed + 1) % 100000; setRecoSeed(ns); try {
                                            localStorage.setItem('ff_reco_seed', String(ns));
                                        }
                                        catch { } }, children: "G\u1EE3i \u00FD kh\u00E1c" }), _jsx("button", { className: "btn ghost", onClick: () => setShowAll(true), children: "Xem t\u1EA5t c\u1EA3" })] })) : (_jsx("button", { className: "btn ghost", onClick: () => setShowAll(false), children: "Ch\u1EC9 hi\u1EC3n th\u1ECB g\u1EE3i \u00FD" })) }))] })), loading ? _jsx("div", { className: "loading", children: "\u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." }) : (list.length === 0 ? _jsx("div", { className: "loading", children: "Kh\u00F4ng t\u00ECm th\u1EA5y m\u00F3n ph\u00F9 h\u1EE3p" }) : (_jsx("div", { className: "products-grid", children: list.map(p => (_jsxs("div", { className: "product-card", children: [_jsxs("div", { className: "product-media", onClick: () => go(`/product/${p.id}`), style: { cursor: 'pointer' }, children: [_jsx("div", { className: "badge", children: normCat(p.category || categoryOf(p.name)) }), (() => { const c = imageCandidates(p); return _jsx(ImageWithPlaceholder, { src: c[0], srcList: c.slice(1), alt: p.name }, p.id); })()] }), _jsxs("div", { className: "product-body", children: [_jsx("div", { className: "product-name", children: p.name }), _jsxs("div", { className: "product-price", children: ["$", p.price.toFixed(2)] }), p.description && _jsx("div", { className: "product-desc", children: p.description }), _jsxs("div", { className: "product-actions", children: [_jsx("button", { className: "btn primary", onClick: () => add(p.id), children: "Th\u00EAm" }), _jsx("button", { className: "btn small", onClick: () => changeQty(p.id, +1), children: "+1" })] })] })] }, p.id))) })))] }));
    }
    function AuthPage() {
        return (_jsxs("div", { className: "auth-page", children: [_jsx("h2", { children: authMode === 'login' ? 'Đăng nhập' : 'Đăng ký' }), _jsxs("div", { className: "card", children: [authError && _jsx("div", { className: "error", children: authError }), authMode === 'login' && forgotMode ? (forgotStep === 'email' && (_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "Email" }), _jsx("input", { className: "input", placeholder: "email", type: "email", name: "email", inputMode: "email", autoComplete: "username", defaultValue: authEmail, ref: emailRef })] }))) : (_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "Email" }), _jsx("input", { className: "input", placeholder: "email", type: "email", name: "email", inputMode: "email", autoComplete: authMode === 'login' ? 'username' : 'email', defaultValue: authEmail, ref: emailRef })] })), authMode === 'register' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "H\u1ECD t\u00EAn" }), _jsx("input", { className: "input", placeholder: "h\u1ECD t\u00EAn", name: "name", autoComplete: "name", defaultValue: authName, ref: nameRef })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i" }), _jsx("input", { className: "input", placeholder: "s\u1ED1 \u0111i\u1EC7n tho\u1EA1i", type: "tel", name: "tel", inputMode: "tel", autoComplete: "tel", defaultValue: authPhone, ref: phoneRef })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("input", { className: "input", placeholder: "\u0111\u1ECBa ch\u1EC9", name: "street-address", autoComplete: "street-address", defaultValue: authAddress, ref: addressRef })] })] })), !(authMode === 'login' && forgotMode) && (_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "M\u1EADt kh\u1EA9u" }), _jsx("input", { className: "input", placeholder: "m\u1EADt kh\u1EA9u", type: "password", name: authMode === 'login' ? 'current-password' : 'new-password', autoComplete: authMode === 'login' ? 'current-password' : 'new-password', defaultValue: authPassword, ref: passwordRef })] })), authMode === 'login' && !forgotMode && (_jsx("div", { style: { marginBottom: 8 }, children: _jsx("button", { className: "btn ghost", onClick: () => { setAuthEmail(emailRef.current?.value || authEmail); setForgotMode(true); setForgotStep('email'); }, children: "Qu\u00EAn m\u1EADt kh\u1EA9u?" }) })), authMode === 'login' && forgotMode && forgotStep === 'email' && (_jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn primary", onClick: verifyEmail, children: "Ti\u1EBFp t\u1EE5c" }), _jsx("button", { className: "btn ghost", onClick: () => { setForgotMode(false); setForgotStep('email'); }, children: "Hu\u1EF7" })] })), authMode === 'login' && forgotMode && forgotStep === 'newpass' && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "M\u1EADt kh\u1EA9u m\u1EDBi" }), _jsx("input", { className: "input", type: "password", ref: newPassRef, placeholder: "m\u1EADt kh\u1EA9u m\u1EDBi" })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "Nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi" }), _jsx("input", { className: "input", type: "password", ref: confirmPassRef, placeholder: "nh\u1EADp l\u1EA1i m\u1EADt kh\u1EA9u m\u1EDBi" })] }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { className: "btn primary", onClick: resetPassword, children: "\u0110\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u" }), _jsx("button", { className: "btn ghost", onClick: () => { setForgotMode(false); setForgotStep('email'); }, children: "Hu\u1EF7" })] })] })), authMode === 'register' && (_jsx("div", { className: "form-row", children: _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }, children: [_jsx("input", { id: "agree-terms", type: "checkbox", checked: agreeTerms, onChange: e => setAgreeTerms(e.target.checked) }), _jsx("span", { children: "T\u00F4i \u0111\u1ED3ng \u00FD v\u1EDBi c\u00E1c \u0111i\u1EC1u kho\u1EA3n" })] }) })), !(authMode === 'login' && forgotMode) && (_jsx("div", { children: _jsx("button", { className: "btn primary", onClick: submitAuth, disabled: authMode === 'register' && !agreeTerms, children: authMode === 'login' ? 'Đăng nhập' : 'Đăng ký' }) })), authMode === 'register' && _jsx("div", { className: "required-fields", children: "* C\u00E1c tr\u01B0\u1EDDng b\u1EAFt bu\u1ED9c" })] })] }));
    }
    function BillPage({ id }) {
        const [order, setOrder] = useState(lastOrder && lastOrder?.id === id ? lastOrder : null);
        useEffect(() => {
            if (!order && id) {
                axios.get(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}`).then(r => setOrder(r.data)).catch(() => { });
            }
        }, [id]);
        useEffect(() => {
            if (!id)
                return;
            let es = null;
            try {
                es = new EventSource(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}/events`);
                es.addEventListener('status', (ev) => {
                    try {
                        const data = JSON.parse(ev.data || '{}');
                        setOrder((o) => ({ ...(o || {}), status: data.status }));
                    }
                    catch { }
                });
            }
            catch { }
            return () => { try {
                es && es.close();
            }
            catch { } };
        }, [id]);
        if (!order)
            return _jsx("div", { className: "page", children: _jsx("div", { className: "card", children: _jsx("div", { className: "loading", children: "\u0110ang t\u1EA3i \u0111\u01A1n h\u00E0ng..." }) }) });
        const items = order.items || [];
        const total = order.total || 0;
        return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "H\u00F3a \u0111\u01A1n" }), _jsxs("div", { className: "card", children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("div", { children: [_jsx("b", { children: "M\u00E3 \u0111\u01A1n:" }), " ", order.id] }), order.createdAt && _jsxs("div", { children: [_jsx("b", { children: "Th\u1EDDi gian:" }), " ", new Date(order.createdAt).toLocaleString()] }), order.status && _jsxs("div", { children: [_jsx("b", { children: "Tr\u1EA1ng th\u00E1i:" }), " ", order.status] }), _jsxs("div", { children: [_jsx("b", { children: "Ng\u01B0\u1EDDi nh\u1EADn:" }), " ", order.shippingName || order?.shipping?.name || shipName] }), _jsxs("div", { children: [_jsx("b", { children: "\u0110i\u1EC7n tho\u1EA1i:" }), " ", order.shippingPhone || order?.shipping?.phone || shipPhone] }), _jsxs("div", { children: [_jsx("b", { children: "\u0110\u1ECBa ch\u1EC9:" }), " ", order.shippingAddress || order?.shipping?.address || shipAddress] }), _jsxs("div", { children: [_jsx("b", { children: "Thanh to\u00E1n:" }), " ", (order.paymentMethod || order?.payment?.method || paymentMethod) === 'COD' ? 'COD (Thanh toán khi nhận hàng)' : 'VNPay'] })] }), _jsxs("div", { style: { marginTop: 12 }, children: [_jsx("div", { style: { fontWeight: 700, marginBottom: 8 }, children: "S\u1EA3n ph\u1EA9m" }), _jsx("ul", { style: { listStyle: 'none', padding: 0, margin: 0 }, children: items.map((it, idx) => {
                                        const p = products.find(px => px.id === it.productId);
                                        return (_jsxs("li", { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }, children: [_jsx("img", { src: imageFor(p, it.productId), style: { width: 70, height: 48, objectFit: 'cover', borderRadius: 8 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 600 }, children: p?.name || it.productId }), _jsxs("div", { style: { color: 'var(--muted)' }, children: ["SL: ", it.qty] })] }), _jsx("div", { style: { fontWeight: 600 }, children: p ? `$${(p.price * it.qty).toFixed(2)}` : '' })] }, idx));
                                    }) }), _jsxs("div", { style: { marginTop: 8, fontWeight: 700 }, children: ["T\u1ED5ng c\u1ED9ng: $", Number(total).toFixed(2)] })] }), _jsxs("div", { style: { marginTop: 12, display: 'flex', gap: 8 }, children: [_jsx("a", { className: "btn ghost", href: "#/", children: "V\u1EC1 trang ch\u1EE7" }), _jsx("a", { className: "btn primary", href: `#/track/${id}`, children: "Theo d\u00F5i \u0111\u01A1n h\u00E0ng" }), _jsx("a", { className: "btn ghost", href: "#/history", children: "L\u1ECBch s\u1EED" })] })] })] }));
    }
    function HistoryPage() {
        const [orders, setOrders] = useState([]);
        useEffect(() => {
            const email = user?.email || '';
            const url = `${ORDER_BASE.replace(/\/$/, '')}/orders` + (email ? `?email=${encodeURIComponent(email)}` : '');
            axios.get(url).then(r => {
                const data = r.data;
                const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
                setOrders(list || []);
            }).catch(() => setOrders([]));
        }, [user]);
        const esRef = useRef({});
        useEffect(() => {
            // attach SSE listeners per order to update status realtime
            const current = esRef.current || {};
            const activeIds = new Set(orders.map(o => o.id));
            // close removed
            for (const id of Object.keys(current)) {
                if (!activeIds.has(id)) {
                    try {
                        current[id].close();
                    }
                    catch { }
                    ;
                    delete current[id];
                }
            }
            // open new
            for (const o of orders) {
                if (!current[o.id]) {
                    try {
                        const es = new EventSource(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}/events`);
                        es.addEventListener('status', (ev) => {
                            try {
                                const data = JSON.parse(ev.data || '{}');
                                setOrders(prev => prev.map(px => px.id === o.id ? { ...px, status: data.status } : px));
                            }
                            catch { }
                        });
                        current[o.id] = es;
                    }
                    catch { }
                }
            }
            esRef.current = current;
            return () => {
                for (const id of Object.keys(current)) {
                    try {
                        current[id].close();
                    }
                    catch { }
                }
            };
        }, [orders]);
        return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "L\u1ECBch s\u1EED mua h\u00E0ng" }), _jsx("div", { className: "card", children: orders.length === 0 ? (_jsx("div", { className: "loading", children: "Ch\u01B0a c\u00F3 \u0111\u01A1n h\u00E0ng" })) : (_jsx("ul", { style: { listStyle: 'none', padding: 0, margin: 0 }, children: orders.map((o) => (_jsxs("li", { style: { padding: 8, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsxs("div", { style: { fontWeight: 600 }, children: ["\u0110\u01A1n #", o.id.slice(0, 6), " \u2022 $", Number(o.total).toFixed(2)] }), _jsxs("div", { style: { color: 'var(--muted)' }, children: [o.createdAt ? new Date(o.createdAt).toLocaleString() : '', " \u2022 ", o.paymentMethod || 'COD'] }), _jsxs("div", { style: { color: 'var(--muted)' }, children: ["\u0110\u1ECBa ch\u1EC9: ", o.shippingAddress || ''] })] }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("a", { className: "btn small ghost", href: `#/bill/${o.id}`, children: "H\u00F3a \u0111\u01A1n" }), _jsx("a", { className: "btn small primary", href: `#/track/${o.id}`, children: "Theo d\u00F5i" })] })] }, o.id))) })) })] }));
    }
    function StepBar({ status }) {
        const steps = [
            { key: 'to_rest', label: 'Điều drone tới nhà hàng', icon: '🚁' },
            { key: 'pickup', label: 'Bắt đầu lấy đồ ăn', icon: '🥡' },
            { key: 'ready', label: 'Chuẩn bị giao hàng', icon: '📦' },
            { key: 'shipping', label: 'Đang giao đồ ăn bằng drone', icon: '🚁' },
            { key: 'done', label: 'Đã giao đồ ăn tới nhà', icon: '🏠' }
        ];
        // map our service statuses to step index
        const map = {
            'Điều drone tới nhà hàng': 0,
            'Bắt đầu lấy đồ ăn': 1,
            'Chuẩn bị giao hàng': 2,
            'Đang giao đồ ăn bằng drone': 3,
            'Đã giao đồ ăn tới nhà': 4
        };
        const idx = typeof status === 'string' && status in map ? map[status] : 0;
        const progressPct = Math.max(0, Math.min(100, (idx / (steps.length - 1)) * 100));
        return (_jsxs("div", { className: "steps", children: [_jsx("div", { className: "rail", children: _jsx("div", { className: "fill", style: { width: `${progressPct}%` } }) }), steps.map((s, i) => (_jsxs("div", { className: `step${i < idx ? ' completed' : (i === idx ? ' active' : '')}`, children: [_jsx("div", { className: "circle", "aria-hidden": true, children: s.icon }), _jsx("div", { className: "label", children: s.label })] }, s.key)))] }));
    }
    function TrackPage({ id }) {
        const [order, setOrder] = useState(null);
        const mapRef = useRef(null);
        const markerRef = useRef(null);
        const routeRef = useRef(null);
        const stopMarkersRef = useRef([]);
        const stopsDataRef = useRef([]);
        const shownStopsRef = useRef(new Set());
        useEffect(() => {
            // init map immediately so user sees base map even before route events
            try {
                if (window.L && !mapRef.current) {
                    const L = window.L;
                    const center = [10.776889, 106.700806];
                    mapRef.current = L.map('trackmap').setView(center, 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current);
                }
            }
            catch { }
            axios.get(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}`).then(r => setOrder(r.data)).catch(() => { });
            let es = null;
            try {
                es = new EventSource(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}/events`);
                es.addEventListener('status', (ev) => {
                    try {
                        const data = JSON.parse(ev.data || '{}');
                        setOrder((o) => ({ ...(o || {}), status: data.status }));
                    }
                    catch { }
                });
                es.addEventListener('drone', (ev) => {
                    try {
                        const data = JSON.parse(ev.data || '{}');
                        if (!window.L)
                            return;
                        const L = window.L;
                        if (!mapRef.current) {
                            const center = [10.776889, 106.700806];
                            mapRef.current = L.map('trackmap').setView(center, 13);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current);
                        }
                        if (data.type === 'route' && Array.isArray(data.path)) {
                            const latlngs = data.path.map((p) => [p.lat, p.lng]);
                            if (data.append && routeRef.current) {
                                try {
                                    const existing = routeRef.current.getLatLngs() || [];
                                    const merged = existing.concat(latlngs.map((ll) => L.latLng(ll[0], ll[1])));
                                    routeRef.current.setLatLngs(merged);
                                }
                                catch {
                                    try {
                                        routeRef.current = L.polyline(latlngs, { color: '#7c3aed' }).addTo(mapRef.current);
                                    }
                                    catch { }
                                }
                            }
                            else {
                                if (routeRef.current) {
                                    try {
                                        mapRef.current.removeLayer(routeRef.current);
                                    }
                                    catch { }
                                }
                                routeRef.current = L.polyline(latlngs, { color: '#7c3aed' }).addTo(mapRef.current);
                                // reset shown stops when drawing a new route (pickup phase)
                                shownStopsRef.current = new Set();
                                // clear old stop markers
                                for (const m of stopMarkersRef.current) {
                                    try {
                                        mapRef.current.removeLayer(m);
                                    }
                                    catch { }
                                }
                                stopMarkersRef.current = [];
                            }
                            // fit bounds to new/updated route
                            try {
                                mapRef.current.fitBounds(routeRef.current.getBounds(), { padding: [20, 20] });
                            }
                            catch { }
                            // place or update stops markers if provided
                            if (Array.isArray(data.stops)) {
                                stopsDataRef.current = data.stops;
                                for (const m of stopMarkersRef.current) {
                                    try {
                                        mapRef.current.removeLayer(m);
                                    }
                                    catch { }
                                }
                                stopMarkersRef.current = [];
                                data.stops.forEach((s) => {
                                    try {
                                        const mk = L.marker([s.lat, s.lng]).addTo(mapRef.current);
                                        const html = `<div><strong>${(s.name || 'Nhà hàng')}</strong><div>${(s.address || '')}</div></div>`;
                                        mk.bindPopup(html);
                                        stopMarkersRef.current.push(mk);
                                    }
                                    catch { }
                                });
                            }
                            // ensure drone marker at start of the new segment
                            const head = latlngs[0];
                            if (head) {
                                if (!markerRef.current)
                                    markerRef.current = L.marker(head).addTo(mapRef.current);
                                else
                                    markerRef.current.setLatLng(head);
                            }
                        }
                        else if (data.type === 'pos' && typeof data.lat === 'number' && typeof data.lng === 'number') {
                            if (!markerRef.current) {
                                markerRef.current = window.L.marker([data.lat, data.lng]).addTo(mapRef.current);
                            }
                            else {
                                markerRef.current.setLatLng([data.lat, data.lng]);
                            }
                            // auto open popup when nearing a stop (once per stop)
                            try {
                                const pt = L.latLng(data.lat, data.lng);
                                const stops = stopsDataRef.current || [];
                                for (let i = 0; i < stops.length; i++) {
                                    if (shownStopsRef.current.has(i))
                                        continue;
                                    const s = stops[i];
                                    const d = pt.distanceTo(L.latLng(s.lat, s.lng));
                                    if (d < 200) { // within 200m
                                        shownStopsRef.current.add(i);
                                        const mk = stopMarkersRef.current[i];
                                        try {
                                            mk && mk.openPopup();
                                        }
                                        catch { }
                                        break;
                                    }
                                }
                            }
                            catch { }
                        }
                        else if (data.type === 'arrived') {
                            // nothing, user waits for admin to confirm delivered
                        }
                    }
                    catch { }
                });
            }
            catch { }
            return () => { try {
                es && es.close();
            }
            catch { } };
        }, [id]);
        return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "Theo d\u00F5i \u0111\u01A1n h\u00E0ng" }), _jsxs("div", { className: "card", children: [_jsx("div", { id: "trackmap", style: { width: '100%', height: 360, borderRadius: 12 } }), _jsx("div", { style: { marginTop: 12 }, children: _jsx(StepBar, { status: order?.status }) }), _jsx("div", { style: { marginTop: 8, display: 'flex', gap: 8 }, children: _jsx("a", { className: "btn ghost", href: `#/bill/${id}`, children: "Xem ho\u00E1 \u0111\u01A1n" }) })] })] }));
    }
    function RestaurantsPage() {
        const [list, setList] = useState([]);
        useEffect(() => { axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`).then(r => setList(r.data || [])).catch(() => setList([])); }, []);
        return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "Nh\u00E0 h\u00E0ng" }), _jsx("div", { className: "card", children: list.length === 0 ? _jsx("div", { className: "loading", children: "Ch\u01B0a c\u00F3 nh\u00E0 h\u00E0ng" }) : (_jsx("div", { className: "restaurants-grid", children: list.map(r => (_jsx("div", { className: "restaurant-card", children: _jsxs("div", { className: "restaurant-body", children: [_jsx("div", { className: "restaurant-name", children: r.name }), r.address && _jsx("div", { className: "restaurant-addr", children: r.address }), _jsx("div", { style: { marginTop: 10 }, children: _jsx("a", { className: "btn primary", href: `#/restaurant/${r.id}`, children: "Xem menu" }) })] }) }, r.id))) })) })] }));
    }
    function RestaurantDetailPage({ id }) {
        const [restaurant, setRestaurant] = useState(null);
        const [list, setList] = useState([]);
        useEffect(() => {
            axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${id}`).then(r => setRestaurant(r.data)).catch(() => setRestaurant(null));
            axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`).then(r => setList(r.data || [])).catch(() => setList([]));
        }, [id]);
        const items = list.filter((p) => (p.restaurantId || '') === id);
        return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: restaurant?.name || 'Nhà hàng' }), _jsxs("div", { className: "card", children: [restaurant?.address && _jsxs("div", { style: { marginBottom: 12, color: 'var(--muted)' }, children: ["\u0110\u1ECBa ch\u1EC9: ", restaurant.address] }), items.length === 0 ? _jsx("div", { className: "loading", children: "Nh\u00E0 h\u00E0ng ch\u01B0a c\u00F3 m\u00F3n" }) : (_jsx("div", { className: "products-grid", children: items.map(p => (_jsxs("div", { className: "product-card", children: [_jsxs("div", { className: "product-media", onClick: () => go(`/product/${p.id}`), style: { cursor: 'pointer' }, children: [_jsx("div", { className: "badge", children: normCat(p.category || categoryOf(p.name)) }), (() => { const c = imageCandidates(p); return _jsx(ImageWithPlaceholder, { src: c[0], srcList: c.slice(1), alt: p.name }, p.id); })()] }), _jsxs("div", { className: "product-body", children: [_jsx("div", { className: "product-name", children: p.name }), _jsxs("div", { className: "product-price", children: ["$", p.price.toFixed(2)] }), p.description && _jsx("div", { className: "product-desc", children: p.description }), _jsxs("div", { className: "product-actions", children: [_jsx("button", { className: "btn primary", onClick: () => add(p.id), children: "Th\u00EAm" }), _jsx("button", { className: "btn small", onClick: () => changeQty(p.id, +1), children: "+1" })] })] })] }, p.id))) }))] })] }));
    }
    function CartPage() {
        return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "Gi\u1ECF h\u00E0ng" }), _jsxs("div", { className: "card", children: [cart.length === 0 ? _jsx("div", { children: "Gi\u1ECF h\u00E0ng tr\u1ED1ng" }) : (_jsx("ul", { style: { listStyle: 'none', padding: 0 }, children: cart.map(it => {
                                const p = products.find(px => px.id === it.productId);
                                return (_jsxs("li", { style: { marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center' }, children: [_jsx("img", { src: imageFor(p, it.productId), style: { width: 90, height: 60, objectFit: 'cover', borderRadius: 6 } }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("div", { style: { fontWeight: 700 }, children: p?.name || it.productId }), _jsxs("div", { style: { color: 'var(--muted)' }, children: ["$", (p?.price || 0).toFixed(2)] })] }), _jsxs("div", { children: [_jsx("button", { className: "btn ghost small", onClick: () => changeQty(it.productId, -1), children: "-" }), _jsx("span", { style: { margin: '0 8px' }, children: it.qty }), _jsx("button", { className: "btn ghost small", onClick: () => changeQty(it.productId, +1), children: "+" }), _jsx("button", { className: "btn ghost small", onClick: () => remove(it.productId), style: { marginLeft: 8 }, children: "Xo\u00E1" })] })] }, it.productId));
                            }) })), _jsxs("div", { style: { marginTop: 12 }, children: [_jsxs("div", { style: { fontWeight: 700 }, children: ["T\u1EA1m t\u00EDnh: $", subtotal.toFixed(2)] }), _jsx("div", { style: { marginTop: 8 }, children: _jsx("button", { className: "btn primary", onClick: () => go('/checkout'), disabled: cart.length === 0, children: "Thanh to\u00E1n" }) })] })] })] }));
    }
    function CheckoutPage() {
        const mapRef = useRef(null);
        const markerRef = useRef(null);
        const [geoLoading, setGeoLoading] = useState(false);
        const [geoError, setGeoError] = useState(null);
        const [geoCands, setGeoCands] = useState([]);
        const [mapBoot, setMapBoot] = useState(0);
        const bootTimerRef = useRef(null);
        async function geocode(addr) {
            try {
                const q = (((addr ?? shipAddressRef.current?.value ?? shipAddress)) || '').trim();
                if (!q)
                    return;
                setGeoLoading(true);
                setGeoError(null);
                const list = await geocodeAddress(q);
                setGeoCands(list);
                if (list[0]) {
                    setShipLat(list[0].lat);
                    setShipLng(list[0].lon);
                }
                else {
                    setGeoError('Không tìm thấy vị trí phù hợp');
                }
            }
            catch (e) {
                setGeoError('Định vị thất bại');
            }
            finally {
                setGeoLoading(false);
            }
        }
        useEffect(() => {
            try {
                const TA = trackasiagl;
                if (!TA) {
                    return;
                }
                const hasLL = typeof shipLat === 'number' && typeof shipLng === 'number';
                if (!mapRef.current) {
                    const center = [hasLL ? shipLng : 106.700806, hasLL ? shipLat : 10.776889];
                    mapRef.current = new TA.Map({
                        container: 'shipmap',
                        style: `https://maps.track-asia.com/styles/v2/streets.json?key=${encodeURIComponent(TRACKASIA_KEY || 'a8da2e51d0a720ef81a1762860280f15fa')}`,
                        center,
                        zoom: hasLL ? 16 : 13
                    });
                    mapRef.current.on('click', (ev) => {
                        try {
                            const { lng, lat } = ev?.lngLat || {};
                            if (typeof lat === 'number' && typeof lng === 'number') {
                                setShipLat(lat);
                                setShipLng(lng);
                                if (markerRef.current)
                                    markerRef.current.setLngLat([lng, lat]);
                            }
                        }
                        catch { }
                    });
                }
                if (hasLL) {
                    if (!markerRef.current) {
                        markerRef.current = new TA.Marker({ draggable: true }).setLngLat([shipLng, shipLat]).addTo(mapRef.current);
                        markerRef.current.on('dragend', () => {
                            try {
                                const c = markerRef.current.getLngLat();
                                setShipLat(c.lat);
                                setShipLng(c.lng);
                            }
                            catch { }
                        });
                    }
                    else {
                        markerRef.current.setLngLat([shipLng, shipLat]);
                    }
                    if (mapRef.current && mapRef.current.flyTo) {
                        mapRef.current.flyTo({ center: [shipLng, shipLat], zoom: 16 });
                    }
                }
            }
            catch { }
            return () => { try {
                if (bootTimerRef.current) {
                    clearTimeout(bootTimerRef.current);
                    bootTimerRef.current = null;
                }
            }
            catch { } };
        }, [shipLat, shipLng, mapBoot]);
        return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "Thanh to\u00E1n" }), _jsxs("div", { className: "card", children: [_jsxs("div", { children: ["T\u1EA1m t\u00EDnh: $", subtotal.toFixed(2)] }), _jsxs("div", { className: "form-row", style: { marginTop: 12 }, children: [_jsx("label", { children: "H\u1ECD t\u00EAn ng\u01B0\u1EDDi nh\u1EADn" }), _jsx("input", { className: "input", placeholder: "Nguy\u1EC5n V\u0103n A", name: "name", autoComplete: "shipping name", defaultValue: shipName, ref: shipNameRef, onBlur: e => setShipName(e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "S\u1ED1 \u0111i\u1EC7n tho\u1EA1i" }), _jsx("input", { className: "input", placeholder: "09xx xxx xxx", type: "tel", inputMode: "tel", name: "tel", autoComplete: "shipping tel", defaultValue: shipPhone, ref: shipPhoneRef, onBlur: e => setShipPhone(e.target.value) })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "\u0110\u1ECBa ch\u1EC9 giao h\u00E0ng" }), _jsx("input", { className: "input", placeholder: "S\u1ED1 nh\u00E0, \u0111\u01B0\u1EDDng, ph\u01B0\u1EDDng/x\u00E3, qu\u1EADn/huy\u1EC7n, t\u1EC9nh/th\u00E0nh", name: "street-address", autoComplete: "shipping street-address", defaultValue: shipAddress, ref: shipAddressRef, onBlur: e => { setShipAddress(e.target.value); geocode(e.target.value); } })] }), _jsxs("div", { className: "form-row", style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("button", { className: "btn small", onClick: (e) => { e.preventDefault(); geocode(); }, children: "\u0110\u1ECBnh v\u1ECB" }), geoLoading && _jsx("div", { className: "loading", style: { padding: 0 }, children: "\u0110ang \u0111\u1ECBnh v\u1ECB..." }), geoError && _jsx("div", { className: "error", children: geoError })] }), _jsx("div", { style: { marginTop: 8 }, children: _jsx("div", { id: "shipmap", style: { width: '100%', height: 260, borderRadius: 12 } }) }), geoCands.length >= 1 && (_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "G\u1EE3i \u00FD" }), _jsx("ul", { style: { listStyle: 'none', padding: 0, margin: 0 }, children: geoCands.slice(0, 5).map((c, i) => (_jsx("li", { children: _jsx("a", { href: "#", onClick: (e) => { e.preventDefault(); setShipLat(c.lat); setShipLng(c.lon); try {
                                                if (markerRef.current && mapRef.current && mapRef.current.flyTo) {
                                                    markerRef.current.setLngLat([c.lon, c.lat]);
                                                    mapRef.current.flyTo({ center: [c.lon, c.lat], zoom: 16 });
                                                }
                                            }
                                            catch { } }, children: c.display_name || `${c.lat},${c.lon}` }) }, i))) })] })), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }), _jsxs("div", { style: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("input", { type: "radio", name: "payment", checked: paymentMethod === 'COD', onChange: () => setPaymentMethod('COD') }), " COD (Thanh to\u00E1n khi nh\u1EADn h\u00E0ng)"] }), _jsxs("label", { style: { display: 'flex', alignItems: 'center', gap: 6 }, children: [_jsx("input", { type: "radio", name: "payment", checked: paymentMethod === 'VNPay', onChange: () => setPaymentMethod('VNPay') }), " VNPay"] })] })] }), paymentMethod === 'VNPay' && (_jsx(_Fragment, {})), _jsx("div", { style: { marginTop: 12 }, children: _jsx("button", { className: "btn primary", onClick: place, disabled: cart.length === 0, children: "\u0110\u1EB7t h\u00E0ng" }) })] })] }));
    }
    function ProductDetail({ id }) {
        const p = products.find(px => px.id === id);
        if (!p)
            return _jsx("div", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y s\u1EA3n ph\u1EA9m" });
        const [rest, setRest] = useState(null);
        useEffect(() => {
            const rid = p?.restaurantId;
            if (rid) {
                axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${rid}`).then(r => setRest(r.data)).catch(() => setRest(null));
            }
            else {
                setRest(null);
            }
        }, [id]);
        return (_jsxs("div", { children: [_jsx("button", { className: "btn ghost", onClick: () => go('/'), children: "Quay l\u1EA1i" }), _jsx("h2", { children: p.name }), _jsx("div", { className: "product-hero", children: (() => { const c = imageCandidates(p); return _jsx(ImageWithPlaceholder, { src: c[0], srcList: c.slice(1), alt: p.name }); })() }), _jsxs("p", { children: ["Gi\u00E1: $", p.price.toFixed(2)] }), rest?.name && (_jsxs("p", { children: ["Nh\u00E0 h\u00E0ng: ", _jsx("a", { href: `#/restaurant/${rest.id}`, children: rest.name })] })), p.description && _jsx("p", { children: p.description }), _jsx("button", { className: "btn primary", onClick: () => add(p.id), children: "Th\u00EAm v\u00E0o gi\u1ECF" })] }));
    }
    return (_jsx("div", { children: _jsxs("div", { className: "app-container", children: [_jsxs("header", { className: "site-header", children: [_jsx("div", { className: "site-title", children: _jsx("span", { className: "logo", children: "FF" }) }), _jsxs("nav", { className: "nav-links", children: [_jsx("a", { href: "#/", children: "Trang ch\u1EE7" }), _jsx("a", { href: "#/restaurants", children: "Nh\u00E0 h\u00E0ng" }), _jsx("a", { href: "#/cart", children: "Gi\u1ECF h\u00E0ng" }), _jsx("a", { href: "#/history", children: "L\u1ECBch s\u1EED" }), user && user.role === 'admin' && _jsx("a", { href: "#/admin", children: "Admin" }), user ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "user-email", children: user.email }), _jsx("button", { className: "btn ghost small", onClick: logout, children: "\u0110\u0103ng xu\u1EA5t" })] })) : (_jsxs(_Fragment, { children: [_jsx("a", { href: "#/login", children: "\u0110\u0103ng nh\u1EADp" }), _jsx("a", { href: "#/register", children: "\u0110\u0103ng k\u00FD" })] }))] })] }), _jsx("div", { className: "hero", children: _jsxs("div", { className: "hero-content", children: [_jsx("h1", { children: "Ngon, nhanh, t\u1EADn n\u01A1i" }), _jsx("p", { children: "\u0110\u1EB7t m\u00F3n \u0103n y\u00EAu th\u00EDch v\u00E0 giao t\u1EADn nh\u00E0 trong t\u00EDch t\u1EAFc" }), route === '/' && (_jsx("div", { className: "hero-search", children: _jsx("input", { ref: searchRef, className: "input", placeholder: "T\u00ECm m\u00F3n \u0103n...", value: search, onChange: e => setSearch(e.target.value) }) }))] }) }), _jsx("main", { children: route.startsWith('/product/') ? (_jsx(ProductDetail, { id: route.split('/product/')[1] })) : route.startsWith('/bill/') ? (_jsx(BillPage, { id: route.split('/bill/')[1] })) : route.startsWith('/track/') ? (_jsx(TrackPage, { id: route.split('/track/')[1] })) : route === '/restaurants' ? (_jsx(RestaurantsPage, {})) : route.startsWith('/restaurant/') ? (_jsx(RestaurantDetailPage, { id: route.split('/restaurant/')[1] })) : route === '/history' ? (_jsx(HistoryPage, {})) : route === '/cart' ? (_jsx(CartPage, {})) : (route === '/login' || route === '/register') ? (_jsx(AuthPage, {})) : route === '/checkout' ? (_jsx(CheckoutPage, {})) : route === '/admin' ? (_jsx(Admin, {})) : route === '/admin/restaurants/new' ? (_jsx(AdminRestaurantCreate, {})) : route === '/admin/products/new' ? (_jsx(AdminProductCreate, {})) : (_jsx(ProductList, {})) })] }) }));
}
