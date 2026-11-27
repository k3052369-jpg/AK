/**
 * SAFE POS V6.0.1 - Kurdish 30-Module Controller & Multi-Tab Workspace
 * Written in 100% Vanilla JavaScript, HTML & CSS
 */

// Global State
let safePosActiveTab = 'main';
let safePosOpenTabs = [{ id: 'main', title: 'سەرەکی', pageId: 'dashboard' }];

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initSafePosLiveClock();
  initSafePosLauncher();
  initSafePosExpenses();
});

// -------------------------------------------------------------
// Live Kurdish Clock & Header (Matching Screenshot)
// -------------------------------------------------------------
function initSafePosLiveClock() {
  function updateClock() {
    const now = new Date();
    const kurdishDays = ['یەک شەممە', 'دوو شەممە', 'سێ شەممە', 'چوار شەممە', 'پێنج شەممە', 'هەینی', 'شەممە'];
    const dayName = kurdishDays[now.getDay()];

    const timeStr = now.toLocaleTimeString('en-US', { hour12: true });
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d} ${dayName}`;

    const timeEl = document.getElementById('safePosClockTime');
    const dateEl = document.getElementById('safePosClockDate');
    if (timeEl) timeEl.textContent = timeStr;
    if (dateEl) dateEl.textContent = dateStr;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

function initSafePosLauncher() {
  const dInput = document.getElementById('safeExpenseDate');
  if (dInput && !dInput.value) {
    dInput.value = new Date().toISOString().slice(0, 10);
  }
}

// -------------------------------------------------------------
// Dynamic Multi-Tab System
// -------------------------------------------------------------
function openPosTab(tabId, title, pageId) {
  const tabsBar = document.getElementById('safePosTabsBar');
  if (!tabsBar) {
    switchPage(pageId);
    return;
  }

  let existing = safePosOpenTabs.find(t => t.id === tabId);
  if (!existing) {
    safePosOpenTabs.push({ id: tabId, title, pageId });

    const tabEl = document.createElement('div');
    tabEl.className = 'safe-pos-tab';
    tabEl.setAttribute('data-tab', tabId);
    tabEl.onclick = () => switchSafePosTab(tabId);
    tabEl.innerHTML = `
      <span class="tab-close" onclick="closeSafePosTab('${tabId}', event)">✕</span>
      <span>${title}</span>
    `;
    tabsBar.appendChild(tabEl);
  }

  switchSafePosTab(tabId);
}

function switchSafePosTab(tabName) {
  safePosActiveTab = tabName;
  const tabObj = safePosOpenTabs.find(t => t.id === tabName) || { pageId: 'dashboard' };

  // Update tab UI
  document.querySelectorAll('.safe-pos-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
  });

  // Switch displayed section
  switchPage(tabObj.pageId);

  // Trigger data loaders for specific sections
  triggerSectionLoader(tabObj.pageId);
}

function closeSafePosTab(tabName, event) {
  if (event) event.stopPropagation();

  // Don't close 'main'
  if (tabName === 'main') {
    switchSafePosTab('main');
    return;
  }

  const idx = safePosOpenTabs.findIndex(t => t.id === tabName);
  if (idx !== -1) {
    safePosOpenTabs.splice(idx, 1);
  }

  const tabEl = document.querySelector(`.safe-pos-tab[data-tab="${tabName}"]`);
  if (tabEl) tabEl.remove();

  if (safePosActiveTab === tabName) {
    const nextTab = safePosOpenTabs[safePosOpenTabs.length - 1] || { id: 'main' };
    switchSafePosTab(nextTab.id);
  }
}

function triggerSectionLoader(pageId) {
  switch (pageId) {
    case 'sales-invoices': loadSalesInvoices(); break;
    case 'cashier-handover': calcCashierHandover(); break;
    case 'damaged': loadDamagedItems(); break;
    case 'shelf-tags': renderShelfTags(); break;
    case 'barcode': initBarcodePage(); break;
    case 'purchase-invoices': loadPurchaseInvoicesList(); break;
    case 'company-debts': loadCompanyDebts(); break;
    case 'debtors-list': loadDebtorsList(); break;
    case 'debt-collection': initDebtCollectionPage(); break;
    case 'installment-alerts': loadInstallmentAlerts(); break;
    case 'installment-dash': loadInstallmentDashboard(); break;
    case 'installment-report': loadInstallmentReport(); break;
    case 'safe': loadSafePage(); break;
    case 'profits': loadProfitsReport(); break;
    case 'low-stock': loadLowStockItems(); break;
    case 'sales-audit': loadSalesAudit(); break;
    case 'cash-statement': loadCashStatement(); break;
    case 'customer-statement': initCustomerStatementPage(); break;
    case 'purchase-statement': initPurchaseStatementPage(); break;
    case 'purchase-audit': loadPurchaseAudit(); break;
    case 'money-report': loadMoneyReport(); break;
    case 'stocktaking': loadStocktaking(); break;
    case 'system-users': loadSystemUsers(); break;
    case 'expenses': if (typeof loadSafeExpenses === 'function') loadSafeExpenses(); break;
  }
}

// -------------------------------------------------------------
// Helper: Get Shared Local Storage or Mock Data
// -------------------------------------------------------------
function getPOSStorage(key, fallback) {
  try {
    const val = localStorage.getItem('autopart_' + key);
    return val ? JSON.parse(val) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setPOSStorage(key, data) {
  try {
    localStorage.setItem('autopart_' + key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage set error:', e);
  }
}

// -------------------------------------------------------------
// 30-Module Click Dispatcher (Matches Screenshot Grid)
// -------------------------------------------------------------
function handlePosModule(moduleId) {
  switch (moduleId) {
    // --- ROW 1 (Blue) ---
    case 'pos-sell':
      // کاڵا فرۆشتن
      openPosTab('sales', 'کاڵا فرۆشتن', 'sales');
      if (typeof openAddSaleModal === 'function') {
        setTimeout(openAddSaleModal, 250);
      }
      break;

    case 'pos-sales-invoices':
      // وەسڵە فرۆشراوەکان
      openPosTab('sales-invoices', 'وەسڵە فرۆشراوەکان', 'sales-invoices');
      break;

    case 'pos-cashier-handover':
      // پارەوەرگرتن لە کاشێر
      openPosTab('cashier-handover', 'پارەوەرگرتن لە کاشێر', 'cashier-handover');
      break;

    case 'pos-expenses':
      // پارە سەرفکردن
      openPosTab('expenses', 'پارە سەرفکردن', 'expenses');
      break;

    case 'pos-damaged':
      // بەهەدەردراوەکان
      openPosTab('damaged', 'بەهەدەردراوەکان', 'damaged');
      break;

    case 'pos-shelf-tags':
      // نرخ بۆ سەر ڕەفە
      openPosTab('shelf-tags', 'نرخ بۆ سەر ڕەفە', 'shelf-tags');
      break;

    // --- ROW 2 (Navy & Green) ---
    case 'pos-barcode':
      // دروستکردنی بارکۆد
      openPosTab('barcode', 'دروستکردنی بارکۆد', 'barcode');
      break;

    case 'pos-new-item':
      // ناساندنی کاڵای نوێ
      openPosTab('products', 'لیستی کاڵاکان', 'products');
      if (typeof openAddProductModal === 'function') {
        setTimeout(openAddProductModal, 250);
      }
      break;

    case 'pos-items-list':
      // لیستی کاڵاکان
      openPosTab('products', 'لیستی کاڵاکان', 'products');
      break;

    case 'pos-purchase-item':
      // کڕینی کاڵا
      openPosTab('purchases', 'کڕینی کاڵا', 'purchases');
      break;

    case 'pos-purchase-invoices':
      // وەسڵەکڕدراوەکان
      openPosTab('purchase-invoices', 'وەسڵەکڕدراوەکان', 'purchase-invoices');
      break;

    case 'pos-company-debts':
      // قەرزی کۆمپانیاکان
      openPosTab('company-debts', 'قەرزی کۆمپانیاکان', 'company-debts');
      break;

    // --- ROW 3 (Orange & Red) ---
    case 'pos-debtors-list':
      // لیستی قەرزدارەکان
      openPosTab('debtors-list', 'لیستی قەرزدارەکان', 'debtors-list');
      break;

    case 'pos-debt-collection':
      // وەرگرتنەوەی قەرز
      openPosTab('debt-collection', 'وەرگرتنەوەی قەرز', 'debt-collection');
      break;

    case 'pos-installment-alerts':
      // ئاگاداری قیست
      openPosTab('installment-alerts', 'ئاگاداری قیست', 'installment-alerts');
      break;

    case 'pos-installment-dash':
      // داشبۆردی قیست
      openPosTab('installment-dash', 'داشبۆردی قیست', 'installment-dash');
      break;

    case 'pos-installment-report':
      // ڕاپۆرتی قیست
      openPosTab('installment-report', 'ڕاپۆرتی قیست', 'installment-report');
      break;

    case 'pos-safe':
      // قاسە
      openPosTab('safe', 'قاسە', 'safe');
      break;

    // --- ROW 4 (Red) ---
    case 'pos-profits':
      // قازانجەکان
      openPosTab('profits', 'قازانجەکان', 'profits');
      break;

    case 'pos-expired':
      // بەسەرچووەکان
      openPosTab('expiry', 'بەسەرچووەکان', 'expiry');
      break;

    case 'pos-low-stock':
      // کاڵا کەمبووەکان
      openPosTab('low-stock', 'کاڵا کەمبووەکان', 'low-stock');
      break;

    case 'pos-sales-audit':
      // جۆردی فرۆشراوەکان
      openPosTab('sales-audit', 'جۆردی فرۆشراوەکان', 'sales-audit');
      break;

    case 'pos-cash-statement':
      // کەشف حساب پارە
      openPosTab('cash-statement', 'کەشف حساب پارە', 'cash-statement');
      break;

    case 'pos-customer-statement':
      // کەشف حساب کریار
      openPosTab('customer-statement', 'کەشف حساب کریار', 'customer-statement');
      break;

    // --- ROW 5 (Red & Brown) ---
    case 'pos-purchase-statement':
      // کەشف حساب کرین
      openPosTab('purchase-statement', 'کەشف حساب کرین', 'purchase-statement');
      break;

    case 'pos-purchase-audit':
      // جەردی کڕدراوەکان
      openPosTab('purchase-audit', 'جەردی کڕدراوەکان', 'purchase-audit');
      break;

    case 'pos-money-report':
      // ڕاپۆرتی پارە
      openPosTab('money-report', 'ڕاپۆرتی پارە', 'money-report');
      break;

    case 'pos-stocktaking':
      // جەردکردن
      openPosTab('stocktaking', 'جەردکردن', 'stocktaking');
      break;

    case 'pos-system-users':
      // بەکارهێنەری سیستم
      openPosTab('system-users', 'بەکارهێنەری سیستم', 'system-users');
      break;

    case 'pos-backup':
      // پاشەکەوتی داتاکان
      openPosTab('backup', 'پاشەکەوتی داتاکان', 'backup');
      break;

    default:
      showToast(`بەشی ${moduleId} کرایەوە`, 'info');
      break;
  }
}

// =============================================================
// 1. وەسڵە فرۆشراوەکان (Sales Invoices)
// =============================================================
let cachedInvoicesList = [];

async function loadSalesInvoices() {
  const tbody = document.getElementById('salesInvoicesTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/sales');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      cachedInvoicesList = json.data;
    } else {
      cachedInvoicesList = getPOSStorage('sales', []);
    }
  } catch (e) {
    cachedInvoicesList = getPOSStorage('sales', []);
  }

  // If still empty, populate realistic sales sample
  if (cachedInvoicesList.length === 0) {
    cachedInvoicesList = [
      { id: 101, sale_date: new Date().toISOString(), customer_name: 'ئاکۆ عومەر', product_name: 'پەدی بریکی پێشەوە تۆیۆتا', quantity: 2, unit_price: 55000, total_price: 110000, paid_amount: 110000, notes: 'کاش' },
      { id: 102, sale_date: new Date(Date.now() - 86400000).toISOString(), customer_name: 'سەردار محمد', product_name: 'فلتەری هەوا کۆرۆڵا', quantity: 4, unit_price: 11000, total_price: 44000, paid_amount: 20000, notes: 'قەرزدار' },
      { id: 103, sale_date: new Date(Date.now() - 172800000).toISOString(), customer_name: 'ڕێباز عەلی', product_name: 'پلاکی مەکینە بۆش', quantity: 4, unit_price: 15000, total_price: 60000, paid_amount: 60000, notes: 'کاش' }
    ];
    setPOSStorage('sales', cachedInvoicesList);
  }

  renderSalesInvoicesTable(cachedInvoicesList);
}

function filterSalesInvoices() {
  const search = (document.getElementById('invSearchInput')?.value || '').toLowerCase().trim();
  const dateF = document.getElementById('invDateFilter')?.value || 'all';
  const statusF = document.getElementById('invStatusFilter')?.value || 'all';

  const now = new Date();
  const filtered = cachedInvoicesList.filter(inv => {
    const nameMatch = !search ||
      String(inv.customer_name || '').toLowerCase().includes(search) ||
      String(inv.id || '').includes(search) ||
      String(inv.product_name || '').toLowerCase().includes(search);

    let statusMatch = true;
    const due = (Number(inv.total_price) || 0) - (Number(inv.paid_amount) || 0);
    if (statusF === 'paid') statusMatch = due <= 0;
    if (statusF === 'debt') statusMatch = due > 0;

    let dateMatch = true;
    if (dateF !== 'all' && inv.sale_date) {
      const d = new Date(inv.sale_date);
      if (dateF === 'today') dateMatch = d.toDateString() === now.toDateString();
      if (dateF === 'week') dateMatch = (now - d) <= (7 * 86400000);
      if (dateF === 'month') dateMatch = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }

    return nameMatch && statusMatch && dateMatch;
  });

  renderSalesInvoicesTable(filtered);
}

function renderSalesInvoicesTable(list) {
  const tbody = document.getElementById('salesInvoicesTableBody');
  if (!tbody) return;

  let totalIqd = 0;
  let totalPaid = 0;
  let totalDue = 0;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748b">هیچ پسوڵەیەکی فرۆشراو نەدۆزرایەوە</td></tr>';
  } else {
    tbody.innerHTML = list.map(inv => {
      const tot = Number(inv.total_price) || 0;
      const paid = Number(inv.paid_amount !== undefined ? inv.paid_amount : tot);
      const due = Math.max(0, tot - paid);

      totalIqd += tot;
      totalPaid += paid;
      totalDue += due;

      const dateStr = inv.sale_date ? String(inv.sale_date).slice(0, 16).replace('T', ' ') : '-';
      const statusBadge = due <= 0
        ? '<span class="pos-badge success">تەواو دراوە</span>'
        : `<span class="pos-badge danger">قەرزدار (${due.toLocaleString()} د.ع)</span>`;

      return `
        <tr>
          <td><strong>#INV-${inv.id}</strong></td>
          <td>${dateStr}</td>
          <td><strong>${inv.customer_name || 'کڕیاری گشتی'}</strong></td>
          <td>${inv.product_name || 'کاڵا'} (${inv.quantity || 1} دانە)</td>
          <td style="color:#2563eb;font-weight:700">${tot.toLocaleString()} د.ع</td>
          <td style="color:#16a34a;font-weight:700">${paid.toLocaleString()} د.ع</td>
          <td style="color:${due > 0 ? '#dc2626' : '#64748b'};font-weight:700">${due > 0 ? due.toLocaleString() + ' د.ع' : '0'}</td>
          <td>${statusBadge}</td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="viewInvoiceDetails(${inv.id})">👁️ بینین</button>
            <button class="btn btn-primary btn-sm" onclick="printSingleInvoice(${inv.id})">🖨️ چاپ</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const rate1 = rate100 / 100;

  if (document.getElementById('invTotalCount')) document.getElementById('invTotalCount').textContent = list.length;
  if (document.getElementById('invTotalIqd')) document.getElementById('invTotalIqd').textContent = `${totalIqd.toLocaleString()} د.ع`;
  if (document.getElementById('invTotalUsd')) document.getElementById('invTotalUsd').textContent = `$ ${(totalIqd / (rate1 || 1500)).toFixed(2)}`;
  if (document.getElementById('invTotalReceived')) document.getElementById('invTotalReceived').textContent = `${totalPaid.toLocaleString()} د.ع`;
  if (document.getElementById('invTotalDue')) document.getElementById('invTotalDue').textContent = `${totalDue.toLocaleString()} د.ع`;
}

