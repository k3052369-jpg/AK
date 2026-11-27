const express = require('express');
const db = require('../database/connection');

const router = express.Router();

function isPositiveInteger(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isValidAmount(value, allowZero = false) {
  const amount = Number(value);
  return Number.isFinite(amount) && (allowZero ? amount >= 0 : amount > 0);
}

function dateFilters(fromDate, toDate, column, params) {
  let filter = '';
  if (fromDate) {
    filter += ` AND DATE(${column}) >= ?`;
    params.push(fromDate);
  }
  if (toDate) {
    filter += ` AND DATE(${column}) <= ?`;
    params.push(toDate);
  }
  return filter;
}

router.get('/expiring-products', async (req, res) => {
  const requestedDays = req.query.days === undefined ? 30 : Number(req.query.days);
  if (!Number.isInteger(requestedDays) || requestedDays < 0 || requestedDays > 365) {
    return res.status(400).json({ success: false, message: 'ماوەی ئاگاداریی بەسەرچوون دروست نییە' });
  }
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.name, p.barcode, p.quantity, p.expiry_date,
             DATEDIFF(p.expiry_date, CURDATE()) AS days_remaining
      FROM products p
      WHERE p.is_active = 1
        AND p.expiry_date IS NOT NULL
        AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ${requestedDays} DAY)
      ORDER BY p.expiry_date ASC, p.name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching expiring products:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە هێنانی کاڵا بەسەرچووەکان' });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const params = [];
    let where = '';
    if (search) {
      where = 'WHERE c.name LIKE ? OR c.phone LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.query(`
      SELECT c.*,
        COALESCE((
          SELECT SUM(s.total_price - s.paid_amount - COALESCE((
            SELECT SUM(sr.refund_amount) FROM sales_returns sr WHERE sr.sale_id = s.id
          ), 0))
          FROM sales s WHERE s.customer_id = c.id
        ), 0) - COALESCE((
          SELECT SUM(cp.amount) FROM customer_payments cp WHERE cp.customer_id = c.id
        ), 0) AS balance
      FROM customers c ${where}
      ORDER BY c.name
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching POS customers:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە هێنانی کڕیارەکان' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success: false, message: 'ناوی کڕیار پێویستە' });

    const [result] = await db.query(
      'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
      [name, req.body.phone || null, req.body.address || null, req.body.notes || null]
    );
    const [rows] = await db.query('SELECT * FROM customers WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error creating POS customer:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە زیادکردنی کڕیار' });
  }
});

router.post('/customers/:id/payments', async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const amount = Number(req.body.amount);
    if (!isPositiveInteger(customerId) || !isValidAmount(amount)) {
      return res.status(400).json({ success: false, message: 'کڕیار و بڕی پارە دروست بنووسە' });
    }

    const [customers] = await db.query('SELECT id FROM customers WHERE id = ?', [customerId]);
    if (!customers.length) return res.status(404).json({ success: false, message: 'کڕیار نەدۆزرایەوە' });

    const [result] = await db.query(
      'INSERT INTO customer_payments (customer_id, amount, notes) VALUES (?, ?, ?)',
      [customerId, amount, req.body.notes || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('Error recording customer payment:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە تۆمارکردنی پارەدانی کڕیار' });
  }
});

router.get('/suppliers', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.id, s.name, s.phone,
        COALESCE((
          SELECT SUM(p.total_amount - p.paid_amount)
          FROM pos_purchases p WHERE p.supplier_id = s.id
        ), 0) - COALESCE((
          SELECT SUM(sp.amount) FROM supplier_payments sp WHERE sp.supplier_id = s.id
        ), 0) AS balance
      FROM suppliers s
      ORDER BY s.name
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching supplier balances:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە هێنانی قەرزی کۆمپانیاکان' });
  }
});

router.post('/suppliers/:id/payments', async (req, res) => {
  try {
    const supplierId = Number(req.params.id);
    const amount = Number(req.body.amount);
    if (!isPositiveInteger(supplierId) || !isValidAmount(amount)) {
      return res.status(400).json({ success: false, message: 'کۆمپانیا و بڕی پارە دروست بنووسە' });
    }
    const [suppliers] = await db.query('SELECT id FROM suppliers WHERE id = ?', [supplierId]);
    if (!suppliers.length) return res.status(404).json({ success: false, message: 'کۆمپانیا نەدۆزرایەوە' });
    const [result] = await db.query(
      'INSERT INTO supplier_payments (supplier_id, amount, notes) VALUES (?, ?, ?)',
      [supplierId, amount, req.body.notes || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('Error recording supplier payment:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە تۆمارکردنی پارەدانی کۆمپانیا' });
  }
});

router.get('/purchases', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.id, p.total_amount, p.paid_amount, p.notes, p.purchased_at,
             s.name AS supplier_name, COUNT(pi.id) AS item_count
      FROM pos_purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      LEFT JOIN pos_purchase_items pi ON pi.purchase_id = p.id
      GROUP BY p.id
      ORDER BY p.purchased_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching purchases:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە هێنانی کڕینەکان' });
  }
});

