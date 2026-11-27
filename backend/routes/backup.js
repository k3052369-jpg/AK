const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// Export complete system backup as JSON
router.get('/export', async (req, res) => {
  try {
    const backup = {
      system: 'Auto Part POS',
      version: '6.0.1',
      exportedAt: new Date().toISOString(),
      data: {}
    };

    const tables = [
      'categories', 'suppliers', 'products', 'sales', 'pos_expenses',
      'customers', 'customer_payments', 'supplier_payments', 'pos_purchases',
      'pos_purchase_items', 'sales_returns', 'pos_settings', 'users'
    ];
    for (const table of tables) {
      try {
        const [rows] = await pool.query(`SELECT * FROM ${table}`);
        backup.data[table] = rows;
      } catch (e) {
        backup.data[table] = [];
      }
    }

    const filename = `autopart_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(backup, null, 2));
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ success: false, message: 'هەڵە لە دروستکردنی باکئەپ: ' + err.message });
  }
});

module.exports = router;
