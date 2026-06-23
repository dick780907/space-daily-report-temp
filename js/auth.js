// ============================================
// 史貝斯商務中心日報系統 - 匿名登入 + 自定義認證模組
// ============================================
// 完全不需要 Email！
// 流程：匿名登入 → 館別代碼+密碼驗證 → Firestore users 記錄權限
// ============================================

// ============ 內部狀態變數 ============

/** 當前登入的 Firebase User 物件 */
let _currentUser = null;

/** 從 Firestore users 集合載入的用戶資料（含 role, branchCode） */
let _userProfile = null;

/** 認證初始化是否完成 */
let _authInitialized = false;

/** 認證狀態監聽器取消函數 */
let _unsubscribeAuth = null;

/** 是否使用本地認證 Fallback（Firebase 未配置時） */
let _useLocalAuth = false;

/** 本地認證的 localStorage key */
const LOCAL_AUTH_KEY = 'space_local_auth';

// ============ 館別帳號對照表 ============
const BRANCH_ACCOUNTS = {
  'master': { role: 'master', name: '總管理者' },
  'TC_CK': { role: 'branch', branchCode: 'TC_CK', name: '台中-中港館' },
  'TC_YT': { role: 'branch', branchCode: 'TC_YT', name: '台中-英才館' },
  'TC_CC': { role: 'branch', branchCode: 'TC_CC', name: '台中-中清館' },
  'TC_CF1': { role: 'branch', branchCode: 'TC_CF1', name: '台中-七期1館' },
  'TC_CF2': { role: 'branch', branchCode: 'TC_CF2', name: '台中-七期2館' },
  'TP_ZX': { role: 'branch', branchCode: 'TP_ZX', name: '台北-忠孝館' },
  'TP_XZ1': { role: 'branch', branchCode: 'TP_XZ1', name: '新北-汐止1館' },
  'TP_XZ2': { role: 'branch', branchCode: 'TP_XZ2', name: '新北-汐止2館' }
};

// ============ 館別密碼對照表 ============
const BRANCH_PASSWORDS = {
  'master': 'Master@2024',
  'TC_CK': 'TC_CK123',
  'TC_YT': 'TC_YT123',
  'TC_CC': 'TC_CC123',
  'TC_CF1': 'TC_CF1123',
  'TC_CF2': 'TC_CF2123',
  'TP_ZX': 'TP_ZX123',
  'TP_XZ1': 'TP_XZ1123',
  'TP_XZ2': 'TP_XZ2123'
};

// ============ 館別登入選項 ============

function getBranchLoginOptions() {
  return [
    { code: 'master', name: '👑 總管理者' },
    { code: 'TC_CK', name: '🏢 台中-中港館' },
    { code: 'TC_YT', name: '🏢 台中-英才館' },
    { code: 'TC_CC', name: '🏢 台中-中清館' },
    { code: 'TC_CF1', name: '🏢 台中-七期1館' },
    { code: 'TC_CF2', name: '🏢 台中-七期2館' },
    { code: 'TP_ZX', name: '🏢 台北-忠孝館' },
    { code: 'TP_XZ1', name: '🏢 新北-汐止1館' },
    { code: 'TP_XZ2', name: '🏢 新北-汐止2館' }
  ];
}

function getBranchAccount(branchCode) {
  return BRANCH_ACCOUNTS[branchCode] || null;
}

// ============ 本地認證 Fallback ============

function _loadLocalAuth() {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function _saveLocalAuth(profile) {
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(profile));
}

function _clearLocalAuth() {
  localStorage.removeItem(LOCAL_AUTH_KEY);
}

// ============================================
// 認證初始化
// ============================================

/**
 * 初始化認證模組，開始監聽登入狀態變化
 * @param {Function} callback - 狀態變更時的回呼函數
 * @returns {boolean} 初始化是否成功啟動
 */
