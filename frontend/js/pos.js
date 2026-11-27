const defaultPosSettings = {
  confirm_sales: 'true',
  allow_credit_sales: 'true',
  show_low_stock_alerts: 'true',
  show_expiry_alerts: 'true',
  compact_mobile: 'true'
};
let posSettings = { ...defaultPosSettings };
let posCustomers = [];
let posProducts = [];
let posSuppliers = [];
let posProductsLoaded = false;
let barcodeStream = null;
let barcodeScanActive = false;

async function posApiCall(endpoint, method = 'GET', data = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('autopart_auth_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const options = { method, headers };
  if (data !== null) options.body = JSON.stringify(data);
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Request failed (${response.status})`);
  }
  return result;
}

function posEscape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function posDateOnly(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function printPosDocument(layoutClass) {
  if (typeof window.print !== 'function') {
    showToast('چاپکردن لەلایەن ئەم وێبگەڕەوە پشتگیری ناکرێت', 'error');
    return;
  }
  const cleanup = () => {
    document.body.classList.remove(layoutClass);
    window.removeEventListener('afterprint', cleanup);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') cleanup();
  };
  document.body.classList.add(layoutClass);
  window.addEventListener('afterprint', cleanup);
  document.addEventListener('visibilitychange', handleVisibility);
  requestAnimationFrame(() => {
    try {
      window.print();
    } catch (err) {
      cleanup();
      showToast('نەتوانرا پەنجەرەی چاپکردن بکرێتەوە', 'error');
    }
  });
}

async function loadPosPageData(page) {
  const loaders = {
    customers: loadCustomers,
    purchases: loadPurchasesPage,
    expenses: loadExpenses,
    returns: loadReturnsPage,
    cash: loadCashSummary,
    settings: loadPosSettings
  };
  if (loaders[page]) await loaders[page]();
}

async function loadCustomers() {
  try {
    const result = await posApiCall('/pos/customers');
    posCustomers = result.data || [];
    const body = document.getElementById('customersTableBody');
    if (!body) return;
    body.innerHTML = posCustomers.length ? posCustomers.map(customer => {
      const balance = Number(customer.balance || 0);
      return `<tr>
        <td><strong>${posEscape(customer.name)}</strong></td>
        <td>${posEscape(customer.phone || '-')}</td>
        <td>${posEscape(customer.address || '-')}</td>
        <td class="${balance > 0 ? 'pos-debt' : 'pos-credit'}">${formatNumber(balance)} IQD</td>
        <td><button class="btn btn-primary btn-sm" onclick="openCustomerPayment(${customer.id})">💵 وەرگرتنی پارە</button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="pos-empty">هیچ کڕیارێک تۆمار نەکراوە</td></tr>';
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی کڕیارەکان', 'error');
  }
}

async function loadExpiringProducts() {
  const days = Number(document.getElementById('expiryAlertDays')?.value || 30);
  try {
    const result = await posApiCall(`/pos/expiring-products?days=${days}`);
    const body = document.getElementById('expiringProductsTableBody');
    if (!body) return;
    const items = result.data || [];
    body.innerHTML = items.length ? items.map(product => {
      const daysRemaining = Number(product.days_remaining);
      const status = daysRemaining < 0
        ? `بەسەرچووە (${formatNumber(Math.abs(daysRemaining))} ڕۆژ)`
        : daysRemaining === 0 ? 'ئەمڕۆ بەسەر دەچێت' : `${formatNumber(daysRemaining)} ڕۆژ ماوە`;
      return `<tr>
        <td><strong>${posEscape(product.name)}</strong></td>
        <td>${posEscape(product.barcode || '-')}</td>
        <td>${formatNumber(product.quantity)}</td>
        <td>${posEscape(posDateOnly(product.expiry_date))}</td>
        <td class="${daysRemaining <= 0 ? 'pos-debt' : ''}">${status}</td>
      </tr>`;
    }).join('') : '<tr><td colspan="5" class="pos-empty">لەو ماوەیەدا کاڵای بەسەرچوو نییە</td></tr>';
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی کاڵا بەسەرچووەکان', 'error');
  }
}

async function createCustomer(event) {
  event.preventDefault();
  const data = {
    name: document.getElementById('customerName').value.trim(),
    phone: document.getElementById('customerPhone').value.trim(),
    address: document.getElementById('customerAddress').value.trim()
  };
  try {
    const result = await posApiCall('/pos/customers', 'POST', data);
    if (!result.success) throw new Error(result.message || 'هەڵە لە زیادکردنی کڕیار');
    event.target.reset();
    showToast('کڕیار زیادکرا');
    await loadCustomers();
  } catch (err) {
    showToast(err.message || 'هەڵە لە زیادکردنی کڕیار', 'error');
  }
}

