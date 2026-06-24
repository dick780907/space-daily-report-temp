// ============================================
// 史貝斯商務中心日報系統 - 總管理者後台
// ============================================

function renderAdmin() {
  const app = document.getElementById('app');

  // ===== 未登入狀態：導向登入頁面 =====
  if (!isUserLoggedIn()) {
    showToast('請先登入以存取管理後台', 'warning');
    navigateTo('login');
    return;
  }

  // ===== 非管理員：顯示無權限 =====
  if (!isMaster()) {
    renderNoPermission('您沒有權限存取管理後台', '此功能僅限總管理者使用');
    return;
  }

  // ===== 已登入狀態：顯示後台頁面 =====
  const tabs = [
    { id: 'daily', label: '日報總表' },
    { id: 'branchEdit', label: '分館日報編輯' },
    { id: 'monthly', label: '月報分析' },
    { id: 'yearly', label: '年報總覽' },
    { id: 'data', label: '資料管理' }
  ];

  app.innerHTML = `
    <div class="min-h-screen bg-gray-50 fade-in">
      <!-- 頂部標題區 -->
      <div class="bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-500 text-white px-4 md:px-8 py-5">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 class="text-xl md:text-2xl font-bold">📊 總管理者後台</h1>
            <p class="text-purple-100 text-sm mt-1">史貝斯商務中心日報管理系統</p>
          </div>
          <button
            id="admin-logout-btn"
            class="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            登出
          </button>
        </div>
      </div>

      <!-- 頁籤導航 -->
      <div class="max-w-7xl mx-auto px-4 md:px-8 py-4">
        <div class="flex bg-gray-100 rounded-xl p-1" id="admin-tabs">
          ${tabs.map(t => `
            <button
              data-tab="${t.id}"
              class="admin-tab-btn flex-1 py-3 px-2 md:px-4 rounded-lg text-sm font-medium transition-all text-center ${t.id === 'daily' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
            >
              ${t.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- 頁籤內容區 -->
      <div class="max-w-7xl mx-auto px-4 md:px-8 pb-10" id="admin-tab-content">
        <!-- 動態載入 -->
      </div>
    </div>
  `;

  // 登出按鈕事件
  document.getElementById('admin-logout-btn')?.addEventListener('click', async () => {
    await logoutUser();
    showToast('已成功登出', 'info');
    navigateTo('login');
  });

  // 頁籤切換事件（事件委托）
  document.getElementById('admin-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.admin-tab-btn');
    if (!btn) return;

    const tabId = btn.dataset.tab;

    // 更新頁籤樣式
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.classList.remove('bg-white', 'text-purple-700', 'shadow-sm');
      b.classList.add('text-gray-500', 'hover:text-gray-700');
    });
    btn.classList.remove('text-gray-500', 'hover:text-gray-700');
    btn.classList.add('bg-white', 'text-purple-700', 'shadow-sm');

    // 載入對應內容
    loadTabContent(tabId);
  });

  // 預設載入日報總表
  loadTabContent('daily');
}

// ============================================
// 頁籤內容載入
// ============================================

function loadTabContent(tabId) {
  const container = document.getElementById('admin-tab-content');

  switch (tabId) {
    case 'daily':
      renderDailyTab(container);
      break;
    case 'branchEdit':
      renderBranchEditTab(container);
      break;
    case 'monthly':
      renderMonthlyTab(container);
      break;
    case 'yearly':
      renderYearlyTab(container);
      break;
    case 'data':
      renderDataTab(container);
      break;
  }
}

// ============================================
// Tab 1: 日報總表
// ============================================

function renderDailyTab(container) {
  const today = todayStr();
  const emailStatus = getEmailSendButtonStatus(today);

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 工具列：日期選擇 + 匯出 + 發送郵件 -->
      <div class="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100">
        <label class="block text-sm font-medium text-gray-700 mb-2">選擇日期</label>
        <div class="flex flex-wrap gap-3 items-center">
          <input type="date" id="daily-date" value="${today}"
            class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
          <button id="daily-export-btn"
            class="bg-white text-purple-600 border-2 border-purple-200 px-5 py-3 rounded-xl font-medium hover:bg-purple-50 transition-all flex items-center gap-2 whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            匯出 CSV
          </button>
          <!-- 發送郵件按鈕 -->
          <button id="daily-email-btn"
            class="${emailStatus.canSend
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200 hover:shadow-xl'
              : emailStatus.style === 'green'
                ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-default'
                : 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed'
            } px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap"
            ${!emailStatus.canSend ? 'disabled' : ''}
            title="${emailStatus.tooltip}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            ${emailStatus.label}
          </button>
        </div>
        <!-- 郵件狀態提示 -->
        <div id="daily-email-status" class="mt-3"></div>
      </div>

      <!-- 日報表格 -->
      <div class="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto" id="daily-table-wrapper"></div>
      </div>
    </div>
  `;

  const dateInput = document.getElementById('daily-date');
  dateInput.addEventListener('change', () => {
    refreshDailyTable(dateInput.value);
    refreshEmailButton(dateInput.value);
  });

  // 匯出 CSV
  document.getElementById('daily-export-btn').addEventListener('click', () => {
    const date = dateInput.value;
    const { rows, totals } = generateDailySummary(date);
    const csvRows = rows.map(r => ({
      '館別': r.branchName, '狀態': r.filled ? '已填報' : '未填報', '填表人': r.author || '',
      '辦公室查詢': r.officeQuery, '營業登記查詢': r.registerQuery, '參觀': r.visits,
      '辦公室續約': r.officeRenew, '辦公室新簽': r.officeNew,
      '營業登記新簽': r.registerNew, '營業登記續約': r.registerRenew,
      '簽約合計': r.signTotal, '退租': r.officeCancel, '付定': r.officeDeposit, '出租率': r.occupancyRate
    }));
    csvRows.push({
      '館別': '全館合計', '狀態': '', '填表人': '',
      '辦公室查詢': totals.officeQuery, '營業登記查詢': totals.registerQuery,
      '參觀': totals.visits, '辦公室續約': totals.officeRenew, '辦公室新簽': totals.officeNew,
      '營業登記新簽': totals.registerNew, '營業登記續約': totals.registerRenew,
      '簽約合計': totals.signTotal, '退租': totals.officeCancel, '付定': totals.officeDeposit,
      '出租率': totals.occupancyRate
    });
    downloadCSV(`日報總表_${date.replace(/-/g,'')}.csv`, csvRows);
    showToast('CSV 匯出成功', 'success');
  });

  // 發送郵件
  document.getElementById('daily-email-btn').addEventListener('click', () => {
    const date = dateInput.value;
    const result = sendDailyEmail(date);
    if (result.success) {
      showToast(result.message, 'success');
      refreshEmailButton(date);
    } else {
      showToast(result.error, result.alreadySent ? 'info' : 'warning');
    }
  });

  refreshDailyTable(dateInput.value);
  refreshEmailButton(dateInput.value);
}

function refreshEmailButton(date) {
  const status = getEmailSendButtonStatus(date);
  const btn = document.getElementById('daily-email-btn');
  const statusEl = document.getElementById('daily-email-status');

  if (btn) {
    btn.disabled = !status.canSend;
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
      ${status.label}
    `;
    btn.title = status.tooltip;

    btn.className = status.canSend
      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200 hover:shadow-xl px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap'
      : status.style === 'green'
        ? 'bg-green-100 text-green-700 border-2 border-green-300 cursor-default px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap'
        : 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed px-5 py-3 rounded-xl font-medium transition-all flex items-center gap-2 whitespace-nowrap';
  }

  if (statusEl) {
    if (!status.canSend) {
      const dayStatus = getBusinessDayStatus(date);
      if (status.alreadySent) {
        statusEl.innerHTML = `<div class="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 border border-green-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg><span>今日日報統計已發送至 cs08@grandcentraltw.com</span></div>`;
      } else {
        statusEl.innerHTML = `<div class="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>${dayStatus.reason}，不發送日報統計</span></div>`;
      }
    } else {
      statusEl.innerHTML = `<div class="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>收件人：cs08@grandcentraltw.com | 點擊按鈕開啟郵件客戶端發送</span></div>`;
    }
  }
}