function viewInvoiceDetails(id) {
  const inv = cachedInvoicesList.find(x => x.id === id);
  if (!inv) return;

  const tot = Number(inv.total_price) || 0;
  const paid = Number(inv.paid_amount !== undefined ? inv.paid_amount : tot);
  const due = Math.max(0, tot - paid);

  const html = `
    <div style="border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:12px;text-align:center">
      <h3 style="margin:0;color:#1e3a8a">Auto Part - پسوڵەی فرۆشتن</h3>
      <div style="font-size:13px;color:#64748b">ژمارەی پسوڵە: #INV-${inv.id}</div>
      <div style="font-size:12px;color:#64748b">${inv.sale_date ? String(inv.sale_date).slice(0, 16).replace('T', ' ') : ''}</div>
    </div>
    <div style="margin-bottom:10px">کڕیار: <strong>${inv.customer_name || 'کڕیاری گشتی'}</strong></div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin:12px 0;text-align:right">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:6px">کاڵا</th>
          <th style="padding:6px">دانە</th>
          <th style="padding:6px">نرخ</th>
          <th style="padding:6px">کۆ</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:6px">${inv.product_name || 'بەرهەم'}</td>
          <td style="padding:6px">${inv.quantity || 1}</td>
          <td style="padding:6px">${(Number(inv.unit_price) || tot).toLocaleString()} د.ع</td>
          <td style="padding:6px">${tot.toLocaleString()} د.ع</td>
        </tr>
      </tbody>
    </table>
    <div style="background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #e2e8f0;font-size:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>کۆی پسوڵە:</span><strong>${tot.toLocaleString()} د.ع</strong></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;color:#16a34a"><span>پارەی دراو:</span><strong>${paid.toLocaleString()} د.ع</strong></div>
      <div style="display:flex;justify-content:space-between;color:${due > 0 ? '#dc2626' : '#334155'};font-weight:700"><span>قەرزی ماوە:</span><strong>${due.toLocaleString()} د.ع</strong></div>
    </div>
  `;

  document.getElementById('posInvoiceDetailsBody').innerHTML = html;
  const printBtn = document.getElementById('posInvoiceDetailsPrintBtn');
  if (printBtn) printBtn.onclick = () => printSingleInvoice(id);
  openModal('posInvoiceDetailsModal');
}

function printSingleInvoice(id) {
  window.print();
}

// =============================================================
// 2. پارەوەرگرتن لە کاشێر (Cashier Handover)
// =============================================================
function calcCashierHandover() {
  const sales = getPOSStorage('sales', cachedInvoicesList);
  const now = new Date();
  let todaySalesTotal = 0;

  sales.forEach(s => {
    if (s.sale_date && new Date(s.sale_date).toDateString() === now.toDateString()) {
      todaySalesTotal += Number(s.paid_amount !== undefined ? s.paid_amount : s.total_price) || 0;
    }
  });

  const expEl = document.getElementById('handoverExpectedIqd');
  if (expEl) expEl.value = `${todaySalesTotal.toLocaleString()} د.ع`;
  expEl.dataset.raw = todaySalesTotal;

  renderHandoverHistory();
}

function onHandoverCountChange() {
  const expVal = Number(document.getElementById('handoverExpectedIqd')?.dataset.raw) || 0;
  const actIqd = Number(document.getElementById('handoverActualIqd')?.value) || 0;
  const actUsd = Number(document.getElementById('handoverActualUsd')?.value) || 0;

  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const rate1 = rate100 / 100;
  const totalCountedIqd = actIqd + Math.round(actUsd * rate1);

  const diff = totalCountedIqd - expVal;
  const diffEl = document.getElementById('handoverDiffDisplay');
  if (!diffEl) return;

  if (diff === 0) {
    diffEl.style.background = '#dcfce7';
    diffEl.style.color = '#15803d';
    diffEl.textContent = '✅ بڕەکە تەواو و هاوتایە (0 د.ع)';
  } else if (diff > 0) {
    diffEl.style.background = '#eff6ff';
    diffEl.style.color = '#1d4ed8';
    diffEl.textContent = `➕ زیادی هەیە: +${diff.toLocaleString()} د.ع`;
  } else {
    diffEl.style.background = '#fee2e2';
    diffEl.style.color = '#b91c1c';
    diffEl.textContent = `⚠️ کەمی هەیە: ${diff.toLocaleString()} د.ع`;
  }
}

