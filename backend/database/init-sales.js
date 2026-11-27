const pool = require('../database/connection');

/**
 * Initialize the `sales` table if it does not exist.
 * This script is called from server startup (you can import it in server.js
 * or run it manually).
 */
async function initSalesTable() {
  try {
    const connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) AS (quantity * unit_price) STORED,
        sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        customer_name VARCHAR(100),
        notes TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
      ) ENGINE=InnoDB;
    `);
    connection.release();
    console.log('✅ `sales` table ensured');
  } catch (err) {
    console.warn('⚠️ Could not initialize sales table:', err.message);
  }
}

module.exports = initSalesTable;
