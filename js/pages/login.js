/**
 * 登入頁面 - 史貝斯商務中心日報系統
 * 數字選館別 + 標準密碼輸入（支援英文、數字、符號）
 */

function renderLogin() {
  const app = document.getElementById('app');

  if (isUserLoggedIn()) {
    navigateTo('home');
    return;
  }

  const BRANCH_NUMBERS = [
    { num: '1', code: 'TC_CK', name: '台中-中港館', color: 'from-purple-500 to-purple-600' },
    { num: '2', code: 'TC_YT', name: '台中-英才館', color: 'from-purple-500 to-purple-600' },
    { num: '3', code: 'TC_CC', name: '台中-中清館', color: 'from-purple-500 to-purple-600' },
    { num: '4', code: 'TC_CF1', name: '台中-七期1館', color: 'from-indigo-500 to-indigo-600' },
    { num: '5', code: 'TC_CF2', name: '台中-七期2館', color: 'from-indigo-500 to-indigo-600' },
    { num: '6', code: 'TP_ZX', name: '台北-忠孝館', color: 'from-blue-500 to-blue-600' },
    { num: '7', code: 'TP_XZ1', name: '新北-汐止1館', color: 'from-cyan-500 to-cyan-600' },
    { num: '8', code: 'TP_XZ2', name: '新北-汐止2館', color: 'from-cyan-500 to-cyan-600' }
  ];

  let selectedBranch = null;

  function renderSelectView() {
    selectedBranch = null;

    const branchGrid = BRANCH_NUMBERS.map(b => `
      <button type="button" data-branch-num="${b.num}"
        class="branch-num-btn group relative bg-white rounded-2xl shadow-md border-2 border-gray-100 p-4 sm:p-5
               hover:shadow-lg hover:border-purple-300 hover:scale-[1.03]
               active:scale-[0.97] transition-all duration-150
               flex flex-col items-center justify-center gap-1 sm:gap-2 min-h-[90px] sm:min-h-[100px]">
        <span class="text-2xl sm:text-3xl font-bold bg-gradient-to-br ${b.color} bg-clip-text text-transparent">${b.num}</span>
        <span class="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-purple-700 transition-colors text-center leading-tight">${escapeHtml(b.name)}</span>
      </button>
    `).join('');

    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <div class="bg-white border-b border-gray-200 px-4 py-4 sm:py-5">
          <div class="max-w-lg mx-auto text-center">
            <h1 class="text-lg sm:text-xl font-bold text-gray-800">🏢 史貝斯商務中心</h1>
            <p class="text-sm text-gray-500 mt-0.5">請選擇您的館別</p>
          </div>
        </div>
        <main class="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div class="w-full max-w-sm">
            <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-4">${branchGrid}</div>
            <button type="button" data-branch-num="0"
              class="branch-num-btn w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl shadow-md
                     px-4 py-3 sm:py-4 font-bold text-base sm:text-lg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                     transition-all duration-150 flex items-center justify-center gap-2">
              <span>👑</span><span>0 - 總管理者</span>
            </button>
            <div id="login-error" class="hidden mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
                </svg>
                <p id="login-error-text" class="text-sm text-red-600"></p>
              </div>
            </div>
          </div>
        </main>
        <footer class="py-4 text-center"><p class="text-xs text-gray-400">&copy; 史貝斯商務中心日報系統</p></footer>
      </div>`;

    document.querySelectorAll('.branch-num-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.getAttribute('data-branch-num');
        if (num === '0') {
          selectedBranch = { num: '0', code: 'master', name: '總管理者' };
        } else {
          const b = BRANCH_NUMBERS.find(x => x.num === num);
          selectedBranch = { ...b };
        }
        renderPasswordView();
      });
    });
  }

  function renderPasswordView() {
    const branchLabel = selectedBranch.num === '0'
      ? '👑 總管理者' : `${selectedBranch.num} - ${selectedBranch.name}`;
    const branchColor = selectedBranch.num === '0'
      ? 'from-amber-400 to-amber-500' : selectedBranch.color;

    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <div class="bg-white border-b border-gray-200 px-4 py-4">
          <div class="max-w-sm mx-auto">
            <button id="back-to-select" class="text-sm text-gray-500 hover:text-purple-600 flex items-center gap-1 mb-2 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              返回選擇館別
            </button>
            <div class="bg-gradient-to-r ${branchColor} text-white rounded-xl px-4 py-3 text-center shadow-md">
              <p class="text-sm opacity-90">已選擇館別</p>
              <p class="text-lg font-bold">${escapeHtml(branchLabel)}</p>
            </div>
          </div>
        </div>

        <main class="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div class="w-full max-w-sm">
            <!-- 密碼輸入區 -->
            <div class="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
              <p class="text-sm text-gray-500 text-center mb-3">請輸入密碼</p>

              <!-- 密碼輸入框 -->
              <div class="relative mb-4">
                <input
                  type="password"
                  id="password-input"
                  placeholder="輸入密碼..."
                  autocomplete="current-password"
                  class="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 pr-24
                         text-center text-lg font-medium tracking-widest
                         focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-300
                         transition-all placeholder:text-gray-300 placeholder:tracking-normal placeholder:font-normal"
                />
                <!-- 清除 & 顯示切換按鈕 -->
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" id="clear-pw" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="清除">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                  <button type="button" id="toggle-visible" class="p-2 text-gray-400 hover:text-purple-600 transition-colors" title="顯示密碼">
                    <svg id="eye-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- 登入按鈕 -->
              <button type="button" id="login-submit-btn"
                class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl
                       py-3.5 text-lg font-bold shadow-lg shadow-purple-200
                       hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                登入
              </button>

              <!-- 錯誤訊息 -->
              <div id="login-error" class="hidden mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <div class="flex items-center gap-2">
                  <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
                  </svg>
                  <p id="login-error-text" class="text-sm text-red-600"></p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>`;

    // 綁定事件
    const pwInput = document.getElementById('password-input');
    const loginBtn = document.getElementById('login-submit-btn');

    // 自動聚焦輸入框
    setTimeout(() => pwInput.focus(), 100);

    // 清除按鈕
    document.getElementById('clear-pw').addEventListener('click', () => {
      pwInput.value = '';
      pwInput.focus();
    });

    // 顯示/隱藏切換
    let visible = false;
    document.getElementById('toggle-visible').addEventListener('click', () => {
      visible = !visible;
      pwInput.type = visible ? 'text' : 'password';
      document.getElementById('eye-icon').innerHTML = visible
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>';
    });

    // 登入按鈕
    loginBtn.addEventListener('click', doLogin);

    // 按 Enter 也能登入
    pwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doLogin();
    });

    // 返回按鈕
    document.getElementById('back-to-select').addEventListener('click', renderSelectView);
  }

  async function doLogin() {
    const pwInput = document.getElementById('password-input');
    const password = pwInput.value.trim();

    if (!password) {
      showError('請輸入密碼');
      pwInput.focus();
      return;
    }

    const loginBtn = document.getElementById('login-submit-btn');
    loginBtn.disabled = true;
    loginBtn.textContent = '登入中...';

    try {
      const result = await loginUser(selectedBranch.code, password);

      if (result.success) {
        const profile = getUserProfile();
        showToast(`登入成功！歡迎，${escapeHtml(profile?.name || '')}`, 'success');

        if (profile?.role === 'master') {
          navigateTo('admin');
        } else {
          navigateTo('branch', { code: profile?.branchCode });
        }
      } else {
        showError(result.error || '登入失敗，密碼錯誤');
        pwInput.value = '';
        pwInput.focus();
      }
    } catch (err) {
      console.error('[Login] 登入過程發生錯誤:', err);
      showError('網路連線異常，請檢查網路後再試');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = '登入';
    }
  }

  function showError(message) {
    const errorBox = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');
    if (errorText) errorText.textContent = message;
    if (errorBox) errorBox.classList.remove('hidden');
  }

  renderSelectView();
}