function saveCashierHandover() {
  const cashier = document.getElementById('handoverCashierName')?.value || 'Admin';
  const actIqd = Number(document.getElementById('handoverActualIqd')?.value) || 0;
  const actUsd = Number(document.getElementById('handoverActualUsd')?.value) || 0;
  const notes = document.getElementById('handoverNotesInput')?.value || 'تەسلیماتی شیفت';
  const expVal = Number(document.getElementById('handoverExpectedIqd')?.dataset.raw) || 0;

  if (actIqd <= 0 && actUsd <= 0) {
    showToast('⚠️ تکایە بڕی پارەی ژمێردراو بنووسە', 'warning');
    return;
  }

  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const rate1 = rate100 / 100;
  const totalCountedIqd = actIqd + Math.round(actUsd * rate1);
  const diff = totalCountedIqd - expVal;

  const record = {
    id: Date.now(),
    date: new Date().toISOString(),
    cashier,
    amount_iqd: actIqd,
    amount_usd: actUsd,
    diff,
    notes
  };

  const history = getPOSStorage('cashier_handovers', []);
  history.unshift(record);
  setPOSStorage('cashier_handovers', history);

  showToast('✅ پارەکە لە کاشێر وەرگیرا و شیفت داخرا', 'success');
  if (document.getElementById('handoverActualIqd')) document.getElementById('handoverActualIqd').value = '';
  if (document.getElementById('handoverActualUsd')) document.getElementById('handoverActualUsd').value = '';
  renderHandoverHistory();
}

function renderHandoverHistory() {
  const tbody = document.getElementById('handoverHistoryBody');
  if (!tbody) return;
  const list = getPOSStorage('cashier_handovers', []);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#64748b">هیچ تۆمارێک نییە</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(h => `
    <tr>
      <td>${String(h.date).slice(0, 16).replace('T', ' ')}</td>
      <td><strong>${h.cashier}</strong></td>
      <td>${h.amount_iqd.toLocaleString()} د.ع ${h.amount_usd > 0 ? `($${h.amount_usd})` : ''}</td>
      <td style="color:${h.diff < 0 ? '#dc2626' : (h.diff > 0 ? '#2563eb' : '#16a34a')};font-weight:700">
        ${h.diff === 0 ? 'ڕێکە' : (h.diff > 0 ? `+${h.diff.toLocaleString()}` : h.diff.toLocaleString())}
      </td>
      <td>${h.notes}</td>
    </tr>
  `).join('');
}

// =============================================================
// 3. بەهەدەردراوەکان (Damaged / Waste Items)
// =============================================================
function loadDamagedItems() {
  const pSelect = document.getElementById('damagedProductSelect');
  const products = getPOSStorage('products', INITIAL_PRODUCTS);

  if (pSelect) {
    pSelect.innerHTML = '<option value="">-- بەرهەمێک هەڵبژێرە --</option>' +
      products.map(p => `<option value="${p.id}" data-price="${p.buy_price_iqd || p.sell_price_iqd || 0}" data-name="${p.name}">${p.name} (ماوە: ${p.quantity})</option>`).join('');
  }

  const damagedList = getPOSStorage('damaged_items', [
    { id: 1, date: new Date().toISOString(), product_id: 1, product_name: 'فلتەری هەوا تۆیۆتا', quantity: 2, loss_iqd: 15000, reason: 'شکانی کاتی داگرتن', notes: 'کارتۆن تەڕببوو' }
  ]);

  let totalQty = 0;
  let totalLoss = 0;

  const tbody = document.getElementById('damagedItemsTableBody');
  if (tbody) {
    if (damagedList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#64748b">هیچ کاڵایەکی بەهەدەرچوو تۆمارنەکراوە</td></tr>';
    } else {
      tbody.innerHTML = damagedList.map(item => {
        totalQty += Number(item.quantity) || 0;
        totalLoss += Number(item.loss_iqd) || 0;
        return `
          <tr>
            <td>${String(item.date).slice(0, 10)}</td>
            <td><strong>${item.product_name}</strong></td>
            <td><code>${item.barcode || '-'}</code></td>
            <td style="color:#dc2626;font-weight:800">${item.quantity} دانە</td>
            <td style="color:#b91c1c;font-weight:700">${Number(item.loss_iqd).toLocaleString()} د.ع</td>
            <td><span class="pos-badge danger">${item.reason}</span></td>
            <td>${item.notes || '-'}</td>
            <td><button class="btn btn-outline btn-sm" onclick="deleteDamagedItem(${item.id})">سڕینەوە</button></td>
          </tr>
        `;
      }).join('');
    }
  }

  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const rate1 = rate100 / 100;

  if (document.getElementById('damagedTotalQty')) document.getElementById('damagedTotalQty').textContent = `${totalQty} دانە`;
  if (document.getElementById('damagedTotalLossIqd')) document.getElementById('damagedTotalLossIqd').textContent = `${totalLoss.toLocaleString()} د.ع`;
  if (document.getElementById('damagedTotalLossUsd')) document.getElementById('damagedTotalLossUsd').textContent = `$ ${(totalLoss / (rate1 || 1500)).toFixed(2)}`;
}

function onDamagedProductSelect() {}

function saveDamagedItem() {
  const pSelect = document.getElementById('damagedProductSelect');
  const pid = Number(pSelect?.value);
  const qty = Number(document.getElementById('damagedQuantity')?.value) || 1;
  const reason = document.getElementById('damagedReasonSelect')?.value || 'عەیبداری';
  const notes = document.getElementById('damagedNotes')?.value || '';

  if (!pid) {
    showToast('⚠️ تکایە بەرهەمێک هەڵبژێرە', 'warning');
    return;
  }

  const opt = pSelect.options[pSelect.selectedIndex];
  const pName = opt.getAttribute('data-name');
  const unitPrice = Number(opt.getAttribute('data-price')) || 5000;
  const totalLoss = unitPrice * qty;

  const damagedList = getPOSStorage('damaged_items', []);
  damagedList.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    product_id: pid,
    product_name: pName,
    quantity: qty,
    loss_iqd: totalLoss,
    reason,
    notes
  });
  setPOSStorage('damaged_items', damagedList);

  // Deduct from product quantity
  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  const prod = products.find(p => p.id === pid);
  if (prod) {
    prod.quantity = Math.max(0, (prod.quantity || 0) - qty);
    setPOSStorage('products', products);
  }

  showToast('✅ کاڵای بەهەدەرچوو تۆمارکرا و لە ستۆک کەمکرایەوە', 'success');
  loadDamagedItems();
}

function deleteDamagedItem(id) {
  let damagedList = getPOSStorage('damaged_items', []);
  damagedList = damagedList.filter(x => x.id !== id);
  setPOSStorage('damaged_items', damagedList);
  showToast('تۆمار سڕایەوە', 'info');
  loadDamagedItems();
}

// =============================================================
// 4. نرخ بۆ سەر ڕەفە (Shelf Price Tags)
// =============================================================
function renderShelfTags() {
  const grid = document.getElementById('shelfTagsGrid');
  if (!grid) return;

  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  const search = (document.getElementById('shelfSearchInput')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('shelfCategoryFilter')?.value || 'all';

  const catSelect = document.getElementById('shelfCategoryFilter');
  if (catSelect && catSelect.options.length <= 1) {
    const cats = getPOSStorage('categories', INITIAL_CATEGORIES);
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.name;
      catSelect.appendChild(o);
    });
  }

  const filtered = products.filter(p => {
    const matchName = !search || String(p.name).toLowerCase().includes(search) || String(p.barcode).includes(search);
    const matchCat = cat === 'all' || String(p.category_id) === cat;
    return matchName && matchCat;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:30px;color:#64748b">هیچ بەرهەمێک نەدۆزرایەوە</div>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="shelf-tag-card">
      <div class="tag-header">Auto Part &bull; ڕەفە: ${p.location || 'A-01'}</div>
      <div class="tag-title">${p.name}</div>
      <div style="font-size:11px;color:#64748b">${p.model || p.part_number || ''}</div>
      <div class="tag-price-iqd">${Number(p.sell_price_iqd || 0).toLocaleString()} د.ع</div>
      <div class="tag-price-usd">$ ${(Number(p.sell_price_usd) || 0).toFixed(2)}</div>
      <div class="tag-barcode">|||| ${p.barcode || '8934500101'} ||||</div>
    </div>
  `).join('');
}

// =============================================================
// 5. دروستکردنی بارکۆد (Barcode Generator)
// =============================================================
function initBarcodePage() {
  const pSelect = document.getElementById('barcodeProductSelect');
  const products = getPOSStorage('products', INITIAL_PRODUCTS);

  if (pSelect) {
    pSelect.innerHTML = '<option value="">-- بەرهەمێک هەڵبژێرە --</option>' +
      products.map(p => `<option value="${p.id}" data-barcode="${p.barcode || ''}" data-price="${p.sell_price_iqd || 0}" data-name="${p.name}">${p.name}</option>`).join('');
  }

  updateBarcodePreview();
}

function onBarcodeProductSelect() {
  const pSelect = document.getElementById('barcodeProductSelect');
  if (!pSelect) return;
  const opt = pSelect.options[pSelect.selectedIndex];
  if (!opt) return;

  if (document.getElementById('barcodeItemName')) document.getElementById('barcodeItemName').value = opt.getAttribute('data-name') || '';
  if (document.getElementById('barcodeCodeValue')) document.getElementById('barcodeCodeValue').value = opt.getAttribute('data-barcode') || '8934500101';
  if (document.getElementById('barcodeItemPrice')) document.getElementById('barcodeItemPrice').value = opt.getAttribute('data-price') || '15000';

  updateBarcodePreview();
}

function generateRandomBarcode() {
  const code = '893' + Math.floor(1000000 + Math.random() * 9000000);
  if (document.getElementById('barcodeCodeValue')) document.getElementById('barcodeCodeValue').value = code;
  updateBarcodePreview();
}

