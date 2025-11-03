"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// allow CORS for browser-based frontend
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS')
        return res.sendStatus(200);
    next();
});
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const prisma = new client_1.PrismaClient();
app.post('/register', async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'email and password required' });
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing)
            return res.status(400).json({ error: 'email exists' });
        const hash = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma.user.create({ data: { email, password: hash, name } });
        res.json({ id: user.id, email: user.email, name: user.name });
    }
    catch (e) {
        console.error('Register error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: 'email and password required' });
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user)
            return res.status(401).json({ error: 'sai email hoặc mật khẩu' });
        const ok = await bcryptjs_1.default.compare(password, user.password);
        if (!ok)
            return res.status(401).json({ error: 'sai email hoặc mật khẩu' });
        const token = jsonwebtoken_1.default.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token });
    }
    catch (e) {
        console.error('Login error:', e);
        // hide internal errors (like missing DB table) from clients
        res.status(500).json({ error: 'Internal server error' });
    }
});
app.get('/me', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth)
        return res.status(401).json({ error: 'no token' });
    const token = auth.split(' ')[1];
    try {
        const payload = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user)
            return res.status(404).json({ error: 'not found' });
        res.json({ id: user.id, email: user.email, name: user.name });
    }
    catch (e) {
        res.status(401).json({ error: 'invalid token' });
    }
});
app.listen(PORT, () => console.log(`User service running on ${PORT}`));