function openCustomerPayment(customerId) {
  const customer = posCustomers.find(item => Number(item.id) === Number(customerId));
  if (!customer) return;
  document.getElementById('paymentCustomerId').value = customer.id;
  document.getElementById('customerPaymentTitle').textContent = `💵 وەرگرتنی پارە - ${customer.name}`;
  document.getElementById('customerPaymentAmount').value = '';
  document.getElementById('customerPaymentNotes').value = '';
  openModal('customerPaymentModal');
}

async function recordCustomerPayment(event) {
  event.preventDefault();
  const customerId = document.getElementById('paymentCustomerId').value;
  const amount = Number(document.getElementById('customerPaymentAmount').value);
  try {
    const result = await posApiCall(`/pos/customers/${customerId}/payments`, 'POST', {
      amount,
      notes: document.getElementById('customerPaymentNotes').value.trim()
    });
    if (!result.success) throw new Error(result.message || 'هەڵە لە تۆمارکردنی پارەدان');
    closeModal('customerPaymentModal');
    showToast('پارەدانی کڕیار تۆمارکرا');
    await loadCustomers();
    await loadCashSummary();
  } catch (err) {
    showToast(err.message || 'هەڵە لە تۆمارکردنی پارەدان', 'error');
  }
}

async function loadPurchaseFormData() {
  try {
    const [productsResult, suppliersResult] = await Promise.all([
      posApiCall('/products?limit=10000'),
      posApiCall('/suppliers')
    ]);
    posProducts = productsResult.data || [];
    posProductsLoaded = true;
    posSuppliers = suppliersResult.data || [];
    const supplierSelect = document.getElementById('purchaseSupplier');
    if (supplierSelect) {
      supplierSelect.innerHTML = '<option value="">بێ کۆمپانیا</option>' +
        (suppliersResult.data || []).map(supplier =>
          `<option value="${supplier.id}">${posEscape(supplier.name)}</option>`
        ).join('');
    }
    const paymentSupplier = document.getElementById('supplierPaymentSupplier');
    if (paymentSupplier) {
      paymentSupplier.innerHTML = '<option value="">کۆمپانیا هەڵبژێرە</option>' +
        posSuppliers.map(supplier => `<option value="${supplier.id}">${posEscape(supplier.name)}</option>`).join('');
    }
    if (posProducts.length && !document.querySelector('#purchaseItems .pos-line-row')) addPurchaseItemRow();
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی زانیاری کڕین', 'error');
  }
}

async function addPurchaseItemRow() {
  if (!posProductsLoaded) await loadPurchaseFormData();
  if (!posProducts.length) {
    showToast('پێش کڕین، لانیکەم یەک کاڵا زیاد بکە', 'warning');
    return;
  }
  const container = document.getElementById('purchaseItems');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'pos-line-row';
  row.innerHTML = `
    <div class="form-group">
      <label>کاڵا</label>
      <select class="purchase-product" required>
        <option value="">کاڵا هەڵبژێرە</option>
        ${posProducts.map(product => `<option value="${product.id}">${posEscape(product.name)}${product.part_number ? ` (${posEscape(product.part_number)})` : ''}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>بڕ</label><input class="purchase-quantity" type="number" min="1" value="1" required inputmode="numeric"></div>
    <div class="form-group"><label>نرخی کڕینی یەکە (IQD)</label><input class="purchase-unit-cost" type="number" min="0" step="0.01" value="0" required inputmode="decimal"></div>
    <button class="btn btn-danger btn-sm pos-remove-line" type="button" aria-label="سڕینەوەی ئەم کاڵایە" onclick="this.closest('.pos-line-row').remove()">✕</button>`;
  container.appendChild(row);
}

async function loadPurchasesPage() {
  await loadPurchaseFormData();
  try {
    const result = await posApiCall('/pos/purchases');
    const body = document.getElementById('purchasesTableBody');
    if (!body) return;
    const rows = result.data || [];
    body.innerHTML = rows.length ? rows.map(purchase => `<tr>
      <td>#${purchase.id}</td>
      <td>${posEscape(purchase.supplier_name || 'بێ کۆمپانیا')}</td>
      <td>${formatNumber(purchase.item_count)}</td>
      <td>${formatNumber(purchase.total_amount)} IQD</td>
      <td>${formatNumber(purchase.paid_amount)} IQD</td>
      <td>${posEscape(new Date(purchase.purchased_at).toLocaleDateString('ku-IQ'))}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="pos-empty">هیچ کڕینێک تۆمار نەکراوە</td></tr>';
    await loadSupplierBalances();
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی کڕینەکان', 'error');
  }
}

