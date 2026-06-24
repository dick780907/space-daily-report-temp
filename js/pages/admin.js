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
// Tab 1: 日報總表（含郵件發送 + 總管理處填報）
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

      <!-- 總管理處日報填報（折疊表單） -->
      <div class="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-hidden">
        <!-- 折疊標題列 -->
        <button id="master-form-toggle" class="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
          <div class="flex items-center gap-3">
            <span id="master-form-arrow" class="text-gray-400 transition-transform">▶</span>
            <span class="font-semibold text-gray-800">🏢 總管理處日報填報</span>
            <span id="master-form-status"></span>
          </div>
          <span class="text-xs text-gray-400">點擊展開/收合</span>
        </button>
        <!-- 表單內容（預設收合） -->
        <div id="master-form-body" class="hidden border-t border-gray-100">
          <div class="p-5 space-y-5">
            <!-- 基本資訊 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">日期 <span class="text-red-500">*</span></label>
                <input type="date" id="master-date" value="${today}"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">填表人 <span class="text-red-500">*</span></label>
                <input type="text" id="master-author" placeholder="請輸入填表人姓名"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
              </div>
            </div>

            <!-- 查詢區 -->
            <div>
              <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">🔍 查詢</h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-gray-500 mb-1">辦公室查詢</label>
                  <input type="number" id="master-officeQuery" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">營業登記查詢</label>
                  <input type="number" id="master-registerQuery" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
              </div>
            </div>

            <!-- 參觀 -->
            <div>
              <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">👥 參觀</h4>
              <input type="number" id="master-visits" value="0" min="0"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
            </div>

            <!-- 簽約區 -->
            <div>
              <h4 class="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-1">📝 簽約</h4>
              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">辦公室續約（間數）</label>
                    <input type="number" id="master-officeRenewCount" value="0" min="0"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">辦公室續約（房號）</label>
                    <input type="text" id="master-officeRenewRooms" placeholder="例：A01,A02"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">辦公室新簽（間數）</label>
                    <input type="number" id="master-officeNewCount" value="0" min="0"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">辦公室新簽（房號）</label>
                    <input type="text" id="master-officeNewRooms" placeholder="例：B01,B02"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">營業登記新簽</label>
                    <input type="number" id="master-registerNew" value="0" min="0"
                      class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-500 mb-1">營業登記續約</label>
                    <input type="number" id="master-registerRenew" value="0" min="0"
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
                  <input type="number" id="master-officeCancelCount" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">辦公室退租（房號）</label>
                  <input type="text" id="master-officeCancelRooms" placeholder="例：C01"
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
                  <input type="number" id="master-officeDepositCount" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">辦公室付定（房號）</label>
                  <input type="text" id="master-officeDepositRooms" placeholder="例：D01"
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
                  <input type="number" id="master-rentedCount" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
                <div>
                  <label class="block text-xs text-gray-500 mb-1">總間數</label>
                  <input type="number" id="master-totalCount" value="0" min="0"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"/>
                </div>
              </div>
              <div class="text-center py-3 bg-purple-50 rounded-xl">
                <span class="text-gray-600 text-sm">出租率：</span>
                <span id="master-occupancy-rate" class="text-2xl font-bold text-purple-700">0%</span>
              </div>
            </div>

            <!-- 儲存按鈕 -->
            <button id="master-save-btn"
              class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-lg">
              ✓ 儲存總管理處日報
            </button>
          </div>
        </div>
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
    // 同步更新總管理處表單日期
    const masterDate = document.getElementById('master-date');
    if (masterDate) {
      masterDate.value = dateInput.value;
      loadMasterReport();
    }
  });

  // 匯出 CSV
  document.getElementById('daily-export-btn').addEventListener('click', () => {
    const date = dateInput.value;
    const { rows, totals } = generateDailySummary(date);
    // 加入總管理處數據
    const masterReport = getReport('MASTER', date);
    const masterRow = masterReport ? {
      branchName: '總管理處', filled: true, author: masterReport.author || '',
      officeQuery: masterReport.officeQuery || 0, registerQuery: masterReport.registerQuery || 0,
      visits: masterReport.visits || 0, officeRenew: masterReport.officeRenew?.count || 0,
      officeNew: masterReport.officeNew?.count || 0, registerNew: masterReport.registerNew || 0,
      registerRenew: masterReport.registerRenew || 0,
      signTotal: calcSignTotal(masterReport),
      officeCancel: masterReport.officeCancel?.count || 0,
      officeDeposit: masterReport.officeDeposit?.count || 0,
      occupancyRate: calcOccupancyRate(masterReport.rentedCount || 0, masterReport.totalCount || 0)
    } : {
      branchName: '總管理處', filled: false, author: '',
      officeQuery: 0, registerQuery: 0, visits: 0,
      officeRenew: 0, officeNew: 0, registerNew: 0, registerRenew: 0,
      signTotal: 0, officeCancel: 0, officeDeposit: 0, occupancyRate: 0
    };
    const allRows = [...rows, masterRow];
    const csvRows = allRows.map(r => ({
      '館別': r.branchName, '狀態': r.filled ? '已填報' : '未填報', '填表人': r.author || '',
      '辦公室查詢': r.officeQuery, '營業登記查詢': r.registerQuery, '參觀': r.visits,
      '辦公室續約': r.officeRenew, '辦公室新簽': r.officeNew,
      '營業登記新簽': r.registerNew, '營業登記續約': r.registerRenew,
      '簽約合計': r.signTotal, '退租': r.officeCancel, '付定': r.officeDeposit, '出租率': r.occupancyRate
    }));
    csvRows.push({
      '館別': '全館合計', '狀態': '', '填表人': '', '辦公室查詢': totals.officeQuery + masterRow.officeQuery, '營業登記查詢': totals.registerQuery + masterRow.registerQuery,
      '參觀': totals.visits + masterRow.visits, '辦公室續約': totals.officeRenew + masterRow.officeRenew, '辦公室新簽': totals.officeNew + masterRow.officeNew,
      '營業登記新簽': totals.registerNew + masterRow.registerNew, '營業登記續約': totals.registerRenew + masterRow.registerRenew,
      '簽約合計': totals.signTotal + masterRow.signTotal, '退租': totals.officeCancel + masterRow.officeCancel, '付定': totals.officeDeposit + masterRow.officeDeposit,
      '出租率': calcOccupancyRate((totals.rentedCount || 0) + (masterReport?.rentedCount || 0), (totals.totalCount || 0) + (masterReport?.totalCount || 0))
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

  // 綁定總管理處表單事件
  bindMasterFormEvents();
  loadMasterReport();
}

// ============================================
// 總管理處日報填報 - 輔助函數
// ============================================

function bindMasterFormEvents() {
  // 折疊/展開
  const toggle = document.getElementById('master-form-toggle');
  const body = document.getElementById('master-form-body');
  const arrow = document.getElementById('master-form-arrow');
  if (toggle && body) {
    toggle.addEventListener('click', () => {
      body.classList.toggle('hidden');
      arrow.textContent = body.classList.contains('hidden') ? '▶' : '▼';
    });
  }

  // 日期變更載入
  const dateInput = document.getElementById('master-date');
  if (dateInput) {
    dateInput.addEventListener('change', loadMasterReport);
  }

  // 出租率即時計算
  ['master-rentedCount', 'master-totalCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateMasterOccupancy);
  });

  // 儲存按鈕
  const saveBtn = document.getElementById('master-save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveMasterReport);
  }
}

function saveMasterReport() {
  const date = document.getElementById('master-date').value;
  const author = document.getElementById('master-author').value.trim();
  if (!date || !author) {
    showToast('請填寫日期和填表人', 'error');
    return;
  }
  const report = {
    id: 'MASTER_' + date,
    branch: 'MASTER',
    date: date,
    author: author,
    officeQuery: parseInt(document.getElementById('master-officeQuery').value || '0', 10),
    registerQuery: parseInt(document.getElementById('master-registerQuery').value || '0', 10),
    visits: parseInt(document.getElementById('master-visits').value || '0', 10),
    officeRenew: {
      count: parseInt(document.getElementById('master-officeRenewCount').value || '0', 10),
      rooms: document.getElementById('master-officeRenewRooms').value || ''
    },
    officeNew: {
      count: parseInt(document.getElementById('master-officeNewCount').value || '0', 10),
      rooms: document.getElementById('master-officeNewRooms').value || ''
    },
    registerNew: parseInt(document.getElementById('master-registerNew').value || '0', 10),
    registerRenew: parseInt(document.getElementById('master-registerRenew').value || '0', 10),
    officeCancel: {
      count: parseInt(document.getElementById('master-officeCancelCount').value || '0', 10),
      rooms: document.getElementById('master-officeCancelRooms').value || ''
    },
    officeDeposit: {
      count: parseInt(document.getElementById('master-officeDepositCount').value || '0', 10),
      rooms: document.getElementById('master-officeDepositRooms').value || ''
    },
    rentedCount: parseInt(document.getElementById('master-rentedCount').value || '0', 10),
    totalCount: parseInt(document.getElementById('master-totalCount').value || '0', 10)
  };
  saveReport(report);
  showToast('總管理處日報儲存成功！', 'success');
  refreshDailyTable(date);
  updateMasterFormStatus(date);
}

function loadMasterReport() {
  const date = document.getElementById('master-date').value;
  if (!date) return;
  const report = getReport('MASTER', date);
  if (report) {
    document.getElementById('master-author').value = report.author || '';
    document.getElementById('master-officeQuery').value = report.officeQuery || 0;
    document.getElementById('master-registerQuery').value = report.registerQuery || 0;
    document.getElementById('master-visits').value = report.visits || 0;
    document.getElementById('master-officeRenewCount').value = report.officeRenew?.count || 0;
    document.getElementById('master-officeRenewRooms').value = report.officeRenew?.rooms || '';
    document.getElementById('master-officeNewCount').value = report.officeNew?.count || 0;
    document.getElementById('master-officeNewRooms').value = report.officeNew?.rooms || '';
    document.getElementById('master-registerNew').value = report.registerNew || 0;
    document.getElementById('master-registerRenew').value = report.registerRenew || 0;
    document.getElementById('master-officeCancelCount').value = report.officeCancel?.count || 0;
    document.getElementById('master-officeCancelRooms').value = report.officeCancel?.rooms || '';
    document.getElementById('master-officeDepositCount').value = report.officeDeposit?.count || 0;
    document.getElementById('master-officeDepositRooms').value = report.officeDeposit?.rooms || '';
    document.getElementById('master-rentedCount').value = report.rentedCount || 0;
    document.getElementById('master-totalCount').value = report.totalCount || 0;
  } else {
    document.getElementById('master-author').value = '';
    document.getElementById('master-officeQuery').value = 0;
    document.getElementById('master-registerQuery').value = 0;
    document.getElementById('master-visits').value = 0;
    document.getElementById('master-officeRenewCount').value = 0;
    document.getElementById('master-officeRenewRooms').value = '';
    document.getElementById('master-officeNewCount').value = 0;
    document.getElementById('master-officeNewRooms').value = '';
    document.getElementById('master-registerNew').value = 0;
    document.getElementById('master-registerRenew').value = 0;
    document.getElementById('master-officeCancelCount').value = 0;
    document.getElementById('master-officeCancelRooms').value = '';
    document.getElementById('master-officeDepositCount').value = 0;
    document.getElementById('master-officeDepositRooms').value = '';
    document.getElementById('master-rentedCount').value = 0;
    document.getElementById('master-totalCount').value = 0;
  }
  updateMasterOccupancy();
  updateMasterFormStatus(date);
}

function updateMasterOccupancy() {
  const rented = parseInt(document.getElementById('master-rentedCount')?.value || '0', 10);
  const total = parseInt(document.getElementById('master-totalCount')?.value || '0', 10);
  const rate = calcOccupancyRate(rented, total);
  const el = document.getElementById('master-occupancy-rate');
  if (el) el.textContent = rate + '%';
}

function updateMasterFormStatus(date) {
  const report = getReport('MASTER', date);
  const statusEl = document.getElementById('master-form-status');
  if (statusEl) {
    if (report) {
      statusEl.innerHTML = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">已填報</span>';
    } else {
      statusEl.innerHTML = '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">未填報</span>';
    }
  }
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

  // 取得總管理處數據
  const masterReport = getReport('MASTER', date);
  const masterRow = masterReport ? {
    branchName: '總管理處',
    filled: true,
    author: masterReport.author || '',
    officeQuery: masterReport.officeQuery || 0,
    registerQuery: masterReport.registerQuery || 0,
    visits: masterReport.visits || 0,
    officeRenew: masterReport.officeRenew?.count || 0,
    officeNew: masterReport.officeNew?.count || 0,
    registerNew: masterReport.registerNew || 0,
    registerRenew: masterReport.registerRenew || 0,
    signTotal: calcSignTotal(masterReport),
    officeCancel: masterReport.officeCancel?.count || 0,
    officeDeposit: masterReport.officeDeposit?.count || 0,
    rentedCount: masterReport.rentedCount || 0,
    totalCount: masterReport.totalCount || 0,
    occupancyRate: calcOccupancyRate(masterReport.rentedCount || 0, masterReport.totalCount || 0)
  } : {
    branchName: '總管理處',
    filled: false,
    author: '',
    officeQuery: 0, registerQuery: 0, visits: 0,
    officeRenew: 0, officeNew: 0, registerNew: 0, registerRenew: 0,
    signTotal: 0, officeCancel: 0, officeDeposit: 0,
    rentedCount: 0, totalCount: 0, occupancyRate: 0
  };

  // 全館合計包含總管理處
  const allRows = [...rows, masterRow];
  const grandTotals = {
    officeQuery: allRows.reduce((s, r) => s + r.officeQuery, 0),
    registerQuery: allRows.reduce((s, r) => s + r.registerQuery, 0),
    visits: allRows.reduce((s, r) => s + r.visits, 0),
    officeRenew: allRows.reduce((s, r) => s + r.officeRenew, 0),
    officeNew: allRows.reduce((s, r) => s + r.officeNew, 0),
    registerNew: allRows.reduce((s, r) => s + r.registerNew, 0),
    registerRenew: allRows.reduce((s, r) => s + r.registerRenew, 0),
    signTotal: allRows.reduce((s, r) => s + r.signTotal, 0),
    officeCancel: allRows.reduce((s, r) => s + r.officeCancel, 0),
    officeDeposit: allRows.reduce((s, r) => s + r.officeDeposit, 0),
    occupancyRate: calcOccupancyRate(
      allRows.reduce((s, r) => s + (r.rentedCount || 0), 0),
      allRows.reduce((s, r) => s + (r.totalCount || 0), 0)
    )
  };

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
        <!-- 總管理處行 -->
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors bg-sky-50">
          <td class="px-3 py-3 font-medium text-sky-800 whitespace-nowrap">🏢 總管理處</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">
            ${masterRow.filled
              ? '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">已填報</span>'
              : '<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600">未填報</span>'}
          </td>
          <td class="px-3 py-3 text-gray-600 whitespace-nowrap">${escapeHtml(masterRow.author)}</td>
          <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${masterRow.officeQuery}</td>
          <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${masterRow.registerQuery}</td>
          <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${masterRow.visits}</td>
          <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${masterRow.officeRenew}</td>
          <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${masterRow.officeNew}</td>
          <td class="px-3 py-3 text-center text-blue-600 whitespace-nowrap font-medium">${masterRow.registerNew}</td>
          <td class="px-3 py-3 text-center text-orange-600 whitespace-nowrap font-medium">${masterRow.registerRenew}</td>
          <td class="px-3 py-3 text-center font-bold text-gray-800 whitespace-nowrap">${masterRow.signTotal}</td>
          <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${masterRow.officeCancel}</td>
          <td class="px-3 py-3 text-center text-gray-700 whitespace-nowrap">${masterRow.officeDeposit}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">
            <span class="font-semibold ${masterRow.occupancyRate >= 80 ? 'text-green-600' : masterRow.occupancyRate >= 50 ? 'text-yellow-600' : 'text-red-500'}">${masterRow.occupancyRate}%</span>
          </td>
        </tr>
        <tr class="bg-purple-50 font-semibold text-purple-900">
          <td class="px-3 py-3 whitespace-nowrap" colspan="2">全館合計</td><td class="px-3 py-3"></td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.officeQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.registerQuery}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.visits}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.officeRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.officeNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.registerNew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.registerRenew}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.signTotal}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.officeCancel}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap">${grandTotals.officeDeposit}</td>
          <td class="px-3 py-3 text-center whitespace-nowrap"><span class="font-bold">${grandTotals.occupancyRate}%</span></td>
        </tr>
      </tbody>
    </table>
  `;
}

// ============================================
// Tab 2: 分館查詢記錄
// ============================================

function renderQueriesTab(container) {
  container.innerHTML = `
    <div class="space-y-4">
      <!-- 統計卡片 -->
      <div id="queries-stats" class="grid grid-cols-2 md:grid-cols-4 gap-3"></div>

      <!-- 工具列 -->
      <div class="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100">
        <div class="flex flex-col lg:flex-row gap-3">
          <div class="flex-1 flex flex-wrap gap-3">
            <select id="queries-filter-status" class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">全部狀態</option>
              <option value="pending">待處理</option>
              <option value="processing">處理中</option>
              <option value="completed">已完成</option>
            </select>
            <select id="queries-filter-branch" class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">全部館別</option>
              ${BRANCHES.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
            </select>
            <input type="text" id="queries-search" placeholder="搜尋客戶姓名或內容..."
              class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[200px]"/>
          </div>
          <div class="flex gap-3">
            <button id="queries-export-btn" class="bg-white text-purple-600 border-2 border-purple-200 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-50 transition-all flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              匯出 CSV
            </button>
            <button id="queries-add-btn" class="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-200 hover:shadow-xl transition-all flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              新增查詢
            </button>
          </div>
        </div>
      </div>

      <!-- 新增查詢表單（預設隱藏） -->
      <div id="queries-form-container" class="hidden">
        <div class="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100">
          <h3 class="text-lg font-bold text-gray-800 mb-4">📝 新增分館轉介查詢</h3>
          <form id="queries-form" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">日期 <span class="text-red-500">*</span></label>
              <input type="date" name="q-date" value="${todayStr()}" required
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">來源館別 <span class="text-red-500">*</span></label>
              <select name="q-sourceBranch" required
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="">請選擇</option>
                ${BRANCHES.map(b => `<option value="${b.code}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">客戶姓名 <span class="text-red-500">*</span></label>
              <input type="text" name="q-customerName" placeholder="請輸入客戶姓名" required
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">聯絡方式</label>
              <input type="text" name="q-contact" placeholder="電話 / Email / Line"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">查詢類型</label>
              <select name="q-queryType"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                ${QUERY_TYPE_OPTIONS.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">處理狀態</label>
              <select name="q-status"
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                <option value="pending">待處理</option>
                <option value="processing">處理中</option>
                <option value="completed">已完成</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">查詢內容 <span class="text-red-500">*</span></label>
              <textarea name="q-content" rows="3" placeholder="請描述客戶的查詢內容..." required
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"></textarea>
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">備註</label>
              <textarea name="q-note" rows="2" placeholder="其他備註事項..."
                class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"></textarea>
            </div>
            <div class="md:col-span-2 flex justify-end gap-3">
              <button type="button" id="queries-cancel-btn" class="text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">取消</button>
              <button type="submit" class="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-purple-200 hover:shadow-xl transition-all">儲存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 查詢列表 -->
      <div class="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-hidden">
        <div id="queries-list" class="overflow-x-auto"></div>
      </div>
    </div>
  `;

  // 刷新統計
  refreshQueriesStats();

  // 篩選事件
  document.getElementById('queries-filter-status').addEventListener('change', refreshQueriesList);
  document.getElementById('queries-filter-branch').addEventListener('change', refreshQueriesList);
  document.getElementById('queries-search').addEventListener('input', debounce(refreshQueriesList, 300));

  // 新增按鈕
  document.getElementById('queries-add-btn').addEventListener('click', () => {
    document.getElementById('queries-form-container').classList.remove('hidden');
    document.getElementById('queries-form').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // 取消按鈕
  document.getElementById('queries-cancel-btn').addEventListener('click', () => {
    document.getElementById('queries-form-container').classList.add('hidden');
    document.getElementById('queries-form').reset();
  });

  // 表單提交
  document.getElementById('queries-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      date: form.querySelector('[name="q-date"]').value,
      sourceBranch: form.querySelector('[name="q-sourceBranch"]').value,
      customerName: form.querySelector('[name="q-customerName"]').value.trim(),
      contact: form.querySelector('[name="q-contact"]').value.trim(),
      queryType: form.querySelector('[name="q-queryType"]').value,
      content: form.querySelector('[name="q-content"]').value.trim(),
      status: form.querySelector('[name="q-status"]').value,
      note: form.querySelector('[name="q-note"]').value.trim()
    };
    if (!data.date || !data.sourceBranch || !data.customerName || !data.content) {
      showToast('請填寫必填欄位', 'error'); return;
    }
    addQuery(data);
    showToast('查詢記錄已新增', 'success');
    form.reset();
    form.querySelector('[name="q-date"]').value = todayStr();
    document.getElementById('queries-form-container').classList.add('hidden');
    refreshQueriesStats();
    refreshQueriesList();
  });

  // 匯出按鈕
  document.getElementById('queries-export-btn').addEventListener('click', () => {
    exportQueriesToCSV();
    showToast('CSV 匯出成功', 'success');
  });

  // 初始渲染列表
  refreshQueriesList();
}

function refreshQueriesStats() {
  const stats = getQueryStats();
  document.getElementById('queries-stats').innerHTML = `
    ${StatCard('查詢總數', stats.total, '筆', 'purple')}
    ${StatCard('待處理', stats.pending, '筆', 'red')}
    ${StatCard('處理中', stats.processing, '筆', 'amber')}
    ${StatCard('已完成', stats.completed, '筆', 'green')}
  `;
}

function refreshQueriesList() {
  const container = document.getElementById('queries-list');
  const statusFilter = document.getElementById('queries-filter-status').value;
  const branchFilter = document.getElementById('queries-filter-branch').value;
  const keyword = document.getElementById('queries-search').value.trim();

  const queries = getAllQueries({
    status: statusFilter,
    sourceBranch: branchFilter,
    keyword: keyword
  });

  if (queries.length === 0) {
    container.innerHTML = `
      <div class="p-12 text-center">
        <div class="text-5xl mb-3">🔍</div>
        <p class="text-gray-500 text-sm">暫無查詢記錄</p>
        ${!statusFilter && !branchFilter && !keyword ? '<p class="text-gray-400 text-xs mt-1">點擊「新增查詢」開始記錄分館轉介</p>' : '<p class="text-gray-400 text-xs mt-1">請調整篩選條件</p>'}
      </div>`;
    return;
  }

  const statusOrder = { pending: 0, processing: 1, completed: 2 };
  queries.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || b.date.localeCompare(a.date));

  container.innerHTML = `
    <table class="w-full min-w-[900px] text-sm">
      <thead>
        <tr class="bg-purple-50 text-purple-900">
          <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">日期</th>
          <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">來源館別</th>
          <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">客戶姓名</th>
          <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">聯絡方式</th>
          <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">類型</th>
          <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">查詢內容</th>
          <th class="px-3 py-3 text-center font-semibold whitespace-nowrap">狀態</th>
          <th class="px-3 py-3 text-left font-semibold whitespace-nowrap">操作</th>
        </tr>
      </thead>
      <tbody>
        ${queries.map(q => {
          const sl = getQueryStatusLabel(q.status);
          return `
            <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors" data-qid="${q.id}">
              <td class="px-3 py-3 text-gray-600 whitespace-nowrap">${formatDateShort(q.date)}</td>
              <td class="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">${escapeHtml(BRANCH_MAP[q.sourceBranch]?.name || q.sourceBranch)}</td>
              <td class="px-3 py-3 font-medium text-gray-800 whitespace-nowrap">${escapeHtml(q.customerName)}</td>
              <td class="px-3 py-3 text-gray-600 whitespace-nowrap">${escapeHtml(q.contact || '')}</td>
              <td class="px-3 py-3 text-gray-600 whitespace-nowrap">${escapeHtml(q.queryType)}</td>
              <td class="px-3 py-3 text-gray-700 max-w-[200px] truncate" title="${escapeHtml(q.content)}">${escapeHtml(q.content)}</td>
              <td class="px-3 py-3 text-center whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${sl.bgClass} ${sl.textClass} border ${sl.borderClass}">${sl.label}</span>
              </td>
              <td class="px-3 py-3 whitespace-nowrap">
                <div class="flex gap-1.5">
                  ${q.status !== 'processing' ? `<button class="q-action-process text-amber-600 hover:text-amber-800 text-xs px-2 py-1 rounded hover:bg-amber-50 transition-colors font-medium" data-id="${q.id}">處理中</button>` : ''}
                  ${q.status !== 'completed' ? `<button class="q-action-complete text-green-600 hover:text-green-800 text-xs px-2 py-1 rounded hover:bg-green-50 transition-colors font-medium" data-id="${q.id}">已完成</button>` : ''}
                  ${q.status !== 'pending' ? `<button class="q-action-pending text-red-500 hover:text-red-700 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors font-medium" data-id="${q.id}">待處理</button>` : ''}
                  <button class="q-action-delete text-gray-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors" data-id="${q.id}">刪除</button>
                </div>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;

  // 綁定操作按鈕
  container.querySelectorAll('.q-action-process').forEach(btn => {
    btn.addEventListener('click', () => { updateQueryStatus(btn.dataset.id, 'processing'); refreshQueriesStats(); refreshQueriesList(); showToast('已更新為處理中', 'success'); });
  });
  container.querySelectorAll('.q-action-complete').forEach(btn => {
    btn.addEventListener('click', () => { updateQueryStatus(btn.dataset.id, 'completed'); refreshQueriesStats(); refreshQueriesList(); showToast('已標記為已完成', 'success'); });
  });
  container.querySelectorAll('.q-action-pending').forEach(btn => {
    btn.addEventListener('click', () => { updateQueryStatus(btn.dataset.id, 'pending'); refreshQueriesStats(); refreshQueriesList(); showToast('已更新為待處理', 'info'); });
  });
  container.querySelectorAll('.q-action-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await confirmAction('確定要刪除此查詢記錄嗎？')) {
        deleteQuery(btn.dataset.id);
        refreshQueriesStats();
        refreshQueriesList();
        showToast('已刪除', 'success');
      }
    });
  });
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
