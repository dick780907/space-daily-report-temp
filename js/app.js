// ============ 主應用路由 ============
// 史貝斯商務中心日報系統 - 路由與導航

const app = document.getElementById('app');
let currentPage = '';

// ============ 路由表 ============
const routes = {
  '': () => renderHome(),
  'home': () => renderHome(),
  'login': () => renderLogin(),
  'branch': () => renderBranchGuarded(),
  'admin': () => renderAdminGuarded(),
};

// ============ 受保護路由：館別頁面 ============
function renderBranchGuarded() {
  // 等待認證初始化
  if (!_authInitialized) {
    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        ${PageHeader('🏢 史貝斯商務中心日報系統', '載入中...')}
        ${LoadingSpinner()}
      </div>
    `;
    setTimeout(renderBranchGuarded, 100);
    return;
  }

  // 認證已初始化，檢查登入
  if (!isUserLoggedIn()) {
    showToast('請先登入', 'warning');
    navigateTo('login');
    return;
  }

  // 已取得登入狀態，進行權限檢查
  var code = getQueryParam('code');
  if (!code || !BRANCH_MAP[code]) {
    showToast('無效的館別代碼', 'error');
    navigateTo('home');
    return;
  }

  // 管理員可訪問所有館別
  if (isMaster()) {
    renderBranch(code);
    return;
  }

  // 館別人員只能訪問自己的館別
  var userBranchCode = getUserBranchCode();
  if (code !== userBranchCode) {
    renderNoPermission('您沒有權限存取此館別', '您的館別為：' + (BRANCH_MAP[userBranchCode] && BRANCH_MAP[userBranchCode].name || userBranchCode));
    return;
  }

  renderBranch(code);
}

// ============ 受保護路由：管理員後台 ============
function renderAdminGuarded() {
  // 等待認證初始化
  if (!_authInitialized) {
    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        ${PageHeader('🏢 史貝斯商務中心日報系統', '載入中...')}
        ${LoadingSpinner()}
      </div>
    `;
    setTimeout(renderAdminGuarded, 100);
    return;
  }

  // 檢查登入
  if (!isUserLoggedIn()) {
    showToast('請先登入', 'warning');
    navigateTo('login');
    return;
  }

  // 檢查管理員權限
  if (!isMaster()) {
    renderNoPermission('您沒有權限存取管理後台', '此功能僅限總管理者使用');
    return;
  }

  renderAdmin();
}

// ============ 無權限頁面 ============
function renderNoPermission(title, subtitle) {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col bg-gray-50">
      ${PageHeader('⚠️ 無權限存取', '您沒有足夠的權限存取此頁面')}

      <main class="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div class="w-full max-w-md text-center">
          <div class="bg-white rounded-2xl shadow-lg border border-red-100 p-8">
            <!-- 警告圖標 -->
            <div class="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>

            <h2 class="text-xl font-bold text-gray-800 mb-2">${escapeHtml(title)}</h2>
            <p class="text-gray-500 mb-6">${escapeHtml(subtitle)}</p>

            <div class="space-y-3">
              <button
                id="btn-go-home"
                class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                返回首頁
              </button>

              <button
                id="btn-logout-relogin"
                class="w-full bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
              >
                登出並重新登入
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  document.getElementById('btn-go-home')?.addEventListener('click', () => {
    navigateTo('home');
  });

  document.getElementById('btn-logout-relogin')?.addEventListener('click', async () => {
    await logoutUser();
    navigateTo('login');
  });
}

// ============ 初始化 ============
function init() {
  // 初始化 Firebase 認證（啟動登入狀態監聽）
  initAuth(({ loggedIn }) => {
    console.log('[Auth] 初始化完成，登入狀態:', loggedIn);
  });

  // 處理首次加載
  handleRoute();
  // 監聽 hash 變化
  window.addEventListener('hashchange', handleRoute);
  // 防止表單提交導致頁面跳轉
  document.addEventListener('submit', e => {
    const form = e.target.closest('form');
    if (form && form.dataset.nosubmit !== 'false') {
      e.preventDefault();
    }
  }, true);
}

// ============ 路由處理 ============
function handleRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  const [page, query] = hash.split('?');
  const routeFn = routes[page] || routes[''];

  // 重置並保存查詢參數
  _queryParams = {};
  if (query) {
    query.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v) _queryParams[decodeURIComponent(k)] = decodeURIComponent(v);
    });
  }

  currentPage = page || 'home';
  app.innerHTML = '';

  // 顯示加載狀態（對於受保護路由）
  if (page === 'branch' || page === 'admin') {
    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        ${PageHeader('🏢 史貝斯商務中心日報系統', '載入中...')}
        ${LoadingSpinner()}
      </div>
    `;
  }

  try {
    routeFn();
  } catch (err) {
    console.error('[Router] render error:', err);
    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        ${PageHeader('錯誤', '頁面渲染失敗')}
        <div class="flex-1 flex items-center justify-center px-4">
          <div class="text-center">
            <div class="text-red-500 text-lg mb-2">渲染錯誤</div>
            <p class="text-gray-500 mb-4">${escapeHtml(err.message)}</p>
            <button onclick="navigateTo('home')" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              返回首頁
            </button>
          </div>
        </div>
      </div>
    `;
  }
  window.scrollTo(0, 0);
}

// ============ 查詢參數工具 ============
let _queryParams = {};
function getQueryParam(key) {
  return _queryParams[key] || '';
}

function setQueryParam(key, value) {
  _queryParams[key] = value;
}

// ============ 導航工具 ============
function redirectTo(page, params = {}) {
  const qs = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  window.location.hash = qs ? `${page}?${qs}` : page;
}

function navigateTo(page, params = {}) {
  redirectTo(page, params);
}

function getCurrentPage() {
  return currentPage;
}

// ============ 頁面切換動畫 ============
function animatePageEnter() {
  const el = app.firstElementChild;
  if (el) el.classList.add('page-enter');
}

// ============ DOM 就緒後初始化 ============
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
