import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3003';
export default function App() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        async function load() {
            try {
                const p = await axios.get(`${API_BASE.replace(/\/$/, '')}/products`);
                setProducts(p.data);
            }
            catch (e) {
                console.error(e);
            }
            setLoading(false);
        }
        load();
    }, []);
    function getImageUrl(p) {
        // simple placeholder images using via.placeholder.com
        const seed = encodeURIComponent(p.name.replace(/\s+/g, '-').toLowerCase());
        return `https://via.placeholder.com/320x180.png?text=${seed}`;
    }
    function add(productId) {
        setCart(c => {
            const found = c.find(i => i.productId === productId);
            if (found)
                return c.map(i => i.productId === productId ? { ...i, qty: i.qty + 1 } : i);
            return [...c, { productId, qty: 1 }];
        });
    }
    function remove(productId) {
        setCart(c => c.filter(i => i.productId !== productId));
    }
    function changeQty(productId, delta) {
        setCart(c => c.map(i => i.productId === productId ? { ...i, qty: Math.max(1, i.qty + delta) } : i));
    }
    const subtotal = cart.reduce((sum, it) => {
        const p = products.find(px => px.id === it.productId);
        return sum + (p ? p.price * it.qty : 0);
    }, 0);
    async function place() {
        try {
            const res = await axios.post(`${API_BASE}/orders`, { items: cart });
            alert('Order placed: ' + JSON.stringify(res.data));
            setCart([]);
        }
        catch (e) {
            alert('Order failed: ' + (e.response?.data?.error || e.message));
        }
    }
    return (_jsxs("div", { style: { padding: 20, fontFamily: 'Arial, sans-serif' }, children: [_jsx("h1", { children: "FoodFast" }), _jsxs("div", { style: { display: 'flex', gap: 24 }, children: [_jsxs("div", { style: { flex: 2 }, children: [_jsx("h2", { children: "Products" }), loading ? _jsx("div", { className: "loading", children: "Loading products..." }) : (_jsx("div", { className: "products-grid", children: products.map(p => (_jsxs("div", { className: "product-card", children: [_jsx("div", { className: "product-media", children: _jsx("img", { src: getImageUrl(p), alt: p.name }) }), _jsxs("div", { className: "product-body", children: [_jsx("div", { className: "product-name", children: p.name }), _jsxs("div", { className: "product-price", children: ["$", p.price.toFixed(2)] }), _jsxs("div", { className: "product-actions", children: [_jsx("button", { className: "btn", onClick: () => add(p.id), children: "Add" }), _jsx("button", { className: "btn small", onClick: () => { setCart(c => { const found = c.find(i => i.productId === p.id); if (found)
                                                                return c.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i); return [...c, { productId: p.id, qty: 1 }]; }); }, children: "+1" })] })] })] }, p.id))) }))] }), _jsxs("div", { style: { flex: 1, borderLeft: '1px solid #eee', paddingLeft: 18 }, children: [_jsx("h2", { children: "Cart" }), cart.length === 0 ? _jsx("div", { children: "Cart is empty" }) : (_jsx("ul", { style: { listStyle: 'none', padding: 0 }, children: cart.map(it => {
                                    const p = products.find(px => px.id === it.productId);
                                    return (_jsx("li", { style: { marginBottom: 10 }, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx("div", { children: p?.name || it.productId }), _jsxs("div", { children: [_jsx("button", { onClick: () => changeQty(it.productId, -1), children: "-" }), _jsx("span", { style: { margin: '0 8px' }, children: it.qty }), _jsx("button", { onClick: () => changeQty(it.productId, +1), children: "+" }), _jsx("button", { onClick: () => remove(it.productId), style: { marginLeft: 8 }, children: "Remove" })] })] }) }, it.productId));
                                }) })), _jsxs("div", { style: { marginTop: 12 }, children: [_jsxs("div", { style: { fontWeight: 700 }, children: ["Subtotal: $", subtotal.toFixed(2)] }), _jsx("div", { style: { marginTop: 8 }, children: _jsx("button", { onClick: place, disabled: cart.length === 0, children: "Place order" }) })] })] })] })] }));
}