router.post('/purchases', async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const supplierId = req.body.supplier_id ? Number(req.body.supplier_id) : null;
  const paidAmount = Number(req.body.paid_amount || 0);
  if (!items.length || items.some(item =>
    !isPositiveInteger(item.product_id) ||
    !isPositiveInteger(item.quantity) ||
    !isValidAmount(item.unit_cost, true)
  )) {
    return res.status(400).json({ success: false, message: 'کاڵا، بڕ و نرخی کڕین دروست بنووسە' });
  }
  if ((supplierId !== null && !isPositiveInteger(supplierId)) || !isValidAmount(paidAmount, true)) {
    return res.status(400).json({ success: false, message: 'کۆمپانیا و بڕی پارەدانی دروست هەڵبژێرە' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    if (supplierId !== null) {
      const [suppliers] = await connection.query('SELECT id FROM suppliers WHERE id = ?', [supplierId]);
      if (!suppliers.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'کۆمپانیا نەدۆزرایەوە' });
      }
    }

    let totalAmount = 0;
    const lockedProducts = [];
    for (const item of items) {
      const [products] = await connection.query(
        'SELECT id, quantity FROM products WHERE id = ? AND is_active = 1 FOR UPDATE',
        [Number(item.product_id)]
      );
      if (!products.length) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'یەکێک لە کاڵاکان نەدۆزرایەوە' });
      }
      const quantity = Number(item.quantity);
      const unitCost = Number(item.unit_cost);
      const lineTotal = quantity * unitCost;
      totalAmount += lineTotal;
      lockedProducts.push({ id: products[0].id, quantity, unitCost, lineTotal });
    }
    if (totalAmount <= 0 || paidAmount > totalAmount) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'کۆی کڕین دروست نییە یان پارەدان لە کۆی کڕین زیاترە' });
    }

    const [purchase] = await connection.query(
      'INSERT INTO pos_purchases (supplier_id, total_amount, paid_amount, notes) VALUES (?, ?, ?, ?)',
      [supplierId, totalAmount, paidAmount, req.body.notes || null]
    );
    for (const item of lockedProducts) {
      await connection.query(`
        INSERT INTO pos_purchase_items (purchase_id, product_id, quantity, unit_cost, total_cost)
        VALUES (?, ?, ?, ?, ?)
      `, [purchase.insertId, item.id, item.quantity, item.unitCost, item.lineTotal]);
      await connection.query(`
        UPDATE products
        SET quantity = quantity + ?, buy_price_iqd = ?
        WHERE id = ?
      `, [item.quantity, item.unitCost, item.id]);
    }

    await connection.commit();
    res.status(201).json({ success: true, data: { id: purchase.insertId, total_amount: totalAmount } });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back purchase:', rollbackError);
      }
    }
    console.error('Error recording purchase:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە تۆمارکردنی کڕین' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/expenses', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM pos_expenses ORDER BY spent_at DESC LIMIT 200'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە هێنانی خەرجییەکان' });
  }
});

router.post('/expenses', async (req, res) => {
  try {
    const category = String(req.body.category || '').trim();
    const description = String(req.body.description || '').trim();
    const amount = Number(req.body.amount);
    if (!category || !description || !isValidAmount(amount)) {
      return res.status(400).json({ success: false, message: 'جۆر، وەسف و بڕی خەرجی پێویستن' });
    }

    const [result] = await db.query(
      'INSERT INTO pos_expenses (category, description, amount, notes) VALUES (?, ?, ?, ?)',
      [category, description, amount, req.body.notes || null]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('Error recording expense:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە تۆمارکردنی خەرجی' });
  }
});

router.get('/returns', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.id, r.sale_id, r.quantity, r.refund_amount, r.notes, r.returned_at,
             p.name AS product_name, s.customer_name
      FROM sales_returns r
      JOIN sales s ON s.id = r.sale_id
      JOIN products p ON p.id = s.product_id
      ORDER BY r.returned_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching returns:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە هێنانی گەڕاندنەوەکان' });
  }
});