function refreshDailyTable(date) {
  const wrapper = document.getElementById('daily-table-wrapper');
  const { rows, totals } = generateDailySummary(date);

  wrapper.innerHTML = `
    <table class="w-full min-w-[1400px] text-sm">
      <thead>
        <tr class="bg-purple-100 text-purple-800 text-xs">
          <th class="px-3 py-2 text-left font-semibold whitespace-nowrap" rowspan="2">館別</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap" rowspan="2">狀態</th>
          <th class="px-3 py-2 text-left font-semibold whitespace-nowrap" rowspan="2">填表人</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" colspan="2">查詢</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">參觀</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" colspan="4">簽約區</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">簽約合計</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">退租</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">付定</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">出租率</th>
        </tr>
        <tr class="bg-purple-50 text-purple-900">
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap">辦公室查詢</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap">營業登記查詢</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-orange-600">辦公室續約</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-blue-600">辦公室</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-blue-600">營業登記新約</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-orange-600">營業登記續約</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">${r.branchName}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap">
              ${r.filled
                ? '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">已填報</span>'
                : '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">未填報</span>'}
            </td>
            <td class="px-3 py-3 text-gray-600 whitespace-nowrap">${escapeHtml(r.author || '')}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.officeQuery}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.registerQuery}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.visits}</td>
            <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${r.officeRenew}</td>
            <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${r.officeNew}</td>
            <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${r.registerNew}</td>
            <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${r.registerRenew}</td>
            <td class="px-3 py-3 text-center font-bold text-gray-800 whitespace-nowrap">${r.signTotal}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.officeCancel}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.officeDeposit}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap">
              <span class="font-semibold ${r.occupancyRate >= 80 ? 'text-green-600' : r.occupancyRate >= 50 ? 'text-yellow-600' : 'text-red-500'}">${r.occupancyRate}%</span>
            </td>
          </tr>
        `).join('')}
        <tr class="bg-purple-50 font-semibold text-purple-900">
          <td class="px-3 py-3 whitespace-nowrap" colspan="2">全館合計</td><td class="px-3 py-3"></td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.visits}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.signTotal}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeCancel}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeDeposit}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap"><span class="font-bold">${totals.occupancyRate}%</span></td>
        </tr>
      </tbody>
    </table>
  `;
}

// ============================================
// Tab 2: 分館日報編輯
// ============================================

function renderBranchEditTab(container) {
  const today = todayStr();
  const branchOptions = BRANCHES.map(b => `<option value="${b.code}">${b.name}</option>`).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <!-- 館別選擇 + 日期選擇 -->
      <div class="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100">
        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">✏️ 分館日報編輯</h3>
        <p class="text-sm text-gray-500 mb-4">選擇分館與日期，直接修改該分館的日報內容。</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">選擇分館 <span class="text-red-500">*</span></label>
            <select id="bedit-branch" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
              <option value="">請選擇分館</option>
              ${branchOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">選擇日期 <span class="text-red-500">*</span></label>
            <input type="date" id="bedit-date" value="${today}"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-3">
          <button id="bedit-load-btn"
            class="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            載入日報
          </button>
          <span id="bedit-status" class="flex items-center text-sm text-gray-500"></span>
        </div>
      </div>

      <!-- 日報編輯表單（預設隱藏，載入後顯示） -->
      <div id="bedit-form-card" class="hidden bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-hidden">
        <div class="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-5 py-3">
          <h4 class="font-bold" id="bedit-form-title">編輯日報</h4>
        </div>
        <div class="p-5 space-y-5">
          <!-- 基本資訊 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">填表人 <span class="text-red-500">*</span></label>
              <input type="text" id="bedit-author" placeholder="請輸入填表人姓名"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
            </div>
          </div>

          <!-- 查詢區 -->
          <div>
            <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">🔍 查詢</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">辦公室查詢</label>
                <input type="number" id="bedit-officeQuery" value="0" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">營業登記查詢</label>
                <input type="number" id="bedit-registerQuery" value="0" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
            </div>
          </div>

          <!-- 參觀 -->
          <div>
            <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">👥 參觀</h4>
            <input type="number" id="bedit-visits" value="0" min="0"
              class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
          </div>

          <!-- 簽約區 -->
          <div>
            <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">📝 簽約</h4>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">辦公室續約（間數）</label>
                  <input type="number" id="bedit-officeRenewCount" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">辦公室續約（房號）</label>
                  <input type="text" id="bedit-officeRenewRooms" placeholder="例：A01,A02"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">辦公室新簽（間數）</label>
                  <input type="number" id="bedit-officeNewCount" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">辦公室新簽（房號）</label>
                  <input type="text" id="bedit-officeNewRooms" placeholder="例：B01,B02"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">營業登記新簽</label>
                  <input type="number" id="bedit-registerNew" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">營業登記續約</label>
                  <input type="number" id="bedit-registerRenew" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
              </div>
            </div>
          </div>

          <!-- 退租 -->
          <div>
            <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">🚪 退租</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">辦公室退租（間數）</label>
                <input type="number" id="bedit-officeCancelCount" value="0" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">辦公室退租（房號）</label>
                <input type="text" id="bedit-officeCancelRooms" placeholder="例：C01"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
            </div>
          </div>

          <!-- 付定 -->
          <div>
            <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">💰 付定</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-500 mb-1">辦公室付定（間數）</label>
                <input type="number" id="bedit-officeDepositCount" value="0" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">辦公室付定（房號）</label>
                <input type="text" id="bedit-officeDepositRooms" placeholder="例：D01"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
            </div>
          </div>

          <!-- 出租率 -->
          <div>
            <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">📊 出租率</h4>
            <div class="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label class="block text-xs text-gray-500 mb-1">已租間數</label>
                <input type="number" id="bedit-rentedCount" value="0" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">總間數</label>
                <input type="number" id="bedit-totalCount" value="0" min="0"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
            </div>
            <div class="text-center py-3 bg-purple-50 rounded-xl">
              <span class="text-gray-600 text-sm">出租率：</span>
              <span id="bedit-occupancy-rate" class="text-2xl font-bold text-purple-700">0%</span>
            </div>
          </div>

          <!-- 儲存按鈕 -->
          <button id="bedit-save-btn"
            class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-lg">
            ✓ 儲存分館日報
          </button>
        </div>
      </div>
    </div>
  `;

  // 出租率即時計算
  ['bedit-rentedCount', 'bedit-totalCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateBranchEditOccupancy);
  });

  // 載入按鈕
  document.getElementById('bedit-load-btn').addEventListener('click', loadBranchEditForm);

  // 儲存按鈕
  document.getElementById('bedit-save-btn').addEventListener('click', saveBranchEditReport);
}