async function loadSupplierBalances() {
  const result = await posApiCall('/pos/suppliers');
  const body = document.getElementById('supplierBalancesTableBody');
  if (!body) return;
  const suppliers = result.data || [];
  body.innerHTML = suppliers.length ? suppliers.map(supplier => `<tr>
    <td>${posEscape(supplier.name)}</td>
    <td>${posEscape(supplier.phone || '-')}</td>
    <td class="${Number(supplier.balance) > 0 ? 'pos-debt' : 'pos-credit'}">${formatNumber(supplier.balance)} IQD</td>
  </tr>`).join('') : '<tr><td colspan="3" class="pos-empty">کۆمپانیا نییە</td></tr>';
}

async function recordSupplierPayment(event) {
  event.preventDefault();
  const supplierId = document.getElementById('supplierPaymentSupplier').value;
  const amount = Number(document.getElementById('supplierPaymentAmount').value);
  if (!supplierId || !Number.isFinite(amount) || amount <= 0) {
    showToast('کۆمپانیا و بڕی پارە دروست هەڵبژێرە', 'error');
    return;
  }
  try {
    const result = await posApiCall(`/pos/suppliers/${supplierId}/payments`, 'POST', {
      amount,
      notes: document.getElementById('supplierPaymentNotes').value.trim()
    });
    if (!result.success) throw new Error(result.message || 'هەڵە لە تۆمارکردنی پارەدان');
    event.target.reset();
    showToast('پارەدانی کۆمپانیا تۆمارکرا');
    await loadSupplierBalances();
    await loadCashSummary();
  } catch (err) {
    showToast(err.message || 'هەڵە لە تۆمارکردنی پارەدانی کۆمپانیا', 'error');
  }
}

async function recordPurchase(event) {
  event.preventDefault();
  const items = Array.from(document.querySelectorAll('#purchaseItems .pos-line-row')).map(row => ({
    product_id: Number(row.querySelector('.purchase-product').value),
    quantity: Number(row.querySelector('.purchase-quantity').value),
    unit_cost: Number(row.querySelector('.purchase-unit-cost').value)
  }));
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  const paidAmount = Number(document.getElementById('purchasePaidAmount').value);
  if (!items.length || items.some(item => !item.product_id || !Number.isInteger(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unit_cost) || item.unit_cost < 0)) {
    showToast('تکایە کاڵا و بڕ و نرخی کڕین دروست بنووسە', 'error');
    return;
  }
  if (!total || !Number.isFinite(paidAmount) || paidAmount < 0 || paidAmount > total) {
    showToast('پارەدراو نابێت لە کۆی کڕین زیاتر بێت', 'error');
    return;
  }
  try {
    const result = await posApiCall('/pos/purchases', 'POST', {
      supplier_id: document.getElementById('purchaseSupplier').value || null,
      items,
      paid_amount: paidAmount,
      notes: document.getElementById('purchaseNotes').value.trim()
    });
    if (!result.success) throw new Error(result.message || 'هەڵە لە تۆمارکردنی کڕین');
    showToast('کڕین تۆمارکرا و ستۆک نوێکرایەوە');
    document.getElementById('purchaseForm').reset();
    document.getElementById('purchaseItems').innerHTML = '';
    addPurchaseItemRow();
    await loadPurchasesPage();
    await loadDashboard();
  } catch (err) {
    showToast(err.message || 'هەڵە لە تۆمارکردنی کڕین', 'error');
  }
}

