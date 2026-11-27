const db = require('./connection');

async function ensureColumn(connection, table, column, definition) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (!Number(rows[0].count)) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    return true;
  }
  return false;
}

async function initPosTables() {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pos_purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_id INT NULL,
        total_amount DECIMAL(15,2) NOT NULL,
        paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        notes TEXT,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pos_purchases_supplier (supplier_id),
        INDEX idx_pos_purchases_date (purchased_at)
      ) ENGINE=InnoDB
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pos_purchase_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_cost DECIMAL(15,2) NOT NULL,
        total_cost DECIMAL(15,2) NOT NULL,
        FOREIGN KEY (purchase_id) REFERENCES pos_purchases(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        INDEX idx_pos_purchase_items_product (product_id)
      ) ENGINE=InnoDB
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pos_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        description VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        notes TEXT,
        spent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pos_expenses_date (spent_at)
      ) ENGINE=InnoDB
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customer_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        notes TEXT,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
        INDEX idx_customer_payments_date (paid_at)
      ) ENGINE=InnoDB
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_id INT NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        notes TEXT,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
        INDEX idx_supplier_payments_date (paid_at)
      ) ENGINE=InnoDB
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sale_id INT NOT NULL,
        quantity INT NOT NULL,
        refund_amount DECIMAL(15,2) NOT NULL,
        notes TEXT,
        returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        INDEX idx_sales_returns_date (returned_at)
      ) ENGINE=InnoDB
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS pos_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    await ensureColumn(connection, 'sales', 'customer_id', 'INT NULL');
    const addedPaidAmount = await ensureColumn(connection, 'sales', 'paid_amount', 'DECIMAL(15,2) NOT NULL DEFAULT 0');
    await ensureColumn(connection, 'products', 'brand', 'VARCHAR(150) NULL');
    await ensureColumn(connection, 'products', 'expiry_date', 'DATE NULL');
    if (addedPaidAmount) {
      await connection.query('UPDATE sales SET paid_amount = total_price');
    }
    console.log('✅ POS tables ensured');
  } catch (err) {
    console.warn('⚠️ Could not initialize POS tables:', err.message);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = initPosTables;
