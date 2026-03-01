import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'inventory-secret-key';

const db = new Database('inventory.db');

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK(category IN ('CYLINDER', 'PAINT', 'STEEL')) NOT NULL,
    stock_unit TEXT NOT NULL,
    allow_direct_edit BOOLEAN NOT NULL,
    status TEXT, -- CYLINDER: normal | damaged
    volume_per_can REAL, -- PAINT
    specification TEXT, -- STEEL
    current_stock REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    type TEXT CHECK(type IN ('IN', 'OUT', 'EXCHANGE', 'ADJUSTMENT', 'DIRECT_EDIT')) NOT NULL,
    quantity REAL NOT NULL,
    notes TEXT,
    photo_url TEXT,
    signature_url TEXT,
    user_name TEXT,
    ship_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(item_id) REFERENCES items(id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create default admin user if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash)
    VALUES (?, ?, ?, ?)
  `).run('user-1', 'admin', 'admin@example.com', hash);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  const getPaintUsageReport = (filters: { start_date?: any; end_date?: any; ship_name?: any }) => {
    let query = `
      SELECT 
        t.ship_name, 
        t.item_id, 
        i.name as item_name, 
        SUM(t.quantity) as total_cans_used, 
        (SUM(t.quantity) * i.volume_per_can) as total_liters_used
      FROM transactions t 
      JOIN items i ON t.item_id = i.id 
      WHERE i.category = 'PAINT' 
        AND t.type = 'OUT' 
        AND t.ship_name IS NOT NULL 
        AND t.ship_name != ''
    `;
    const params: any[] = [];

    if (filters.start_date) {
      query += ` AND date(t.created_at) >= date(?)`;
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ` AND date(t.created_at) <= date(?)`;
      params.push(filters.end_date);
    }
    if (filters.ship_name) {
      query += ` AND t.ship_name = ?`;
      params.push(filters.ship_name);
    }

    query += ` GROUP BY t.ship_name, t.item_id, i.name, i.volume_per_can`;
    query += ` ORDER BY t.ship_name ASC, i.name ASC`;

    return db.prepare(query).all(...params) as any[];
  };

  const getSteelUsageReport = (filters: {
    start_date?: any;
    end_date?: any;
    ship_name?: any;
    contractor_name?: any;
  }) => {
    let query = `
      SELECT
        t.item_id,
        i.name as item_name,
        i.stock_unit,
        SUM(t.quantity) as total_quantity_used
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE i.category = 'STEEL'
        AND t.type = 'OUT'
        AND t.ship_name IS NOT NULL
        AND t.ship_name != ''
        AND t.user_name IS NOT NULL
        AND t.user_name != ''
    `;

    const params: any[] = [];

    if (filters.ship_name && filters.ship_name !== 'all') {
      query += ` AND LOWER(t.ship_name) = LOWER(?)`;
      params.push(filters.ship_name);
    }

    if (filters.contractor_name && filters.contractor_name !== 'all') {
      query += ` AND LOWER(t.user_name) LIKE LOWER(?)`;
      params.push(`%${filters.contractor_name}%`);
    }

    if (filters.start_date) {
      query += ` AND date(t.created_at) >= date(?)`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND date(t.created_at) <= date(?)`;
      params.push(filters.end_date);
    }

    query += ` GROUP BY t.item_id, i.name, i.stock_unit`;
    query += ` ORDER BY i.name ASC`;

    return db.prepare(query).all(...params);
  };

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Auth Routes
  app.post('/api/auth/login', (req, res) => {
    const { username_or_email, password } = req.body;
    
    if (!username_or_email || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username_or_email, username_or_email) as any;
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: any, res: any) => {
    const user = db.prepare('SELECT id, username, email, is_active FROM users WHERE id = ?').get(req.user.id) as any;
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    res.json({ user });
  });

  // API Routes
  app.get('/api/items', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM items').all();
    res.json(items);
  });

  app.post('/api/items', requireAuth, (req, res) => {
    const { id, name, category, stock_unit, allow_direct_edit, status, volume_per_can, specification } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO items (id, name, category, stock_unit, allow_direct_edit, status, volume_per_can, specification)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, name, category, stock_unit, allow_direct_edit ? 1 : 0, status, volume_per_can, specification);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/transactions', requireAuth, (req, res) => {
    const { item_id, type, quantity, notes, user_name, ship_name, photos, signature } = req.body;
    
    const item = db.prepare('SELECT * FROM items WHERE id = ?').get(item_id) as any;
    if (!item) return res.status(404).json({ error: 'Item not found' });

    if (type === 'DIRECT_EDIT' && !item.allow_direct_edit) {
      return res.status(400).json({ error: 'Direct edit not allowed for this item' });
    }

    if (type === 'EXCHANGE' && item.category !== 'CYLINDER') {
      return res.status(400).json({ error: 'Exchange is only allowed for cylinders' });
    }

    if (item.category === 'PAINT' && !Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'Paint transactions must use whole cans only.' });
    }

    if (type === 'OUT' && (item.category === 'PAINT' || item.category === 'STEEL') && (!ship_name || String(ship_name).trim() === '')) {
      return res.status(400).json({ error: 'Nama kapal wajib diisi untuk transaksi keluar Cat dan Besi.' });
    }

    if (type === 'OUT' && Number(quantity) > Number(item.current_stock)) {
      return res.status(400).json({ error: `Stok tidak mencukupi. Stok saat ini: ${item.current_stock}.` });
    }

    if (item.category === 'CYLINDER') {
      const needEvidence = type === 'OUT' || type === 'EXCHANGE';

      if (needEvidence) {
        if (!photos || !Array.isArray(photos) || photos.length === 0) {
          return res.status(400).json({
            error: 'Foto dokumentasi wajib untuk tabung saat keluar atau tukar'
          });
        }

        if (!signature) {
          return res.status(400).json({
            error: 'Tanda tangan wajib untuk tabung saat keluar atau tukar'
          });
        }
      }
    }

    // Process files
    let photoUrls: string[] = [];
    if (photos && Array.isArray(photos)) {
      for (let i = 0; i < photos.length; i++) {
        if (photos[i].startsWith('data:image')) {
          const base64Data = photos[i].replace(/^data:image\/\w+;base64,/, '');
          const extMatch = photos[i].match(/^data:image\/(\w+);base64,/);
          const ext = extMatch ? extMatch[1] : 'png';
          const filename = `photo_${Date.now()}_${i}.${ext}`;
          const filepath = path.join(uploadsDir, filename);
          fs.writeFileSync(filepath, base64Data, 'base64');
          photoUrls.push(`/uploads/${filename}`);
        }
      }
    }

    let signatureUrl = null;
    if (signature && signature.startsWith('data:image')) {
      const base64Data = signature.replace(/^data:image\/\w+;base64,/, '');
      const filename = `signature_${Date.now()}.png`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, base64Data, 'base64');
      signatureUrl = `/uploads/${filename}`;
    }

    const photo_url_db = photoUrls.length > 0 ? JSON.stringify(photoUrls) : null;

    const transaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO transactions (item_id, type, quantity, notes, photo_url, signature_url, user_name, ship_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(item_id, type, quantity, notes, photo_url_db, signatureUrl, user_name, ship_name);

      let stockChange = 0;
      if (type === 'IN') stockChange = quantity;
      else if (type === 'OUT') stockChange = -quantity;
      else if (type === 'ADJUSTMENT') stockChange = quantity; // quantity can be negative
      else if (type === 'DIRECT_EDIT') {
        const diff = quantity - item.current_stock;
        stockChange = diff;
      }

      if (stockChange !== 0) {
        db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ?').run(stockChange, item_id);
      }
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/transactions', requireAuth, (req, res) => {
    const { start_date, end_date, item_id, category, transaction_type, report_type, ship_name } = req.query;
    
    if (report_type === 'paint_usage') {
      try {
        const report = getPaintUsageReport({ start_date, end_date, ship_name });
        return res.json(report);
      } catch (error: any) {
        return res.status(400).json({ error: error.message });
      }
    }

    let query = `
      SELECT t.*, i.name as item_name, i.category, i.stock_unit 
      FROM transactions t 
      JOIN items i ON t.item_id = i.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (start_date) {
      query += ` AND date(t.created_at) >= date(?)`;
      params.push(start_date);
    }
    if (end_date) {
      query += ` AND date(t.created_at) <= date(?)`;
      params.push(end_date);
    }
    if (item_id) {
      query += ` AND t.item_id = ?`;
      params.push(item_id);
    }
    if (category) {
      query += ` AND i.category = ?`;
      params.push(category);
    }
    if (transaction_type) {
      query += ` AND t.type = ?`;
      params.push(transaction_type);
    }

    query += ` ORDER BY t.created_at DESC`;

    try {
      const transactions = db.prepare(query).all(...params);
      res.json(transactions);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/reports/steel-usage', requireAuth, (req, res) => {
  const { ship_name, contractor_name, start_date, end_date } = req.query;

  if (!ship_name || !contractor_name) {
    return res.json([]);
  }

  const rows = getSteelUsageReport({
    ship_name,
    contractor_name,
    start_date,
    end_date
  });

  return res.json(rows);
  });

  app.get('/api/reports/stock-pdf', requireAuth, (req, res) => {
    const items = db.prepare('SELECT * FROM items').all() as any[];
    
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=stock-report.pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('PT NDS', { align: 'center' });
    doc.fontSize(14).text('Final Stock Report', { align: 'center' });
    doc.fontSize(10).text(`Report Period: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Table Header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('ID', 50, tableTop);
    doc.text('Name', 150, tableTop);
    doc.text('Category', 300, tableTop);
    doc.text('Stock', 400, tableTop);
    doc.text('Unit', 480, tableTop);
    
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Table Rows
    let y = tableTop + 25;
    doc.font('Helvetica');
    items.forEach(item => {
      if (y > 700) {
        doc.addPage();
        y = 50;
      }
      doc.text(item.id, 50, y);
      doc.text(item.name, 150, y);
      doc.text(item.category, 300, y);
      doc.text(item.current_stock.toString(), 400, y);
      doc.text(item.stock_unit, 480, y);
      y += 20;
    });

    // Footer
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Developed by rama | Print Date: ${new Date().toLocaleString()} | Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    doc.end();
  });

  app.get('/api/reports/paint-usage-pdf', requireAuth, (req, res) => {
    const { ship_name, start_date, end_date } = req.query;

    if (!ship_name || String(ship_name).trim() === '') {
      return res.status(400).json({ error: 'Parameter ship_name wajib diisi.' });
    }

    let report: any[] = [];
    try {
      report = getPaintUsageReport({ start_date, end_date, ship_name });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    if (report.length === 0) {
      return res.status(404).json({ error: 'Data penggunaan cat tidak ditemukan untuk kapal/periode yang dipilih.' });
    }

    const safeShipName = String(ship_name).replace(/[^a-z0-9-_]+/gi, '_');
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=paint-usage-${safeShipName}.pdf`);
    doc.pipe(res);

    const periodText = start_date && end_date
      ? `${start_date} s/d ${end_date}`
      : start_date
        ? `Mulai ${start_date}`
        : end_date
          ? `Sampai ${end_date}`
          : 'Semua Periode';

    doc.fontSize(20).text('PT NDS', { align: 'center' });
    doc.fontSize(14).text('Laporan Penggunaan Cat', { align: 'center' });
    doc.fontSize(10).text(`Nama Kapal: ${ship_name}`, { align: 'center' });
    doc.fontSize(10).text(`Periode: ${periodText}`, { align: 'center' });
    doc.moveDown(2);

    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Nama Cat', 50, tableTop);
    doc.text('Total Kaleng', 340, tableTop, { width: 90, align: 'right' });
    doc.text('Total Liter', 440, tableTop, { width: 100, align: 'right' });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica');
    report.forEach(row => {
      if (y > 700) {
        doc.addPage();
        y = 50;
        doc.font('Helvetica-Bold');
        doc.text('Nama Cat', 50, y);
        doc.text('Total Kaleng', 340, y, { width: 90, align: 'right' });
        doc.text('Total Liter', 440, y, { width: 100, align: 'right' });
        doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
        y += 25;
        doc.font('Helvetica');
      }

      doc.text(row.item_name, 50, y, { width: 280 });
      doc.text(String(row.total_cans_used), 340, y, { width: 90, align: 'right' });
      doc.text(Number(row.total_liters_used || 0).toFixed(2), 440, y, { width: 100, align: 'right' });
      y += 20;
    });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Developed by rama | Print Date: ${new Date().toLocaleString()} | Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    doc.end();
  });

  app.get('/api/reports/steel-usage-json', requireAuth, (req, res) => {
    const { ship_name, contractor_name, start_date, end_date } = req.query;

    if (!ship_name || String(ship_name).trim() === '') {
      return res.status(400).json({ error: 'Ship name is required' });
    }

    if (!contractor_name || String(contractor_name).trim() === '') {
      return res.status(400).json({ error: 'Contractor name is required' });
    }

    try {
      const rows = getSteelUsageReport({
        ship_name,
        contractor_name,
        start_date,
        end_date
      });

      return res.json(rows);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to fetch steel usage data' });
    }
  });

  app.get('/api/reports/steel-usage-pdf', requireAuth, (req, res) => {
    const { ship_name, contractor_name, start_date, end_date } = req.query;

    if (!ship_name || String(ship_name).trim() === '') {
      return res.status(400).json({ error: 'Parameter ship_name wajib diisi.' });
    }

    if (!contractor_name || String(contractor_name).trim() === '') {
      return res.status(400).json({ error: 'Parameter contractor_name wajib diisi.' });
    }

    let report: any[] = [];
    try {
      report = getSteelUsageReport({
        ship_name,
        contractor_name,
        start_date,
        end_date,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    if (report.length === 0) {
      return res.status(404).json({ error: 'Data penggunaan besi tidak ditemukan. Pastikan transaksi OUT memiliki Nama Kapal dan Kontraktor terisi pada periode yang dipilih.' });
    }

    const safeShipName = String(ship_name).replace(/[^a-z0-9-_]+/gi, '_');
    const safeContractorName = String(contractor_name).replace(/[^a-z0-9-_]+/gi, '_');
    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=steel-usage-${safeShipName}-${safeContractorName}.pdf`);
    doc.pipe(res);

    const periodText = start_date && end_date
      ? `${start_date} s/d ${end_date}`
      : start_date
        ? `Mulai ${start_date}`
        : end_date
          ? `Sampai ${end_date}`
          : 'Semua Periode';

    doc.fontSize(20).text('PT NDS', { align: 'center' });
    doc.fontSize(14).text('Laporan Penggunaan Besi', { align: 'center' });
    doc.fontSize(10).text(`Nama Kapal: ${ship_name}`, { align: 'center' });
    doc.fontSize(10).text(`Nama Kontraktor: ${contractor_name}`, { align: 'center' });
    doc.fontSize(10).text(`Periode: ${periodText}`, { align: 'center' });
    doc.moveDown(2);

    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Nama Besi', 50, tableTop);
    doc.text('Jumlah', 340, tableTop, { width: 90, align: 'right' });
    doc.text('Satuan', 450, tableTop, { width: 90, align: 'left' });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica');
    report.forEach(row => {
      if (y > 700) {
        doc.addPage();
        y = 50;
        doc.font('Helvetica-Bold');
        doc.text('Nama Besi', 50, y);
        doc.text('Jumlah', 340, y, { width: 90, align: 'right' });
        doc.text('Satuan', 450, y, { width: 90, align: 'left' });
        doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
        y += 25;
        doc.font('Helvetica');
      }

      doc.text(row.item_name, 50, y, { width: 280 });
      doc.text(String(row.total_quantity_used), 340, y, { width: 90, align: 'right' });
      doc.text(row.stock_unit || '-', 450, y, { width: 90, align: 'left' });
      y += 20;
    });

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Developed by rama | Print Date: ${new Date().toLocaleString()} | Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    doc.end();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
