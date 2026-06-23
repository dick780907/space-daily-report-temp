/**
 * 登入頁面渲染函數 - 史貝斯商務中心日報系統
 * 提供 帳號 + 密碼 登入，以及快速館別選擇
 */

function renderLogin() {
  const app = document.getElementById('app');

  // 如果已登入，自動導向首頁
  if (isUserLoggedIn()) {
    navigateTo('home');
    return;
  }

  // 取得上次記住的帳號
  const lastAccount = localStorage.getItem('space_last_account') || '';

  // 館別選項（用於下拉選單）
  const branchOptions = getBranchLoginOptions();
  const branchSelectOptions = branchOptions.map(opt =>
    `<option value="${escapeHtml(opt.code)}">${escapeHtml(opt.name)}</option>`
  ).join('');

  // 組合登入頁面 HTML
  app.innerHTML = `
    <div class="min-h-screen flex flex-col bg-gray-50">
      <!-- 頂部標題區 -->
      ${PageHeader('🏢 史貝斯商務中心日報系統', '請登入以繼續使用系統')}

      <!-- 登入卡片 -->
      <main class="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div class="w-full max-w-md">
          <div class="bg-white rounded-2xl shadow-lg shadow-purple-100/50 border border-purple-100 p-6 sm:p-8">
            <!-- 鎖頭圖標 -->
            <div class="text-center mb-6">
              <div class="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-3">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <h2 class="text-xl font-bold text-gray-800">帳號登入</h2>
              <p class="text-sm text-gray-500 mt-1">請輸入您的帳號與密碼</p>
            </div>

            <!-- 登入表單 -->
            <form id="login-form" class="space-y-4" data-nosubmit="false">
              <!-- 快速選擇館別 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">快速選擇館別</label>
                <select id="branch-select"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all cursor-pointer">
                  <option value="">-- 請選擇館別 --</option>
                  ${branchSelectOptions}
                </select>
              </div>

              <!-- 帳號輸入 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">帳號</label>
                <input
                  type="text"
                  id="login-account"
                  value="${escapeHtml(lastAccount)}"
                  placeholder="請輸入帳號（如 tc_ck）"
                  autocomplete="username"
                  class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <!-- 密碼輸入 -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1.5">密碼</label>
                <div class="relative">
                  <input
                    type="password"
                    id="login-password"
                    placeholder="請輸入密碼"
                    autocomplete="current-password"
                    class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    id="toggle-password"
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    aria-label="切換密碼顯示"
                  >
                    <svg id="eye-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 記住我 -->
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="remember-account"
                  ${lastAccount ? 'checked' : ''}
                  class="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
                />
                <label for="remember-account" class="ml-2 text-sm text-gray-600 cursor-pointer select-none">記住我的帳號</label>
              </div>

              <!-- 登入按鈕 -->
              <button
                type="submit"
                id="login-btn"
                class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                </svg>
                <span id="login-btn-text">登入</span>
              </button>

              <!-- 錯誤訊息區域 -->
              <div id="login-error" class="hidden rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p id="login-error-text" class="text-sm text-red-600"></p>
                </div>
              </div>

              <!-- 提示訊息 -->
              <div class="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                <div class="flex items-start gap-2">
                  <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <div class="text-xs text-blue-600 space-y-1">
                    <p class="font-medium">預設密碼提示：</p>
                    <p>各館密碼為「館別代碼 + 123」（如 TC_CK123）</p>
                    <p>管理者密碼為 Master@2024</p>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <!-- 返回首頁 -->
          <div class="text-center mt-4">
            <a href="#" class="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-purple-600 transition-colors no-underline">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              返回館別選擇
            </a>
          </div>
        </div>
      </main>

      <!-- 底部版權 -->
      <footer class="py-6 text-center">
        <p class="text-xs text-gray-400">&copy; 史貝斯商務中心日報系統 &middot; All Rights Reserved</p>
      </footer>
    </div>
  `;

  // ============ 綁定事件 ============

  const loginForm = document.getElementById('login-form');
  const accountInput = document.getElementById('login-account');
  const passwordInput = document.getElementById('login-password');
  const branchSelect = document.getElementById('branch-select');
  const loginBtn = document.getElementById('login-btn');
  const loginBtnText = document.getElementById('login-btn-text');
  const errorBox = document.getElementById('login-error');
  const errorText = document.getElementById('login-error-text');
  const rememberCheckbox = document.getElementById('remember-account');
  const togglePasswordBtn = document.getElementById('toggle-password');

  // --- 館別下拉選單變更：自動填入帳號 ---
  branchSelect.addEventListener('change', () => {
    const selectedCode = branchSelect.value;
    if (selectedCode) {
      accountInput.value = selectedCode;
      // 自動填入對應密碼提示
      const defaultPassword = BRANCH_PASSWORDS[selectedCode];
      if (defaultPassword) {
        passwordInput.placeholder = `預設密碼: ${defaultPassword}`;
      }
      passwordInput.focus();
    }
  });

  // --- 切換密碼顯示 ---
  let passwordVisible = false;
  togglePasswordBtn.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    togglePasswordBtn.innerHTML = passwordVisible
      ? `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
             d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
         </svg>`
      : `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
             d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
             d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
         </svg>`;
  });

  // --- 表單提交：登入 ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const account = accountInput.value.trim();
    const password = passwordInput.value.trim();

    // 清除錯誤訊息
    errorBox.classList.add('hidden');
    errorText.textContent = '';

    // 基本驗證
    if (!account) {
      showError('請輸入帳號');
      accountInput.focus();
      return;
    }
    if (!password) {
      showError('請輸入密碼');
      passwordInput.focus();
      return;
    }

    // 帳號轉換為 email（自動加上 @space.com）
    const email = account.includes('@') ? account : `${account}@space.com`;

    // 設置載入狀態
    setLoading(true);

    try {
      const result = await loginUser(email, password);

      if (result.success) {
        // 記住帳號（記住原始帳號，不含 @space.com）
        if (rememberCheckbox.checked) {
          localStorage.setItem('space_last_account', account);
        } else {
          localStorage.removeItem('space_last_account');
        }

        // 從 profile 取得角色資訊
        const profile = getUserProfile();
        showToast(`登入成功！歡迎，${escapeHtml(profile?.name || '')}`, 'success');

        // 依角色導向
        if (profile?.role === 'master') {
          navigateTo('admin');
        } else {
          navigateTo('branch', { code: profile?.branchCode });
        }
      } else {
        showError(result.error || '登入失敗，請檢查您的帳號密碼');
        passwordInput.value = '';
        passwordInput.focus();
      }
    } catch (err) {
      console.error('[Login] 登入過程發生錯誤:', err);
      showError('網路連線異常，請檢查網路後再試');
    } finally {
      setLoading(false);
    }
  });

  // --- 輔助函數 ---

  function showError(message) {
    errorText.textContent = message;
    errorBox.classList.remove('hidden');
  }

  function setLoading(loading) {
    if (loading) {
      loginBtn.disabled = true;
      loginBtn.classList.add('opacity-70', 'cursor-not-allowed');
      loginBtnText.textContent = '登入中...';
    } else {
      loginBtn.disabled = false;
      loginBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      loginBtnText.textContent = '登入';
    }
  }
}