function updateBarcodePreview() {
  const name = document.getElementById('barcodeItemName')?.value || 'پلاکی مەکینە تۆیۆتا';
  const code = document.getElementById('barcodeCodeValue')?.value || '8934500101';
  const price = Number(document.getElementById('barcodeItemPrice')?.value) || 25000;
  const count = Math.min(30, Number(document.getElementById('barcodePrintCount')?.value) || 12);

  const preview = document.getElementById('barcodePreviewArea');
  if (!preview) return;

  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div style="border:1px solid #000;padding:8px;text-align:center;border-radius:4px;background:#fff">
        <div style="font-size:11px;font-weight:700">Auto Part</div>
        <div style="font-size:12px;font-weight:800;margin:3px 0">${name}</div>
        <div style="font-size:15px;font-weight:900;color:#000">${price.toLocaleString()} د.ع</div>
        <div style="font-family:monospace;letter-spacing:3px;font-size:11px;margin-top:3px">||| ${code} |||</div>
      </div>
    `;
  }
  preview.innerHTML = html;
}

function printBarcodeSheet() {
  window.print();
}

// =============================================================
// 6. وەسڵەکڕدراوەکان (Purchase Invoices)
// =============================================================
async function loadPurchaseInvoicesList() {
  const tbody = document.getElementById('purchaseInvoicesTableBody');
  if (!tbody) return;

  let purchases = [];
  try {
    const res = await fetch('/api/pos/purchases');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) purchases = json.data;
    else purchases = getPOSStorage('purchases_list', []);
  } catch (e) {
    purchases = getPOSStorage('purchases_list', []);
  }

  if (purchases.length === 0) {
    purchases = [
      { id: 201, purchased_at: new Date().toISOString(), supplier_name: 'کۆمپانیای ئەڵمان پارت', total_amount: 1450000, paid_amount: 1450000, item_count: 5, notes: 'کڕینی کاش' },
      { id: 202, purchased_at: new Date(Date.now() - 86400000).toISOString(), supplier_name: 'کۆمپانیای گۆڵدن ئۆتۆ', total_amount: 2200000, paid_amount: 1000000, item_count: 8, notes: 'پێشەکی دراوە' }
    ];
    setPOSStorage('purchases_list', purchases);
  }

  let totPurch = 0;
  let totPaid = 0;
  let totDue = 0;

  tbody.innerHTML = purchases.map(p => {
    const tot = Number(p.total_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    const due = Math.max(0, tot - paid);

    totPurch += tot;
    totPaid += paid;
    totDue += due;

    return `
      <tr>
        <td><strong>#PUR-${p.id}</strong></td>
        <td>${String(p.purchased_at || '').slice(0, 10)}</td>
        <td><strong>${p.supplier_name || 'کۆمپانیا'}</strong></td>
        <td>${p.item_count || 1} بەرهەم</td>
        <td style="color:#2563eb;font-weight:700">${tot.toLocaleString()} د.ع</td>
        <td style="color:#16a34a;font-weight:700">${paid.toLocaleString()} د.ع</td>
        <td style="color:${due > 0 ? '#dc2626' : '#64748b'};font-weight:700">${due > 0 ? due.toLocaleString() + ' د.ع' : '0'}</td>
        <td>${due <= 0 ? '<span class="pos-badge success">تەواو دراوە</span>' : '<span class="pos-badge danger">قەرزدار</span>'}</td>
        <td><button class="btn btn-outline btn-sm" onclick="window.print()">🖨️ چاپ</button></td>
      </tr>
    `;
  }).join('');

  if (document.getElementById('purchTotalCount')) document.getElementById('purchTotalCount').textContent = purchases.length;
  if (document.getElementById('purchTotalAmount')) document.getElementById('purchTotalAmount').textContent = `${totPurch.toLocaleString()} د.ع`;
  if (document.getElementById('purchTotalPaid')) document.getElementById('purchTotalPaid').textContent = `${totPaid.toLocaleString()} د.ع`;
  if (document.getElementById('purchTotalRemaining')) document.getElementById('purchTotalRemaining').textContent = `${totDue.toLocaleString()} د.ع`;
}

// =============================================================
// 7. قەرزی کۆمپانیاکان (Company Debts)
// =============================================================
function loadCompanyDebts() {
  const tbody = document.getElementById('companyDebtsTableBody');
  if (!tbody) return;

  const suppliers = getPOSStorage('companies', INITIAL_COMPANIES);
  const debts = getPOSStorage('supplier_debt_records', [
    { id: 1, name: 'کۆمپانیای ئەڵمان پارت', phone: '0750 445 1234', total_purchased: 4500000, total_paid: 3200000, balance: 1300000 },
    { id: 2, name: 'کۆمپانیای گۆڵدن ئۆتۆ', phone: '0770 152 7890', total_purchased: 3800000, total_paid: 2600000, balance: 1200000 },
    { id: 3, name: 'کۆمپانیای داهێنەر بۆ هاوردە', phone: '0750 889 6543', total_purchased: 2000000, total_paid: 2000000, balance: 0 }
  ]);

  let totalDebt = 0;
  tbody.innerHTML = debts.map(s => {
    totalDebt += s.balance;
    return `
      <tr>
        <td><strong>${s.name}</strong></td>
        <td>${s.phone || '-'}</td>
        <td>${s.total_purchased.toLocaleString()} د.ع</td>
        <td style="color:#16a34a;font-weight:700">${s.total_paid.toLocaleString()} د.ع</td>
        <td style="color:${s.balance > 0 ? '#dc2626' : '#16a34a'};font-weight:800">${s.balance.toLocaleString()} د.ع</td>
        <td>${s.balance > 0 ? '<span class="pos-badge danger">قەرزی ماوە</span>' : '<span class="pos-badge success">هاوتایە</span>'}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="openPaySupplierModal(${s.id}, '${s.name}', ${s.balance})">💳 دانەوەی قەرز</button>
        </td>
      </tr>
    `;
  }).join('');

  if (document.getElementById('compDebtCount')) document.getElementById('compDebtCount').textContent = debts.length;
  if (document.getElementById('compDebtTotal')) document.getElementById('compDebtTotal').textContent = `${totalDebt.toLocaleString()} د.ع`;
}

function openPaySupplierModal(id, name, due) {
  if (document.getElementById('posPaySupplierId')) document.getElementById('posPaySupplierId').value = id;
  if (document.getElementById('posPaySupplierName')) document.getElementById('posPaySupplierName').textContent = name;
  if (document.getElementById('posPaySupplierDue')) document.getElementById('posPaySupplierDue').textContent = `${due.toLocaleString()} د.ع`;
  openModal('posSupplierPayModal');
}

function submitSupplierPayment() {
  const id = Number(document.getElementById('posPaySupplierId')?.value);
  const amt = Number(document.getElementById('posPaySupplierAmount')?.value) || 0;
  if (amt <= 0) {
    showToast('⚠️ تکایە بڕی پارەی دراو بنووسە', 'warning');
    return;
  }

  const debts = getPOSStorage('supplier_debt_records', []);
  const s = debts.find(x => x.id === id);
  if (s) {
    s.total_paid = (s.total_paid || 0) + amt;
    s.balance = Math.max(0, (s.balance || 0) - amt);
    setPOSStorage('supplier_debt_records', debts);
  }

  closeModal('posSupplierPayModal');
  showToast('✅ پارەدان بە کۆمپانیا بە سەرکەوتوویی تۆمارکرا', 'success');
  loadCompanyDebts();
}

// =============================================================
// 8. لیستی قەرزدارەکان (Customer Debtors List)
// =============================================================
function loadDebtorsList() {
  const tbody = document.getElementById('debtorsTableBody');
  if (!tbody) return;

  const customers = getPOSStorage('debtors_records', [
    { id: 1, name: 'سەردار محمد', phone: '07501234567', address: 'هەولێر - تەیراوە', debt: 24000 },
    { id: 2, name: 'شوان کاروان قادر', phone: '07709876543', address: 'سلێمانی - ڕزگاری', debt: 350000 },
    { id: 3, name: 'محمد علی احمد', phone: '07505554433', address: 'هەولێر - بەختیاری', debt: 150000 }
  ]);

  let totalDebt = 0;
  tbody.innerHTML = customers.map(c => {
    totalDebt += c.debt;
    return `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.phone}</td>
        <td>${c.address || '-'}</td>
        <td style="color:#dc2626;font-weight:900">${c.debt.toLocaleString()} د.ع</td>
        <td><span class="pos-badge danger">قەرزدار</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="sendDebtWhatsApp('${c.phone}', '${c.name}', ${c.debt})">📱 واتسئەپ</button>
        </td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="openDebtCollectionForCustomer(${c.id})">💵 وەرگرتنەوەی قەرز</button>
        </td>
      </tr>
    `;
  }).join('');

  if (document.getElementById('debtorsCount')) document.getElementById('debtorsCount').textContent = customers.length;
  if (document.getElementById('debtorsTotalAmount')) document.getElementById('debtorsTotalAmount').textContent = `${totalDebt.toLocaleString()} د.ع`;
}

function sendDebtWhatsApp(phone, name, amount) {
  const msg = encodeURIComponent(`سڵاو کاک ${name}ی بەڕێز، ئاگادارتان دەکەینەوە کە بڕی ${amount.toLocaleString()} دینار قەرزتان لە کۆگای Auto Part ماوە. سوپاس بۆ هاوکاریتان.`);
  window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
}

function printDebtorsReport() {
  window.print();
}

// =============================================================
// 9. وەرگرتنەوەی قەرز (Debt Collection)
// =============================================================
function initDebtCollectionPage() {
  const select = document.getElementById('debtCollectCustomer');
  const debtors = getPOSStorage('debtors_records', [
    { id: 1, name: 'سەردار محمد', debt: 24000 },
    { id: 2, name: 'شوان کاروان قادر', debt: 350000 },
    { id: 3, name: 'محمد علی احمد', debt: 150000 }
  ]);

  if (select) {
    select.innerHTML = '<option value="">-- کڕیارێک هەڵبژێرە --</option>' +
      debtors.map(d => `<option value="${d.id}" data-debt="${d.debt}">${d.name} (قەرز: ${d.debt.toLocaleString()} د.ع)</option>`).join('');
  }

  renderDebtCollectHistory();
}

function onDebtCollectCustomerChange() {
  const select = document.getElementById('debtCollectCustomer');
  const opt = select?.options[select.selectedIndex];
  const debt = Number(opt?.getAttribute('data-debt')) || 0;
  if (document.getElementById('debtCollectBalance')) {
    document.getElementById('debtCollectBalance').textContent = `${debt.toLocaleString()} د.ع`;
  }
}

function openDebtCollectionForCustomer(id) {
  openPosTab('debt-collection', 'وەرگرتنەوەی قەرز', 'debt-collection');
  setTimeout(() => {
    const select = document.getElementById('debtCollectCustomer');
    if (select) {
      select.value = id;
      onDebtCollectCustomerChange();
    }
  }, 200);
}

function saveDebtCollection() {
  const select = document.getElementById('debtCollectCustomer');
  const id = Number(select?.value);
  const amt = Number(document.getElementById('debtCollectAmountIqd')?.value) || 0;
  const method = document.getElementById('debtCollectMethod')?.value || 'کاش';
  const notes = document.getElementById('debtCollectNotes')?.value || 'دانەوەی قەرز';

  if (!id || amt <= 0) {
    showToast('⚠️ تکایە کڕیار و بڕی پارەی دراو دیاری بکە', 'warning');
    return;
  }

  const opt = select.options[select.selectedIndex];
  const custName = opt.text.split('(')[0].trim();

  // Update debtor balance
  const debtors = getPOSStorage('debtors_records', []);
  const d = debtors.find(x => x.id === id);
  if (d) {
    d.debt = Math.max(0, (d.debt || 0) - amt);
    setPOSStorage('debtors_records', debtors);
  }

  // Save history
  const history = getPOSStorage('debt_collections', []);
  history.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    customer_id: id,
    customer_name: custName,
    amount: amt,
    method,
    notes
  });
  setPOSStorage('debt_collections', history);

  showToast('✅ پارەی قەرز وەرگیرا و لە باڵانسی کڕیار کەمکرایەوە', 'success');
  if (document.getElementById('debtCollectAmountIqd')) document.getElementById('debtCollectAmountIqd').value = '';
  initDebtCollectionPage();
}

function renderDebtCollectHistory() {
  const tbody = document.getElementById('debtCollectHistoryBody');
  if (!tbody) return;
  const list = getPOSStorage('debt_collections', []);

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:16px;color:#64748b">هیچ تۆمارێک نییە</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${String(item.date).slice(0, 10)}</td>
      <td><strong>${item.customer_name}</strong></td>
      <td style="color:#16a34a;font-weight:800">${Number(item.amount).toLocaleString()} د.ع</td>
      <td><span class="pos-badge info">${item.method}</span></td>
      <td>${item.notes}</td>
    </tr>
  `).join('');
}

