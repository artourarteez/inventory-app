import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { generatePdf } from './src/pdf/generatePdf.js';
import { paintUsageTemplate } from './src/pdf/paintUsageTemplate.js';
import { stockTemplate } from './src/pdf/stockTemplate.js';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'inventory-secret-key';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function toAbsoluteUrl(relativePath: string | null): string | null {
  if (!relativePath) return null;
  return `${BASE_URL}${relativePath}`;
}

function resolvePhotoUrls(jsonStr: string | null): string[] | null {
  if (!jsonStr) return null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.map((p: string) => toAbsoluteUrl(p)!).filter(Boolean);
    }
  } catch {}
  return null;
}

let db: ReturnType<typeof createClient>;

type QueryParams = any[];
type WriteStatement = { sql: string; args?: QueryParams };

async function execute(sql: string, args: QueryParams = []) {
  try {
    return await db.execute({ sql, args });
  } catch (error) {
    console.error('[db.execute] Failed query:', sql, error);
    throw error;
  }
}

async function safeExecute(sql: string, args: QueryParams = [], retries = 3): Promise<any> {
  try {
    return await execute(sql, args);
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 50));
      return safeExecute(sql, args, retries - 1);
    }
    throw err;
  }
}

async function queryAll<T = any>(sql: string, args: QueryParams = []): Promise<T[]> {
  const result = await execute(sql, args);
  return result.rows as unknown as T[];
}

async function queryOne<T = any>(sql: string, args: QueryParams = []): Promise<T | null> {
  const rows = await queryAll<T>(sql, args);
  return rows.length > 0 ? rows[0] : null;
}

async function runTransaction(statements: WriteStatement[], retries = 3) {
  const tx = await db.transaction('write');
  try {
    for (const stmt of statements) {
      await tx.execute({ sql: stmt.sql, args: stmt.args ?? [] });
    }
    await tx.commit();
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      // Ignore rollback errors so retry logic can proceed.
    }

    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 50));
      return runTransaction(statements, retries - 1);
    }
    throw err;
  }
}

// Note: Keep multi-write operations inside runTransaction() to preserve atomicity.