router.post('/returns', async (req, res) => {
  const saleId = Number(req.body.sale_id);
  const quantity = Number(req.body.quantity);
  if (!isPositiveInteger(saleId) || !isPositiveInteger(quantity)) {
    return res.status(400).json({ success: false, message: 'فرۆشتن و بڕی گەڕاندنەوە دروست بنووسە' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [sales] = await connection.query(
      'SELECT id, product_id, quantity, unit_price FROM sales WHERE id = ? FOR UPDATE',
      [saleId]
    );
    if (!sales.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'فرۆشتن نەدۆزرایەوە' });
    }
    const [returned] = await connection.query(
      'SELECT COALESCE(SUM(quantity), 0) AS quantity FROM sales_returns WHERE sale_id = ?',
      [saleId]
    );
    const remaining = Number(sales[0].quantity) - Number(returned[0].quantity);
    if (quantity > remaining) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `تەنها ${remaining} دانە دەتوانرێت بگەڕێندرێتەوە` });
    }

    const refundAmount = quantity * Number(sales[0].unit_price);
    const [result] = await connection.query(`
      INSERT INTO sales_returns (sale_id, quantity, refund_amount, notes)
      VALUES (?, ?, ?, ?)
    `, [saleId, quantity, refundAmount, req.body.notes || null]);
    await connection.query(
      'UPDATE products SET quantity = quantity + ? WHERE id = ?',
      [quantity, sales[0].product_id]
    );
    await connection.commit();
    res.status(201).json({ success: true, data: { id: result.insertId, refund_amount: refundAmount } });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back sale return:', rollbackError);
      }
    }
    console.error('Error recording sale return:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە تۆمارکردنی گەڕاندنەوە' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/cash-summary', async (req, res) => {
  try {
    const { from_date: fromDate = '', to_date: toDate = '' } = req.query;
    const salesParams = [];
    const paymentParams = [];
    const supplierPaymentParams = [];
    const purchaseParams = [];
    const expenseParams = [];
    const returnParams = [];
    const salesFilter = dateFilters(fromDate, toDate, 's.sale_date', salesParams);
    const paymentFilter = dateFilters(fromDate, toDate, 'cp.paid_at', paymentParams);
    const supplierPaymentFilter = dateFilters(fromDate, toDate, 'sp.paid_at', supplierPaymentParams);
    const purchaseFilter = dateFilters(fromDate, toDate, 'p.purchased_at', purchaseParams);
    const expenseFilter = dateFilters(fromDate, toDate, 'e.spent_at', expenseParams);
    const returnFilter = dateFilters(fromDate, toDate, 'r.returned_at', returnParams);
    const [[sales], [payments], [supplierPayments], [purchases], [expenses], [returns]] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(s.total_price),0) AS total, COALESCE(SUM(s.paid_amount),0) AS received FROM sales s WHERE 1=1 ${salesFilter}`, salesParams),
      db.query(`SELECT COALESCE(SUM(cp.amount),0) AS total FROM customer_payments cp WHERE 1=1 ${paymentFilter}`, paymentParams),
      db.query(`SELECT COALESCE(SUM(sp.amount),0) AS total FROM supplier_payments sp WHERE 1=1 ${supplierPaymentFilter}`, supplierPaymentParams),
      db.query(`SELECT COALESCE(SUM(p.paid_amount),0) AS total FROM pos_purchases p WHERE 1=1 ${purchaseFilter}`, purchaseParams),
      db.query(`SELECT COALESCE(SUM(e.amount),0) AS total FROM pos_expenses e WHERE 1=1 ${expenseFilter}`, expenseParams),
      db.query(`SELECT COALESCE(SUM(r.refund_amount),0) AS total FROM sales_returns r WHERE 1=1 ${returnFilter}`, returnParams)
    ]);

    const salesReceived = Number(sales[0].received);
    const customerPayments = Number(payments[0].total);
    const supplierPaymentsTotal = Number(supplierPayments[0].total);
    const purchasePaid = Number(purchases[0].total);
    const expenseTotal = Number(expenses[0].total);
    const refundTotal = Number(returns[0].total);
    res.json({
      success: true,
      data: {
        sales_total: Number(sales[0].total),
        sales_received: salesReceived,
        customer_payments: customerPayments,
        supplier_payments: supplierPaymentsTotal,
        purchases_paid: purchasePaid,
        expenses: expenseTotal,
        refunds: refundTotal,
        cash_balance: salesReceived + customerPayments - supplierPaymentsTotal - purchasePaid - expenseTotal - refundTotal
      }
    });
  } catch (err) {
    console.error('Error generating cash summary:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە دروستکردنی ڕاپۆرتی کاش' });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT setting_key, setting_value FROM pos_settings ORDER BY setting_key');
    res.json({ success: true, data: Object.fromEntries(rows.map(row => [row.setting_key, row.setting_value])) });
  } catch (err) {
    console.error('Error fetching POS settings:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە هێنانی ڕێکخستنەکان' });
  }
});

router.put('/settings', async (req, res) => {
  const settings = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const entries = Object.entries(settings).filter(([key, value]) =>
    /^[a-z][a-z0-9_]{0,99}$/i.test(key) &&
    (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') &&
    String(value).length <= 1000
  );
  if (!entries.length) return res.status(400).json({ success: false, message: 'هیچ ڕێکخستنێکی دروست نەنێردراوە' });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    for (const [key, value] of entries) {
      await connection.query(`
        INSERT INTO pos_settings (setting_key, setting_value) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `, [key, String(value)]);
    }
    await connection.commit();
    res.json({ success: true, data: Object.fromEntries(entries.map(([key, value]) => [key, String(value)])) });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back POS settings:', rollbackError);
      }
    }
    console.error('Error saving POS settings:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە پاشەکەوتکردنی ڕێکخستنەکان' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