// =============================================================
// 10, 11, 12. قیستەکان (Installments)
// =============================================================
function loadInstallmentAlerts() {
  const tbody = document.getElementById('installmentAlertsTableBody');
  if (!tbody) return;

  const alerts = [
    { customer: 'محمد علی احمد', phone: '07505554433', amount: 150000, date: '2026-11-28', days: '3 ڕۆژ ماوە', status: 'warning' },
    { customer: 'شوان کاروان قادر', phone: '07709876543', amount: 200000, date: '2026-11-20', days: 'دواکەوتووە (5 ڕۆژ)', status: 'danger' },
    { customer: 'بەرهەم جەمیل', phone: '07501112233', amount: 100000, date: '2026-12-05', days: '10 ڕۆژ ماوە', status: 'info' }
  ];

  tbody.innerHTML = alerts.map(a => `
    <tr>
      <td><strong>${a.customer}</strong></td>
      <td>${a.phone}</td>
      <td style="color:#2563eb;font-weight:800">${a.amount.toLocaleString()} د.ع</td>
      <td>${a.date}</td>
      <td><strong style="color:${a.status === 'danger' ? '#dc2626' : '#d97706'}">${a.days}</strong></td>
      <td><span class="pos-badge ${a.status}">${a.status === 'danger' ? '⚠️ دواکەوتووە' : '⏳ نزیکە'}</span></td>
      <td><button class="btn btn-primary btn-sm" onclick="showToast('وەسڵی قیست کرایەوە', 'success')">💳 وەرگرتن</button></td>
    </tr>
  `).join('');
}

function loadInstallmentDashboard() {
  const tbody = document.getElementById('installmentContractsTableBody');
  if (!tbody) return;

  const contracts = getPOSStorage('installment_contracts', [
    { id: 1, customer: 'محمد علی احمد', item: 'تایەر و باتری بۆش', total: 1800000, down: 300000, monthly: 150000, progress: 60, remaining: 600000 },
    { id: 2, customer: 'شوان کاروان قادر', item: 'دەبڵ و جامپەری تۆیۆتا', total: 1200000, down: 200000, monthly: 200000, progress: 40, remaining: 600000 },
    { id: 3, customer: 'بەرهەم جەمیل', item: 'دیسک و پلێت کیا', total: 600000, down: 100000, monthly: 100000, progress: 80, remaining: 100000 }
  ]);

  tbody.innerHTML = contracts.map(c => `
    <tr>
      <td><strong>${c.customer}</strong></td>
      <td>${c.item}</td>
      <td>${c.total.toLocaleString()} د.ع</td>
      <td>${c.down.toLocaleString()} د.ع</td>
      <td style="color:#2563eb;font-weight:700">${c.monthly.toLocaleString()} د.ع</td>
      <td style="min-width:120px">
        <div style="font-size:11px;font-weight:700">${c.progress}% دراوە</div>
        <div class="inst-progress-bar"><div class="inst-progress-fill" style="width:${c.progress}%"></div></div>
      </td>
      <td style="color:#dc2626;font-weight:800">${c.remaining.toLocaleString()} د.ع</td>
      <td><button class="btn btn-outline btn-sm" onclick="showToast('گرێبەستی قیست', 'info')">📄 گرێبەست</button></td>
    </tr>
  `).join('');
}

function openAddInstallmentModal() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  if (document.getElementById('instStartDate')) document.getElementById('instStartDate').value = d.toISOString().slice(0, 10);
  calcMonthlyInstallment();
  openModal('posAddInstallmentModal');
}

function calcMonthlyInstallment() {
  const tot = Number(document.getElementById('instTotalPrice')?.value) || 0;
  const down = Number(document.getElementById('instDownPayment')?.value) || 0;
  const months = Math.max(1, Number(document.getElementById('instMonths')?.value) || 6);

  const rem = Math.max(0, tot - down);
  const monthly = Math.round(rem / months);

  const prev = document.getElementById('instMonthlyPreview');
  if (prev) prev.textContent = `${monthly.toLocaleString()} د.ع / مانگانە (${months} قیست)`;
}

function submitInstallmentContract() {
  const cust = document.getElementById('instCustName')?.value.trim();
  const item = document.getElementById('instItemName')?.value.trim();
  const tot = Number(document.getElementById('instTotalPrice')?.value) || 0;
  const down = Number(document.getElementById('instDownPayment')?.value) || 0;
  const months = Number(document.getElementById('instMonths')?.value) || 6;

  if (!cust || !item || tot <= 0) {
    showToast('⚠️ تکایە ناوی کڕیار، کاڵا و کۆی نرخ بنووسە', 'warning');
    return;
  }

  const monthly = Math.round((tot - down) / months);
  const contracts = getPOSStorage('installment_contracts', []);
  contracts.unshift({
    id: Date.now(),
    customer: cust,
    item,
    total: tot,
    down,
    monthly,
    progress: Math.round((down / tot) * 100),
    remaining: tot - down
  });
  setPOSStorage('installment_contracts', contracts);

  closeModal('posAddInstallmentModal');
  showToast('✅ گرێبەستی قیست بە سەرکەوتوویی تۆمارکرا', 'success');
  loadInstallmentDashboard();
}

function loadInstallmentReport() {
  const tbody = document.getElementById('installmentReportTableBody');
  if (!tbody) return;
  const contracts = getPOSStorage('installment_contracts', []);

  tbody.innerHTML = contracts.map(c => `
    <tr>
      <td><strong>${c.customer}</strong></td>
      <td>${c.total.toLocaleString()} د.ع</td>
      <td style="color:#16a34a;font-weight:700">${(c.total - c.remaining).toLocaleString()} د.ع</td>
      <td style="color:#dc2626;font-weight:800">${c.remaining.toLocaleString()} د.ع</td>
      <td>${c.monthly.toLocaleString()} د.ع (مانگانە)</td>
      <td><span class="pos-badge success">چالاکە</span></td>
    </tr>
  `).join('');
}

// =============================================================
// 13. قاسە (Safe & Cash Register)
// =============================================================
function loadSafePage() {
  const sales = getPOSStorage('sales', cachedInvoicesList);
  const expenses = getPOSStorage('pos_expenses', []);
  const transfers = getPOSStorage('safe_transfers', []);

  let totalInflow = 0;
  let totalOutflow = 0;

  sales.forEach(s => {
    totalInflow += Number(s.paid_amount !== undefined ? s.paid_amount : s.total_price) || 0;
  });

  expenses.forEach(e => {
    totalOutflow += Number(e.amount_iqd || e.amount) || 0;
  });

  transfers.forEach(t => {
    if (t.type === 'in') totalInflow += Number(t.amount_iqd) || 0;
    if (t.type === 'out') totalOutflow += Number(t.amount_iqd) || 0;
  });

  const baseIqd = 4500000;
  const currentSafeIqd = baseIqd + totalInflow - totalOutflow;

  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const rate1 = rate100 / 100;
  const currentSafeUsd = (currentSafeIqd / (rate1 || 1500)).toFixed(2);

  if (document.getElementById('safeViewBalanceIqd')) document.getElementById('safeViewBalanceIqd').textContent = `${Math.round(currentSafeIqd).toLocaleString()} د.ع`;
  if (document.getElementById('safeViewBalanceUsd')) document.getElementById('safeViewBalanceUsd').textContent = `$ ${Number(currentSafeUsd).toLocaleString()}`;
  if (document.getElementById('safeTodayInflow')) document.getElementById('safeTodayInflow').textContent = `+${totalInflow.toLocaleString()} د.ع`;
  if (document.getElementById('safeTodayOutflow')) document.getElementById('safeTodayOutflow').textContent = `-${totalOutflow.toLocaleString()} د.ع`;
  if (document.getElementById('safeTodayNet')) document.getElementById('safeTodayNet').textContent = `${(totalInflow - totalOutflow).toLocaleString()} د.ع`;

  renderSafeLedgerTable(transfers);
}

function openSafeTransferModal(type) {
  const titleEl = document.getElementById('posSafeTransferTitle');
  const typeInp = document.getElementById('posSafeTransferType');
  if (typeInp) typeInp.value = type;
  if (titleEl) titleEl.textContent = type === 'in' ? '➕ داخڵکردنی کاش بۆ ناو قاسە' : '➖ ڕاکێشانی کاش لە قاسە';
  openModal('posSafeTransferModal');
}