function initAuth(callback) {
  // Firebase 未配置 → 啟用本地認證 Fallback
  if (!initFirebase()) {
    console.log('ℹ️ Firebase 未配置，使用本地認證模式');
    _useLocalAuth = true;
    _authInitialized = true;
    const localAuth = _loadLocalAuth();
    if (localAuth) {
      _userProfile = localAuth;
      _currentUser = { uid: 'local_' + localAuth.branchCode, isAnonymous: true };
      if (callback) callback({ user: _currentUser, profile: _userProfile, loggedIn: true });
    } else {
      if (callback) callback({ user: null, profile: null, loggedIn: false });
    }
    return true;
  }

  const auth = getAuth();
  if (!auth) {
    console.warn('⚠️ Auth 實例無法取得，啟用本地認證 Fallback');
    _useLocalAuth = true;
    _authInitialized = true;
    if (callback) callback({ user: null, profile: null, loggedIn: false });
    return false;
  }

  enableOfflinePersistence();

  // 監聽認證狀態變化
  _unsubscribeAuth = auth.onAuthStateChanged(
    async (user) => {
      _authInitialized = true;

      if (user) {
        _currentUser = user;
        console.log('✅ 用戶已登入 (匿名UID:', user.uid, ')');

        try {
          const profile = await loadUserProfile(user.uid);
          _userProfile = profile;

          if (profile) {
            console.log('👤 用戶資料已載入 | 角色:', profile.role || '未設定', '| 館別:', profile.branchCode || '未設定');
          } else {
            console.log('ℹ️ 匿名用戶尚未綁定館別資料');
          }

          if (callback) callback({ user, profile, loggedIn: !!profile });
        } catch (err) {
          console.error('❌ 載入用戶資料失敗:', err.message);
          _userProfile = null;
          if (callback) callback({ user, profile: null, loggedIn: false });
        }
      } else {
        _currentUser = null;
        _userProfile = null;
        console.log('ℹ️ 用戶未登入');
        if (callback) callback({ user: null, profile: null, loggedIn: false });
      }
    },
    (err) => {
      console.error('❌ 認證狀態監聽發生錯誤:', err.message);
      _authInitialized = true;
      if (callback) callback({ user: null, profile: null, loggedIn: false });
    }
  );

  return true;
}

/**
 * 停止認證狀態監聽
 */
function stopAuthListener() {
  if (_unsubscribeAuth) {
    _unsubscribeAuth();
    _unsubscribeAuth = null;
    console.log('🛑 認證狀態監聽已停止');
  }
}

// ============================================
// 用戶資料管理
// ============================================

async function loadUserProfile(uid) {
  try {
    const db = getDb();
    if (!db) return null;

    const docRef = db.collection('users').doc(uid);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return docSnap.data();
    }
    return null;
  } catch (err) {
    console.error('❌ 載入使用者資料失敗 (UID: %s):', uid, err.message);
    return null;
  }
}

async function refreshUserProfile() {
  if (!_currentUser) {
    console.warn('⚠️ 無法重新載入：用戶未登入');
    return null;
  }
  try {
    _userProfile = await loadUserProfile(_currentUser.uid);
    return _userProfile;
  } catch (err) {
    console.error('❌ 重新載入用戶資料失敗:', err.message);
    return null;
  }
}

// ============================================
// 登入 / 登出（核心：匿名登入 + 館別密碼驗證）
// ============================================

/**
 * 使用館別代碼 + 密碼登入
 * 流程：匿名登入 → 驗證密碼 → 寫入 users 集合
 * @param {string} branchCode - 館別代碼（如 'TC_CK' 或 'master'）
 * @param {string} password - 登入密碼
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
async function loginUser(branchCode, password) {
  branchCode = branchCode.trim();

  // ===== 基本驗證 =====
  const accountInfo = getBranchAccount(branchCode);
  if (!accountInfo) {
    return { success: false, error: '找不到此館別代碼' };
  }

  const expectedPw = BRANCH_PASSWORDS[branchCode];
  if (!expectedPw || password !== expectedPw) {
    return { success: false, error: '密碼錯誤' };
  }

  // ===== 本地認證模式（Firebase 未配置） =====
  if (_useLocalAuth) {
    _userProfile = {
      role: accountInfo.role,
      branchCode: accountInfo.branchCode || null,
      name: accountInfo.name,
      account: branchCode
    };
    _currentUser = { uid: 'local_' + branchCode, isAnonymous: true };
    _saveLocalAuth(_userProfile);
    console.log('✅ 本地登入成功:', branchCode);
    return { success: true, user: _currentUser };
  }

  // ===== Firebase 匿名登入模式 =====
  if (!initFirebase()) {
    return { success: false, error: 'Firebase 未初始化，無法登入' };
  }

  const auth = getAuth();
  if (!auth) {
    return { success: false, error: 'Auth 實例無法取得' };
  }

  try {
    // Step 1: 匿名登入 Firebase
    let user;
    if (auth.currentUser && auth.currentUser.isAnonymous) {
      // 已經是匿名登入狀態，直接使用
      user = auth.currentUser;
    } else {
      // 先登出再匿名登入（避免衝突）
      try { await auth.signOut(); } catch (e) { /* ignore */ }
      const result = await auth.signInAnonymously();
      user = result.user;
    }

    console.log('✅ 匿名登入成功, UID:', user.uid);

    // Step 2: 寫入 users 集合（綁定館別權限）
    const db = getDb();
    const userData = {
      role: accountInfo.role,
      name: accountInfo.name,
      account: branchCode,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (accountInfo.branchCode) {
      userData.branchCode = accountInfo.branchCode;
    }

    // 使用 set with merge 避免覆蓋既有資料
    await db.collection('users').doc(user.uid).set(userData, { merge: true });
    console.log('✅ 用戶資料已寫入 Firestore');

    // Step 3: 更新本地狀態
    _currentUser = user;
    _userProfile = { ...userData, branchCode: accountInfo.branchCode || null };

    console.log('✅ 登入成功:', branchCode, '|', accountInfo.name);
    return { success: true, user: user };

  } catch (err) {
    let message = '登入失敗';
    console.error('❌ 登入失敗:', err.code, err.message);
    switch (err.code) {
      case 'auth/operation-not-allowed':
        message = '匿名登入未啟用，請聯繫管理員'; break;
      case 'auth/network-request-failed':
        message = '網路連線失敗，請檢查網路狀態'; break;
      default:
        message = '登入失敗：' + (err.message || '未知錯誤');
    }
    return { success: false, error: message };
  }
}

