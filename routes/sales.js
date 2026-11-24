// routes/sales.js
const express = require('express');
const router = express.Router();
const db = require('../database/connection');

// ─────────────────────────────────────────────────────────────
// GET /api/sales  – list all sales with optional filters
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      from_date = '',
      to_date = '',
      page = 1,
      limit = 20
    } = req.query;

    let query = `
      SELECT s.id, s.quantity, s.unit_price, s.total_price,
             s.sale_date, s.customer_name, s.notes,
             p.name  AS product_name,
             p.part_number,
             p.brand
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) AS total
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (search) {
      const clause = ` AND (p.name LIKE ? OR s.customer_name LIKE ? OR p.part_number LIKE ?)`;
      query += clause;
      countQuery += clause;
      const v = `%${search}%`;
      params.push(v, v, v);
      countParams.push(v, v, v);
    }

    if (from_date) {
      query += ` AND DATE(s.sale_date) >= ?`;
      countQuery += ` AND DATE(s.sale_date) >= ?`;
      params.push(from_date);
      countParams.push(from_date);
    }

    if (to_date) {
      query += ` AND DATE(s.sale_date) <= ?`;
      countQuery += ` AND DATE(s.sale_date) <= ?`;
      params.push(to_date);
      countParams.push(to_date);
    }

    query += ` ORDER BY s.sale_date DESC`;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const [rows]        = await db.query(query, params);
    const [countResult] = await db.query(countQuery, countParams);

    res.json({
      success: true,
      data: rows,
      pagination: {
        total:      countResult[0].total,
        page:       parseInt(page),
        limit:      parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ success: false, message: 'هەڵەیەک ڕوویدا لە هێنانی فرۆشتنەکان' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sales/summary  – revenue & item totals
// ─────────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        COUNT(*)                   AS total_orders,
        SUM(quantity)              AS total_items_sold,
        SUM(total_price)           AS total_revenue,
        SUM(CASE WHEN DATE(sale_date) = CURDATE() THEN total_price ELSE 0 END) AS today_revenue,
        SUM(CASE WHEN YEARWEEK(sale_date, 1) = YEARWEEK(CURDATE(), 1) THEN total_price ELSE 0 END) AS week_revenue,
        SUM(CASE WHEN MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE()) THEN total_price ELSE 0 END) AS month_revenue
      FROM sales
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error fetching sales summary:', err);
    res.status(500).json({ success: false, message: 'هەڵەیەک ڕوویدا' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sales/:id  – single sale record
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, p.name AS product_name, p.part_number, p.brand
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'فرۆشتن نەدۆزرایەوە' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'هەڵەیەک ڕوویدا' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sales  – record a new sale (also deducts stock)
// ─────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { product_id, quantity, unit_price, customer_name, notes } = req.body;

    if (!product_id || !quantity || !unit_price) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, message: 'بەرهەم، بڕ و نرخ پێویستن' });
    }

    // Check stock
    const [productRows] = await conn.query(
      'SELECT id, name, quantity FROM products WHERE id = ? AND is_active = 1',
      [product_id]
    );

    if (productRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'بەرهەم نەدۆزرایەوە' });
    }

    const product = productRows[0];
    if (product.quantity < parseInt(quantity)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        success: false,
        message: `کەمی کاڵا: تەنها ${product.quantity} دانە هەیە`
      });
    }

    // Insert sale record
    const [result] = await conn.query(`
      INSERT INTO sales (product_id, quantity, unit_price, customer_name, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [product_id, parseInt(quantity), parseFloat(unit_price), customer_name || null, notes || null]);

    // Deduct stock
    await conn.query(
      'UPDATE products SET quantity = quantity - ? WHERE id = ?',
      [parseInt(quantity), product_id]
    );

    await conn.commit();
    conn.release();

    // Return full sale record
    const [newSale] = await db.query(`
      SELECT s.*, p.name AS product_name, p.part_number, p.brand
      FROM sales s
      JOIN products p ON s.product_id = p.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json({ success: true, message: 'فرۆشتن تۆمارکرا', data: newSale[0] });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Error recording sale:', err);
    res.status(500).json({ success: false, message: 'هەڵەیەک ڕوویدا لە تۆمارکردنی فرۆشتن' });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/sales/:id  – update notes / customer name only
// ─────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { customer_name, notes } = req.body;
    await db.query(
      'UPDATE sales SET customer_name = ?, notes = ? WHERE id = ?',
      [customer_name || null, notes || null, req.params.id]
    );
    const [updated] = await db.query(`
      SELECT s.*, p.name AS product_name FROM sales s JOIN products p ON s.product_id = p.id WHERE s.id = ?
    `, [req.params.id]);
    res.json({ success: true, message: 'فرۆشتن نوێکرایەوە', data: updated[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'هەڵەیەک ڕوویدا' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/sales/:id  – delete a sale & restore stock
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [saleRows] = await conn.query('SELECT * FROM sales WHERE id = ?', [req.params.id]);
    if (saleRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'فرۆشتن نەدۆزرایەوە' });
    }

    const sale = saleRows[0];

    // Restore stock
    await conn.query(
      'UPDATE products SET quantity = quantity + ? WHERE id = ?',
      [sale.quantity, sale.product_id]
    );

    await conn.query('DELETE FROM sales WHERE id = ?', [req.params.id]);
    await conn.commit();
    conn.release();

    res.json({ success: true, message: 'فرۆشتن سڕایەوە و کەمی کاڵا گەڕایەوە' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('Error deleting sale:', err);
    res.status(500).json({ success: false, message: 'هەڵەیەک ڕوویدا لە سڕینەوەی فرۆشتن' });
  }
});

module.exports = router;
