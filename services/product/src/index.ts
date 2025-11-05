import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const app = express();
app.use(express.json());

// very small CORS middleware for browser-based frontend
app.use((req: any, res: any, next: any) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// simple upload endpoint: accepts field name 'file', stores into IMAGES_DIR, returns /images/<filename>
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: (error: any, destination: string) => void) => cb(null, IMAGES_DIR),
  filename: (req: any, file: any, cb: (error: any, filename: string) => void) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    const name = `${Date.now()}-${safe}`;
    cb(null, name);
  }
});
const upload = multer({ storage });
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const f: any = (req as any).file;
    if (!f) return res.status(400).json({ error: 'file required' });
    const out = {
      ok: true,
      filename: f.filename,
      path: `/images/${f.filename}`,
      size: f.size,
      mime: f.mimetype
    };
    appendLog({ route: '/upload', file: out });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// request logging middleware: log every incoming request body/headers/path
app.use((req: Request, res: Response, next: NextFunction) => {
  try {
    appendLog({ type: 'request', method: req.method, path: req.path, headers: req.headers, body: req.body });
  } catch (e) {
    console.error('request log failed', e);
  }
  next();
});

const PORT = process.env.PORT || 3002;
const prisma = new PrismaClient();
const LOG_PATH = process.env.DEBUG_LOG_PATH || '/tmp/product-debug.log';
const IMAGES_DIR = process.env.IMAGES_DIR || '/images';
try { fs.mkdirSync(IMAGES_DIR, { recursive: true }); } catch {}

function appendLog(entry: any) {
  try {
    const line = typeof entry === 'string' ? entry : JSON.stringify(entry);
    fs.appendFileSync(LOG_PATH, `${new Date().toISOString()} ${line}\n`);
  } catch (e) {
    console.error('failed to append log', e);
  }
}

