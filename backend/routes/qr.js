// routes/qr.js
const express = require('express');
const router = express.Router();

// Lazy load the QR implementation (fallback to our local generator)
let QR;
function loadQR() {
  if (QR) return;
  try {
    QR = require('qrcode'); // npm package if present
  } catch (_) {
    // Use the minimal generator we added under utils/qr/qrcodegen.js
    QR = require('../utils/qr/qrcodegen');
  }
}

/**
 * GET /qr/product/:id
 * Returns an SVG image of a QR code that points to the product page.
 * Replace BASE_URL with your public domain.
 */
router.get('/product/:id', async (req, res) => {
  loadQR();
  const productId = req.params.id;
  const BASE_URL = 'https://YOUR_BASE_URL_HERE'; // TODO: edit to real URL
  const target = `${BASE_URL}/product/${productId}`;

  try {
    // Our generator provides a static generateSVG method.
    const size = 300; // pixels
    const margin = 4;
    const svg = QR.generateSVG(target, size, margin);
    res.type('svg').send(svg);
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ success: false, message: 'QR generation failed' });
  }
});

module.exports = router;