function updateBranchEditOccupancy() {
  const rented = parseInt(document.getElementById('bedit-rentedCount')?.value || '0', 10);
  const total = parseInt(document.getElementById('bedit-totalCount')?.value || '0', 10);
  const rate = calcOccupancyRate(rented, total);
  const el = document.getElementById('bedit-occupancy-rate');
  if (el) el.textContent = rate + '%';
}

function loadBranchEditForm() {
  const branchCode = document.getElementById('bedit-branch').value;
  const date = document.getElementById('bedit-date').value;
  const statusEl = document.getElementById('bedit-status');
  const formCard = document.getElementById('bedit-form-card');
  const formTitle = document.getElementById('bedit-form-title');

  if (!branchCode) {
    showToast('請先選擇分館', 'error');
    return;
  }
  if (!date) {
    showToast('請先選擇日期', 'error');
    return;
  }

  const branch = BRANCH_MAP[branchCode];
  const report = getReport(branchCode, date);

  if (report) {
    // 已有資料，載入
    document.getElementById('bedit-author').value = report.author || '';
    document.getElementById('bedit-officeQuery').value = report.officeQuery || 0;
    document.getElementById('bedit-registerQuery').value = report.registerQuery || 0;
    document.getElementById('bedit-visits').value = report.visits || 0;
    document.getElementById('bedit-officeRenewCount').value = report.officeRenew?.count || 0;
    document.getElementById('bedit-officeRenewRooms').value = report.officeRenew?.rooms || '';
    document.getElementById('bedit-officeNewCount').value = report.officeNew?.count || 0;
    document.getElementById('bedit-officeNewRooms').value = report.officeNew?.rooms || '';
    document.getElementById('bedit-registerNew').value = report.registerNew || 0;
    document.getElementById('bedit-registerRenew').value = report.registerRenew || 0;
    document.getElementById('bedit-officeCancelCount').value = report.officeCancel?.count || 0;
    document.getElementById('bedit-officeCancelRooms').value = report.officeCancel?.rooms || '';
    document.getElementById('bedit-officeDepositCount').value = report.officeDeposit?.count || 0;
    document.getElementById('bedit-officeDepositRooms').value = report.officeDeposit?.rooms || '';
    document.getElementById('bedit-rentedCount').value = report.rentedCount || 0;
    document.getElementById('bedit-totalCount').value = report.totalCount || 0;
    statusEl.innerHTML = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">已載入現有資料</span>';
  } else {
    // 無資料，清空表單
    document.getElementById('bedit-author').value = '';
    document.getElementById('bedit-officeQuery').value = 0;
    document.getElementById('bedit-registerQuery').value = 0;
    document.getElementById('bedit-visits').value = 0;
    document.getElementById('bedit-officeRenewCount').value = 0;
    document.getElementById('bedit-officeRenewRooms').value = '';
    document.getElementById('bedit-officeNewCount').value = 0;
    document.getElementById('bedit-officeNewRooms').value = '';
    document.getElementById('bedit-registerNew').value = 0;
    document.getElementById('bedit-registerRenew').value = 0;
    document.getElementById('bedit-officeCancelCount').value = 0;
    document.getElementById('bedit-officeCancelRooms').value = '';
    document.getElementById('bedit-officeDepositCount').value = 0;
    document.getElementById('bedit-officeDepositRooms').value = '';
    document.getElementById('bedit-rentedCount').value = 0;
    document.getElementById('bedit-totalCount').value = 0;
    statusEl.innerHTML = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">該日期尚無資料，可新增</span>';
  }

  updateBranchEditOccupancy();
  formTitle.textContent = `編輯 ${branch?.name || branchCode} - ${formatDate(date)} 日報`;
  formCard.classList.remove('hidden');
  formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function saveBranchEditReport() {
  const branchCode = document.getElementById('bedit-branch').value;
  const date = document.getElementById('bedit-date').value;
  const author = document.getElementById('bedit-author').value.trim();

  if (!branchCode) { showToast('請選擇分館', 'error'); return; }
  if (!date) { showToast('請選擇日期', 'error'); return; }
  if (!author) { showToast('請填寫填表人', 'error'); return; }

  const report = {
    id: branchCode + '_' + date,
    branch: branchCode,
    date: date,
    author: author,
    officeQuery: parseInt(document.getElementById('bedit-officeQuery').value || '0', 10),
    registerQuery: parseInt(document.getElementById('bedit-registerQuery').value || '0', 10),
    visits: parseInt(document.getElementById('bedit-visits').value || '0', 10),
    officeRenew: {
      count: parseInt(document.getElementById('bedit-officeRenewCount').value || '0', 10),
      rooms: document.getElementById('bedit-officeRenewRooms').value || ''
    },
    officeNew: {
      count: parseInt(document.getElementById('bedit-officeNewCount').value || '0', 10),
      rooms: document.getElementById('bedit-officeNewRooms').value || ''
    },
    registerNew: parseInt(document.getElementById('bedit-registerNew').value || '0', 10),
    registerRenew: parseInt(document.getElementById('bedit-registerRenew').value || '0', 10),
    officeCancel: {
      count: parseInt(document.getElementById('bedit-officeCancelCount').value || '0', 10),
      rooms: document.getElementById('bedit-officeCancelRooms').value || ''
    },
    officeDeposit: {
      count: parseInt(document.getElementById('bedit-officeDepositCount').value || '0', 10),
      rooms: document.getElementById('bedit-officeDepositRooms').value || ''
    },
    rentedCount: parseInt(document.getElementById('bedit-rentedCount').value || '0', 10),
    totalCount: parseInt(document.getElementById('bedit-totalCount').value || '0', 10)
  };

  saveReport(report);
  const branchName = BRANCH_MAP[branchCode]?.name || branchCode;
  showToast(`${branchName} ${formatDate(date)} 日報儲存成功！`, 'success');

  const statusEl = document.getElementById('bedit-status');
  statusEl.innerHTML = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">已儲存</span>';
}

// ============================================
// Tab 3: 月報分析
// ============================================

function renderMonthlyTab(container) {
  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100">
        <label class="block text-sm font-medium text-gray-700 mb-2">選擇月份</label>
        <div class="flex gap-3 flex-wrap">
          <input type="month" id="monthly-yearmonth" value="${currentYearMonth()}"
            class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
          <button id="monthly-export-btn" class="bg-white text-purple-600 border-2 border-purple-200 px-5 py-3 rounded-xl font-medium hover:bg-purple-50 transition-all flex items-center gap-2 whitespace-nowrap">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            匯出 CSV
          </button>
        </div>
      </div>
      <div id="monthly-stats" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3"></div>
      <div class="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto" id="monthly-table-wrapper"></div>
      </div>
    </div>
  `;

  const monthInput = document.getElementById('monthly-yearmonth');
  monthInput.addEventListener('change', () => refreshMonthlyView(monthInput.value));
  document.getElementById('monthly-export-btn').addEventListener('click', () => {
    const yearMonth = monthInput.value;
    const { rows, totals } = generateMonthlySummary(yearMonth);
    const csvRows = rows.map(r => ({
      '館別': r.branchName, '辦公室查詢': r.officeQuery, '營業登記查詢': r.registerQuery, '參觀': r.visits,
      '辦公室續約': r.officeRenew, '辦公室新簽': r.officeNew, '營業登記新簽': r.registerNew, '營業登記續約': r.registerRenew,
      '簽約合計': r.signTotal, '退租': r.officeCancel, '付定': r.officeDeposit, '填報天數': r.fillDays, '平均出租率': r.avgOccupancy + '%'
    }));
    csvRows.push({
      '館別': '全館合計', '辦公室查詢': totals.officeQuery, '營業登記查詢': totals.registerQuery, '參觀': totals.visits,
      '辦公室續約': totals.officeRenew, '辦公室新簽': totals.officeNew, '營業登記新簽': totals.registerNew, '營業登記續約': totals.registerRenew,
      '簽約合計': totals.signTotal, '退租': totals.officeCancel, '付定': totals.officeDeposit, '填報天數': totals.fillDays, '平均出租率': totals.avgOccupancy + '%'
    });
    downloadCSV(`月報分析_${yearMonth.replace('-','')}.csv`, csvRows);
    showToast('CSV 匯出成功', 'success');
  });
  refreshMonthlyView(monthInput.value);
}

function refreshMonthlyView(yearMonth) {
  const { rows, totals } = generateMonthlySummary(yearMonth);
  document.getElementById('monthly-stats').innerHTML = `
    ${StatCard('本月查詢合計', totals.officeQuery + totals.registerQuery, '次', 'purple')}
    ${StatCard('本月參觀人次', totals.visits, '人', 'blue')}
    ${StatCard('本月簽約總數', totals.signTotal, '件', 'green')}
    ${StatCard('本月退租', totals.officeCancel, '間', 'red')}
    ${StatCard('本月付定', totals.officeDeposit, '間', 'orange')}
    ${StatCard('本月填報天數', totals.reportDays || 0, '天', 'indigo')}
    ${StatCard('平均出租率', totals.avgOccupancy, '%', 'emerald')}
  `;
  const tableWrapper = document.getElementById('monthly-table-wrapper');
  tableWrapper.innerHTML = `
    <table class="w-full min-w-[1200px] text-sm">
      <thead>
        <tr class="bg-purple-100 text-purple-800 text-xs">
          <th class="px-3 py-2 text-left font-semibold whitespace-nowrap" rowspan="2">館別</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" colspan="2">查詢</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">參觀</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" colspan="4">簽約區</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">簽約合計</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">退租</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">付定</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">填報天數</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">平均出租率</th>
        </tr>
        <tr class="bg-purple-50 text-purple-900">
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap">辦公室查詢</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap">營業登記查詢</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-orange-600">辦公室續約</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-blue-600">辦公室</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-blue-600">營業登記新約</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-orange-600">營業登記續約</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">${r.branchName}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.officeQuery}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.registerQuery}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.visits}</td>
            <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${r.officeRenew}</td>
            <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${r.officeNew}</td>
            <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${r.registerNew}</td>
            <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${r.registerRenew}</td>
            <td class="px-3 py-3 text-center font-bold text-gray-800 whitespace-nowrap">${r.signTotal}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.officeCancel}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.officeDeposit}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${r.fillDays} / ${r.totalDays}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap">
              <span class="font-semibold ${r.avgOccupancy >= 80 ? 'text-green-600' : r.avgOccupancy >= 50 ? 'text-yellow-600' : 'text-red-500'}">${r.avgOccupancy}%</span>
            </td>
          </tr>
        `).join('')}
        <tr class="bg-purple-50 font-semibold text-purple-900">
          <td class="px-3 py-3 whitespace-nowrap">全館合計</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.visits}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.signTotal}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeCancel}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeDeposit}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.reportDays || 0}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap"><span class="font-bold">${totals.avgOccupancy}%</span></td>
        </tr>
      </tbody>
    </table>
  `;
}

