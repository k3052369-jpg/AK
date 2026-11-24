// public/js/sales.js
// ─────────────────────────────────────────────────────────────
// Sales section – front‑end logic
// ─────────────────────────────────────────────────────────────

let salesCurrentPage = 1;
const salesPageLimit = 20;
let salesSearchTimer = null;

// ─────────────────────────────────────────────────────────────
// Called when the user switches to the Sales page
// ─────────────────────────────────────────────────────────────
async function initSalesPage() {
  await loadSalesSummary();
  await loadSales();
  await loadProductsForSaleModal();
}

// ─────────────────────────────────────────────────────────────
// Load summary cards (revenue totals)
// ─────────────────────────────────────────────────────────────
async function loadSalesSummary() {
  try {
    const res  = await fetch('/api/sales/summary');
    const json = await res.json();
    if (!json.success) return;
    const d = json.data;
    document.getElementById('salesTodayRevenue').textContent  = Number(d.today_revenue  || 0).toLocaleString();
    document.getElementById('salesMonthRevenue').textContent  = Number(d.month_revenue  || 0).toLocaleString();
    document.getElementById('salesTotalOrders').textContent   = Number(d.total_orders   || 0).toLocaleString();
    document.getElementById('salesTotalItems').textContent    = Number(d.total_items_sold || 0).toLocaleString();
  } catch (err) {
    console.error('Error loading sales summary:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Load the sales table
// ─────────────────────────────────────────────────────────────
async function loadSales(page = 1) {
  salesCurrentPage = page;
  const search    = (document.getElementById('salesSearch')    || {}).value || '';
  const fromDate  = (document.getElementById('salesFromDate')  || {}).value || '';
  const toDate    = (document.getElementById('salesToDate')    || {}).value || '';

  const params = new URLSearchParams({
    search,
    from_date: fromDate,
    to_date:   toDate,
    page,
    limit: salesPageLimit
  });

  try {
    const res  = await fetch(`/api/sales?${params}`);
    const json = await res.json();
    const tbody = document.getElementById('salesTableBody');
    if (!json.success || json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-light)">هیچ فرۆشتنێک نەدۆزرایەوە</td></tr>`;
      document.getElementById('salesPagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = json.data.map((s, i) => `
      <tr>
        <td>${(page - 1) * salesPageLimit + i + 1}</td>
        <td>
          <strong>${escHtml(s.product_name)}</strong>
          ${s.part_number ? `<br><small style="color:var(--text-light)">${escHtml(s.part_number)}</small>` : ''}
        </td>
        <td>${s.quantity}</td>
        <td>${Number(s.unit_price).toLocaleString()} IQD</td>
        <td><strong>${Number(s.total_price).toLocaleString()} IQD</strong></td>
        <td>${s.customer_name ? escHtml(s.customer_name) : '<span style="color:var(--text-light)">—</span>'}</td>
        <td>${formatDate(s.sale_date)}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteSale(${s.id})" title="سڕینەوە">🗑️</button>
        </td>
      </tr>
    `).join('');

    renderSalesPagination(json.pagination);
  } catch (err) {
    console.error('Error loading sales:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────
function renderSalesPagination(p) {
  const container = document.getElementById('salesPagination');
  if (!p || p.totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= p.totalPages; i++) {
    html += `<button class="btn ${i === p.page ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="loadSales(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// Search debounce
// ─────────────────────────────────────────────────────────────
function salesSearchDebounce() {
  clearTimeout(salesSearchTimer);
  salesSearchTimer = setTimeout(() => loadSales(1), 400);
}

// ─────────────────────────────────────────────────────────────
// Load products into the "Add Sale" modal dropdown
// ─────────────────────────────────────────────────────────────
async function loadProductsForSaleModal() {
  try {
    const res  = await fetch('/api/products?limit=500');
    const json = await res.json();
    const sel  = document.getElementById('saleProductId');
    if (!sel || !json.success) return;
    sel.innerHTML = '<option value="">-- بەرهەمێک هەڵبژێرە --</option>' +
      json.data.map(p => `
        <option value="${p.id}" data-price="${p.sell_price_iqd}" data-qty="${p.quantity}" ${Number(p.quantity) <= 0 ? 'disabled' : ''}>
          ${escHtml(p.name)}${p.part_number ? ` (${p.part_number})` : ''} — مەخزەن: ${p.quantity}
        </option>
      `).join('');

    // Auto‑fill price when product is selected
    sel.onchange = function() {
      const opt = this.selectedOptions[0];
      if (opt && opt.dataset.price) {
        document.getElementById('saleUnitPrice').value = opt.dataset.price;
        const quantityInput = document.getElementById('saleQuantity');
        quantityInput.max = opt.dataset.qty;
        quantityInput.value = 1;
        const stockHint = document.getElementById('saleStockHint');
        if (stockHint) stockHint.textContent = `لە مەخزەن: ${opt.dataset.qty} دانە`;
        updateSaleTotal();
      } else {
        const stockHint = document.getElementById('saleStockHint');
        if (stockHint) stockHint.textContent = '';
      }
    };
    document.getElementById('saleQuantity').oninput = updateSaleTotal;
    document.getElementById('saleUnitPrice').oninput = updateSaleTotal;
  } catch (err) {
    console.error('Error loading products for sale modal:', err);
  }
}

// ─────────────────────────────────────────────────────────────
// Open the "Add Sale" modal
// ─────────────────────────────────────────────────────────────
async function openAddSaleModal() {
  await loadProductsForSaleModal();
  document.getElementById('saleProductId').value    = '';
  document.getElementById('saleQuantity').value     = 1;
  document.getElementById('saleQuantity').removeAttribute('max');
  document.getElementById('saleUnitPrice').value    = '';
  document.getElementById('saleCustomerName').value = '';
  document.getElementById('saleNotes').value        = '';
  const stockHint = document.getElementById('saleStockHint');
  if (stockHint) stockHint.textContent = '';
  updateSaleTotal();
  openModal('addSaleModal');
}

function updateSaleTotal() {
  const quantity = Number(document.getElementById('saleQuantity')?.value || 0);
  const unitPrice = Number(document.getElementById('saleUnitPrice')?.value || 0);
  const totalElement = document.getElementById('saleTotalPreview');
  if (totalElement) totalElement.textContent = (quantity * unitPrice).toLocaleString();
}

// ─────────────────────────────────────────────────────────────
// Submit the new sale
// ─────────────────────────────────────────────────────────────
async function submitSale() {
  const productSelect = document.getElementById('saleProductId');
  const product_id    = productSelect.value;
  const quantity      = Number(document.getElementById('saleQuantity').value);
  const unit_price    = Number(document.getElementById('saleUnitPrice').value);
  const customer_name = document.getElementById('saleCustomerName').value;
  const notes         = document.getElementById('saleNotes').value;

  if (!product_id || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unit_price) || unit_price <= 0) {
    showToast('تکایە بەرهەم، بڕ و نرخ پڕ بکەرەوە', 'error');
    return;
  }

  const selectedOption = productSelect.selectedOptions[0];
  const availableStock = Number(selectedOption?.dataset.qty || 0);
  if (quantity > availableStock) {
    showToast(`بڕی فرۆشتن لە مەخزەن زیاترە؛ تەنها ${availableStock} دانە هەیە`, 'error');
    return;
  }

  try {
    const res  = await fetch('/api/sales', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id, quantity: parseInt(quantity), unit_price: parseFloat(unit_price), customer_name, notes })
    });
    const json = await res.json();
    if (json.success) {
      showToast('✅ فرۆشتن تۆمارکرا', 'success');
      closeModal('addSaleModal');
      await loadSalesSummary();
      await loadSales(salesCurrentPage);
      await loadProductsForSaleModal();
    } else {
      showToast(json.message || 'هەڵەیەک ڕوویدا', 'error');
    }
  } catch (err) {
    console.error('Error submitting sale:', err);
    showToast('هەڵەیەک ڕوویدا', 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// Delete a sale (restores stock automatically via the API)
// ─────────────────────────────────────────────────────────────
async function deleteSale(id) {
  if (!confirm('دڵنیایت لە سڕینەوەی ئەم فرۆشتنە؟ کەمی کاڵا دەگەڕێتەوە.')) return;
  try {
    const res  = await fetch(`/api/sales/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast('فرۆشتن سڕایەوە', 'success');
      await loadSalesSummary();
      await loadSales(salesCurrentPage);
      await loadProductsForSaleModal();
    } else {
      showToast(json.message || 'هەڵەیەک ڕوویدا', 'error');
    }
  } catch (err) {
    console.error('Error deleting sale:', err);
    showToast('هەڵەیەک ڕوویدا', 'error');
  }
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ku-IQ', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' });
}

// ─────────────────────────────────────────────────────────────
// Hook into the existing page‑switching mechanism in app.js
// ─────────────────────────────────────────────────────────────
(function patchSwitchPage() {
  // Wait for app.js to define switchPage, then wrap it
  const interval = setInterval(() => {
    if (typeof switchPage === 'function') {
      clearInterval(interval);
      const _orig = switchPage;
      window.switchPage = function(page) {
        _orig(page);
        if (page === 'sales') {
          initSalesPage();
        }
      };
    }
  }, 100);
})();