function submitSafeTransfer() {
  const type = document.getElementById('posSafeTransferType')?.value || 'in';
  const iqd = Number(document.getElementById('posSafeTransferIqd')?.value) || 0;
  const usd = Number(document.getElementById('posSafeTransferUsd')?.value) || 0;
  const notes = document.getElementById('posSafeTransferNotes')?.value || (type === 'in' ? 'تەغزیەی قاسە' : 'ڕاکێشان');

  if (iqd <= 0 && usd <= 0) {
    showToast('⚠️ تکایە بڕی پارە دیاری بکە', 'warning');
    return;
  }

  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const rate1 = rate100 / 100;
  const calcIqd = iqd > 0 ? iqd : Math.round(usd * rate1);
  const calcUsd = usd > 0 ? usd : Number((iqd / rate1).toFixed(2));

  const transfers = getPOSStorage('safe_transfers', []);
  transfers.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    type,
    amount_iqd: calcIqd,
    amount_usd: calcUsd,
    user: 'Admin',
    notes
  });
  setPOSStorage('safe_transfers', transfers);

  closeModal('posSafeTransferModal');
  showToast('💾 جوڵەی قاسە بە سەرکەوتوویی تۆمارکرا', 'success');
  loadSafePage();
}

function renderSafeLedgerTable(transfers) {
  const tbody = document.getElementById('safeLedgerTableBody');
  if (!tbody) return;

  if (transfers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#64748b">هیچ جوڵەیەکی دەستی تۆمارنەکراوە</td></tr>';
    return;
  }

  tbody.innerHTML = transfers.map(t => `
    <tr>
      <td>${String(t.date).slice(0, 16).replace('T', ' ')}</td>
      <td><span class="pos-badge ${t.type === 'in' ? 'success' : 'danger'}">${t.type === 'in' ? 'داخڵکردن (+)' : 'ڕاکێشان (-)'}</span></td>
      <td style="color:${t.type === 'in' ? '#16a34a' : '#dc2626'};font-weight:800">${t.amount_iqd.toLocaleString()} د.ع</td>
      <td>$ ${t.amount_usd.toFixed(2)}</td>
      <td><strong>${t.user || 'Admin'}</strong></td>
      <td>${t.notes}</td>
    </tr>
  `).join('');
}

// =============================================================
// 14. قازانجەکان (Profits & Margins)
// =============================================================
function loadProfitsReport() {
  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  const sales = getPOSStorage('sales', cachedInvoicesList);
  const expenses = getPOSStorage('pos_expenses', []);

  let totalRev = 0;
  let totalCost = 0;
  let totalExp = 0;

  expenses.forEach(e => totalExp += Number(e.amount_iqd || e.amount) || 0);

  const productStats = {};
  products.forEach(p => {
    productStats[p.id] = {
      name: p.name,
      buy: Number(p.buy_price_iqd) || 0,
      sell: Number(p.sell_price_iqd) || 0,
      sold: 0
    };
  });

  sales.forEach(s => {
    const rev = Number(s.total_price) || 0;
    totalRev += rev;
    const pid = s.product_id || 1;
    if (productStats[pid]) {
      productStats[pid].sold += Number(s.quantity) || 1;
      totalCost += (productStats[pid].buy * (Number(s.quantity) || 1));
    } else {
      totalCost += (rev * 0.7); // approximate 30% margin if unlinked
    }
  });

  const grossProfit = totalRev - totalCost;
  const netProfit = grossProfit - totalExp;

  if (document.getElementById('profTotalRevenue')) document.getElementById('profTotalRevenue').textContent = `${totalRev.toLocaleString()} د.ع`;
  if (document.getElementById('profTotalCost')) document.getElementById('profTotalCost').textContent = `${Math.round(totalCost).toLocaleString()} د.ع`;
  if (document.getElementById('profGrossProfit')) document.getElementById('profGrossProfit').textContent = `+${Math.round(grossProfit).toLocaleString()} د.ع`;
  if (document.getElementById('profTotalExpenses')) document.getElementById('profTotalExpenses').textContent = `-${Math.round(totalExp).toLocaleString()} د.ع`;
  if (document.getElementById('profNetProfit')) document.getElementById('profNetProfit').textContent = `${netProfit >= 0 ? '+' : ''}${Math.round(netProfit).toLocaleString()} د.ع`;

  const tbody = document.getElementById('profitsProductTableBody');
  if (tbody) {
    const list = Object.values(productStats).filter(x => x.sold > 0);
    if (list.length === 0) {
      // Mock rows for preview
      tbody.innerHTML = `
        <tr><td>فلتەری هەوا کۆرۆڵا</td><td>14</td><td>7,500 د.ع</td><td>11,000 د.ع</td><td>3,500 د.ع</td><td style="color:#16a34a;font-weight:800">+49,000 د.ع</td><td>31.8%</td></tr>
        <tr><td>پەدی بریکی لاندکرۆزەر</td><td>6</td><td>38,000 د.ع</td><td>55,000 د.ع</td><td>17,000 د.ع</td><td style="color:#16a34a;font-weight:800">+102,000 د.ع</td><td>30.9%</td></tr>
        <tr><td>پلاکی مەکینە بۆش</td><td>20</td><td>10,000 د.ع</td><td>15,000 د.ع</td><td>5,000 د.ع</td><td style="color:#16a34a;font-weight:800">+100,000 د.ع</td><td>33.3%</td></tr>
      `;
    } else {
      tbody.innerHTML = list.map(item => {
        const unitP = item.sell - item.buy;
        const totP = unitP * item.sold;
        const margin = item.sell > 0 ? ((unitP / item.sell) * 100).toFixed(1) : 0;
        return `
          <tr>
            <td><strong>${item.name}</strong></td>
            <td>${item.sold} دانە</td>
            <td>${item.buy.toLocaleString()} د.ع</td>
            <td>${item.sell.toLocaleString()} د.ع</td>
            <td>${unitP.toLocaleString()} د.ع</td>
            <td style="color:#16a34a;font-weight:800">+${totP.toLocaleString()} د.ع</td>
            <td>${margin}%</td>
          </tr>
        `;
      }).join('');
    }
  }
}

// =============================================================
// 15. کاڵا کەمبووەکان (Low Stock Items)
// =============================================================
function loadLowStockItems() {
  const tbody = document.getElementById('lowStockTableBody');
  if (!tbody) return;

  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  const lowItems = products.filter(p => (Number(p.quantity) || 0) <= (Number(p.min_stock) || 5));

  if (lowItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:#16a34a;font-weight:700">✅ مەخزەن پڕە و هیچ کاڵایەک لە کەمیدا نییە</td></tr>';
    return;
  }

  tbody.innerHTML = lowItems.map(p => {
    const qty = Number(p.quantity) || 0;
    const isOut = qty === 0;
    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.category_name || 'پارچە'}</td>
        <td><code>${p.part_number || '-'}</code></td>
        <td>${p.location || 'A-01'}</td>
        <td style="color:${isOut ? '#dc2626' : '#d97706'};font-size:16px;font-weight:900">${qty} دانە</td>
        <td>${p.min_stock || 5} دانە</td>
        <td><span class="pos-badge ${isOut ? 'danger' : 'warning'}">${isOut ? '🚫 تەواوبووە' : '📉 لە کەمیدایە'}</span></td>
        <td><button class="btn btn-primary btn-sm" onclick="switchPage('purchases')">📥 داواکردنی کڕین</button></td>
      </tr>
    `;
  }).join('');
}

// =============================================================
// 16. جۆردی فرۆشراوەکان (Sales Audit)
// =============================================================
function loadSalesAudit() {
  const tbody = document.getElementById('salesAuditTableBody');
  if (!tbody) return;

  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  const list = products.slice(0, 10).map((p, idx) => ({
    rank: idx + 1,
    name: p.name,
    code: p.part_number || 'AUTO-P' + (idx + 1),
    sold: Math.floor(15 + Math.random() * 45),
    revenue: Math.floor(250000 + Math.random() * 950000)
  })).sort((a, b) => b.sold - a.sold);

  tbody.innerHTML = list.map(item => `
    <tr>
      <td><strong>#${item.rank}</strong></td>
      <td><strong>${item.name}</strong></td>
      <td><code>${item.code}</code></td>
      <td style="font-weight:800;color:#2563eb">${item.sold} دانە</td>
      <td style="font-weight:800;color:#16a34a">${item.revenue.toLocaleString()} د.ع</td>
      <td><span class="pos-badge success">پڕفرۆش</span></td>
    </tr>
  `).join('');
}

// =============================================================
// 17. کەشف حساب پارە (Cash Statement)
// =============================================================
function loadCashStatement() {
  const tbody = document.getElementById('cashStatementTableBody');
  if (!tbody) return;

  const rows = [
    { date: '2026-11-25 09:30', type: 'فرۆشتن', desc: 'داهاتی فرۆشتنی کاشی پسوڵە #101', in: 110000, out: 0, balance: 4610000 },
    { date: '2026-11-25 11:15', type: 'مەسروفات', desc: 'کرێی کارەبا و مۆلیدە', in: 0, out: 45000, balance: 4565000 },
    { date: '2026-11-25 14:00', type: 'وەرگرتنەوەی قەرز', desc: 'پارەی وەرگیراو لە کڕیار شوان', in: 150000, out: 0, balance: 4715000 },
    { date: '2026-11-25 16:30', type: 'دانەوە بە کۆمپانیا', desc: 'پارەی دراو بە کۆمپانیای ئەڵمان پارت', in: 0, out: 300000, balance: 4415000 }
  ];

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td><span class="pos-badge ${r.in > 0 ? 'success' : 'danger'}">${r.type}</span></td>
      <td>${r.desc}</td>
      <td style="color:#16a34a;font-weight:700">${r.in > 0 ? `+${r.in.toLocaleString()} د.ع` : '-'}</td>
      <td style="color:#dc2626;font-weight:700">${r.out > 0 ? `-${r.out.toLocaleString()} د.ع` : '-'}</td>
      <td style="font-weight:900;color:#1e3a8a">${r.balance.toLocaleString()} د.ع</td>
    </tr>
  `).join('');
}

// =============================================================
// 18. کەشف حساب کریار (Customer Statement)
// =============================================================
function initCustomerStatementPage() {
  const select = document.getElementById('stmtCustomerSelect');
  const debtors = getPOSStorage('debtors_records', [
    { id: 1, name: 'سەردار محمد', phone: '07501234567', debt: 24000 },
    { id: 2, name: 'شوان کاروان قادر', phone: '07709876543', debt: 350000 },
    { id: 3, name: 'محمد علی احمد', phone: '07505554433', debt: 150000 }
  ]);

  if (select) {
    select.innerHTML = '<option value="">-- کڕیارێک هەڵبژێرە --</option>' +
      debtors.map(d => `<option value="${d.id}" data-phone="${d.phone}" data-debt="${d.debt}" data-name="${d.name}">${d.name}</option>`).join('');
  }
}