/**
 * 登出當前用戶
 */
async function logoutUser() {
  _clearLocalAuth();
  _userProfile = null;

  if (initFirebase()) {
    const auth = getAuth();
    if (auth) {
      try { await auth.signOut(); } catch (e) { /* ignore */ }
    }
  }

  _currentUser = null;
  console.log('✅ 登出成功');
  return { success: true };
}

// ============================================
// 用戶資訊查詢
// ============================================

function getCurrentUser() {
  return _currentUser;
}

function getUserProfile() {
  return _userProfile;
}

function getCurrentUserId() {
  return _currentUser ? _currentUser.uid : null;
}

function getCurrentUserEmail() {
  return null; // 匿名登入沒有 email
}

function getCurrentUserName() {
  if (_userProfile && _userProfile.name) {
    return _userProfile.name;
  }
  return null;
}

// ============================================
// 登入狀態檢查
// ============================================

function isUserLoggedIn() {
  return !!_currentUser && _authInitialized && !!_userProfile;
}

function isAuthInitialized() {
  return _authInitialized;
}

function waitForAuth(timeoutMs) {
  const maxWait = timeoutMs || 10000;
  return new Promise((resolve) => {
    if (_authInitialized) {
      resolve(isUserLoggedIn());
      return;
    }
    let waited = 0;
    const interval = 100;
    const check = setInterval(() => {
      waited += interval;
      if (_authInitialized) {
        clearInterval(check);
        resolve(isUserLoggedIn());
        return;
      }
      if (waited >= maxWait) {
        clearInterval(check);
        console.warn('⚠️ 等待認證初始化超時（%d ms）', maxWait);
        resolve(false);
      }
    }, interval);
  });
}

// ============================================
// 權限檢查
// ============================================

function isMaster() {
  return _userProfile && _userProfile.role === 'master';
}

function hasBranchAccess(branchCode) {
  if (!branchCode) return false;
  if (isMaster()) return true;
  return _userProfile && _userProfile.branchCode === branchCode;
}

function getUserBranchCode() {
  if (isMaster()) return null;
  return _userProfile ? _userProfile.branchCode : null;
}

function getAccessibleBranches(allBranches) {
  if (isMaster()) {
    return allBranches || [];
  }
  const userBranch = getUserBranchCode();
  if (!userBranch || !allBranches) return [];
  return allBranches.filter(b => b.code === userBranch);
}

// ============================================
// 帳號管理（僅管理員可用）
// ============================================

/**
 * 修改館別密碼
 * @param {string} branchCode - 館別代碼
 * @param {string} newPassword - 新密碼
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function changeBranchPassword(branchCode, newPassword) {
  if (!isMaster()) {
    return { success: false, error: '只有管理員可以修改密碼' };
  }
  if (!newPassword || newPassword.length < 4) {
    return { success: false, error: '密碼至少需要 4 個字元' };
  }

  // 更新記憶體中的密碼
  BRANCH_PASSWORDS[branchCode] = newPassword;

  // 同步到 Firestore accounts 集合
  if (initFirebase()) {
    try {
      const db = getDb();
      await db.collection('accounts').doc(branchCode).set({
        password: newPassword,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: getCurrentUserId()
      }, { merge: true });
    } catch (err) {
      console.error('❌ 同步密碼到 Firestore 失敗:', err);
    }
  }

  console.log('✅ 密碼修改成功:', branchCode);
  return { success: true };
}

// ============================================
// 工具函數
// ============================================

function getUserSummary() {
  return {
    loggedIn: isUserLoggedIn(),
    initialized: _authInitialized,
    uid: getCurrentUserId(),
    email: null, // 匿名登入沒有 email
    name: getCurrentUserName(),
    role: _userProfile ? _userProfile.role : null,
    branchCode: getUserBranchCode(),
    isMaster: isMaster(),
    isAnonymous: true
  };
}
