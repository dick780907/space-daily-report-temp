// ============ 館別人員填報頁 ============

function renderBranch(branchCode) {
  const app = document.getElementById('app');
  const branch = BRANCH_MAP[branchCode];

  if (!branch) {
    app.innerHTML = `
      <div class="min-h-screen bg-slate-50">
        ${PageHeader('錯誤', '找不到該館別')}
        <div class="max-w-6xl mx-auto px-4 py-8">
          ${EmptyState('館別代碼無效，請返回首頁重新選擇')}
          <div class="text-center mt-4">${BackButton('#')}</div>
        </div>
      </div>
    `;
    return;
  }

  // ===== 頁面結構 =====
  app.innerHTML = `
    <div class="min-h-screen bg-slate-50 fade-in">
      ${PageHeader(branch.name, '館別人員日報填報系統')}

      <div class="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
        <!-- 頂部工具列 -->
        <div class="flex items-center justify-between mb-4">
          ${BackButton('#')}
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">
              <span class="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>
              ${escapeHtml(getCurrentUserDisplayName() || '')}
            </span>
            <button
              id="branch-logout-btn"
              class="text-sm text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              登出
            </button>
          </div>
        </div>

        <!-- 頁籤 -->
        <div class="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button data-tab="form" class="tab-btn flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all text-center bg-white text-purple-700 shadow-sm">
            📝 填寫日報
          </button>
          <button data-tab="history" class="tab-btn flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all text-center text-gray-500 hover:text-gray-700">
            📋 歷史紀錄
          </button>
          <button data-tab="stats" class="tab-btn flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all text-center text-gray-500 hover:text-gray-700">
            📊 本館統計
          </button>
        </div>

        <!-- Tab 1: 填寫日報 -->
        <div id="tab-form" class="tab-content">
          <form id="report-form" class="space-y-6">
            <!-- 基本資訊 -->
            <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">日期 <span class="text-red-500">*</span></label>
                  <input type="date" name="date" id="form-date" value="${todayStr()}"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[56px]" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">填表人姓名 <span class="text-red-500">*</span></label>
                  <input type="text" name="author" id="form-author" placeholder="請輸入姓名"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[56px]" required>
                </div>
              </div>
            </div>

            <!-- 查詢區 -->
            <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
              ${SectionTitle('🔍', '查詢區')}
              <div class="grid grid-cols-2 gap-4">
                ${NumberInput('辦公室查詢（件）', 'officeQuery', 0)}
                ${NumberInput('營業登記查詢（件）', 'registerQuery', 0)}
              </div>
            </div>

            <!-- 參觀區 -->
            <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
              ${SectionTitle('👥', '參觀區')}
              ${NumberInput('參觀人次', 'visits', 0)}
            </div>

            <!-- 簽約區 -->
            <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
              ${SectionTitle('📝', '簽約區')}
              <div class="space-y-4">
                ${RoomInput('辦公室續約', 'officeRenew', 0, '', '辦公室(續約)')}
                ${RoomInput('辦公室新簽', 'officeNew', 0, '', '辦公室')}
                <div class="grid grid-cols-2 gap-4">
                  ${NumberInput('營業登記新簽（件）', 'registerNew', 0)}
                  ${NumberInput('營業登記續約（件）', 'registerRenew', 0)}
                </div>
              </div>
            </div>

            <!-- 退租區 -->
            <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
              ${SectionTitle('🚪', '退租區')}
              ${RoomInput('辦公室退租', 'officeCancel', 0, '')}
            </div>

            <!-- 付定區 -->
            <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
              ${SectionTitle('💰', '付定區')}
              ${RoomInput('辦公室付定', 'officeDeposit', 0, '')}
            </div>

            <!-- 出租率 -->
            <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100">
              ${SectionTitle('📊', '出租率')}
              <div class="grid grid-cols-2 gap-4 mb-3">
                ${NumberInput('已租間數', 'rentedCount', 0)}
                ${NumberInput('總間數', 'totalCount', 0)}
              </div>
              <div id="occupancy-display" class="text-center py-4 bg-purple-50 rounded-xl">
                <span class="text-gray-600 text-sm">出租率：</span>
                <span id="occupancy-rate" class="text-3xl font-bold text-purple-700">0%</span>
              </div>
            </div>

            <!-- 提交按鈕 -->
            <button type="submit"
              class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-4 rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all text-lg">
              ✓ 提交日報
            </button>
          </form>
        </div>

        <!-- Tab 2: 歷史紀錄 -->
        <div id="tab-history" class="tab-content hidden">
          <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100 mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">選擇月份</label>
            <input type="month" id="history-month" value="${currentYearMonth()}"
              class="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[56px]">
          </div>
          <div id="history-table-container"></div>
        </div>

        <!-- Tab 3: 本館統計 -->
        <div id="tab-stats" class="tab-content hidden">
          <div class="bg-white rounded-2xl p-5 md:p-6 shadow-lg shadow-gray-100/50 border border-gray-100 mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">選擇月份</label>
            <input type="month" id="stats-month" value="${currentYearMonth()}"
              class="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[56px]">
          </div>
          <div id="stats-container" class="grid grid-cols-2 md:grid-cols-3 gap-4"></div>
        </div>
      </div>
    </div>
  `;

  // ===== Tab 切換邏輯 =====
  const tabBtns = app.querySelectorAll('.tab-btn');
  const tabContents = app.querySelectorAll('.tab-content');
  let currentTab = 'form';

  function switchTab(tabName) {
    currentTab = tabName;
    tabBtns.forEach(btn => {
      const isTarget = btn.dataset.tab === tabName;
      btn.className = isTarget
        ? 'tab-btn flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all text-center bg-white text-purple-700 shadow-sm'
        : 'tab-btn flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all text-center text-gray-500 hover:text-gray-700';
    });
    tabContents.forEach(content => {
      content.classList.toggle('hidden', content.id !== `tab-${tabName}`);
    });

    if (tabName === 'history') renderHistoryTable();
    if (tabName === 'stats') renderStats();
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ===== Tab 1: 表單邏輯 =====
  const form = app.querySelector('#report-form');
  const dateInput = app.querySelector('#form-date');
  const authorInput = app.querySelector('#form-author');
  const occupancyRateEl = app.querySelector('#occupancy-rate');

  // 載入已有資料
  function loadExistingReport() {
    const date = dateInput.value;
    if (!date) return;
    const report = getReport(branchCode, date);

    if (report) {
      authorInput.value = report.author || '';
      setNumberValue('officeQuery', report.officeQuery);
      setNumberValue('registerQuery', report.registerQuery);
      setNumberValue('visits', report.visits);
      setRoomValue('officeRenew', report.officeRenew);
      setRoomValue('officeNew', report.officeNew);
      setNumberValue('registerNew', report.registerNew);
      setNumberValue('registerRenew', report.registerRenew);
      setRoomValue('officeCancel', report.officeCancel);
      setRoomValue('officeDeposit', report.officeDeposit);
      setNumberValue('rentedCount', report.rentedCount);
      setNumberValue('totalCount', report.totalCount);
    } else {
      // 清空非必填欄位
      authorInput.value = '';
      setNumberValue('officeQuery', 0);
      setNumberValue('registerQuery', 0);
      setNumberValue('visits', 0);
      setRoomValue('officeRenew', { count: 0, rooms: '' });
      setRoomValue('officeNew', { count: 0, rooms: '' });
      setNumberValue('registerNew', 0);
      setNumberValue('registerRenew', 0);
      setRoomValue('officeCancel', { count: 0, rooms: '' });
      setRoomValue('officeDeposit', { count: 0, rooms: '' });
      setNumberValue('rentedCount', 0);
      setNumberValue('totalCount', 0);
    }
    updateOccupancyDisplay();
  }

  function setNumberValue(name, value) {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = value ?? 0;
  }

  function setRoomValue(name, data) {
    const countInput = form.querySelector(`[name="${name}Count"]`);
    const roomsInput = form.querySelector(`[name="${name}Rooms"]`);
    if (countInput) countInput.value = data?.count ?? 0;
    if (roomsInput) roomsInput.value = data?.rooms ?? '';
  }

  function getNumberValue(name) {
    const input = form.querySelector(`[name="${name}"]`);
    return input ? parseInt(input.value || '0', 10) : 0;
  }

  function getRoomValue(name) {
    const countInput = form.querySelector(`[name="${name}Count"]`);
    const roomsInput = form.querySelector(`[name="${name}Rooms"]`);
    return {
      count: countInput ? parseInt(countInput.value || '0', 10) : 0,
      rooms: roomsInput ? (roomsInput.value || '') : ''
    };
  }

  // 出租率即時計算
  function updateOccupancyDisplay() {
    const rented = getNumberValue('rentedCount');
    const total = getNumberValue('totalCount');
    const rate = calcOccupancyRate(rented, total);
    occupancyRateEl.textContent = `${rate}%`;
    if (total > 0) {
      occupancyRateEl.className = 'text-3xl font-bold text-purple-700';
    } else {
      occupancyRateEl.className = 'text-3xl font-bold text-gray-400';
    }
  }

  // 監聽出租率欄位
  ['rentedCount', 'totalCount'].forEach(name => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) {
      input.addEventListener('input', updateOccupancyDisplay);
    }
  });

  // 日期切換自動載入
  dateInput.addEventListener('change', loadExistingReport);

  // 表單提交
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const date = dateInput.value;
    const author = authorInput.value.trim();

    if (!date) {
      showToast('請選擇日期', 'error');
      return;
    }
    if (!author) {
      showToast('請輸入填表人姓名', 'error');
      return;
    }

    const report = {
      id: `${branchCode}_${date}`,
      branch: branchCode,
      date,
      author,
      officeQuery: getNumberValue('officeQuery'),
      registerQuery: getNumberValue('registerQuery'),
      visits: getNumberValue('visits'),
      officeRenew: getRoomValue('officeRenew'),
      officeNew: getRoomValue('officeNew'),
      registerNew: getNumberValue('registerNew'),
      registerRenew: getNumberValue('registerRenew'),
      officeCancel: getRoomValue('officeCancel'),
      officeDeposit: getRoomValue('officeDeposit'),
      rentedCount: getNumberValue('rentedCount'),
      totalCount: getNumberValue('totalCount')
    };

    saveReport(report);
    showToast('日報提交成功！', 'success');
  });

  // 首次載入
  loadExistingReport();

  // ===== Tab 2: 歷史紀錄 =====
  const historyMonthInput = app.querySelector('#history-month');
  const historyTableContainer = app.querySelector('#history-table-container');

  function renderHistoryTable() {
    const yearMonth = historyMonthInput.value;
    if (!yearMonth) return;

    const reports = getReportsByBranchMonth(branchCode, yearMonth);

    if (reports.length === 0) {
      historyTableContainer.innerHTML = EmptyState('該月份尚無日報記錄');
      return;
    }

    const rows = reports.map(r => {
      const signTotal = calcSignTotal(r);
      const occupancy = calcOccupancyRate(r.rentedCount || 0, r.totalCount || 0);
      return `
        <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
          <td class="px-3 py-3 text-sm whitespace-nowrap">${formatDateShort(r.date)}</td>
          <td class="px-3 py-3 text-sm font-medium">${escapeHtml(r.author)}</td>
          <td class="px-3 py-3 text-sm text-center">${r.officeQuery || 0}</td>
          <td class="px-3 py-3 text-sm text-center">${r.registerQuery || 0}</td>
          <td class="px-3 py-3 text-sm text-center">${r.visits || 0}</td>
          <td class="px-3 py-3 text-sm text-center font-medium text-purple-700">${signTotal}</td>
          <td class="px-3 py-3 text-sm text-center">${r.officeCancel?.count || 0}</td>
          <td class="px-3 py-3 text-sm text-center">${r.officeDeposit?.count || 0}</td>
          <td class="px-3 py-3 text-sm text-center">${occupancy}%</td>
          <td class="px-3 py-3 text-sm whitespace-nowrap">
            <div class="flex gap-2">
              <button data-edit="${r.date}" class="edit-btn text-purple-600 hover:text-purple-800 font-medium text-sm px-2 py-1 rounded hover:bg-purple-50 transition-colors">編輯</button>
              <button data-delete="${r.date}" class="delete-btn text-red-500 hover:text-red-700 font-medium text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors">刪除</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    historyTableContainer.innerHTML = `
      <div class="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border border-gray-100 overflow-x-auto">
        <table class="w-full min-w-[700px]">
          <thead>
            <tr class="bg-purple-50 text-purple-900 font-semibold text-sm">
              <th class="px-3 py-3 text-left">日期</th>
              <th class="px-3 py-3 text-left">填表人</th>
              <th class="px-3 py-3 text-center">辦公室<br>查詢</th>
              <th class="px-3 py-3 text-center">營登<br>查詢</th>
              <th class="px-3 py-3 text-center">參觀</th>
              <th class="px-3 py-3 text-center">簽約</th>
              <th class="px-3 py-3 text-center">退租</th>
              <th class="px-3 py-3 text-center">付定</th>
              <th class="px-3 py-3 text-center">出租率</th>
              <th class="px-3 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    // 綁定編輯按鈕
    historyTableContainer.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.edit;
        switchTab('form');
        dateInput.value = date;
        loadExistingReport();
      });
    });

    // 綁定刪除按鈕
    historyTableContainer.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const date = btn.dataset.delete;
        const modalHtml = DeleteConfirmModal();
        const modalWrapper = document.createElement('div');
        modalWrapper.innerHTML = modalHtml;
        document.body.appendChild(modalWrapper);
        bindDeleteModal(() => {
          deleteReport(branchCode, date);
          showToast('日報已刪除', 'success');
          renderHistoryTable();
        });
      });
    });
  }

  historyMonthInput.addEventListener('change', renderHistoryTable);

  // ===== Tab 3: 本館統計 =====
  const statsMonthInput = app.querySelector('#stats-month');
  const statsContainer = app.querySelector('#stats-container');

  function renderStats() {
    const yearMonth = statsMonthInput.value;
    if (!yearMonth) return;

    const stats = calcBranchMonthStats(branchCode, yearMonth);
    const fill = getBranchMonthFillStatus(branchCode, yearMonth);

    const statItems = [
      { label: '辦公室查詢', value: stats.officeQuery, unit: '件', color: 'blue' },
      { label: '營業登記查詢', value: stats.registerQuery, unit: '件', color: 'blue' },
      { label: '參觀人次', value: stats.visits, unit: '人', color: 'emerald' },
      { label: '辦公室續約', value: stats.officeRenew, unit: '間', color: 'purple' },
      { label: '辦公室新簽', value: stats.officeNew, unit: '間', color: 'purple' },
      { label: '營業登記新簽', value: stats.registerNew, unit: '件', color: 'purple' },
      { label: '營業登記續約', value: stats.registerRenew, unit: '件', color: 'purple' },
      { label: '簽約總數', value: stats.signTotal, unit: '間/件', color: 'amber' },
      { label: '辦公室退租', value: stats.officeCancel, unit: '間', color: 'rose' },
      { label: '辦公室付定', value: stats.officeDeposit, unit: '間', color: 'amber' },
      { label: '平均出租率', value: stats.avgOccupancy, unit: '%', color: 'purple' },
      { label: '填報天數', value: `${stats.reportDays}/${fill.total}`, unit: '天', color: 'emerald' },
    ];

    statsContainer.innerHTML = statItems.map(item =>
      StatCard(item.label, item.value, item.unit, item.color)
    ).join('');
  }

  statsMonthInput.addEventListener('change', renderStats);

  // ===== 登出按鈕 =====
  const logoutBtn = app.querySelector('#branch-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await logoutUser();
      showToast('已成功登出', 'info');
      navigateTo('login');
    });
  }
}