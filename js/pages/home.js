/**
 * 首頁渲染函數 - 史貝斯商務中心日報系統
 * 登入後首頁：根據用戶角色顯示不同內容
 * 未登入：自動導向登入頁面
 */

function renderHome() {
  // 檢查認證是否已初始化
  if (!_authInitialized) {
    setTimeout(renderHome, 100);
    return;
  }

  // 認證已初始化，檢查登入狀態
  if (!isUserLoggedIn()) {
    // 未登入 → 導向登入頁面
    navigateTo('login');
    return;
  }

  // 已登入，渲染首頁內容
  _renderHomeContent();
}

function _renderHomeContent() {
  var app = document.getElementById('app');
  const userName = getCurrentUserDisplayName();
  const userEmail = getCurrentUserEmail();
  const userBranchCode = getUserBranchCode();
  const master = isMaster();

  if (master) {
    // --- 管理員首頁 ---
    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- 頂部標題區 -->
        ${PageHeader('🏢 史貝斯商務中心日報系統', '管理員控制台')}

        <!-- 管理員歡迎區 -->
        <main class="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
          <div class="w-full max-w-lg">
            <!-- 歡迎卡片 -->
            <div class="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 p-6 sm:p-8 text-center mb-6">
              <!-- 管理員圖標 -->
              <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-200/50">
                <span class="text-4xl">👑</span>
              </div>
              <h2 class="text-2xl font-bold text-gray-800 mb-1">歡迎，管理員</h2>
              <p class="text-sm text-gray-500">${escapeHtml(userEmail)}</p>

              <div class="mt-4 inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-sm font-medium px-4 py-1.5 rounded-full">
                <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                已登入
              </div>
            </div>

            <!-- 功能按鈕 -->
            <div class="space-y-4">
              <!-- 進入總管理者後台 -->
              <button
                id="btn-admin-dashboard"
                class="w-full group bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl p-6 shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-4 text-left"
              >
                <div class="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-bold">總管理者後台</h3>
                  <p class="text-sm text-purple-100">查看所有館別日報、統計數據與管理功能</p>
                </div>
                <svg class="w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- 登出按鈕 -->
              <button
                id="btn-logout"
                class="w-full bg-white text-gray-700 border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                登出
              </button>
            </div>
          </div>
        </main>

        <!-- 底部版權 -->
        <footer class="py-6 text-center">
          <p class="text-xs text-gray-400">&copy; 史貝斯商務中心日報系統 &middot; All Rights Reserved</p>
        </footer>
      </div>
    `;

    // 綁定管理員按鈕事件
    document.getElementById('btn-admin-dashboard')?.addEventListener('click', () => {
      navigateTo('admin');
    });

  } else {
    // --- 館別人員首頁 ---
    const branch = BRANCH_MAP[userBranchCode];
    const cityColors = {
      '台中': 'from-purple-500 to-purple-600',
      '台北': 'from-blue-500 to-blue-600',
      '新北': 'from-emerald-500 to-emerald-600'
    };
    const gradientClass = cityColors[branch?.city] || 'from-purple-500 to-purple-600';
    const borderClass = branch?.city === '台中' ? 'border-purple-200' : branch?.city === '台北' ? 'border-blue-200' : 'border-emerald-200';

    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- 頂部標題區 -->
        ${PageHeader('🏢 史貝斯商務中心日報系統', '館別人員工作台')}

        <!-- 館別人員歡迎區 -->
        <main class="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
          <div class="w-full max-w-lg">
            <!-- 歡迎卡片 -->
            <div class="bg-white rounded-2xl shadow-lg shadow-gray-100/50 border ${borderClass} p-6 sm:p-8 text-center mb-6">
              <!-- 館別圖標 -->
              <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center mb-4 shadow-lg">
                <span class="text-4xl">🏢</span>
              </div>
              <h2 class="text-2xl font-bold text-gray-800 mb-1">歡迎，${escapeHtml(userName)}</h2>
              <p class="text-sm text-gray-500">${escapeHtml(userEmail)}</p>

              <div class="mt-4 flex items-center justify-center gap-3">
                <span class="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm font-mono px-3 py-1 rounded-full">
                  ${escapeHtml(userBranchCode)}
                </span>
                <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-sm px-3 py-1 rounded-full">
                  <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  已登入
                </span>
              </div>
            </div>

            <!-- 功能按鈕 -->
            <div class="space-y-4">
              <!-- 填寫日報 -->
              <button
                id="btn-fill-report"
                class="w-full group bg-gradient-to-r ${gradientClass} text-white rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-4 text-left"
              >
                <div class="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                </div>
                <div class="flex-1 min-w-0">
                  <h3 class="text-lg font-bold">填寫日報</h3>
                  <p class="text-sm text-white/80">進入日報填報系統，記錄今日營運數據</p>
                </div>
                <svg class="w-6 h-6 text-white/70 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>

              <!-- 登出按鈕 -->
              <button
                id="btn-logout"
                class="w-full bg-white text-gray-700 border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                登出
              </button>
            </div>
          </div>
        </main>

        <!-- 底部版權 -->
        <footer class="py-6 text-center">
          <p class="text-xs text-gray-400">&copy; 史貝斯商務中心日報系統 &middot; All Rights Reserved</p>
        </footer>
      </div>
    `;

    // 綁定填寫日報按鈕事件
    document.getElementById('btn-fill-report')?.addEventListener('click', () => {
      navigateTo('branch', { code: userBranchCode });
    });
  }

  // ===== 共用：登出按鈕事件 =====
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await logoutUser();
    showToast('已成功登出', 'info');
    navigateTo('login');
  });
}