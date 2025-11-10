import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(express.json());

// allow CORS for browser-based frontend
app.use((req: any, res: any, next: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

const prisma = new PrismaClient();

async function ensureAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@foodfast.local';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'Administrator';
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const hash = await bcrypt.hash(password, 10);
      await prisma.user.create({ data: { email, password: hash, name, role: 'admin' } });
      console.log(`Seeded admin account: ${email}`);
    }
  } catch (e) {
    console.error('ensureAdmin failed', e);
  }
}

function auth(req: Request & { authUser?: any }, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const token = auth.split(' ')[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    req.authUser = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

async function requireAdmin(req: Request & { authUser?: any }, res: Response, next: NextFunction) {
  try {
    const uid = req.authUser?.sub;
    if (!uid) return res.status(401).json({ error: 'unauthorized' });
    const u = await prisma.user.findUnique({ where: { id: uid } });
    if (!u || u.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    next();
  } catch (e) {
    res.status(401).json({ error: 'unauthorized' });
  }
}

app.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'email exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hash, name } });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e: any) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'sai email hoặc mật khẩu' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'sai email hoặc mật khẩu' });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (e: any) {
    console.error('Login error:', e);
    // hide internal errors (like missing DB table) from clients
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/reset', async (req: Request, res: Response) => {
  const { email, password } = req.body as any;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'not found' });
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { email }, data: { password: hash } });
  res.json({ ok: true });
});

app.get('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const token = auth.split(' ')[1];
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e: any) {
    res.status(401).json({ error: 'invalid token' });
  }
});

app.get('/users', auth, requireAdmin, async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, createdAt: u.createdAt })));
});

app.patch('/users/:id', auth, requireAdmin, async (req: Request, res: Response) => {
  const id = (req.params as any).id as string;
  const { email, password, name, role } = req.body as any;
  const data: any = {};
  if (email) data.email = email;
  if (name !== undefined) data.name = name;
  if (role) data.role = role;
  if (password) data.password = await bcrypt.hash(password, 10);
  const u = await prisma.user.update({ where: { id }, data });
  res.json({ id: u.id, email: u.email, name: u.name, role: u.role });
});

app.delete('/users/:id', auth, requireAdmin, async (req: Request, res: Response) => {
  const id = (req.params as any).id as string;
  await prisma.user.delete({ where: { id } });
  res.json({ ok: true });
});

ensureAdmin().then(() => console.log('Admin account ensured')).catch(() => {});
app.listen(PORT, () => console.log(`User service running on ${PORT}`));