// ============================================
// Tab 4: 年報總覽
// ============================================

function renderYearlyTab(container) {
  const thisYear = currentYear();
  const yearOptions = [];
  for (let y = 2024; y <= 2027; y++) {
    yearOptions.push(`<option value="${y}" ${y === parseInt(thisYear) ? 'selected' : ''}>${y} 年</option>`);
  }
  const branchOptions = [{ code: 'ALL', name: '全館合計' }, ...BRANCHES].map(b => `<option value="${b.code}">${b.name}</option>`).join('');

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100">
        <div class="flex flex-col sm:flex-row gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">選擇年份</label>
            <select id="yearly-year" class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">${yearOptions.join('')}</select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">選擇館別</label>
            <select id="yearly-branch" class="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-w-[160px]">${branchOptions}</select>
          </div>
          <div class="flex items-end">
            <button id="yearly-export-btn" class="bg-white text-purple-600 border-2 border-purple-200 px-5 py-3 rounded-xl font-medium hover:bg-purple-50 transition-all flex items-center gap-2 whitespace-nowrap">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              匯出 CSV
            </button>
          </div>
        </div>
      </div>
      <div id="yearly-branch-title" class="text-center"></div>
      <div class="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto" id="yearly-table-wrapper"></div>
      </div>
    </div>
  `;

  const yearSelect = document.getElementById('yearly-year');
  const branchSelect = document.getElementById('yearly-branch');
  const refresh = () => refreshYearlyTable(yearSelect.value, branchSelect.value);
  yearSelect.addEventListener('change', refresh);
  branchSelect.addEventListener('change', refresh);
  document.getElementById('yearly-export-btn').addEventListener('click', () => {
    const year = yearSelect.value;
    const branchCode = branchSelect.value;
    const isAll = branchCode === 'ALL';
    const { months, totals } = isAll ? generateYearlySummary(year) : generateBranchYearlySummary(branchCode, year);
    const branchName = isAll ? '全館合計' : BRANCH_MAP[branchCode]?.name || branchCode;
    const csvRows = months.map(m => ({
      '月份': m.month, '辦公室查詢': m.officeQuery, '營業登記查詢': m.registerQuery, '參觀': m.visits,
      '辦公室續約': m.officeRenew, '辦公室': m.officeNew, '營業登記新約': m.registerNew, '營業登記續約': m.registerRenew,
      '簽約合計': m.signTotal, '退租': m.officeCancel, '付定': m.officeDeposit, '填報天數': m.reportDays, '平均出租率': m.avgOccupancy + '%'
    }));
    csvRows.push({
      '月份': '年度合計', '辦公室查詢': totals.officeQuery, '營業登記查詢': totals.registerQuery, '參觀': totals.visits,
      '辦公室續約': totals.officeRenew, '辦公室': totals.officeNew, '營業登記新約': totals.registerNew, '營業登記續約': totals.registerRenew,
      '簽約合計': totals.signTotal, '退租': totals.officeCancel, '付定': totals.officeDeposit, '填報天數': totals.reportDays, '平均出租率': totals.avgOccupancy + '%'
    });
    downloadCSV(`年報總覽_${branchName}_${year}.csv`, csvRows);
    showToast('CSV 匯出成功', 'success');
  });
  refresh();
}

function refreshYearlyTable(year, branchCode) {
  const wrapper = document.getElementById('yearly-table-wrapper');
  const titleEl = document.getElementById('yearly-branch-title');
  const isAll = branchCode === 'ALL';
  const { months, totals } = isAll ? generateYearlySummary(year) : generateBranchYearlySummary(branchCode, year);
  const branchName = isAll ? '全館合計' : BRANCH_MAP[branchCode]?.name || branchCode;

  titleEl.innerHTML = `
    <div class="bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl px-6 py-3 shadow-lg inline-block">
      <span class="text-lg font-bold">${escapeHtml(branchName)}</span>
      <span class="text-purple-200 ml-2">${year} 年報</span>
    </div>
  `;

  wrapper.innerHTML = `
    <table class="w-full min-w-[1400px] text-sm">
      <thead>
        <tr class="bg-purple-100 text-purple-800 text-xs">
          <th class="px-3 py-2 text-left font-semibold whitespace-nowrap" rowspan="2">月份</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" colspan="2">查詢</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">參觀</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" colspan="4">簽約區</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">簽約合計</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">退租</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">付定</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">填報天數</th>
          <th class="px-3 py-2 text-center font-semibold whitespace-nowrap border-l border-purple-200" rowspan="2">平均出租率</th>
        </tr>
        <tr class="bg-purple-50 text-purple-900">
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap">辦公室查詢</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap">營業登記查詢</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-orange-600">辦公室續約</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-blue-600">辦公室</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-blue-600">營業登記新約</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap text-orange-600">營業登記續約</th>
        </tr>
      </thead>
      <tbody>
        ${months.map(m => `
          <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td class="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">${m.month}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${m.officeQuery}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${m.registerQuery}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${m.visits}</td>
            <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${m.officeRenew}</td>
            <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${m.officeNew}</td>
            <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${m.registerNew}</td>
            <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${m.registerRenew}</td>
            <td class="px-3 py-3 text-center font-bold text-gray-800 whitespace-nowrap">${m.signTotal}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${m.officeCancel}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${m.officeDeposit}</td>
            <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${m.reportDays}</td>
            <td class="px-3 py-3 text-center whitespace-nowrap">
              <span class="font-semibold ${m.avgOccupancy >= 80 ? 'text-green-600' : m.avgOccupancy >= 50 ? 'text-yellow-600' : 'text-red-500'}">${m.avgOccupancy}%</span>
            </td>
          </tr>
        `).join('')}
        <tr class="bg-purple-50 font-semibold text-purple-900">
          <td class="px-3 py-3 whitespace-nowrap">年度合計</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.visits}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.registerRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.signTotal}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeCancel}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.officeDeposit}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${totals.reportDays}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap"><span class="font-bold">${totals.avgOccupancy}%</span></td>
        </tr>
      </tbody>
    </table>
  `;
}

// ============================================
// Tab 5: 資料管理
// ============================================

function renderDataTab(container) {
  const status = getTodayReportStatus();

  container.innerHTML = `
    <div class="space-y-4">
      <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
        <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          📋 今日填報狀態 <span class="text-sm font-normal text-gray-500">(${formatDate(todayStr())})</span>
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3" id="today-status-grid">
          ${status.map(s => `
            <div class="flex items-center gap-3 p-3 rounded-xl border ${s.filled ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}">
              <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.filled ? 'bg-green-500' : 'bg-red-500'}">
                ${s.filled
                  ? '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>'
                  : '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>'}
              </div>
              <div class="min-w-0">
                <div class="text-sm font-medium text-gray-800 truncate">${s.name}</div>
                <div class="text-xs ${s.filled ? 'text-green-600' : 'text-red-500'}">${s.filled ? escapeHtml(s.author) : '未填報'}</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span>已填報 ${status.filter(s => s.filled).length} 館</span>
          <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span>未填報 ${status.filter(s => !s.filled).length} 館</span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
          <h3 class="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">📦 備份資料</h3>
          <p class="text-sm text-gray-500 mb-4">將所有日報資料匯出為 JSON 檔案，作為備份使用。</p>
          <button id="backup-export-btn" class="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-4 10h6a2 2 0 002-2v-8a2 2 0 00-2-2h-6a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            匯出全部 JSON 備份
          </button>
        </div>
        <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
          <h3 class="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">📥 還原資料</h3>
          <p class="text-sm text-gray-500 mb-4">從 JSON 備份檔案還原資料，將覆蓋現有資料。</p>
          <div class="flex flex-col sm:flex-row gap-3">
            <input type="file" id="restore-file-input" accept=".json"
              class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-100 file:text-purple-700 file:text-sm file:font-medium"/>
            <button id="restore-import-btn" class="bg-white text-purple-600 border-2 border-purple-200 px-5 py-3 rounded-xl font-medium hover:bg-purple-50 transition-all flex items-center gap-2 whitespace-nowrap justify-center">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              匯入 JSON 還原
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-red-100/50 border-2 border-red-200">
        <h3 class="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">⚠️ 危險區域</h3>
        <p class="text-sm text-gray-500 mb-4">清除所有日報資料，此操作不可復原！請確保已先備份。</p>
        <button id="clear-all-btn" class="bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          清除全部資料
        </button>
      </div>
    </div>
  `;

  document.getElementById('backup-export-btn').addEventListener('click', () => {
    const data = exportAllData();
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    downloadJSON(`史貝斯日報備份_${timestamp}.json`, data);
    showToast('JSON 備份匯出成功', 'success');
  });

  document.getElementById('restore-import-btn').addEventListener('click', async () => {
    const fileInput = document.getElementById('restore-file-input');
    const file = fileInput.files[0];
    if (!file) { showToast('請選擇 JSON 檔案', 'error'); return; }
    try {
      const data = await readJSONFile(file);
      if (!data || typeof data !== 'object') { showToast('無效的 JSON 檔案格式', 'error'); return; }
      const confirmed = await confirmAction('確定要匯入此備份檔案嗎？現有資料將被覆蓋。');
      if (!confirmed) return;
      importAllData(data);
      showToast('資料還原成功', 'success');
      fileInput.value = '';
      renderDataTab(container);
    } catch (err) {
      showToast('匯入失敗：' + err.message, 'error');
    }
  });

  document.getElementById('clear-all-btn').addEventListener('click', async () => {
    const confirmed = await confirmAction('⚠️ 警告：此操作將永久刪除所有日報資料，且無法復原！確定要繼續嗎？');
    if (!confirmed) return;
    clearAllData();
    showToast('所有資料已清除', 'success');
    renderDataTab(container);
  });
}
