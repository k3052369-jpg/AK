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
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--text-light)">هیچ فرۆشتنێک نەدۆزرایەوە</td></tr>`;
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
        <td>${Number(s.paid_amount || 0).toLocaleString()} IQD</td>
        <td class="${Number(s.total_price) > Number(s.paid_amount || 0) ? 'pos-debt' : 'pos-credit'}">${Math.max(0, Number(s.total_price) - Number(s.paid_amount || 0)).toLocaleString()} IQD</td>
        <td>${s.customer_name ? escHtml(s.customer_name) : '<span style="color:var(--text-light)">—</span>'}</td>
        <td>${formatDate(s.sale_date)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="printSaleReceipt(${s.id})" title="چاپی وەسڵ">🖨️</button>
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
        <option value="${p.id}" data-price="${p.sell_price_iqd}" data-qty="${p.quantity}" data-expiry="${escHtml(p.expiry_date || '')}" ${Number(p.quantity) <= 0 ? 'disabled' : ''}>
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
        if (stockHint) {
          const expiryDate = opt.dataset.expiry ? opt.dataset.expiry.slice(0, 10) : '';
          stockHint.textContent = `لە مەخزەن: ${opt.dataset.qty} دانە${expiryDate ? ` — بەسەرچوون: ${expiryDate}` : ''}`;
        }
        updateSaleTotal();
      } else {
        const stockHint = document.getElementById('saleStockHint');
        if (stockHint) stockHint.textContent = '';
      }
    };
    document.getElementById('saleQuantity').oninput = updateSaleTotal;
    document.getElementById('saleUnitPrice').oninput = updateSaleTotal;
    const customersResponse = await fetch('/api/pos/customers');
    const customersJson = await customersResponse.json();
    const customerSelect = document.getElementById('saleCustomerId');
    if (customerSelect && customersJson.success) {
      customerSelect.innerHTML = '<option value="">کڕیاری نوێ / بێ کڕیار</option>' +
        customersJson.data.map(customer => `
          <option value="${customer.id}" data-name="${escHtml(customer.name)}">
            ${escHtml(customer.name)}${customer.phone ? ` - ${escHtml(customer.phone)}` : ''}
          </option>
        `).join('');
    }
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
  const customerSelect = document.getElementById('saleCustomerId');
  if (customerSelect) customerSelect.value = '';
  const paidInput = document.getElementById('salePaidAmount');
  if (paidInput) {
    paidInput.value = '0';
    paidInput.dataset.auto = 'true';
  }
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
  const total = quantity * unitPrice;
  const totalElement = document.getElementById('saleTotalPreview');
  if (totalElement) totalElement.textContent = total.toLocaleString();
  const paidInput = document.getElementById('salePaidAmount');
  if (paidInput && paidInput.dataset.auto === 'true') paidInput.value = String(total);
  const paid = Number(paidInput?.value || 0);
  const dueElement = document.getElementById('saleDuePreview');
  if (dueElement) dueElement.textContent = Math.max(0, total - paid).toLocaleString();
}