function loadCustomerStatement() {
  const select = document.getElementById('stmtCustomerSelect');
  const opt = select?.options[select.selectedIndex];
  if (!opt || !select.value) return;

  const name = opt.getAttribute('data-name');
  const phone = opt.getAttribute('data-phone');
  const debt = Number(opt.getAttribute('data-debt')) || 0;

  if (document.getElementById('stmtCustPhone')) document.getElementById('stmtCustPhone').textContent = phone || '-';
  if (document.getElementById('stmtCustBalance')) document.getElementById('stmtCustBalance').textContent = `${debt.toLocaleString()} د.ع`;
  if (document.getElementById('stmtPrintDetails')) {
    document.getElementById('stmtPrintDetails').innerHTML = `کڕیار: <strong>${name}</strong> | مۆبایل: ${phone} | بەروار: ${new Date().toISOString().slice(0, 10)}`;
  }

  const tbody = document.getElementById('customerStatementTableBody');
  if (!tbody) return;

  const rows = [
    { date: '2026-10-15', type: 'پسوڵەی فرۆشتن', desc: 'کڕینی پادی بریک و فلتەر', plus: debt + 50000, minus: 0, balance: debt + 50000 },
    { date: '2026-11-01', type: 'پارەدان (کاش)', desc: 'دانەوەی بەشێک لە قەرز', plus: 0, minus: 50000, balance: debt }
  ];

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td><strong>${r.type}</strong></td>
      <td>${r.desc}</td>
      <td style="color:#2563eb;font-weight:700">${r.plus > 0 ? r.plus.toLocaleString() + ' د.ع' : '-'}</td>
      <td style="color:#16a34a;font-weight:700">${r.minus > 0 ? r.minus.toLocaleString() + ' د.ع' : '-'}</td>
      <td style="color:#dc2626;font-weight:900">${r.balance.toLocaleString()} د.ع</td>
    </tr>
  `).join('');
}

// =============================================================
// 19. کەشف حساب کرین (Purchase Statement)
// =============================================================
function initPurchaseStatementPage() {
  const select = document.getElementById('stmtSupplierSelect');
  const suppliers = getPOSStorage('companies', INITIAL_COMPANIES);

  if (select) {
    select.innerHTML = '<option value="">-- کۆمپانیایەک هەڵبژێرە --</option>' +
      suppliers.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name}</option>`).join('');
  }
}

function loadSupplierStatement() {
  const select = document.getElementById('stmtSupplierSelect');
  const tbody = document.getElementById('supplierStatementTableBody');
  if (!tbody || !select?.value) return;

  const rows = [
    { date: '2026-10-10', desc: 'وەسڵی کڕینی پارچەی تۆیۆتا #PUR-101', plus: 2500000, minus: 1500000, balance: 1000000 },
    { date: '2026-11-05', desc: 'دانەوەی پارە بە کۆمپانیا بە حەواڵە', plus: 0, minus: 500000, balance: 500000 }
  ];

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.desc}</td>
      <td style="color:#2563eb;font-weight:700">${r.plus > 0 ? r.plus.toLocaleString() + ' د.ع' : '-'}</td>
      <td style="color:#16a34a;font-weight:700">${r.minus > 0 ? r.minus.toLocaleString() + ' د.ع' : '-'}</td>
      <td style="color:#dc2626;font-weight:900">${r.balance.toLocaleString()} د.ع</td>
    </tr>
  `).join('');
}

// =============================================================
// 20. جەردی کڕدراوەکان (Purchases Audit)
// =============================================================
function loadPurchaseAudit() {
  const tbody = document.getElementById('purchaseAuditTableBody');
  if (!tbody) return;

  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  tbody.innerHTML = products.slice(0, 8).map(p => {
    const qty = 20 + Math.floor(Math.random() * 30);
    const cost = qty * (p.buy_price_iqd || 10000);
    return `
      <tr>
        <td><strong>${p.name}</strong></td>
        <td><code>${p.part_number || '-'}</code></td>
        <td style="font-weight:800;color:#2563eb">${qty} دانە</td>
        <td style="font-weight:800;color:#16a34a">${cost.toLocaleString()} د.ع</td>
        <td>${(p.buy_price_iqd || 10000).toLocaleString()} د.ع</td>
      </tr>
    `;
  }).join('');
}

// =============================================================
// 21. ڕاپۆرتی پارە (Financial Statement)
// =============================================================
function loadMoneyReport() {
  const rev = 24500000;
  const cost = 16200000;
  const gross = rev - cost;
  const exp = 1450000;
  const net = gross - exp;

  if (document.getElementById('finReportSales')) document.getElementById('finReportSales').textContent = `${rev.toLocaleString()} د.ع`;
  if (document.getElementById('finReportCost')) document.getElementById('finReportCost').textContent = `${cost.toLocaleString()} د.ع`;
  if (document.getElementById('finReportGross')) document.getElementById('finReportGross').textContent = `${gross.toLocaleString()} د.ع`;
  if (document.getElementById('finReportExpenses')) document.getElementById('finReportExpenses').textContent = `${exp.toLocaleString()} د.ع`;
  if (document.getElementById('finReportNet')) document.getElementById('finReportNet').textContent = `+${net.toLocaleString()} د.ع`;
}

// =============================================================
// 22. جەردکردن (Stocktaking & Reconciliation)
// =============================================================
function loadStocktaking() {
  const tbody = document.getElementById('stocktakingTableBody');
  if (!tbody) return;

  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  let matched = 0;
  let diffCount = 0;

  tbody.innerHTML = products.map((p, idx) => {
    matched++;
    return `
      <tr data-id="${p.id}" data-sys="${p.quantity || 0}">
        <td><strong>${p.name}</strong></td>
        <td><code>${p.barcode || '-'}</code></td>
        <td>${p.location || 'A-01'}</td>
        <td style="font-weight:700">${p.quantity || 0}</td>
        <td>
          <input type="number" class="stock-count-input" id="stockInp_${p.id}" value="${p.quantity || 0}" oninput="onStocktakingInputChange(${p.id})">
        </td>
        <td id="stockDiff_${p.id}" style="font-weight:800;color:#16a34a">0 (یەکسانە)</td>
        <td id="stockStatus_${p.id}"><span class="pos-badge success">هاوتایە</span></td>
      </tr>
    `;
  }).join('');

  if (document.getElementById('stocktakingTotalItems')) document.getElementById('stocktakingTotalItems').textContent = products.length;
  if (document.getElementById('stocktakingMatched')) document.getElementById('stocktakingMatched').textContent = matched;
  if (document.getElementById('stocktakingDiffs')) document.getElementById('stocktakingDiffs').textContent = diffCount;
}

function onStocktakingInputChange(id) {
  const inp = document.getElementById(`stockInp_${id}`);
  const row = inp?.closest('tr');
  const sysVal = Number(row?.getAttribute('data-sys')) || 0;
  const actualVal = Number(inp?.value) || 0;

  const diff = actualVal - sysVal;
  const diffEl = document.getElementById(`stockDiff_${id}`);
  const statEl = document.getElementById(`stockStatus_${id}`);

  if (!diffEl || !statEl) return;

  if (diff === 0) {
    diffEl.style.color = '#16a34a';
    diffEl.textContent = '0 (یەکسانە)';
    statEl.innerHTML = '<span class="pos-badge success">هاوتایە</span>';
  } else if (diff > 0) {
    diffEl.style.color = '#2563eb';
    diffEl.textContent = `+${diff} (زیادی)`;
    statEl.innerHTML = '<span class="pos-badge info">زیادی هەیە</span>';
  } else {
    diffEl.style.color = '#dc2626';
    diffEl.textContent = `${diff} (کەمی)`;
    statEl.innerHTML = '<span class="pos-badge danger">کەمی هەیە</span>';
  }
}

function reconcileStocktaking() {
  const products = getPOSStorage('products', INITIAL_PRODUCTS);
  let changed = 0;

  products.forEach(p => {
    const inp = document.getElementById(`stockInp_${p.id}`);
    if (inp) {
      const val = Number(inp.value);
      if (!isNaN(val) && val !== p.quantity) {
        p.quantity = val;
        changed++;
      }
    }
  });

  setPOSStorage('products', products);
  showToast(`✅ مەخزەن یەکسانکرا! ژمارەی ${changed} بەرهەم دەستکاریکرا`, 'success');
  loadStocktaking();
}

// =============================================================
// 23. بەکارهێنەری سیستم (System Users)
// =============================================================
function loadSystemUsers() {
  const tbody = document.getElementById('systemUsersTableBody');
  if (!tbody) return;

  const users = getPOSStorage('system_users', [
    { id: 1, username: 'admin', fullName: 'ئەدمینی سەرەکی', role: 'admin', status: 'active', createdAt: '2026-01-01' },
    { id: 2, username: 'cashier1', fullName: 'کارمەندی فرۆشتن', role: 'cashier', status: 'active', createdAt: '2026-02-15' }
  ]);

  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.fullName}</td>
      <td><span class="pos-badge ${u.role === 'admin' ? 'info' : 'warning'}">${u.role === 'admin' ? 'بەڕێوەبەر (Admin)' : 'کاشێر (Cashier)'}</span></td>
      <td><span class="pos-badge success">🟢 چالاکە</span></td>
      <td>${u.createdAt}</td>
      <td>
        ${u.username !== 'admin' ? `<button class="btn btn-outline btn-sm" onclick="deleteUser(${u.id})">سڕینەوە</button>` : '<span style="color:#64748b;font-size:12px">پارێزراوە</span>'}
      </td>
    </tr>
  `).join('');
}

function openAddUserModal() {
  openModal('posAddUserModal');
}

function submitNewUser() {
  const u = document.getElementById('newUsername')?.value.trim();
  const f = document.getElementById('newUserFullName')?.value.trim();
  const p = document.getElementById('newUserPassword')?.value;
  const r = document.getElementById('newUserRole')?.value || 'cashier';

  if (!u || !f || !p) {
    showToast('⚠️ تکایە هەموو خانەکان پڕبکەرەوە', 'warning');
    return;
  }

  const users = getPOSStorage('system_users', []);
  users.push({
    id: Date.now(),
    username: u,
    fullName: f,
    role: r,
    status: 'active',
    createdAt: new Date().toISOString().slice(0, 10)
  });
  setPOSStorage('system_users', users);

  closeModal('posAddUserModal');
  showToast('✅ بەکارهێنەری نوێ زیادکرا', 'success');
  loadSystemUsers();
}

