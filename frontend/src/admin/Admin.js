import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
const PRODUCT_BASE = import.meta.env.VITE_PRODUCT_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3002';
const USER_BASE = import.meta.env.VITE_USER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const ORDER_BASE = import.meta.env.VITE_ORDER_BASE || import.meta.env.VITE_API_BASE || 'http://localhost:3003';
function val(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}
function fileOf(id) {
    const el = document.getElementById(id);
    const f = el && el.files && el.files[0];
    return f || null;
}
async function uploadImage(file) {
    const fd = new FormData();
    fd.append('file', file);
    const r = await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return r?.data?.path || '';
}
function useAuth() {
    const initial = (() => {
        try {
            const raw = localStorage.getItem('ff_user');
            if (raw) {
                const u = JSON.parse(raw);
                return { token: u?.token || '', role: u?.role || 'user', email: u?.email || '' };
            }
        }
        catch { }
        return { token: '', role: 'user', email: '' };
    })();
    const [token, setToken] = useState(initial.token);
    const [role, setRole] = useState(initial.role);
    const [email, setEmail] = useState(initial.email);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        try {
            const raw = localStorage.getItem('ff_user');
            if (raw) {
                const u = JSON.parse(raw);
                setToken(u?.token || '');
                setEmail(u?.email || '');
                setRole(u?.role || 'user');
            }
        }
        catch { }
    }, []);
    useEffect(() => {
        async function verify() {
            try {
                if (!token) {
                    setReady(true);
                    return;
                }
                const me = await axios.get(`${USER_BASE.replace(/\/$/, '')}/me`, { headers: { Authorization: `Bearer ${token}` } });
                if (me?.data) {
                    setRole(me.data.role || role);
                    setEmail(me.data.email || email);
                }
            }
            catch { }
            setReady(true);
        }
        verify();
    }, [token]);
    return { token, role, email, ready };
}
function Section({ title, children }) {
    return (_jsxs("div", { className: "card", style: { marginBottom: 16 }, children: [_jsx("h3", { style: { marginTop: 0 }, children: title }), children] }));
}
export function AdminProductCreate() {
    const { token, role, ready } = useAuth();
    const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
    const [restaurants, setRestaurants] = useState([]);
    const [categories, setCategories] = useState([]);
    const nameRef = useRef(null);
    const priceRef = useRef(null);
    const catRef = useRef(null);
    const restRef = useRef(null);
    const imgRef = useRef(null);
    const fileRef = useRef(null);
    const descRef = useRef(null);
    const stockRef = useRef(null);
    useEffect(() => {
        axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`).then(r => setRestaurants(r.data || [])).catch(() => setRestaurants([]));
        axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`).then(r => setCategories(r.data || [])).catch(() => setCategories([]));
    }, []);
    useEffect(() => {
        if (!ready)
            return;
        if (role !== 'admin') {
            window.location.hash = '/';
        }
    }, [ready, role]);
    async function submit() {
        const name = nameRef.current?.value?.trim() || '';
        const price = Number(priceRef.current?.value || 0);
        const category = catRef.current?.value || '';
        let imageUrl = imgRef.current?.value?.trim() || '';
        const description = descRef.current?.value?.trim() || '';
        const stock = Number(stockRef.current?.value || 100);
        const restaurantId = restRef.current?.value || '';
        if (!name || !price) {
            alert('Vui lòng nhập tên và giá');
            return;
        }
        try {
            const f = fileRef.current?.files && fileRef.current.files[0];
            if (f) {
                const up = await uploadImage(f);
                if (up)
                    imageUrl = up;
            }
        }
        catch { }
        await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/products`, { name, price, stock, imageUrl, description, category, restaurantId }, { headers });
        window.location.hash = '#/admin';
    }
    return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "Th\u00EAm s\u1EA3n ph\u1EA9m" }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "T\u00EAn" }), _jsx("input", { className: "input", placeholder: "T\u00EAn m\u00F3n", ref: nameRef, autoComplete: "off" })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "Gi\u00E1" }), _jsx("input", { className: "input", placeholder: "Gi\u00E1", inputMode: "decimal", ref: priceRef, autoComplete: "off" })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "Danh m\u1EE5c" }), _jsxs("select", { ref: catRef, defaultValue: "", children: [_jsx("option", { value: "", children: "-- ch\u1ECDn danh m\u1EE5c --" }), categories.map(c => _jsx("option", { value: c.name, children: c.name }, c.id))] })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "Nh\u00E0 h\u00E0ng" }), _jsxs("select", { ref: restRef, defaultValue: "", children: [_jsx("option", { value: "", children: "-- ch\u1ECDn nh\u00E0 h\u00E0ng --" }), restaurants.map(r => _jsx("option", { value: r.id, children: r.name }, r.id))] })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "\u1EA2nh (URL ho\u1EB7c /images/...)" }), _jsx("input", { className: "input", placeholder: "/images/pho-bo.jpg", ref: imgRef, autoComplete: "off" })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "T\u1EA3i \u1EA3nh" }), _jsx("input", { type: "file", accept: "image/*", ref: fileRef })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "M\u00F4 t\u1EA3" }), _jsx("input", { className: "input", placeholder: "M\u00F4 t\u1EA3 chi ti\u1EBFt", ref: descRef, autoComplete: "off" })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "T\u1ED3n kho" }), _jsx("input", { className: "input", placeholder: "100", inputMode: "numeric", ref: stockRef, autoComplete: "off" })] }), _jsxs("div", { style: { display: 'flex', gap: 8, marginTop: 8 }, children: [_jsx("button", { className: "btn", onClick: () => { window.location.hash = '#/admin'; }, children: "Quay l\u1EA1i" }), _jsx("button", { className: "btn primary", onClick: submit, children: "L\u01B0u" })] })] })] }));
}
export default function Admin() {
    const { token, role, ready } = useAuth();
    const headers = useMemo(() => token ? { Authorization: `Bearer ${token}` } : {}, [token]);
    const [tab, setTab] = useState('orders');
    const [products, setProducts] = useState([]);
    const [users, setUsers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [categories, setCategories] = useState([]);
    const [armed, setArmed] = useState({});
    const pNameRef = useRef(null);
    const pPriceRef = useRef(null);
    const pCategoryRef = useRef(null);
    const pImageRef = useRef(null);
    const pDescRef = useRef(null);
    const pStockRef = useRef(null);
    const pFileRef = useRef(null);
    const pRestaurantRef = useRef(null);
    // refs for Restaurants/Categories management
    const rNameRef = useRef(null);
    const rAddrRef = useRef(null);
    const rLatRef = useRef(null);
    const rLngRef = useRef(null);
    const cNameRef = useRef(null);
    useEffect(() => {
        if (!ready)
            return;
        if (role !== 'admin') {
            window.location.hash = '/';
        }
    }, [ready, role]);
    async function refreshProducts() {
        const r = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/products`);
        setProducts(r.data || []);
    }
    async function refreshRestaurants() {
        const r = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`);
        setRestaurants(r.data || []);
    }
    async function refreshCategories() {
        const r = await axios.get(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`);
        setCategories(r.data || []);
    }
    async function refreshUsers() {
        const r = await axios.get(`${USER_BASE.replace(/\/$/, '')}/users`, { headers });
        setUsers(r.data || []);
    }
    async function refreshOrders() {
        const r = await axios.get(`${ORDER_BASE.replace(/\/$/, '')}/orders`);
        setOrders(r.data || []);
    }
    useEffect(() => { refreshProducts(); refreshRestaurants(); refreshCategories(); }, []);
    useEffect(() => { if (role === 'admin')
        refreshUsers(); }, [role]);
    useEffect(() => { refreshOrders(); }, []);
    // Realtime updates for orders via SSE
    const esOrdersRef = useRef({});
    useEffect(() => {
        const current = esOrdersRef.current || {};
        const ids = new Set(orders.map(o => o.id));
        // close listeners for orders no longer listed
        for (const id of Object.keys(current)) {
            if (!ids.has(id)) {
                try {
                    current[id].close();
                }
                catch { }
                ;
                delete current[id];
            }
        }
        // attach listeners for new orders
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
                    es.addEventListener('deleted', () => {
                        setOrders(prev => prev.filter(px => px.id !== o.id));
                    });
                    current[o.id] = es;
                }
                catch { }
            }
        }
        esOrdersRef.current = current;
        return () => {
            for (const id of Object.keys(current)) {
                try {
                    current[id].close();
                }
                catch { }
            }
        };
    }, [orders]);
    async function addProduct() {
        const name = pNameRef.current?.value?.trim() || '';
        const price = Number(pPriceRef.current?.value || 0);
        const category = pCategoryRef.current?.value || '';
        let imageUrl = pImageRef.current?.value?.trim() || '';
        const description = pDescRef.current?.value?.trim() || '';
        const stock = Number(pStockRef.current?.value || 100);
        const restaurantId = pRestaurantRef.current?.value || '';
        if (!name || !price) {
            alert('Vui lòng nhập tên và giá');
            return;
        }
        try {
            const file = pFileRef.current?.files && pFileRef.current.files[0];
            if (file) {
                const path = await uploadImage(file);
                if (path)
                    imageUrl = path;
            }
        }
        catch { }
        await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/products`, { name, price, stock, imageUrl, description, category, restaurantId });
        await refreshProducts();
        if (pNameRef.current)
            pNameRef.current.value = '';
        if (pPriceRef.current)
            pPriceRef.current.value = '';
        if (pCategoryRef.current)
            pCategoryRef.current.value = '';
        if (pImageRef.current)
            pImageRef.current.value = '';
        if (pDescRef.current)
            pDescRef.current.value = '';
        if (pStockRef.current)
            pStockRef.current.value = '';
        if (pFileRef.current)
            pFileRef.current.value = '';
        if (pRestaurantRef.current)
            pRestaurantRef.current.value = '';
    }
    async function updateProduct(p) {
        const payload = {
            name: val(`p-name-${p.id}`),
            price: Number(val(`p-price-${p.id}`) || p.price),
            category: val(`p-category-${p.id}`),
            imageUrl: val(`p-image-${p.id}`),
            description: val(`p-desc-${p.id}`),
            stock: Number(val(`p-stock-${p.id}`) || p.stock),
        };
        try {
            const el = document.getElementById(`p-rest-${p.id}`);
            if (el)
                payload.restaurantId = el.value || null;
        }
        catch { }
        try {
            const f = fileOf(`p-file-${p.id}`);
            if (f) {
                const up = await uploadImage(f);
                if (up)
                    payload.imageUrl = up;
            }
        }
        catch { }
        await axios.put(`${PRODUCT_BASE.replace(/\/$/, '')}/products/${p.id}`, payload);
        await refreshProducts();
    }
    async function deleteProduct(id) {
        if (!confirm('Xoá sản phẩm này?'))
            return;
        await axios.delete(`${PRODUCT_BASE.replace(/\/$/, '')}/products/${id}`);
        await refreshProducts();
    }
    async function changeUserRole(u, role) {
        await axios.patch(`${USER_BASE.replace(/\/$/, '')}/users/${u.id}`, { role }, { headers });
        await refreshUsers();
    }
    async function updateUser(u) {
        const payload = {
            email: val(`u-email-${u.id}`),
            name: val(`u-name-${u.id}`),
        };
        const pw = val(`u-pass-${u.id}`);
        if (pw)
            payload.password = pw;
        await axios.patch(`${USER_BASE.replace(/\/$/, '')}/users/${u.id}`, payload, { headers });
        await refreshUsers();
    }
    async function deleteUser(id) {
        if (!confirm('Xoá tài khoản này?'))
            return;
        await axios.delete(`${USER_BASE.replace(/\/$/, '')}/users/${id}`, { headers });
        await refreshUsers();
    }
    async function updateOrderStatus(o, status) {
        await axios.patch(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}`, { status });
        await refreshOrders();
    }
    async function deleteOrder(id) {
        if (!confirm('Xoá đơn hàng này?'))
            return;
        await axios.delete(`${ORDER_BASE.replace(/\/$/, '')}/orders/${id}`);
        await refreshOrders();
    }
    return (_jsxs("div", { className: "page", children: [_jsx("h2", { children: "Admin" }), _jsx("div", { className: "card", style: { marginBottom: 12 }, children: _jsx("div", { className: "filters", style: { justifyContent: 'flex-start' }, children: _jsxs("div", { className: "chips", children: [_jsx("button", { className: `chip${tab === 'products' ? ' active' : ''}`, onClick: () => setTab('products'), children: "S\u1EA3n ph\u1EA9m" }), _jsx("button", { className: `chip${tab === 'users' ? ' active' : ''}`, onClick: () => setTab('users'), children: "Ng\u01B0\u1EDDi d\u00F9ng" }), _jsx("button", { className: `chip${tab === 'orders' ? ' active' : ''}`, onClick: () => setTab('orders'), children: "\u0110\u01A1n h\u00E0ng" }), _jsx("button", { className: `chip${tab === 'restaurants' ? ' active' : ''}`, onClick: () => setTab('restaurants'), children: "Nh\u00E0 h\u00E0ng" }), _jsx("button", { className: `chip${tab === 'categories' ? ' active' : ''}`, onClick: () => setTab('categories'), children: "Danh m\u1EE5c" })] }) }) }), tab === 'products' && (_jsxs(_Fragment, { children: [_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }, children: _jsx("a", { className: "btn primary", href: "#/admin/products/new", children: "Th\u00EAm" }) }), _jsx(Section, { title: "Danh s\u00E1ch s\u1EA3n ph\u1EA9m", children: _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "T\u00EAn" }), _jsx("th", { align: "left", children: "Gi\u00E1" }), _jsx("th", { align: "left", children: "Danh m\u1EE5c" }), _jsx("th", { align: "left", children: "Nh\u00E0 h\u00E0ng" }), _jsx("th", { align: "left", children: "T\u1ED3n" }), _jsx("th", { align: "left", children: "\u1EA2nh" }), _jsx("th", { align: "left", children: "M\u00F4 t\u1EA3" }), _jsx("th", { align: "left", children: "H\u00E0nh \u0111\u1ED9ng" })] }) }), _jsx("tbody", { children: products.map(p => {
                                            return (_jsxs("tr", { style: { borderTop: '1px solid var(--border)' }, children: [_jsx("td", { children: _jsx("input", { id: `p-name-${p.id}`, className: "input", defaultValue: p.name }) }), _jsx("td", { children: _jsx("input", { id: `p-price-${p.id}`, className: "input", defaultValue: String(p.price) }) }), _jsx("td", { children: _jsx("input", { id: `p-category-${p.id}`, className: "input", defaultValue: p.category || '' }) }), _jsx("td", { children: _jsxs("select", { id: `p-rest-${p.id}`, defaultValue: p.restaurantId || '', children: [_jsx("option", { value: "", children: "--" }), restaurants.map(r => _jsx("option", { value: r.id, children: r.name }, r.id))] }) }), _jsx("td", { children: _jsx("input", { id: `p-stock-${p.id}`, className: "input", defaultValue: String(p.stock) }) }), _jsxs("td", { children: [_jsx("input", { id: `p-image-${p.id}`, className: "input", defaultValue: p.imageUrl || '' }), _jsx("div", { style: { marginTop: 6 }, children: _jsx("input", { id: `p-file-${p.id}`, type: "file", accept: "image/*" }) })] }), _jsx("td", { children: _jsx("input", { id: `p-desc-${p.id}`, className: "input", defaultValue: p.description || '' }) }), _jsxs("td", { style: { whiteSpace: 'nowrap' }, children: [_jsx("button", { className: "btn small", onClick: () => updateProduct(p), children: "L\u01B0u" }), _jsx("button", { className: "btn small ghost", onClick: () => deleteProduct(p.id), style: { marginLeft: 6 }, children: "Xo\u00E1" })] })] }, p.id));
                                        }) })] }) }) })] })), tab === 'users' && (_jsx(Section, { title: "Danh s\u00E1ch ng\u01B0\u1EDDi d\u00F9ng", children: _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "Email" }), _jsx("th", { align: "left", children: "T\u00EAn" }), _jsx("th", { align: "left", children: "Quy\u1EC1n" }), _jsx("th", { align: "left", children: "M\u1EADt kh\u1EA9u m\u1EDBi" }), _jsx("th", { align: "left", children: "H\u00E0nh \u0111\u1ED9ng" })] }) }), _jsx("tbody", { children: users.map(u => {
                                    return (_jsxs("tr", { style: { borderTop: '1px solid var(--border)' }, children: [_jsx("td", { children: _jsx("input", { id: `u-email-${u.id}`, className: "input", defaultValue: u.email }) }), _jsx("td", { children: _jsx("input", { id: `u-name-${u.id}`, className: "input", defaultValue: u.name || '' }) }), _jsx("td", { children: _jsxs("select", { value: u.role, onChange: e => changeUserRole(u, e.target.value), children: [_jsx("option", { value: "user", children: "user" }), _jsx("option", { value: "admin", children: "admin" })] }) }), _jsx("td", { children: _jsx("input", { id: `u-pass-${u.id}`, className: "input", placeholder: "(tu\u1EF3 ch\u1ECDn)", type: "password" }) }), _jsxs("td", { style: { whiteSpace: 'nowrap' }, children: [_jsx("button", { className: "btn small", onClick: () => updateUser(u), children: "L\u01B0u" }), _jsx("button", { className: "btn small ghost", onClick: () => deleteUser(u.id), style: { marginLeft: 6 }, children: "Xo\u00E1" })] })] }, u.id));
                                }) })] }) }) })), tab === 'orders' && (_jsx(Section, { title: "Danh s\u00E1ch \u0111\u01A1n h\u00E0ng", children: _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "M\u00E3 \u0111\u01A1n" }), _jsx("th", { align: "left", children: "Email" }), _jsx("th", { align: "left", children: "Th\u1EDDi gian" }), _jsx("th", { align: "left", children: "T\u1ED5ng" }), _jsx("th", { align: "left", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { align: "left", children: "H\u00E0nh \u0111\u1ED9ng" })] }) }), _jsx("tbody", { children: orders.map(o => (_jsxs("tr", { style: { borderTop: '1px solid var(--border)' }, children: [_jsx("td", { children: o.id.slice(0, 6) }), _jsx("td", { children: o.userEmail || '' }), _jsx("td", { children: o.createdAt ? new Date(o.createdAt).toLocaleString() : '' }), _jsxs("td", { children: ["$", Number(o.total || 0).toFixed(2)] }), _jsx("td", { children: _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx("span", { className: "badge", children: o.status || '' }), _jsx("button", { className: "btn small", style: { background: (armed[o.id] ? 'var(--accent)' : ''), color: (armed[o.id] ? '#fff' : '') }, onClick: async () => { const next = !armed[o.id]; if (next) {
                                                            try {
                                                                await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}/drone/arm`);
                                                            }
                                                            catch { }
                                                        } setArmed(a => ({ ...a, [o.id]: next })); }, title: "B\u1EADt/t\u1EAFt drone", children: "\uD83D\uDEF8" }), _jsx("button", { className: "btn small primary", disabled: !armed[o.id], onClick: async () => { await axios.post(`${ORDER_BASE.replace(/\/$/, '')}/orders/${o.id}/drone/start`); }, children: "B\u1EAFt \u0111\u1EA7u drone" }), _jsx("button", { className: "btn small", onClick: () => updateOrderStatus(o, 'Đã giao đồ ăn tới nhà'), children: "X\u00E1c nh\u1EADn \u0111\u00E3 giao" }), _jsx("a", { className: "btn small ghost", href: `#/track/${o.id}`, children: "Theo d\u00F5i" })] }) }), _jsx("td", { style: { whiteSpace: 'nowrap' }, children: _jsx("button", { className: "btn small ghost", onClick: () => deleteOrder(o.id), children: "Xo\u00E1" }) })] }, o.id))) })] }) }) })), tab === 'restaurants' && (_jsxs(_Fragment, { children: [_jsxs(Section, { title: "Th\u00EAm nh\u00E0 h\u00E0ng", children: [_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "T\u00EAn" }), _jsx("input", { className: "input", placeholder: "T\u00EAn nh\u00E0 h\u00E0ng", ref: rNameRef })] }), _jsxs("div", { className: "form-row", children: [_jsx("label", { children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("input", { className: "input", placeholder: "\u0110\u1ECBa ch\u1EC9", ref: rAddrRef })] }), _jsxs("div", { className: "form-row", style: { display: 'flex', gap: 8 }, children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Lat" }), _jsx("input", { className: "input", placeholder: "10.77", ref: rLatRef })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Lng" }), _jsx("input", { className: "input", placeholder: "106.69", ref: rLngRef })] })] }), _jsx("button", { className: "btn primary", onClick: async () => { const name = rNameRef.current?.value || ''; if (!name) {
                                    alert('Nhập tên');
                                    return;
                                } const address = rAddrRef.current?.value || ''; const lat = Number(rLatRef.current?.value || ''); const lng = Number(rLngRef.current?.value || ''); await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants`, { name, address, lat: isNaN(lat) ? undefined : lat, lng: isNaN(lng) ? undefined : lng }); await refreshRestaurants(); if (rNameRef.current)
                                    rNameRef.current.value = ''; if (rAddrRef.current)
                                    rAddrRef.current.value = ''; if (rLatRef.current)
                                    rLatRef.current.value = ''; if (rLngRef.current)
                                    rLngRef.current.value = ''; }, children: "Th\u00EAm" })] }), _jsx(Section, { title: "G\u00E1n m\u00F3n v\u00E0o nh\u00E0 h\u00E0ng", children: _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center' }, children: [_jsx("button", { className: "btn", onClick: async () => {
                                        try {
                                            await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/assign-restaurants`);
                                            await refreshProducts();
                                            alert('Đã gán tất cả món vào các nhà hàng (vòng tròn).');
                                        }
                                        catch (e) {
                                            alert('Thất bại: ' + (e?.response?.data?.error || e?.message));
                                        }
                                    }, children: "G\u00E1n t\u1EA5t c\u1EA3 m\u00F3n" }), _jsx("div", { className: "loading", style: { padding: 0 }, children: "Y\u00EAu c\u1EA7u \u0111\u00E3 c\u00F3 nh\u00E0 h\u00E0ng \u0111\u01B0\u1EE3c t\u1EA1o/seed tr\u01B0\u1EDBc \u0111\u00F3." })] }) }), _jsx(Section, { title: "Danh s\u00E1ch nh\u00E0 h\u00E0ng", children: _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "T\u00EAn" }), _jsx("th", { align: "left", children: "\u0110\u1ECBa ch\u1EC9" }), _jsx("th", { align: "left", children: "To\u1EA1 \u0111\u1ED9" }), _jsx("th", { align: "left", children: "H\u00E0nh \u0111\u1ED9ng" })] }) }), _jsx("tbody", { children: restaurants.map(r => (_jsxs("tr", { style: { borderTop: '1px solid var(--border)' }, children: [_jsx("td", { children: _jsx("input", { id: `r-name-${r.id}`, className: "input", defaultValue: r.name }) }), _jsx("td", { children: _jsx("input", { id: `r-addr-${r.id}`, className: "input", defaultValue: r.address || '' }) }), _jsxs("td", { style: { display: 'flex', gap: 6 }, children: [_jsx("input", { id: `r-lat-${r.id}`, className: "input", defaultValue: String(r.lat ?? '') }), _jsx("input", { id: `r-lng-${r.id}`, className: "input", defaultValue: String(r.lng ?? '') })] }), _jsxs("td", { children: [_jsx("button", { className: "btn small", onClick: async () => { const payload = { name: val(`r-name-${r.id}`), address: val(`r-addr-${r.id}`) }; const latV = parseFloat(val(`r-lat-${r.id}`)); if (!isNaN(latV))
                                                                payload.lat = latV; const lngV = parseFloat(val(`r-lng-${r.id}`)); if (!isNaN(lngV))
                                                                payload.lng = lngV; await axios.put(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${r.id}`, payload); await refreshRestaurants(); }, children: "L\u01B0u" }), _jsx("button", { className: "btn small ghost", style: { marginLeft: 6 }, onClick: async () => { if (!confirm('Xoá nhà hàng này?'))
                                                                return; await axios.delete(`${PRODUCT_BASE.replace(/\/$/, '')}/restaurants/${r.id}`); await refreshRestaurants(); }, children: "Xo\u00E1" })] })] }, r.id))) })] }) }) })] })), tab === 'categories' && (_jsxs(_Fragment, { children: [_jsxs(Section, { title: "Th\u00EAm danh m\u1EE5c", children: [_jsxs("div", { className: "form-row", children: [_jsx("label", { children: "T\u00EAn danh m\u1EE5c" }), _jsx("input", { className: "input", placeholder: "V\u00ED d\u1EE5: Vietnamese", ref: cNameRef })] }), _jsx("button", { className: "btn primary", onClick: async () => { const name = cNameRef.current?.value?.trim() || ''; if (!name) {
                                    alert('Nhập tên danh mục');
                                    return;
                                } await axios.post(`${PRODUCT_BASE.replace(/\/$/, '')}/categories`, { name }); await refreshCategories(); if (cNameRef.current)
                                    cNameRef.current.value = ''; }, children: "Th\u00EAm" })] }), _jsx(Section, { title: "Danh s\u00E1ch danh m\u1EE5c", children: _jsx("div", { style: { overflowX: 'auto' }, children: _jsxs("table", { style: { width: '100%', borderCollapse: 'collapse' }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { align: "left", children: "T\u00EAn" }), _jsx("th", { align: "left", children: "H\u00E0nh \u0111\u1ED9ng" })] }) }), _jsx("tbody", { children: categories.map(c => (_jsxs("tr", { style: { borderTop: '1px solid var(--border)' }, children: [_jsx("td", { children: c.name }), _jsx("td", { children: _jsx("button", { className: "btn small ghost", onClick: async () => { if (!confirm('Xoá danh mục này?'))
                                                            return; await axios.delete(`${PRODUCT_BASE.replace(/\/$/, '')}/categories/${c.id}`); await refreshCategories(); }, children: "Xo\u00E1" }) })] }, c.id))) })] }) }) })] }))] }));
}