// ─────────────────────────────────────────────────────────────
// Submit the new sale
// ─────────────────────────────────────────────────────────────
async function submitSale() {
  const productSelect = document.getElementById('saleProductId');
  const product_id    = productSelect.value;
  const quantity      = Number(document.getElementById('saleQuantity').value);
  const unit_price    = Number(document.getElementById('saleUnitPrice').value);
  const customerSelect = document.getElementById('saleCustomerId');
  const customer_id = customerSelect?.value || null;
  const selectedCustomerName = customerSelect?.selectedOptions[0]?.dataset.name || '';
  const customer_name = selectedCustomerName || document.getElementById('saleCustomerName').value;
  const paid_amount = Number(document.getElementById('salePaidAmount')?.value || 0);
  const notes         = document.getElementById('saleNotes').value;

  if (!product_id || !Number.isInteger(quantity) || quantity <= 0 || !Number.isFinite(unit_price) || unit_price <= 0) {
    showToast('تکایە بەرهەم، بڕ و نرخ پڕ بکەرەوە', 'error');
    return;
  }
  if (!Number.isFinite(paid_amount) || paid_amount < 0 || paid_amount > quantity * unit_price) {
    showToast('بڕی پارەدان دروست نییە', 'error');
    return;
  }
  if (paid_amount < quantity * unit_price && !customer_id) {
    showToast('بۆ فرۆشتنی قەرزدار کڕیار هەڵبژێرە', 'error');
    return;
  }
  if (paid_amount < quantity * unit_price && typeof posSettings !== 'undefined' && posSettings.allow_credit_sales === 'false') {
    showToast('فرۆشتنی قەرزدار لە ڕێکخستنەکان ناچالاک کراوە', 'error');
    return;
  }
  const selectedOption = productSelect.selectedOptions[0];
  const availableStock = Number(selectedOption?.dataset.qty || 0);
  if (quantity > availableStock) {
    showToast(`بڕی فرۆشتن لە مەخزەن زیاترە؛ تەنها ${availableStock} دانە هەیە`, 'error');
    return;
  }
  const expiryDate = selectedOption?.dataset.expiry?.slice(0, 10) || '';
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (expiryDate && expiryDate < today && typeof posSettings !== 'undefined' &&
      posSettings.show_expiry_alerts !== 'false' &&
      !confirm(`ئاگاداری: بەرواری بەسەرچوونی ئەم کاڵایە ${expiryDate} بووە. بەردەوام بیت؟`)) {
    return;
  }
  if (typeof posSettings !== 'undefined' && posSettings.confirm_sales === 'true' &&
      !confirm(`دڵنیایت لە تۆمارکردنی فرۆشتنی بە بڕی ${(quantity * unit_price).toLocaleString()} IQD؟`)) {
    return;
  }

  try {
    const res  = await fetch('/api/sales', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id,
        quantity: parseInt(quantity),
        unit_price: parseFloat(unit_price),
        paid_amount,
        customer_id,
        customer_name,
        notes
      })
    });
    const json = await res.json();
    if (json.success) {
      showToast('✅ فرۆشتن تۆمارکرا', 'success');
      closeModal('addSaleModal');
      await loadSalesSummary();
      await loadSales(salesCurrentPage);
      await loadProductsForSaleModal();
      if (typeof loadCustomers === 'function') await loadCustomers();
      if (typeof loadCashSummary === 'function') await loadCashSummary();
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

async function printSaleReceipt(id) {
  try {
    const result = await posApiCall(`/sales/${id}`);
    const sale = result.data;
    const receipt = document.getElementById('saleReceiptPrint');
    const due = Math.max(0, Number(sale.total_price) - Number(sale.paid_amount || 0));
    receipt.innerHTML = `
      <header class="sale-receipt-header">
        <strong>Auto Part</strong>
        <span>وەسڵی فرۆشتن #${Number(sale.id)}</span>
      </header>
      <div class="sale-receipt-meta">
        <span>بەروار: ${escHtml(formatDate(sale.sale_date))}</span>
        <span>کڕیار: ${escHtml(sale.customer_name || 'کڕیاری نەناسراو')}</span>
      </div>
      <hr>
      <div class="sale-receipt-item">
        <strong>${escHtml(sale.product_name)}</strong>
        ${sale.part_number ? `<small>${escHtml(sale.part_number)}</small>` : ''}
        <span>${Number(sale.quantity)} × ${Number(sale.unit_price).toLocaleString()} IQD</span>
      </div>
      <hr>
      <div class="sale-receipt-total"><span>کۆی گشتی</span><strong>${Number(sale.total_price).toLocaleString()} IQD</strong></div>
      <div class="sale-receipt-total"><span>پارەی وەرگیراو</span><strong>${Number(sale.paid_amount || 0).toLocaleString()} IQD</strong></div>
      <div class="sale-receipt-total"><span>ماوە</span><strong>${due.toLocaleString()} IQD</strong></div>
      <footer>سوپاس بۆ کڕینتان</footer>
    `;
    printPosDocument('printing-sale-receipt');
  } catch (err) {
    showToast(err.message || 'نەتوانرا وەسڵی فرۆشتن بهێنرێت', 'error');
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
