const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db             = require('./database/connection');
const initUsersTable = require('./database/init-users');
const initSalesTable = require('./database/init-sales');
const initPosTables = require('./database/init-pos');

const authRoutes      = require('./routes/auth');
const productRoutes   = require('./routes/products');
const categoryRoutes  = require('./routes/categories');
const supplierRoutes  = require('./routes/suppliers');
const dashboardRoutes = require('./routes/dashboard');
const exchangeRoutes  = require('./routes/exchange');
const salesRoutes     = require('./routes/sales');
const posRoutes       = require('./routes/pos');
const qrRouter        = require('./routes/qr');
const backupRoutes    = require('./routes/backup');

const app  = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API Routes
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/suppliers',  supplierRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/exchange',   exchangeRoutes);
app.use('/api/sales',      salesRoutes);   // ← Sales section
app.use('/api/pos',        posRoutes);
app.use('/api/backup',     backupRoutes);
app.use('/qr',             qrRouter);      // ← QR codes

// Direct alias for expenses
app.use('/api/expenses', (req, res, next) => {
  req.url = '/expenses' + (req.url === '/' ? '' : req.url);
  posRoutes(req, res, next);
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`\n🚗 Auto Part System is running on http://localhost:${PORT}\n`);
  await initUsersTable();
  await initSalesTable();
  await initPosTables();
});

module.exports = app;
