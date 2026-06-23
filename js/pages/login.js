/**
 * 登入頁面渲染函數 - 史貝斯商務中心日報系統
 * 數字鍵盤選擇館別 + 密碼登入（匿名認證，完全不需要 Email）
 */

function renderLogin() {
  const app = document.getElementById('app');

  // 如果已登入，自動導向首頁
  if (isUserLoggedIn()) {
    navigateTo('home');
    return;
  }

  // 館別數字對照表
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

  // 步驟狀態
  let currentStep = 'select';
  let selectedBranch = null;
  let passwordValue = '';

  function renderSelectView() {
    currentStep = 'select';
    selectedBranch = null;
    passwordValue = '';

    const branchGrid = BRANCH_NUMBERS.map(b => `
      <button
        type="button"
        data-branch-num="${b.num}"
        class="branch-num-btn group relative bg-white rounded-2xl shadow-md border-2 border-gray-100 p-4 sm:p-5
               hover:shadow-lg hover:border-purple-300 hover:scale-[1.03]
               active:scale-[0.97] transition-all duration-150
               flex flex-col items-center justify-center gap-1 sm:gap-2 min-h-[90px] sm:min-h-[100px]"
      >
        <span class="text-2xl sm:text-3xl font-bold bg-gradient-to-br ${b.color} bg-clip-text text-transparent">
          ${b.num}
        </span>
        <span class="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-purple-700 transition-colors text-center leading-tight">
          ${escapeHtml(b.name)}
        </span>
      </button>
    `).join('');

    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <!-- 頂部標題 -->
        <div class="bg-white border-b border-gray-200 px-4 py-4 sm:py-5">
          <div class="max-w-lg mx-auto text-center">
            <h1 class="text-lg sm:text-xl font-bold text-gray-800">🏢 史貝斯商務中心</h1>
            <p class="text-sm text-gray-500 mt-0.5">請選擇您的館別</p>
          </div>
        </div>

        <!-- 館別選擇網格 -->
        <main class="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div class="w-full max-w-sm">
            <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
              ${branchGrid}
            </div>

            <!-- 管理者入口 -->
            <button
              type="button"
              data-branch-num="0"
              class="branch-num-btn w-full bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl shadow-md
                     px-4 py-3 sm:py-4 font-bold text-base sm:text-lg
                     hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-150
                     flex items-center justify-center gap-2"
            >
              <span>👑</span>
              <span>0 - 總管理者</span>
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

        <footer class="py-4 text-center">
          <p class="text-xs text-gray-400">&copy; 史貝斯商務中心日報系統</p>
        </footer>
      </div>
    `;

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
    currentStep = 'password';
    passwordValue = '';

    const branchLabel = selectedBranch.num === '0'
      ? '👑 總管理者'
      : `${selectedBranch.num} - ${selectedBranch.name}`;

    const branchColor = selectedBranch.num === '0'
      ? 'from-amber-400 to-amber-500'
      : selectedBranch.color;

    const numKeys = ['1','2','3','4','5','6','7','8','9','C','0','←'];

    const keypadGrid = numKeys.map(key => {
      let keyClass = 'bg-white text-gray-800 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50';
      let keyLabel = key;
      if (key === 'C') {
        keyClass = 'bg-red-50 text-red-600 border-2 border-red-200 hover:border-red-400 hover:bg-red-100';
      } else if (key === '←') {
        keyClass = 'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-200';
        keyLabel = '⌫';
      }
      return `
        <button
          type="button"
          data-key="${key}"
          class="num-key-btn ${keyClass} rounded-2xl text-xl sm:text-2xl font-bold
                 h-16 sm:h-18 flex items-center justify-center
                 active:scale-[0.92] transition-all duration-100 shadow-sm"
        >${keyLabel}</button>
      `;
    }).join('');

    app.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-50">
        <div class="bg-white border-b border-gray-200 px-4 py-4">
          <div class="max-w-sm mx-auto">
            <button id="back-to-select" class="text-sm text-gray-500 hover:text-purple-600 flex items-center gap-1 mb-2 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              返回選擇館別
            </button>
            <div class="bg-gradient-to-r ${branchColor} text-white rounded-xl px-4 py-3 text-center shadow-md">
              <p class="text-sm opacity-90">已選擇館別</p>
              <p class="text-lg font-bold">${escapeHtml(branchLabel)}</p>
            </div>
          </div>
        </div>

        <main class="flex-1 flex flex-col items-center justify-center px-4 py-4">
          <div class="w-full max-w-xs">
            <div class="text-center mb-4">
              <p class="text-sm text-gray-500 mb-2">請輸入密碼</p>
              <div id="password-dots" class="flex items-center justify-center gap-3 h-10">
                <span class="text-gray-300 text-2xl tracking-widest">••••••</span>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              ${keypadGrid}
            </div>

            <button
              type="button"
              id="login-submit-btn"
              class="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-2xl
                     py-3.5 text-lg font-bold shadow-lg shadow-purple-200
                     hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]
                     transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              登入
            </button>

            <div id="login-error" class="hidden mt-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"/>
                </svg>
                <p id="login-error-text" class="text-sm text-red-600"></p>
              </div>
            </div>

            <div class="mt-3 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
              <div class="flex items-start gap-2">
                <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01"/>
                </svg>
                <div class="text-xs text-blue-600">
                  <p class="font-medium">預設密碼：</p>
                  <p id="password-hint">${selectedBranch.num === '0' ? 'Master@2024' : selectedBranch.code + '123'}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    updatePasswordDots();

    document.querySelectorAll('.num-key-btn').forEach(btn => {
      btn.addEventListener('click', () => handleKeyPress(btn.getAttribute('data-key')));
    });

    document.getElementById('login-submit-btn').addEventListener('click', doLogin);
    document.getElementById('back-to-select').addEventListener('click', renderSelectView);
  }

  function handleKeyPress(key) {
    const errorBox = document.getElementById('login-error');
    if (errorBox) errorBox.classList.add('hidden');

    if (key === 'C') {
      passwordValue = '';
    } else if (key === '←') {
      passwordValue = passwordValue.slice(0, -1);
    } else if (/^[0-9]$/.test(key)) {
      passwordValue += key;
    }
    updatePasswordDots();
  }

  function updatePasswordDots() {
    const dotsContainer = document.getElementById('password-dots');
    if (!dotsContainer) return;

    if (passwordValue.length === 0) {
      dotsContainer.innerHTML = '<span class="text-gray-300 text-2xl tracking-widest">••••••</span>';
    } else {
      const filled = '•'.repeat(passwordValue.length);
      const empty = '○'.repeat(Math.max(0, 6 - passwordValue.length));
      dotsContainer.innerHTML = `<span class="text-2xl tracking-widest"><span class="text-purple-600 font-bold">${filled}</span><span class="text-gray-300">${empty}</span></span>`;
    }
  }

  async function doLogin() {
    if (!passwordValue) {
      showError('請輸入密碼');
      return;
    }

    const branchCode = selectedBranch.code;
    const password = passwordValue;

    const loginBtn = document.getElementById('login-submit-btn');
    loginBtn.disabled = true;
    loginBtn.textContent = '登入中...';

    try {
      // 直接傳館別代碼 + 密碼，不再轉換 email
      const result = await loginUser(branchCode, password);

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
        passwordValue = '';
        updatePasswordDots();
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