function deleteUser(id) {
  let users = getPOSStorage('system_users', []);
  users = users.filter(u => u.id !== id);
  setPOSStorage('system_users', users);
  showToast('بەکارهێنەر سڕایەوە', 'info');
  loadSystemUsers();
}

// =============================================================
// 24. پاشەکەوتی داتاکان (Data Backup & Restore)
// =============================================================
function triggerPosBackup() {
  showToast('💾 ئامادەکردنی باکئەپی داتاکان...', 'info');

  const backup = {
    system: 'Auto Part POS V6.0.1',
    date: new Date().toISOString(),
    data: {
      products: getPOSStorage('products', INITIAL_PRODUCTS),
      categories: getPOSStorage('categories', INITIAL_CATEGORIES),
      companies: getPOSStorage('companies', INITIAL_COMPANIES),
      sales: getPOSStorage('sales', cachedInvoicesList),
      expenses: getPOSStorage('pos_expenses', []),
      debtors: getPOSStorage('debtors_records', []),
      safe_transfers: getPOSStorage('safe_transfers', []),
      installments: getPOSStorage('installment_contracts', [])
    }
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `autopart_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setTimeout(() => showToast('✅ باکئەپ بە سەرکەوتوویی دابەزی', 'success'), 600);
}

function handleRestoreBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.data) {
        if (parsed.data.products) setPOSStorage('products', parsed.data.products);
        if (parsed.data.categories) setPOSStorage('categories', parsed.data.categories);
        if (parsed.data.companies) setPOSStorage('companies', parsed.data.companies);
        if (parsed.data.sales) setPOSStorage('sales', parsed.data.sales);
        if (parsed.data.expenses) setPOSStorage('pos_expenses', parsed.data.expenses);
        if (parsed.data.debtors) setPOSStorage('debtors_records', parsed.data.debtors);

        showToast('✅ داتاکان لە باکئەپەوە بە سەرکەوتوویی گەڕێندرانەوە!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast('⚠️ فایلی باکئەپ شێوازی دروست نییە', 'error');
      }
    } catch (err) {
      showToast('هەڵە لە خوێندنەوەی باکئەپ: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// =============================================================
// SAFE POS EXPENSES LOGIC (پارە سەرفکردن)
// =============================================================
let safeExpensesData = [];

function initSafePosExpenses() {
  const dInput = document.getElementById('safeExpenseDate');
  if (dInput && !dInput.value) {
    dInput.value = new Date().toISOString().slice(0, 10);
  }
}

function onSafeExpenseIqdChange(iqdVal) {
  const iqd = parseFloat(iqdVal) || 0;
  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const ratePerDollar = rate100 / 100;
  const usdInput = document.getElementById('safeExpenseUsd');
  if (usdInput && iqd > 0 && ratePerDollar > 0) {
    usdInput.value = (iqd / ratePerDollar).toFixed(2);
  } else if (usdInput && iqd === 0) {
    usdInput.value = '';
  }
}

function onSafeExpenseUsdChange(usdVal) {
  const usd = parseFloat(usdVal) || 0;
  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const ratePerDollar = rate100 / 100;
  const iqdInput = document.getElementById('safeExpenseIqd');
  if (iqdInput && usd > 0 && ratePerDollar > 0) {
    iqdInput.value = Math.round(usd * ratePerDollar);
  } else if (iqdInput && usd === 0) {
    iqdInput.value = '';
  }
}

function setSafeExpenseCategory(catName) {
  const catSelect = document.getElementById('safeExpenseCategory');
  if (catSelect) catSelect.value = catName;
}

async function loadSafeExpenses() {
  try {
    const showAll = document.getElementById('safeExpenseShowAll')?.checked;
    const fFrom = document.getElementById('safeExpenseFilterFrom')?.value;
    const fTo = document.getElementById('safeExpenseFilterTo')?.value;
    const fCat = document.getElementById('safeExpenseFilterCategory')?.value;

    let url = `/api/expenses?`;
    if (showAll) {
      url += `show_all=true`;
    } else {
      if (fFrom) url += `from_date=${fFrom}&`;
      if (fTo) url += `to_date=${fTo}&`;
    }
    if (fCat && fCat !== 'هەمووی') {
      url += `category=${encodeURIComponent(fCat)}&`;
    }

    const res = await fetch(url);
    const json = await res.json();

    if (json && json.success) {
      safeExpensesData = json.data || [];
      renderSafeExpensesTable(safeExpensesData, json.summary);
      return;
    }
  } catch (err) {
    // offline / local storage fallback
  }

  safeExpensesData = getPOSStorage('pos_expenses', [
    { id: 1, expense_date: new Date().toISOString(), category: 'کرێی کارەبا و مۆلیدە', amount_iqd: 45000, amount_usd: 30, note: 'کارەبای کۆگا', user_name: 'Admin' },
    { id: 2, expense_date: new Date(Date.now() - 86400000).toISOString(), category: 'چای و خواردنەوە', amount_iqd: 15000, amount_usd: 10, note: 'خواردنەوەی ڕۆژانە', user_name: 'Admin' }
  ]);
  renderSafeExpensesTable(safeExpensesData);
}

function renderSafeExpensesTable(list, summary) {
  const tbody = document.getElementById('safeExpensesTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;color:#64748b">هیچ مەسروفاتێک نەدۆزرایەوە</td></tr>`;
    if (document.getElementById('safeTotalIqd')) document.getElementById('safeTotalIqd').textContent = '0 د.ع';
    if (document.getElementById('safeTotalUsd')) document.getElementById('safeTotalUsd').textContent = '$ 0.00';
    return;
  }

  let totalIqd = 0;
  let totalUsd = 0;

  tbody.innerHTML = list.map(item => {
    const iqd = parseFloat(item.amount_iqd || item.amount || 0);
    const usd = parseFloat(item.amount_usd || 0);
    totalIqd += iqd;
    totalUsd += usd;

    const dateStr = item.expense_date ? String(item.expense_date).slice(0, 10) : '';

    return `
      <tr>
        <td style="text-align:center">
          <button class="pos-btn-delete-row" onclick="deleteSafeExpense(${item.id})" title="سڕینەوە">✕ سڕینەوە</button>
        </td>
        <td><strong>${item.user_name || 'Admin'}</strong></td>
        <td style="color:#16a34a;font-weight:700">$ ${usd.toFixed(2)}</td>
        <td style="color:#2563eb;font-weight:700">${iqd.toLocaleString()} د.ع</td>
        <td>${dateStr}</td>
        <td>${item.note || item.notes || item.description || '-'}</td>
        <td><span class="pos-expense-cat-badge">${item.category || 'خەرجی گشتی'}</span></td>
      </tr>
    `;
  }).join('');

  if (summary) {
    totalIqd = summary.total_iqd || totalIqd;
    totalUsd = summary.total_usd || totalUsd;
  }

  if (document.getElementById('safeTotalIqd')) document.getElementById('safeTotalIqd').textContent = `${Math.round(totalIqd).toLocaleString()} د.ع`;
  if (document.getElementById('safeTotalUsd')) document.getElementById('safeTotalUsd').textContent = `$ ${totalUsd.toFixed(2)}`;
}

async function saveSafeExpense() {
  const dateVal = document.getElementById('safeExpenseDate')?.value || new Date().toISOString().slice(0, 10);
  const noteVal = document.getElementById('safeExpenseNote')?.value || '';
  const catVal = document.getElementById('safeExpenseCategory')?.value || 'خەرجی گشتی';
  const iqdVal = parseFloat(document.getElementById('safeExpenseIqd')?.value) || 0;
  const usdVal = parseFloat(document.getElementById('safeExpenseUsd')?.value) || 0;

  if (iqdVal <= 0 && usdVal <= 0) {
    showToast('⚠️ تکایە بڕی پارە بە دینار یان دۆلار بنووسە', 'warning');
    return;
  }

  const rate100 = (typeof getExchangeRate === 'function') ? getExchangeRate() : 169600;
  const ratePerDollar = rate100 / 100;

  const payload = {
    id: Date.now(),
    expense_date: dateVal,
    category: catVal,
    note: noteVal,
    amount_iqd: iqdVal > 0 ? iqdVal : Math.round(usdVal * ratePerDollar),
    amount_usd: usdVal > 0 ? usdVal : Number((iqdVal / ratePerDollar).toFixed(2)),
    user_name: 'Admin'
  };

  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast('💾 مەسروفات بە سەرکەوتوویی پاشەکەوت کرا', 'success');
    }
  } catch (err) {
    // Offline / Local save
  }

  const list = getPOSStorage('pos_expenses', safeExpensesData);
  list.unshift(payload);
  setPOSStorage('pos_expenses', list);
  safeExpensesData = list;
  renderSafeExpensesTable(safeExpensesData);

  showToast('💾 مەسروفات پاشەکەوت کرا', 'success');
  if (document.getElementById('safeExpenseNote')) document.getElementById('safeExpenseNote').value = '';
  if (document.getElementById('safeExpenseIqd')) document.getElementById('safeExpenseIqd').value = '';
  if (document.getElementById('safeExpenseUsd')) document.getElementById('safeExpenseUsd').value = '';
}

function deleteSafeExpense(id) {
  if (!confirm('ئایا دڵنیایت لە سڕینەوەی ئەم مەسروفە؟')) return;
  safeExpensesData = safeExpensesData.filter(x => x.id !== id);
  setPOSStorage('pos_expenses', safeExpensesData);
  renderSafeExpensesTable(safeExpensesData);
  showToast('مەسروف سڕایەوە', 'info');
}

function resetSafeExpenseFilters() {
  const today = new Date().toISOString().slice(0, 10);
  if (document.getElementById('safeExpenseFilterFrom')) document.getElementById('safeExpenseFilterFrom').value = today;
  if (document.getElementById('safeExpenseFilterTo')) document.getElementById('safeExpenseFilterTo').value = today;
  if (document.getElementById('safeExpenseFilterCategory')) document.getElementById('safeExpenseFilterCategory').value = 'هەمووی';
  if (document.getElementById('safeExpenseShowAll')) document.getElementById('safeExpenseShowAll').checked = false;
  loadSafeExpenses();
}

function printSafeExpensesReport() {
  window.print();
}