app.post('/seed', async (req: Request, res: Response) => {
  const sample = [
    // Burger & Fast Food
    { name: 'Cheeseburger', price: 5.99, stock: 80, imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=60', description: 'Bánh burger bò phô mai thơm béo, nướng chín vừa, kèm rau tươi và sốt đặc biệt.' },
    { name: 'Double Burger', price: 7.99, stock: 60, imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=900&q=60', description: 'Burger hai lớp bò mọng nước, đậm đà hương vị, ăn kèm khoai tây chiên.' },
    { name: 'Fries', price: 2.49, stock: 200, imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=900&q=60', description: 'Khoai tây chiên vàng giòn bên ngoài, mềm bùi bên trong, rắc muối biển.' },
    { name: 'Coke Soda', price: 1.50, stock: 300, imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=900&q=60', description: 'Nước ngọt có ga mát lạnh, giải khát tức thì.' },

    // Pizza & Italian
    { name: 'Margherita Pizza', price: 8.99, stock: 60, imageUrl: 'https://images.unsplash.com/photo-1548365328-9f547fb0953c?auto=format&fit=crop&w=900&q=60', description: 'Pizza truyền thống Ý với sốt cà chua, mozzarella tươi và lá húng quế.' },
    { name: 'Pepperoni Pizza', price: 9.99, stock: 60, imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=60', description: 'Pizza pepperoni cay nhẹ, phủ phô mai kéo sợi hấp dẫn.' },
    { name: 'Hawaiian Pizza', price: 9.49, stock: 55, imageUrl: 'https://images.unsplash.com/photo-1548365327-8f1f2b33d8b1?auto=format&fit=crop&w=900&q=60', description: 'Vị ngọt của dứa kết hợp thịt nguội và phô mai béo ngậy.' },
    { name: 'Spaghetti Carbonara', price: 7.99, stock: 50, imageUrl: 'https://images.unsplash.com/photo-1521389508051-d7ffb5dc8bbf?auto=format&fit=crop&w=900&q=60', description: 'Mì Ý sốt trứng và phô mai pecorino, kèm thịt xông khói giòn.' },
    { name: 'Lasagna', price: 8.49, stock: 40, imageUrl: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5c25?auto=format&fit=crop&w=900&q=60', description: 'Lớp mì xếp xen kẽ sốt thịt cà chua, bechamel và phô mai nướng.' },

    // Japanese
    { name: 'Sushi Maki', price: 10.99, stock: 40, imageUrl: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=900&q=60', description: 'Cuộn sushi rong biển với cá tươi, cơm dẻo và rau củ giòn.' },
    { name: 'Nigiri Set', price: 12.99, stock: 35, imageUrl: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=60', description: 'Tuyển chọn nigiri cá hồi, cá ngừ và tôm tươi theo mùa.' },
    { name: 'Ramen Miso', price: 9.49, stock: 50, imageUrl: 'https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=900&q=60', description: 'Mì ramen nước dùng miso đậm đà, thịt heo char siu và trứng lòng đào.' },
    { name: 'Chicken Katsu', price: 8.49, stock: 45, imageUrl: 'https://images.unsplash.com/photo-1617692855027-7f14c7a19dfb?auto=format&fit=crop&w=900&q=60', description: 'Gà tẩm bột chiên xù giòn rụm, ăn kèm sốt tonkatsu.' },

    // Vietnamese
    { name: 'Phở Bò', price: 6.99, stock: 80, imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=60', description: 'Bánh phở mềm với nước dùng xương ngọt thanh, thịt bò tái nạm và rau thơm.' },
    { name: 'Bánh Mì Thịt', price: 3.49, stock: 120, imageUrl: 'https://images.unsplash.com/photo-1604908176997-4315800de8be?auto=format&fit=crop&w=900&q=60', description: 'Bánh mì Việt Nam giòn rụm, pate thơm béo, chả thịt và đồ chua.' },
    { name: 'Bún Bò Huế', price: 7.49, stock: 60, imageUrl: 'https://images.unsplash.com/photo-1593062096033-9a26b09456f5?auto=format&fit=crop&w=900&q=60', description: 'Sợi bún to với nước lèo cay nhẹ, giò heo và chả cua đặc trưng.' },
    { name: 'Cơm Tấm', price: 5.99, stock: 90, imageUrl: 'https://images.unsplash.com/photo-1617195737494-8c31fe6df024?auto=format&fit=crop&w=900&q=60', description: 'Cơm tấm hạt rời, sườn nướng, bì chả và mỡ hành thơm lừng.' },
    { name: 'Gỏi Cuốn', price: 4.49, stock: 110, imageUrl: 'https://images.unsplash.com/photo-1604908554054-5ccef72e99de?auto=format&fit=crop&w=900&q=60', description: 'Cuốn tôm thịt thanh mát với rau sống, bún và chấm mắm nêm/đậu phộng.' },
    { name: 'Bún Chả Hà Nội', price: 6.99, stock: 70, imageUrl: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=900&q=60', description: 'Thịt nướng than hoa thơm lừng ăn kèm bún tươi và nước chấm chua ngọt.' },
    { name: 'Bánh Xèo', price: 5.49, stock: 65, imageUrl: 'https://images.unsplash.com/photo-1625944525268-8f6fe57a19f9?auto=format&fit=crop&w=900&q=60', description: 'Bánh xèo vàng giòn nhân tôm thịt, ăn kèm rau sống và nước mắm.' },
    { name: 'Mì Quảng', price: 6.49, stock: 60, imageUrl: 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=900&q=60', description: 'Mì bản to với nước dùng sền sệt, tôm thịt, đậu phộng và bánh tráng.' },
    { name: 'Bò Kho Bánh Mì', price: 6.99, stock: 55, imageUrl: 'https://images.unsplash.com/photo-1625944525301-8c1f57a19f9c?auto=format&fit=crop&w=900&q=60', description: 'Bò kho mềm vị quế hồi cay nhẹ, chấm cùng bánh mì nóng giòn.' },
    { name: 'Hủ Tiếu Nam Vang', price: 6.49, stock: 70, imageUrl: 'https://images.unsplash.com/photo-1569718212165-3fefc33b1a5a?auto=format&fit=crop&w=900&q=60', description: 'Hủ tiếu nước trong ngọt thanh, tôm thịt trứng cút và tóp mỡ.' },

    // Mexican
    { name: 'Taco Bò', price: 3.99, stock: 100, imageUrl: 'https://images.unsplash.com/photo-1601050690597-9d43e6234943?auto=format&fit=crop&w=900&q=60', description: 'Taco vỏ ngô giòn, nhân bò xào gia vị Mexico, rau và phô mai.' },
    { name: 'Chicken Burrito', price: 6.99, stock: 70, imageUrl: 'https://images.unsplash.com/photo-1599974579688-8dbdd7a93f5f?auto=format&fit=crop&w=900&q=60', description: 'Burrito gà nướng, cơm Mexico, đậu đen và sốt pico de gallo.' },
    { name: 'Quesadilla', price: 5.99, stock: 70, imageUrl: 'https://images.unsplash.com/photo-1615873968403-89e72eb38c80?auto=format&fit=crop&w=900&q=60', description: 'Bánh tortilla kẹp phô mai tan chảy và thịt gà/bò nướng.' },

    // Chicken / Steak
    { name: 'Gà Rán', price: 6.49, stock: 100, imageUrl: 'https://images.unsplash.com/photo-1604908554049-1f1d2bcb1a8a?auto=format&fit=crop&w=900&q=60', description: 'Gà rán giòn rụm với lớp áo bột đậm vị, ăn kèm sốt cay/ ngọt.' },
    { name: 'Steak Bít-tết', price: 14.99, stock: 30, imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=60', description: 'Thăn bò nướng chín tới, sốt tiêu đen, khoai nghiền và rau củ áp chảo.' },

    // Thai / Asian
    { name: 'Pad Thai', price: 8.49, stock: 50, imageUrl: 'https://images.unsplash.com/photo-1600628421205-4f68a6f2ef14?auto=format&fit=crop&w=900&q=60', description: 'Mì xào chua ngọt kiểu Thái với tôm, đậu phộng và giá đỗ.' },
    { name: 'Cơm Chiên Dương Châu', price: 5.49, stock: 100, imageUrl: 'https://images.unsplash.com/photo-1590758036263-9f1b5d3b5a61?auto=format&fit=crop&w=900&q=60', description: 'Cơm chiên hạt rời, ngũ sắc với tôm, lạp xưởng và trứng.' },

    // Salad & Sides
    { name: 'Caesar Salad', price: 5.49, stock: 70, imageUrl: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b5?auto=format&fit=crop&w=900&q=60', description: 'Xà lách giòn với sốt Caesar, phô mai parmesan và bánh mì nướng.' },
    { name: 'Greek Salad', price: 5.99, stock: 65, imageUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=60', description: 'Salad kiểu Hy Lạp với phô mai feta, dưa chuột, cà chua và ô liu.' },

    // Drinks & Desserts
    { name: 'Trà Sữa Trân Châu', price: 3.49, stock: 150, imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31b?auto=format&fit=crop&w=900&q=60', description: 'Trà sữa Đài Loan béo thơm, trân châu dẻo dai.' },
    { name: 'Nước Cam Ép', price: 2.99, stock: 120, imageUrl: 'https://images.unsplash.com/photo-1571076172156-7a5b26f61f4a?auto=format&fit=crop&w=900&q=60', description: 'Nước cam nguyên chất vắt lạnh, giàu vitamin C.' },
    { name: 'Chè Ba Màu', price: 2.49, stock: 100, imageUrl: 'https://images.unsplash.com/photo-1604908553651-1e9ebcca40fe?auto=format&fit=crop&w=900&q=60', description: 'Chè truyền thống Việt Nam với đậu, thạch và nước cốt dừa.' },
  ];
  try {
    await prisma.product.deleteMany();
    const created = [] as any[];
    for (const p of sample) {
      const c = await prisma.product.create({ data: p as any });
      created.push(c);
    }
    res.json({ ok: true, products: created });
  } catch (e: any) {
    console.error('seed error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/products', async (req: Request, res: Response) => {
  try {
    const all = await prisma.product.findMany();
    res.json(all);
  } catch (e: any) {
    console.error('products error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const p = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!p) return res.status(404).json({ error: 'not found' });
    res.json(p);
  } catch (e: any) {
    console.error('product id error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.post('/products', async (req: Request, res: Response) => {
  try {
    const { name, price, stock, imageUrl, description, category } = req.body as any;
    const data: any = {
      name,
      price: Number(price),
      stock: Number(stock ?? 100),
      imageUrl: imageUrl || null,
      description: description || null,
      category: category || null,
    };
    const p = await prisma.product.create({ data });
    res.json(p);
  } catch (e: any) {
    console.error('create product error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.put('/products/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  try {
    const { name, price, stock, imageUrl, description, category } = req.body as any;
    const data: any = {}
    if (name !== undefined) data.name = name
    if (price !== undefined) data.price = Number(price)
    if (stock !== undefined) data.stock = Number(stock)
    if (imageUrl !== undefined) data.imageUrl = imageUrl
    if (description !== undefined) data.description = description
    if (category !== undefined) data.category = category
    const p = await prisma.product.update({ where: { id }, data })
    res.json(p)
  } catch (e: any) {
    console.error('update product error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

app.delete('/products/:id', async (req: Request, res: Response) => {
  const id = req.params.id
  try {
    await prisma.product.delete({ where: { id } })
    res.json({ ok: true })
  } catch (e: any) {
    console.error('delete product error', e);
    res.status(500).json({ error: e?.message || String(e) });
  }
});

// decrement endpoint used by Order service
app.post('/decrement', async (req: Request, res: Response) => {
  const { productId, qty } = req.body as { productId: string; qty: number };
  if (!productId || !qty) return res.status(400).json({ error: 'productId and qty required' });
  try {
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(404).json({ error: 'not found' });
    if (prod.stock < qty) return res.status(400).json({ error: 'insufficient stock' });
    const updated = await prisma.product.update({ where: { id: productId }, data: { stock: prod.stock - qty } });
    console.debug('decremented', { productId, qty, newStock: updated.stock });
    const out = { success: true, product: updated };
    appendLog({ route: '/decrement', req: { productId, qty }, res: out });
    res.json(out);
  } catch (e: any) {
    console.error('decrement error', e);
    const out = { success: false, error: e?.message || String(e) };
    appendLog({ route: '/decrement', req: { productId, qty }, res: out, error: e?.message || String(e) });
    res.status(500).json(out);
  }
});

// increment endpoint used by Order service for compensation (restore stock)
app.post('/increment', async (req: Request, res: Response) => {
  const { productId, qty } = req.body as { productId: string; qty: number };
  if (!productId || !qty) return res.status(400).json({ error: 'productId and qty required' });
  try {
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(404).json({ error: 'not found' });
    const updated = await prisma.product.update({ where: { id: productId }, data: { stock: prod.stock + qty } });
    console.debug('incremented', { productId, qty, newStock: updated.stock });
    const out = { success: true, product: updated };
    appendLog({ route: '/increment', req: { productId, qty }, res: out });
    res.json(out);
  } catch (e: any) {
    console.error('increment error', e);
    const out = { success: false, error: e?.message || String(e) };
    appendLog({ route: '/increment', req: { productId, qty }, res: out, error: e?.message || String(e) });
    res.status(500).json(out);
  }
});

// debug endpoint to read recent logs
app.get('/debug/logs', async (req: Request, res: Response) => {
  try {
    const tail = Number(req.query.tail) || 20000;
    const raw = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, 'utf8') : '';
    const out = raw.slice(-tail);
    res.set('content-type', 'text/plain').send(out);
  } catch (e: any) {
    res.status(500).send(String(e));
  }
});

app.listen(PORT, () => console.log(`Product service running on ${PORT}`));