function assertSafeIdentifier(value: string, kind: 'table' | 'column'): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid ${kind} identifier: ${value}`);
  }
  return value;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const safeTable = assertSafeIdentifier(table, 'table');
  const safeColumn = assertSafeIdentifier(column, 'column');
  const result = await execute(`PRAGMA table_info(${safeTable})`);
  return result.rows.some((col: any) => String(col?.name) === safeColumn);
}

async function addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
  const safeTable = assertSafeIdentifier(table, 'table');
  const safeColumn = assertSafeIdentifier(column, 'column');

  if (await columnExists(safeTable, safeColumn)) {
    return;
  }

  await safeExecute(`ALTER TABLE ${safeTable} ADD COLUMN ${safeColumn} ${definition}`);
}

function asNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function initializeDatabase() {
  await safeExecute("CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, stock_unit TEXT NOT NULL, allow_direct_edit INTEGER NOT NULL, status TEXT, volume_per_can REAL, specification TEXT, current_stock REAL DEFAULT 0, CHECK (category IN ('CYLINDER', 'PAINT', 'STEEL')))");
  console.log('[db.init] items table ready');

  await safeExecute("CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'EXCHANGE', 'ADJUSTMENT', 'DIRECT_EDIT')), quantity REAL NOT NULL, notes TEXT, photo_url TEXT, signature_url TEXT, user_name TEXT, ship_name TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(item_id) REFERENCES items(id))");
  console.log('[db.init] transactions table ready');

  await safeExecute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE, password TEXT, password_hash TEXT NOT NULL, is_active BOOLEAN DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  console.log('[db.init] users table ready');

  await safeExecute('CREATE TABLE IF NOT EXISTS paint_products (id TEXT PRIMARY KEY, base_name TEXT NOT NULL, set_size REAL NOT NULL, volume_part_a REAL NOT NULL, volume_part_b REAL DEFAULT 0, has_part_b BOOLEAN NOT NULL)');
  console.log('[db.init] paint_products table ready');

  await safeExecute("CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, po_number TEXT UNIQUE, supplier TEXT, notes TEXT, status TEXT CHECK (status IN ('OPEN', 'PARTIAL', 'VALIDATED', 'CLOSED')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  console.log('[db.init] purchase_orders table ready');

  await safeExecute('CREATE TABLE IF NOT EXISTS purchase_order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER, item_id TEXT, ordered_quantity REAL, received_quantity REAL DEFAULT 0, FOREIGN KEY(po_id) REFERENCES purchase_orders(id), FOREIGN KEY(item_id) REFERENCES items(id))');
  console.log('[db.init] purchase_order_items table ready');

  await addColumnIfMissing('items', 'paint_product_id', 'TEXT');
  await addColumnIfMissing('items', 'part_type', 'TEXT');
  await addColumnIfMissing('transactions', 'is_auto_generated', 'INTEGER DEFAULT 0');

  const existingUsers = await queryAll<any>('SELECT id, password_hash, password FROM users');
  for (const user of existingUsers) {
    const currentHash = String(user.password_hash || '');
    const looksHashed = currentHash.startsWith('$2a$') || currentHash.startsWith('$2b$') || currentHash.startsWith('$2y$');
    if (looksHashed) {
      continue;
    }

    const sourcePassword = String(user.password_hash || user.password || '');
    if (!sourcePassword) {
      continue;
    }

    const hashedPassword = await bcrypt.hash(sourcePassword, 10);
    await safeExecute('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id]);
  }

  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  await safeExecute(
    `INSERT OR IGNORE INTO users (id, username, email, password_hash)
     VALUES (?, ?, ?, ?)`,
    ['user-1', 'admin', 'admin@example.com', adminPasswordHash]
  );
}

async function startServer() {
  const tursoUrl = (process.env.TURSO_URL || '').trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

  if (!tursoUrl || !tursoToken) {
    console.error('[db.init] Missing required Turso environment variables:');
    console.error('  TURSO_URL:', tursoUrl ? '(set)' : '(missing)');
    console.error('  TURSO_AUTH_TOKEN:', tursoToken ? '(set)' : '(missing)');
    throw new Error('Missing required Turso environment variables: TURSO_URL and/or TURSO_AUTH_TOKEN');
  }

  db = createClient({
    url: tursoUrl,
    authToken: tursoToken,
  });

  try {
    await execute('SELECT 1 AS ok');
    console.log('[db.init] Turso connectivity check passed');
  } catch (error) {
    console.error('[db.init] Turso connectivity check failed. Verify TURSO_URL and TURSO_AUTH_TOKEN');
    throw error;
  }

  await initializeDatabase();

  const app = express();
  const PORT = 3000;

  const getPaintUsageReport = async (filters: { start_date?: any; end_date?: any; ship_name?: any }) => {
    let query = `
      SELECT
        t.ship_name,
        t.item_id,
        i.name as item_name,
        i.part_type,
        i.volume_per_can,
        SUM(t.quantity) as total_cans_used,
        CASE
          WHEN i.part_type = 'A' THEN SUM(t.quantity) * p.set_size
          ELSE SUM(t.quantity) * i.volume_per_can
        END as total_liters_used
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      LEFT JOIN paint_products p ON i.paint_product_id = p.id
      WHERE i.category = 'PAINT'
        AND t.type = 'OUT'
        AND t.ship_name IS NOT NULL
        AND t.ship_name != ''
        AND (i.part_type IS NULL OR i.part_type != 'B')
    `;

    const params: QueryParams = [];

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

    query += ` GROUP BY t.ship_name, t.item_id, i.name, i.volume_per_can, i.part_type, p.set_size`;
    query += ` ORDER BY t.ship_name ASC, i.name ASC`;

    return await queryAll(query, params);
  };

  const getSteelUsageReport = async (filters: {
    start_date?: any;
    end_date?: any;
    ship_name?: any;
    contractor_name?: any;
  }) => {
    const normalizedShip = typeof filters.ship_name === 'string' ? filters.ship_name.trim().toLowerCase() : '';
    const normalizedContractor =
      typeof filters.contractor_name === 'string' ? filters.contractor_name.trim().toLowerCase() : '';

    let query = `
      SELECT
        t.id,
        t.created_at,
        t.item_id,
        i.name AS item_name,
        t.quantity,
        i.stock_unit,
        t.user_name
      FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE i.category = 'STEEL'
        AND t.type = 'OUT'
    `;

    const params: QueryParams = [];

    if (normalizedShip && normalizedShip !== 'all') {
      query += ` AND LOWER(TRIM(t.ship_name)) = LOWER(TRIM(?))`;
      params.push(String(filters.ship_name));
    }

    if (normalizedContractor && normalizedContractor !== 'all') {
      query += ` AND LOWER(TRIM(COALESCE(t.user_name, ''))) LIKE LOWER(TRIM(?))`;
      params.push(`%${String(filters.contractor_name).trim()}%`);
    }

    if (filters.start_date) {
      query += ` AND date(t.created_at) >= date(?)`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND date(t.created_at) <= date(?)`;
      params.push(filters.end_date);
    }

    query += ` ORDER BY datetime(t.created_at) DESC, i.name ASC`;

    return await queryAll(query, params);
  };

  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  const requireAuth = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

    app.post('/api/auth/login', async (req, res) => {
    const { username, username_or_email, password } = req.body;
    const login = username || username_or_email;

    if (!login || !password) {
        return res.status(400).json({ error: 'Username/email and password are required' });
    }

    try {
        const user = await queryOne<any>(
        'SELECT id, username, email, password_hash, is_active FROM users WHERE username = ? OR email = ?',
        [login, login]
        );

        if (!user || !asNumber(user.is_active)) {
        return res.status(401).json({ error: 'Invalid credentials or inactive account' });
        }

        const valid = await bcrypt.compare(String(password), String(user.password_hash || ''));
        if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, {
        httpOnly: true,
        secure: false, 
        sameSite: 'lax'
        });

        return res.json({ success: true, user: { id: user.id, username: user.username } });

    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
    });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, async (req: any, res: any) => {
    try {
      const user = await queryOne<any>(
        'SELECT id, username, email, is_active FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!user || !asNumber(user.is_active)) {
        return res.status(401).json({ error: 'User not found or inactive' });
      }

      return res.json({ user });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
    }
  });

  // Admin-only cleanup endpoint
  app.delete('/api/admin/cleanup-dummy', requireAuth, async (req: any, res: any) => {
    try {
      if (req.user.username !== 'admin') {
        return res.status(403).json({ error: 'Admin only' });
      }

      await safeExecute(
        `DELETE FROM transactions WHERE notes LIKE '%AUTO PAIR%' OR notes LIKE '%dummy%' OR notes = 'tida ada' OR notes = 'SOBAT'`
      );

      return res.json({ success: true, message: 'Dummy transactions removed' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to cleanup dummy data' });
    }
  });

  app.get('/api/users/me', requireAuth, async (req: any, res: any) => {
    try {
      const user = await queryOne<any>(
        'SELECT id, username, email FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        id: user.id,
        username: String(user.username || ''),
        email: String(user.email || ''),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch profile' });
    }
  });

  app.put('/api/users/profile', requireAuth, async (req: any, res: any) => {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim();

    if (!username || !email) {
      return res.status(400).json({ error: 'username and email are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    try {
      const existing = await queryOne<any>(
        'SELECT id, username, email FROM users WHERE (username = ? OR email = ?) AND id != ?',
        [username, email, req.user.id]
      );

      if (existing) {
        if (String(existing.username) === username) {
          return res.status(409).json({ error: 'Username is already in use' });
        }
        if (String(existing.email || '') === email) {
          return res.status(409).json({ error: 'Email is already in use' });
        }
      }

      await safeExecute(
        'UPDATE users SET username = ?, email = ? WHERE id = ?',
        [username, email, req.user.id]
      );

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: req.user.id,
          username,
          email,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  app.post('/api/users/change-password', requireAuth, async (req: any, res: any) => {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'old_password and new_password are required' });
    }

    if (String(new_password).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    try {
      const user = await queryOne<any>(
        'SELECT id, password_hash FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const match = await bcrypt.compare(String(old_password), String(user.password_hash || ''));
      if (!match) {
        return res.status(400).json({ error: 'Old password is incorrect' });
      }

      const hash = await bcrypt.hash(String(new_password), 10);
      await safeExecute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to change password' });
    }
  });

  app.post('/api/paint-products', requireAuth, async (req: any, res: any) => {
    const { base_name, set_size, volume_part_a, volume_part_b, has_part_b } = req.body;

    if (!base_name || set_size == null || volume_part_a == null || has_part_b == null) {
      return res
        .status(400)
        .json({ error: 'Missing required fields: base_name, set_size, volume_part_a, has_part_b' });
    }

    const productId = `pp-${Date.now()}`;

    try {
      const statements: { sql: string; args: any[] }[] = [];
      const items: any[] = [];

      statements.push({
        sql: `INSERT INTO paint_products (id, base_name, set_size, volume_part_a, volume_part_b, has_part_b)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [productId, base_name, set_size, volume_part_a, volume_part_b || 0, has_part_b ? 1 : 0]
      });

      if (has_part_b) {
        const partAId = `item-${Date.now()}-a`;
        const partAName = `${base_name} ${volume_part_a}L PART A`;
        statements.push({
          sql: `INSERT INTO items (id, name, category, stock_unit, allow_direct_edit, volume_per_can, current_stock, paint_product_id, part_type)
                VALUES (?, ?, 'PAINT', 'CAN', 0, ?, 0, ?, 'A')`,
          args: [partAId, partAName, volume_part_a, productId]
        });
        items.push({ id: partAId, name: partAName, part_type: 'A' });

        const partBId = `item-${Date.now()}-b`;
        const partBName = `${base_name} ${volume_part_b}L PART B`;
        statements.push({
          sql: `INSERT INTO items (id, name, category, stock_unit, allow_direct_edit, volume_per_can, current_stock, paint_product_id, part_type)
                VALUES (?, ?, 'PAINT', 'CAN', 0, ?, 0, ?, 'B')`,
          args: [partBId, partBName, volume_part_b || 0, productId]
        });
        items.push({ id: partBId, name: partBName, part_type: 'B' });
      } else {
        const itemId = `item-${Date.now()}`;
        const itemName = `${base_name} ${volume_part_a}L`;
        statements.push({
          sql: `INSERT INTO items (id, name, category, stock_unit, allow_direct_edit, volume_per_can, current_stock, paint_product_id, part_type)
                VALUES (?, ?, 'PAINT', 'CAN', 0, ?, 0, ?, NULL)`,
          args: [itemId, itemName, volume_part_a, productId]
        });
        items.push({ id: itemId, name: itemName, part_type: null });
      }

      await runTransaction(statements);
      const generatedItems = items;

      return res.json({ success: true, product_id: productId, generated_items: generatedItems });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/paint-products', requireAuth, async (_req, res) => {
    try {
      const products = await queryAll('SELECT * FROM paint_products');
      return res.json(products);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/items', requireAuth, async (req, res) => {
    try {
      const { page, limit, category, search } = req.query;

      const whereConditions: string[] = [];
      const params: QueryParams = [];

      if (category && String(category).trim() !== '') {
        whereConditions.push('category = ?');
        params.push(String(category).trim());
      }

      if (search && String(search).trim() !== '') {
        whereConditions.push('name LIKE ?');
        params.push(`%${String(search).trim()}%`);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      if (page !== undefined) {
        const pageNum = Math.max(1, parseInt(String(page)) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(String(limit)) || 20));
        const offset = (pageNum - 1) * limitNum;

        const countResult = await queryOne<any>(
          `SELECT COUNT(*) as total FROM items ${whereClause}`,
          params
        );
        const total = asNumber(countResult?.total ?? 0);
        const total_pages = Math.max(1, Math.ceil(total / limitNum));

        const items = await queryAll(
          `SELECT *
           FROM items
           ${whereClause}
           ORDER BY
             CASE category
               WHEN 'CYLINDER' THEN 1
               WHEN 'STEEL' THEN 2
               WHEN 'PAINT' THEN 3
             END,
             name ASC
           LIMIT ?
           OFFSET ?`,
          [...params, limitNum, offset]
        );

        return res.json({ items, total, page: pageNum, total_pages });
      } else {
        // Backward-compatible: return flat array when no page param
        const items = await queryAll(
          `SELECT *
           FROM items
           ${whereClause}
           ORDER BY
             CASE category
               WHEN 'CYLINDER' THEN 1
               WHEN 'STEEL' THEN 2
               WHEN 'PAINT' THEN 3
             END,
             name ASC`,
          params
        );
        return res.json(items);
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch items' });
    }
  });

  app.post('/api/items', requireAuth, async (req, res) => {
    const { id, name, category, stock_unit, allow_direct_edit, status, volume_per_can, specification } = req.body;
    try {
      await safeExecute(
        `INSERT INTO items (id, name, category, stock_unit, allow_direct_edit, status, volume_per_can, specification)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, category, stock_unit, allow_direct_edit ? 1 : 0, status, volume_per_can, specification]
      );
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/transactions', requireAuth, async (req, res) => {
    const { item_id, type, quantity, notes, user_name, ship_name, photos, signature } = req.body;

    try {
      const item = await queryOne<any>('SELECT * FROM items WHERE id = ?', [item_id]);
      if (!item) return res.status(404).json({ error: 'Item not found' });

      if (type === 'DIRECT_EDIT' && !asNumber(item.allow_direct_edit)) {
        return res.status(400).json({ error: 'Direct edit not allowed for this item' });
      }

      if (type === 'EXCHANGE' && item.category !== 'CYLINDER') {
        return res.status(400).json({ error: 'Exchange is only allowed for cylinders' });
      }

      if (item.category === 'PAINT' && item.part_type === 'B') {
        return res.status(400).json({ error: 'PART B cannot be transacted manually.' });
      }

      if (item.category === 'PAINT' && !Number.isInteger(quantity)) {
        return res.status(400).json({ error: 'Paint transactions must use whole cans only.' });
      }

      if (
        type === 'OUT' &&
        (item.category === 'PAINT' || item.category === 'STEEL') &&
        (!ship_name || String(ship_name).trim() === '')
      ) {
        return res.status(400).json({ error: 'Nama kapal wajib diisi untuk transaksi keluar Cat dan Besi.' });
      }

      if (item.category === 'CYLINDER') {
        const needEvidence = type === 'OUT' || type === 'EXCHANGE';
        if (needEvidence) {
          if (!photos || !Array.isArray(photos) || photos.length === 0) {
            return res.status(400).json({ error: 'Foto dokumentasi wajib untuk tabung saat keluar atau tukar' });
          }

          if (!signature) {
            return res.status(400).json({ error: 'Tanda tangan wajib untuk tabung saat keluar atau tukar' });
          }
        }
      }

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
      const needsAutoPair = item.category === 'PAINT' && item.part_type === 'A' && (type === 'IN' || type === 'OUT');

      let partB: any = null;
      if (needsAutoPair) {
        partB = await queryOne<any>(
          `SELECT * FROM items WHERE paint_product_id = ? AND part_type = 'B'`,
          [item.paint_product_id]
        );

        if (!partB) {
          return res.status(400).json({ error: 'Paired PART B item not found for this paint product.' });
        }

      }

      const qty = asNumber(quantity);
      const tx = await db.transaction('write');
      try {
        await tx.execute({
          sql: `INSERT INTO transactions (item_id, type, quantity, notes, photo_url, signature_url, user_name, ship_name, is_auto_generated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
          args: [item_id, type, qty, notes, photo_url_db, signatureUrl, user_name, ship_name]
        });

        let stockChange = 0;
        if (type === 'IN') stockChange = qty;
        else if (type === 'OUT') stockChange = -qty;
        else if (type === 'ADJUSTMENT') stockChange = qty;
        else if (type === 'DIRECT_EDIT') stockChange = qty - asNumber(item.current_stock);

        if (stockChange !== 0) {
          if (type === 'OUT') {
            const stockResult = await tx.execute({
              sql: 'UPDATE items SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ?',
              args: [qty, item_id, qty]
            });

            if (!stockResult.rowsAffected) {
              throw new Error('Stock not sufficient');
            }
          } else {
            await tx.execute({
              sql: 'UPDATE items SET current_stock = current_stock + ? WHERE id = ?',
              args: [stockChange, item_id]
            });
          }
        }

        if (needsAutoPair && partB) {
          const partBNotes = notes ? `${notes} [AUTO PAIR]` : '[AUTO PAIR]';

          await tx.execute({
            sql: `INSERT INTO transactions (item_id, type, quantity, notes, photo_url, signature_url, user_name, ship_name, is_auto_generated)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            args: [partB.id, type, qty, partBNotes, photo_url_db, signatureUrl, user_name, ship_name]
          });

          if (type === 'OUT') {
            const partBStockResult = await tx.execute({
              sql: 'UPDATE items SET current_stock = current_stock - ? WHERE id = ? AND current_stock >= ?',
              args: [qty, partB.id, qty]
            });

            if (!partBStockResult.rowsAffected) {
              throw new Error('Stock not sufficient');
            }
          } else {
            await tx.execute({
              sql: 'UPDATE items SET current_stock = current_stock + ? WHERE id = ?',
              args: [qty, partB.id]
            });
          }
        }

        await tx.commit();
      } catch (err) {
        try {
          await tx.rollback();
        } catch {
          // Ignore rollback errors.
        }
        throw err;
      }

      return res.json({ success: true });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/transactions', requireAuth, async (req, res) => {
    const { start_date, end_date, item_id, category, transaction_type, report_type, ship_name } = req.query;

    if (report_type === 'paint_usage') {
      try {
        const report = await getPaintUsageReport({ start_date, end_date, ship_name });
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
    const params: QueryParams = [];

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
      const transactions = await queryAll(query, params);
      const resolved = transactions.map((t: any) => ({
        ...t,
        photo_url: resolvePhotoUrls(t.photo_url),
        signature_url: toAbsoluteUrl(t.signature_url),
      }));
      return res.json(resolved);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/purchase-orders', requireAuth, async (req, res) => {
    const { supplier, notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and must not be empty.' });
    }

    const poNumber = `PO-${Date.now()}`;

    try {
      // Validate all items exist before inserting
      for (const entry of items) {
        if (!entry.item_id || entry.quantity == null || entry.quantity <= 0) {
          throw new Error('Each item must have a valid item_id and quantity > 0.');
        }
        const itemExists = await queryOne<any>('SELECT id FROM items WHERE id = ?', [entry.item_id]);
        if (!itemExists) {
          throw new Error(`Item not found: ${entry.item_id}`);
        }
      }

      // Insert PO and capture the generated ID atomically
      const poResult = await safeExecute(
        `INSERT INTO purchase_orders (po_number, supplier, notes, status)
         VALUES (?, ?, ?, 'OPEN')`,
        [poNumber, supplier || null, notes || null]
      );

      const poId = poResult.lastInsertRowid;
      if (!poId) {
        throw new Error('Failed to create purchase order.');
      }

      // Batch insert all PO items
      const poItemStatements = items.map((entry: any) => ({
        sql: `INSERT INTO purchase_order_items (po_id, item_id, ordered_quantity) VALUES (?, ?, ?)`,
        args: [poId, entry.item_id, entry.quantity]
      }));

      if (poItemStatements.length > 0) {
        await runTransaction(poItemStatements);
      }

      return res.json({ success: true, po_id: poId, po_number: poNumber });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/purchase-orders', requireAuth, async (_req, res) => {
    try {
      const orders = await queryAll(`
        SELECT id, po_number, supplier, status, created_at
        FROM purchase_orders
        ORDER BY created_at DESC
      `);
      return res.json(orders);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/purchase-orders/:id', requireAuth, async (req, res) => {
    try {
      const po = await queryOne<any>(
        `SELECT id, po_number, supplier, notes, status, created_at
         FROM purchase_orders
         WHERE id = ?`,
        [req.params.id]
      );

      if (!po) {
        return res.status(404).json({ error: 'Purchase order not found.' });
      }

      const items = await queryAll(
        `SELECT
          poi.id,
          poi.item_id,
          i.name AS item_name,
          poi.ordered_quantity,
          poi.received_quantity,
          (poi.ordered_quantity - poi.received_quantity) AS remaining_quantity
         FROM purchase_order_items poi
         JOIN items i ON poi.item_id = i.id
         WHERE poi.po_id = ?`,
        [po.id]
      );

      return res.json({ ...po, items });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/purchase-orders/:id/receive', requireAuth, async (req: any, res: any) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required and must not be empty.' });
    }

    try {
      const po = await queryOne<any>('SELECT * FROM purchase_orders WHERE id = ?', [req.params.id]);
      if (!po) {
        return res.status(404).json({ error: 'Purchase order not found.' });
      }

      // Validate all items first
      const receiveActions: { poItemId: any; itemId: any; quantity: any }[] = [];
      for (const entry of items) {
        if (!entry.po_item_id || entry.quantity == null || entry.quantity <= 0) {
          throw new Error('Each item must have a valid po_item_id and quantity > 0.');
        }

        const poItem = await queryOne<any>(
          `SELECT poi.*, i.id as item_id
           FROM purchase_order_items poi
           JOIN items i ON poi.item_id = i.id
           WHERE poi.id = ? AND poi.po_id = ?`,
          [entry.po_item_id, po.id]
        );

        if (!poItem) {
          throw new Error(`PO item not found: ${entry.po_item_id}`);
        }

        const remaining = asNumber(poItem.ordered_quantity) - asNumber(poItem.received_quantity);
        if (asNumber(entry.quantity) > remaining) {
          throw new Error(
            `Quantity ${entry.quantity} exceeds remaining ${remaining} for PO item ${entry.po_item_id}.`
          );
        }

        receiveActions.push({
          poItemId: entry.po_item_id,
          itemId: poItem.item_id,
          quantity: entry.quantity
        });
      }

      const receiveStatements: WriteStatement[] = [];
      for (const action of receiveActions) {
        receiveStatements.push({
          sql: 'UPDATE purchase_order_items SET received_quantity = received_quantity + ? WHERE id = ?',
          args: [action.quantity, action.poItemId]
        });

        receiveStatements.push({
            sql: `INSERT INTO transactions (item_id, type, quantity, notes, user_name)
              VALUES (?, 'IN', ?, 'PO RECEIPT', ?)`,
            args: [action.itemId, action.quantity, req.user.username]
        });

        receiveStatements.push({
          sql: 'UPDATE items SET current_stock = current_stock + ? WHERE id = ?',
          args: [action.quantity, action.itemId]
        });
      }

      receiveStatements.push({
        sql: `UPDATE purchase_orders
              SET status = CASE
                WHEN COALESCE((SELECT SUM(received_quantity) FROM purchase_order_items WHERE po_id = purchase_orders.id), 0) = 0 THEN 'OPEN'
                WHEN COALESCE((SELECT SUM(received_quantity) FROM purchase_order_items WHERE po_id = purchase_orders.id), 0)
                     < COALESCE((SELECT SUM(ordered_quantity) FROM purchase_order_items WHERE po_id = purchase_orders.id), 0) THEN 'PARTIAL'
                ELSE 'VALIDATED'
              END
              WHERE id = ?`,
        args: [po.id]
      });

      await runTransaction(receiveStatements);

      const updatedPo = await queryOne<any>('SELECT status FROM purchase_orders WHERE id = ?', [po.id]);
      const newStatus = updatedPo?.status || po.status || 'OPEN';

      return res.json({ success: true, status: newStatus });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/reports/steel-usage', requireAuth, async (req, res) => {
    const { ship_name, contractor_name, start_date, end_date } = req.query;

    try {
      const rows = await getSteelUsageReport({
        ship_name,
        contractor_name,
        start_date,
        end_date,
      });

      return res.json(rows);
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'Failed to fetch steel usage data' });
    }
  });

  app.get('/api/reports/stock-pdf', requireAuth, async (_req, res) => {
    try {
      const items = await queryAll<any>(
        `SELECT name, category, current_stock, stock_unit, volume_per_can
         FROM items
         WHERE current_stock > 0
           AND (part_type IS NULL OR part_type != 'B')
         ORDER BY
           CASE category
             WHEN 'STEEL' THEN 1
             WHEN 'CYLINDER' THEN 2
             WHEN 'PAINT' THEN 3
           END,
           name ASC`
      );

      const grouped = {
            STEEL: items.filter((i: any) => i.category === 'STEEL'),
            CYLINDER: items.filter((i: any) => i.category === 'CYLINDER'),
            PAINT: items.filter((i: any) => i.category === 'PAINT'),
          };

          const generatedDate = new Date().toLocaleDateString();
          const html = stockTemplate(grouped, generatedDate);

          const pdf = await generatePdf(html);

          const buffer = Buffer.from(pdf);

          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", "attachment; filename=stock-report.pdf");
          res.setHeader("Content-Length", buffer.length);
          res.setHeader("Cache-Control", "no-store");

          res.end(buffer);

        } catch (error: any) {
          res.status(500).json({ error: error.message });
        }
      });



  app.get('/api/reports/paint-usage-pdf', requireAuth, async (req, res) => {
    const { ship_name, start_date, end_date } = req.query;

    if (!ship_name || String(ship_name).trim() === '') {
      return res.status(400).json({ error: 'Parameter ship_name wajib diisi.' });
    }

    let report: any[] = [];
    try {
      report = await getPaintUsageReport({ start_date, end_date, ship_name });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    if (report.length === 0) {
      return res.status(404).json({ error: 'Data penggunaan cat tidak ditemukan untuk kapal/periode yang dipilih.' });
    }

    const safeShipName = String(ship_name).replace(/[^a-z0-9-_]+/gi, '_');
    const generatedDate = new Date().toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Collect photo documentation from matching transactions
    let photoQuery = `
      SELECT t.photo_url FROM transactions t
      JOIN items i ON t.item_id = i.id
      WHERE i.category = 'PAINT' AND t.type = 'OUT'
        AND t.ship_name = ? AND t.photo_url IS NOT NULL
    `;
    const photoParams: any[] = [ship_name];
    if (start_date) { photoQuery += ` AND date(t.created_at) >= date(?)`; photoParams.push(start_date); }
    if (end_date) { photoQuery += ` AND date(t.created_at) <= date(?)`; photoParams.push(end_date); }

    const photoRows = await queryAll<{ photo_url: string }>(photoQuery, photoParams);
    const photos: string[] = photoRows.flatMap((row) => {
      try {
        const parsed = JSON.parse(row.photo_url);
        return Array.isArray(parsed) ? parsed.filter((p: any) => typeof p === 'string' && p.length > 0) : [];
      } catch {
        return [];
      }
    });

    const html = paintUsageTemplate(report, String(ship_name), generatedDate, BASE_URL, photos);
    const pdfBuffer = await generatePdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=paint-usage-${safeShipName}.pdf`);
    res.send(pdfBuffer);
  });

  app.get('/api/reports/steel-usage-json', requireAuth, async (req, res) => {
    const { ship_name, contractor_name, start_date, end_date } = req.query;

    try {
      const rows = await getSteelUsageReport({
        ship_name,
        contractor_name,
        start_date,
        end_date,
      });

      return res.json(rows);
    } catch {
      return res.status(500).json({ error: 'Failed to fetch steel usage data' });
    }
  });

  app.get('/api/reports/steel-usage-pdf', requireAuth, async (req, res) => {
    const { ship_name, contractor_name, start_date, end_date } = req.query;

    if (!ship_name || String(ship_name).trim() === '') {
      return res.status(400).json({ error: 'Parameter ship_name wajib diisi.' });
    }

    const contractorValue = typeof contractor_name === 'string' ? contractor_name.trim() : '';
    const hasContractorFilter = contractorValue !== '' && contractorValue.toLowerCase() !== 'all';

    let report: any[] = [];
    try {
      report = await getSteelUsageReport({
        ship_name,
        contractor_name,
        start_date,
        end_date,
      });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }

    if (report.length === 0) {
      return res.status(404).json({ error: 'Data penggunaan besi tidak ditemukan untuk filter/periode yang dipilih.' });
    }

    const safeShipName = String(ship_name).replace(/[^a-z0-9-_]+/gi, '_');
    const safeContractorName = hasContractorFilter ? contractorValue.replace(/[^a-z0-9-_]+/gi, '_') : 'all';
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
    doc.fontSize(10).text(
      `Nama Kontraktor: ${hasContractorFilter ? contractorValue : 'Semua Kontraktor'}`,
      { align: 'center' }
    );
    doc.fontSize(10).text(`Periode: ${periodText}`, { align: 'center' });
    doc.moveDown(2);

    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Tanggal', 50, tableTop, { width: 90 });
    doc.text('Nama Besi', 145, tableTop, { width: 170 });
    doc.text('Kontraktor', 320, tableTop, { width: 120 });
    doc.text('Jumlah', 445, tableTop, { width: 45, align: 'right' });
    doc.text('Satuan', 495, tableTop, { width: 45, align: 'left' });
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let y = tableTop + 25;
    doc.font('Helvetica');
    report.forEach((row) => {
      if (y > 700) {
        doc.addPage();
        y = 50;
        doc.font('Helvetica-Bold');
        doc.text('Tanggal', 50, y, { width: 90 });
        doc.text('Nama Besi', 145, y, { width: 170 });
        doc.text('Kontraktor', 320, y, { width: 120 });
        doc.text('Jumlah', 445, y, { width: 45, align: 'right' });
        doc.text('Satuan', 495, y, { width: 45, align: 'left' });
        doc.moveTo(50, y + 15).lineTo(550, y + 15).stroke();
        y += 25;
        doc.font('Helvetica');
      }

      const createdAt = row.created_at ? new Date(String(row.created_at)).toLocaleDateString('id-ID') : '-';
      doc.text(createdAt, 50, y, { width: 90 });
      doc.text(String(row.item_name || '-'), 145, y, { width: 170 });
      doc.text(String(row.user_name || '-'), 320, y, { width: 120 });
      doc.text(String(row.quantity || 0), 445, y, { width: 45, align: 'right' });
      doc.text(String(row.stock_unit || '-'), 495, y, { width: 45, align: 'left' });
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

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
});