async function loadExpenses() {
  try {
    const result = await posApiCall('/pos/expenses');
    const body = document.getElementById('expensesTableBody');
    if (!body) return;
    const rows = result.data || [];
    body.innerHTML = rows.length ? rows.map(expense => `<tr>
      <td>${posEscape(expense.category)}</td>
      <td>${posEscape(expense.description)}</td>
      <td>${formatNumber(expense.amount)} IQD</td>
      <td>${posEscape(new Date(expense.spent_at).toLocaleDateString('ku-IQ'))}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="pos-empty">هیچ خەرجییەک تۆمار نەکراوە</td></tr>';
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی خەرجییەکان', 'error');
  }
}

async function recordExpense(event) {
  event.preventDefault();
  const data = {
    category: document.getElementById('expenseCategory').value,
    description: document.getElementById('expenseDescription').value.trim(),
    amount: Number(document.getElementById('expenseAmount').value),
    notes: document.getElementById('expenseNotes').value.trim()
  };
  try {
    const result = await posApiCall('/pos/expenses', 'POST', data);
    if (!result.success) throw new Error(result.message || 'هەڵە لە تۆمارکردنی خەرجی');
    event.target.reset();
    showToast('خەرجی تۆمارکرا');
    await loadExpenses();
    await loadCashSummary();
  } catch (err) {
    showToast(err.message || 'هەڵە لە تۆمارکردنی خەرجی', 'error');
  }
}

async function loadReturnsPage() {
  try {
    const [returnsResult, salesResult] = await Promise.all([
      posApiCall('/pos/returns'),
      posApiCall('/sales?limit=100')
    ]);
    const select = document.getElementById('returnSaleId');
    if (select) {
      select.innerHTML = '<option value="">فرۆشتن هەڵبژێرە</option>' +
        (salesResult.data || []).map(sale => `
          <option value="${sale.id}" data-quantity="${sale.quantity}">
            #${sale.id} - ${posEscape(sale.product_name)} - ${formatNumber(sale.quantity)} دانە
          </option>
        `).join('');
    }
    const body = document.getElementById('returnsTableBody');
    if (!body) return;
    const rows = returnsResult.data || [];
    body.innerHTML = rows.length ? rows.map(item => `<tr>
      <td>${posEscape(item.product_name)}</td>
      <td>#${item.sale_id}</td>
      <td>${formatNumber(item.quantity)}</td>
      <td>${formatNumber(item.refund_amount)} IQD</td>
      <td>${posEscape(item.customer_name || '-')}</td>
      <td>${posEscape(new Date(item.returned_at).toLocaleDateString('ku-IQ'))}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="pos-empty">هیچ کاڵایەک نەگەڕێندراوەتەوە</td></tr>';
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی گەڕاندنەوەکان', 'error');
  }
}

async function recordSaleReturn(event) {
  event.preventDefault();
  const saleId = document.getElementById('returnSaleId').value;
  const quantity = Number(document.getElementById('returnQuantity').value);
  const selected = document.getElementById('returnSaleId').selectedOptions[0];
  if (!saleId || !Number.isInteger(quantity) || quantity <= 0 || quantity > Number(selected.dataset.quantity)) {
    showToast('فرۆشتن و بڕی گەڕاندنەوە دروست هەڵبژێرە', 'error');
    return;
  }
  try {
    const result = await posApiCall('/pos/returns', 'POST', {
      sale_id: Number(saleId),
      quantity,
      notes: document.getElementById('returnNotes').value.trim()
    });
    if (!result.success) throw new Error(result.message || 'هەڵە لە گەڕاندنەوە');
    showToast(`کاڵا گەڕێندرایەوە؛ ${formatNumber(result.data.refund_amount)} IQD`);
    event.target.reset();
    await loadReturnsPage();
    await loadSalesSummary();
    await loadDashboard();
  } catch (err) {
    showToast(err.message || 'هەڵە لە گەڕاندنەوە', 'error');
  }
}

async function loadCashSummary() {
  const params = new URLSearchParams();
  const fromDate = document.getElementById('cashFromDate')?.value || '';
  const toDate = document.getElementById('cashToDate')?.value || '';
  if (fromDate) params.set('from_date', fromDate);
  if (toDate) params.set('to_date', toDate);
  try {
    const result = await posApiCall(`/pos/cash-summary?${params.toString()}`);
    const data = result.data || {};
    const cards = [
      ['کۆی فرۆشتن', data.sales_total],
      ['پارەی وەرگیراو لە فرۆشتن', data.sales_received],
      ['وەرگرتنی قەرز', data.customer_payments],
      ['پارەدانی کۆمپانیا', data.supplier_payments],
      ['پارەی کڕین', data.purchases_paid],
      ['خەرجی', data.expenses],
      ['پارەی گەڕاوە', data.refunds],
      ['باڵانسی کاش', data.cash_balance]
    ];
    const target = document.getElementById('cashSummary');
    if (target) target.innerHTML = cards.map(([label, amount]) => `
      <div class="pos-summary-card"><span>${label}</span><strong>${formatNumber(amount)} IQD</strong></div>
    `).join('');
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی ڕاپۆرتی کاش', 'error');
  }
}

async function loadPosSettings() {
  try {
    const result = await posApiCall('/pos/settings');
    posSettings = { ...defaultPosSettings, ...(result.data || {}) };
    const form = document.getElementById('posSettingsForm');
    if (form) {
      Object.keys(defaultPosSettings).forEach(key => {
        form.elements[key].checked = posSettings[key] === 'true';
      });
    }
    applyPosSettings();
  } catch (err) {
    showToast(err.message || 'هەڵە لە هێنانی ڕێکخستنەکان', 'error');
  }
}

async function savePosSettings(event) {
  event.preventDefault();
  const form = event.target;
  const settings = Object.fromEntries(Object.keys(defaultPosSettings).map(key =>
    [key, String(form.elements[key].checked)]
  ));
  try {
    const result = await posApiCall('/pos/settings', 'PUT', settings);
    if (!result.success) throw new Error(result.message || 'هەڵە لە پاشەکەوتکردن');
    posSettings = { ...defaultPosSettings, ...result.data };
    applyPosSettings();
    showToast('ڕێکخستنەکان پاشەکەوت کران');
  } catch (err) {
    showToast(err.message || 'هەڵە لە پاشەکەوتکردنی ڕێکخستنەکان', 'error');
  }
}

function applyPosSettings() {
  document.body.classList.toggle('compact-mobile', posSettings.compact_mobile === 'true');
  const alerts = document.querySelector('.dashboard-alert-preview');
  const alertCard = document.querySelector('.alert-card-interactive');
  if (alerts) alerts.style.display = posSettings.show_low_stock_alerts === 'false' ? 'none' : '';
  if (alertCard) alertCard.style.display = posSettings.show_low_stock_alerts === 'false' ? 'none' : '';
  const expiryNav = document.querySelector('.nav-item[data-page="expiry"]');
  const expiryShortcut = Array.from(document.querySelectorAll('.quick-action-card'))
    .find(button => button.getAttribute('onclick') === "switchPage('expiry')");
  const showExpiry = posSettings.show_expiry_alerts !== 'false';
  if (expiryNav) expiryNav.style.display = showExpiry ? '' : 'none';
  if (expiryShortcut) expiryShortcut.style.display = showExpiry ? '' : 'none';
}

async function startBarcodeScanner() {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
    showToast('سکانکەری بارکۆد لەم وێبگەڕەدا بەردەست نییە؛ ژمارەی بارکۆد بە دەستی بنووسە', 'info');
    document.getElementById('searchInput')?.focus();
    return;
  }
  try {
    const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'];
    const supportedFormats = typeof BarcodeDetector.getSupportedFormats === 'function'
      ? await BarcodeDetector.getSupportedFormats()
      : formats;
    const acceptedFormats = formats.filter(format => supportedFormats.includes(format));
    if (!acceptedFormats.length) {
      showToast('جۆری بارکۆدەکە پشتگیری ناکرێت؛ بە دەستی بگەڕێ', 'info');
      return;
    }

    const detector = new BarcodeDetector({ formats: acceptedFormats });
    const video = document.getElementById('barcodeScannerVideo');
    barcodeStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    video.srcObject = barcodeStream;
    await video.play();
    barcodeScanActive = true;
    openModal('barcodeScannerModal');

    const scanFrame = async () => {
      if (!barcodeScanActive) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const codes = await detector.detect(video);
          if (codes.length && codes[0].rawValue) {
            document.getElementById('searchInput').value = codes[0].rawValue;
            stopBarcodeScanner();
            closeModal('barcodeScannerModal');
            debounceSearch();
            return;
          }
        } catch (err) {
          stopBarcodeScanner();
          closeModal('barcodeScannerModal');
          showToast('نەتوانرا بارکۆد بخوێندرێتەوە', 'error');
          return;
        }
      }
      if (barcodeScanActive) requestAnimationFrame(scanFrame);
    };
    requestAnimationFrame(scanFrame);
  } catch (err) {
    stopBarcodeScanner();
    closeModal('barcodeScannerModal');
    showToast('کامێرا نەکراوە؛ مۆڵەتی کامێرا بدە یان بارکۆدەکە بە دەستی بنووسە', 'error');
  }
}

function stopBarcodeScanner() {
  barcodeScanActive = false;
  if (barcodeStream) {
    barcodeStream.getTracks().forEach(track => track.stop());
    barcodeStream = null;
  }
  const video = document.getElementById('barcodeScannerVideo');
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}
