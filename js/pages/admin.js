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
    { id: 'queries', label: '分館查詢' },
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
    case 'queries':
      renderQueriesTab(container);
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
// Tab 1: 日報總表（含郵件發送）
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
      '館別': '全館合計', '狀態': '', '填表人': '', '辦公室查詢': totals.officeQuery, '營業登記查詢': totals.registerQuery,
      '參觀': totals.visits, '辦公室續約': totals.officeRenew, '辦公室新簽': totals.officeNew,
      '營業登記新簽': totals.registerNew, '營業登記續約': totals.registerRenew,
      '簽約合計': totals.signTotal, '退租': totals.officeCancel, '付定': totals.officeDeposit, '出租率': totals.occupancyRate
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
