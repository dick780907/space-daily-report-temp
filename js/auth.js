// ============================================
// 史貝斯商務中心日報系統 - Firebase Authentication 模組
// ============================================
// 提供登入/登出/權限檢查功能
// 支援管理員（master）與館別人員兩種角色
// ============================================

// 館別帳號的 email 格式範例：tc_ck@space.com, tp_zx@space.com 等
// 管理員帳號：master@space.com

// ============ 內部狀態變數 ============

/** 當前登入的 Firebase 用戶物件 */
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

// ============ 館別 Email 對照表 ============
const BRANCH_EMAIL_MAP = {
  'master@space.com': { role: 'master', name: '總管理者' },
  'tc_ck@space.com': { role: 'branch', branchCode: 'TC_CK', name: '台中-中港館' },
  'tc_yt@space.com': { role: 'branch', branchCode: 'TC_YT', name: '台中-英才館' },
  'tc_cc@space.com': { role: 'branch', branchCode: 'TC_CC', name: '台中-中清館' },
  'tc_cf1@space.com': { role: 'branch', branchCode: 'TC_CF1', name: '台中-七期1館' },
  'tc_cf2@space.com': { role: 'branch', branchCode: 'TC_CF2', name: '台中-七期2館' },
  'tp_zx@space.com': { role: 'branch', branchCode: 'TP_ZX', name: '台北-忠孝館' },
  'tp_xz1@space.com': { role: 'branch', branchCode: 'TP_XZ1', name: '新北-汐止1館' },
  'tp_xz2@space.com': { role: 'branch', branchCode: 'TP_XZ2', name: '新北-汐止2館' }
};

// ============================================
// 認證初始化與狀態監聽
// ============================================

// ============ 館別登入資訊 ============

const BRANCH_PASSWORDS = {
  'master': 'admin123',
  'TC_CK': 'TC_CK123',
  'TC_YT': 'TC_YT123',
  'TC_CC': 'TC_CC123',
  'TC_CF1': 'TC_CF1123',
  'TC_CF2': 'TC_CF2123',
  'TP_ZX': 'TP_ZX123',
  'TP_XZ1': 'TP_XZ1123',
  'TP_XZ2': 'TP_XZ2123'
};

function getBranchLoginOptions() {
  return [
    { email: 'master@space.com', name: '👑 總管理者', code: 'master' },
    { email: 'tc_ck@space.com', name: '🏢 台中-中港館', code: 'TC_CK' },
    { email: 'tc_yt@space.com', name: '🏢 台中-英才館', code: 'TC_YT' },
    { email: 'tc_cc@space.com', name: '🏢 台中-中清館', code: 'TC_CC' },
    { email: 'tc_cf1@space.com', name: '🏢 台中-七期1館', code: 'TC_CF1' },
    { email: 'tc_cf2@space.com', name: '🏢 台中-七期2館', code: 'TC_CF2' },
    { email: 'tp_zx@space.com', name: '🏢 台北-忠孝館', code: 'TP_ZX' },
    { email: 'tp_xz1@space.com', name: '🏢 新北-汐止1館', code: 'TP_XZ1' },
    { email: 'tp_xz2@space.com', name: '🏢 新北-汐止2館', code: 'TP_XZ2' }
  ];
}

function getBranchByEmail(email) {
  const lower = email.toLowerCase();
  const entry = Object.entries(BRANCH_EMAIL_MAP).find(([e]) => e === lower);
  if (!entry) return null;
  const [_, info] = entry;
  return { ...info, email: lower };
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

function _getBranchByEmail(email) {
  return BRANCH_EMAIL_MAP[email.toLowerCase()] || null;
}

/**
 * 初始化認證模組，開始監聽登入狀態變化
 * @param {Function} callback - 狀態變更時的回呼函數，接收 {user, profile, loggedIn}
 *   - user: Firebase User 物件 或 null
 *   - profile: Firestore 中的用戶資料 或 null
 *   - loggedIn: boolean 是否已登入
 * @returns {boolean} 初始化是否成功啟動
 */
function initAuth(callback) {
  // Firebase 未配置 → 啟用本地認證 Fallback
  if (!initFirebase()) {
    console.log('ℹ️ Firebase 未配置，使用本地認證模式（資料儲存在 localStorage）');
    _useLocalAuth = true;
    _authInitialized = true;
    // 檢查本地登入狀態
    const localAuth = _loadLocalAuth();
    if (localAuth) {
      _userProfile = localAuth;
      _currentUser = { email: localAuth.email, uid: 'local_' + localAuth.email };
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

  // 啟用離線持久化（由 Firestore 自動管理）
  enableOfflinePersistence();

  // 監聽認證狀態變化
  _unsubscribeAuth = auth.onAuthStateChanged(
    async (user) => {
      _authInitialized = true;

      if (user) {
        // 用戶已登入
        _currentUser = user;
        console.log('✅ 用戶已登入:', user.email);

        try {
          // 從 Firestore 讀取使用者資料（role, branchCode 等）
          const profile = await loadUserProfile(user.uid);
          _userProfile = profile;

          if (profile) {
            console.log('👤 用戶資料已載入 | 角色:', profile.role || '未設定', '| 館別:', profile.branchCode || '未設定');
          } else {
            console.warn('⚠️ 用戶 %s 在 Firestore 中無對應資料', user.email);
          }

          if (callback) callback({ user, profile, loggedIn: true });
        } catch (err) {
          console.error('❌ 載入用戶資料失敗:', err.message);
          _userProfile = null;
          if (callback) callback({ user, profile: null, loggedIn: true });
        }
      } else {
        // 用戶未登入
        _currentUser = null;
        _userProfile = null;
        console.log('ℹ️ 用戶未登入');
        if (callback) callback({ user: null, profile: null, loggedIn: false });
      }
    },
    (err) => {
      // 認證狀態監聽錯誤
      console.error('❌ 認證狀態監聽發生錯誤:', err.message);
      _authInitialized = true;
      if (callback) callback({ user: null, profile: null, loggedIn: false });
    }
  );

  return true;
}

/**
 * 停止認證狀態監聽（登出頁面時呼叫）
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

/**
 * 從 Firestore 載入使用者資料
 * @param {string} uid - Firebase Authentication 的用戶 UID
 * @returns {Object|null} 用戶資料物件（含 role, branchCode）或 null
 */
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

/**
 * 重新載入當前用戶資料（資料變更後使用）
 * @returns {Object|null} 更新後的用戶資料
 */
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
// 登入 / 登出
// ============================================

/**
 * 使用 Email/Password 登入
 * @param {string} email - 登入帳號的 Email
 * @param {string} password - 登入密碼
 * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
 */
async function loginUser(email, password) {
  const emailLower = email.toLowerCase().trim();
  const branchInfo = _getBranchByEmail(emailLower);

  // ===== 本地認證模式（Firebase 未配置） =====
  if (_useLocalAuth) {
    if (!branchInfo) {
      return { success: false, error: '找不到此帳號' };
    }
    // 本地模式密碼驗證：館別代碼大寫 + "123" 或 "admin123"
    const expectedPw = branchInfo.role === 'master' ? 'admin123'
      : branchInfo.branchCode.toUpperCase() + '123';
    if (password !== expectedPw) {
      return { success: false, error: '密碼錯誤' };
    }
    // 本地登入成功
    _userProfile = {
      email: emailLower,
      role: branchInfo.role,
      branchCode: branchInfo.branchCode || null,
      name: branchInfo.name
    };
    _currentUser = { email: emailLower, uid: 'local_' + emailLower };
    _saveLocalAuth(_userProfile);
    console.log('✅ 本地登入成功:', emailLower);
    return { success: true, user: _currentUser };
  }

  // ===== Firebase 認證模式 =====
  if (!initFirebase()) {
    return { success: false, error: 'Firebase 未初始化，無法登入' };
  }

  const auth = getAuth();
  if (!auth) {
    return { success: false, error: 'Auth 實例無法取得' };
  }

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    console.log('✅ 登入成功:', result.user.email);
    return { success: true, user: result.user };
  } catch (err) {
    let message = '登入失敗';
    switch (err.code) {
      case 'auth/invalid-email':
        message = 'Email 格式不正確，請檢查輸入';
        break;
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        message = '找不到此帳號或密碼錯誤，請確認後重試';
        break;
      case 'auth/wrong-password':
        message = '密碼錯誤，請重新輸入';
        break;
      case 'auth/too-many-requests':
        message = '嘗試次數過多，請稍後再試（約 30 秒）';
        break;
      case 'auth/network-request-failed':
        message = '網路連線失敗，請檢查網路狀態';
        break;
      case 'auth/user-disabled':
        message = '此帳號已被停用，請聯繫管理員';
        break;
      case 'auth/invalid-login-credentials':
        message = '帳號或密碼錯誤，請確認後重試';
        break;
    }
    console.error('❌ 登入失敗 (%s): %s', err.code, message);
    return { success: false, error: message };
  }
}

/**
 * 登出當前用戶
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function logoutUser() {
  // 清除本地認證狀態
  _clearLocalAuth();
  _currentUser = null;
  _userProfile = null;

  // 如果 Firebase 可用，也執行 Firebase 登出
  if (initFirebase()) {
    const auth = getAuth();
    if (auth) {
      try { await auth.signOut(); } catch (e) { /* ignore */ }
    }
  }

  console.log('✅ 登出成功');
  return { success: true };
}

// ============================================
// 用戶資訊查詢
// ============================================

/**
 * 取得當前登入的 Firebase User 物件
 * @returns {firebase.User|null}
 */
function getCurrentUser() {
  return _currentUser;
}

/**
 * 取得當前用戶的 Firestore 資料（含 role, branchCode）
 * @returns {Object|null}
 */
function getUserProfile() {
  return _userProfile;
}

/**
 * 取得當前登入用戶的 UID
 * @returns {string|null}
 */
function getCurrentUserId() {
  return _currentUser ? _currentUser.uid : null;
}

/**
 * 取得當前登入用戶的 Email
 * @returns {string|null}
 */
function getCurrentUserEmail() {
  return _currentUser ? _currentUser.email : null;
}

/**
 * 取得當前用戶的顯示名稱
 * @returns {string|null}
 */
function getCurrentUserName() {
  if (_userProfile && _userProfile.displayName) {
    return _userProfile.displayName;
  }
  if (_currentUser && _currentUser.displayName) {
    return _currentUser.displayName;
  }
  // 從 email 推斷
  if (_currentUser && _currentUser.email) {
    return _currentUser.email.split('@')[0];
  }
  return null;
}

// ============================================
// 登入狀態檢查
// ============================================

/**
 * 檢查用戶是否已登入且認證初始化已完成
 * @returns {boolean}
 */
function isUserLoggedIn() {
  return !!_currentUser && _authInitialized;
}

/**
 * 檢查認證是否已初始化（無論登入與否）
 * @returns {boolean}
 */
function isAuthInitialized() {
  return _authInitialized;
}

/**
 * 等待認證初始化完成
 * @param {number} timeoutMs - 最大等待時間（毫秒），預設 10000
 * @returns {Promise<boolean>} 是否已登入
 */
function waitForAuth(timeoutMs) {
  const maxWait = timeoutMs || 10000;
  return new Promise((resolve) => {
    // 已初始化，直接回傳
    if (_authInitialized) {
      resolve(isUserLoggedIn());
      return;
    }

    // 定時檢查
    let waited = 0;
    const interval = 100; // 每 100ms 檢查一次
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

/**
 * 檢查當前用戶是否為管理員（master）
 * 管理員擁有所有館別的讀寫權限
 * @returns {boolean}
 */
function isMaster() {
  return _userProfile && _userProfile.role === 'master';
}

/**
 * 檢查是否有指定館別的權限
 * - 管理員：所有館別皆可存取
 * - 館別人員：只能存取自己的館別
 * @param {string} branchCode - 館別代碼（如 'tc_ck', 'tp_zx'）
 * @returns {boolean}
 */
function hasBranchAccess(branchCode) {
  if (!branchCode) return false;
  // 管理員擁有所有館別權限
  if (isMaster()) return true;
  // 館別人員只能存取自己的館別
  return _userProfile && _userProfile.branchCode === branchCode;
}

/**
 * 取得當前用戶的館別代碼
 * @returns {string|null} 館別代碼，未設定或管理員則回傳 null
 */
function getUserBranchCode() {
  if (isMaster()) return null; // 管理員無特定館別
  return _userProfile ? _userProfile.branchCode : null;
}

/**
 * 取得當前用戶有權限的館別列表
 * @param {Array<{code: string, name: string}>} allBranches - 所有館別列表
 * @returns {Array<{code: string, name: string}>} 用戶可存取的館別列表
 */
function getAccessibleBranches(allBranches) {
  if (isMaster()) {
    return allBranches || [];
  }
  const userBranch = getUserBranchCode();
  if (!userBranch || !allBranches) return [];
  return allBranches.filter(b => b.code === userBranch);
}

// ============================================
// 密碼管理
// ============================================

/**
 * 修改當前用戶的密碼
 * @param {string} newPassword - 新密碼（至少 6 個字元）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function changePassword(newPassword) {
  if (!initFirebase() || !_currentUser) {
    return { success: false, error: '用戶未登入' };
  }

  try {
    await _currentUser.updatePassword(newPassword);
    console.log('✅ 密碼修改成功');
    return { success: true };
  } catch (err) {
    let message = '密碼修改失敗';
    switch (err.code) {
      case 'auth/weak-password':
        message = '新密碼強度不足，至少需要 6 個字元';
        break;
      case 'auth/requires-recent-login':
        message = '為了安全起見，請先重新登入後再修改密碼';
        break;
    }
    console.error('❌ 修改密碼失敗:', err.code, message);
    return { success: false, error: message };
  }
}

/**
 * 發送密碼重設 Email
 * @param {string} email - 要重設密碼的 Email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendPasswordReset(email) {
  if (!initFirebase()) {
    return { success: false, error: 'Firebase 未初始化' };
  }

  const auth = getAuth();
  try {
    await auth.sendPasswordResetEmail(email);
    console.log('✅ 密碼重設信已發送至:', email);
    return { success: true };
  } catch (err) {
    let message = '發送密碼重設信失敗';
    switch (err.code) {
      case 'auth/invalid-email':
        message = 'Email 格式不正確';
        break;
      case 'auth/user-not-found':
        message = '找不到此帳號';
        break;
    }
    return { success: false, error: message };
  }
}

// ============================================
// 帳號管理（僅管理員可用）
// ============================================

/**
 * 建立新帳號（管理員功能）
 * 在 Firebase Authentication 中建立帳號，並在 Firestore users 集合寫入資料
 * @param {string} email - 新帳號 Email
 * @param {string} password - 初始密碼
 * @param {Object} profile - 用戶資料 { displayName, role, branchCode }
 * @returns {Promise<{success: boolean, uid?: string, error?: string}>}
 */
async function createUserAccount(email, password, profile) {
  if (!isMaster()) {
    return { success: false, error: '只有管理員可以建立新帳號' };
  }

  if (!initFirebase()) {
    return { success: false, error: 'Firebase 未初始化' };
  }

  const auth = getAuth();
  const db = getDb();

  try {
    // 使用 Firebase Admin SDK 或 Cloud Function 建立較安全
    // 此處使用 Secondary App 來建立不登出當前用戶
    const secondaryApp = firebase.initializeApp(FIREBASE_CONFIG, 'Secondary');
    const secondaryAuth = secondaryApp.auth();

    const result = await secondaryAuth.createUserWithEmailAndPassword(email, password);
    const uid = result.user.uid;

    // 在 Firestore 建立用戶資料
    await db.collection('users').doc(uid).set({
      email: email,
      displayName: profile.displayName || '',
      role: profile.role || 'staff',
      branchCode: profile.branchCode || '',
      createdAt: serverTimestamp(),
      createdBy: getCurrentUserId()
    });

    // 清理 secondary app
    await secondaryAuth.signOut();
    await secondaryApp.delete();

    console.log('✅ 帳號建立成功:', email, '| UID:', uid);
    return { success: true, uid: uid };
  } catch (err) {
    let message = '帳號建立失敗';
    switch (err.code) {
      case 'auth/email-already-in-use':
        message = '此 Email 已被使用';
        break;
      case 'auth/invalid-email':
        message = 'Email 格式不正確';
        break;
      case 'auth/weak-password':
        message = '密碼強度不足，至少需要 6 個字元';
        break;
    }
    console.error('❌ 建立帳號失敗:', err.code, message);
    return { success: false, error: message };
  }
}

// ============================================
// 工具函數
// ============================================

/**
 * 從 Email 推斷館別代碼
 * Email 格式：tc_ck@space.com → 館別：tc_ck
 * @param {string} email
 * @returns {string|null}
 */
function extractBranchFromEmail(email) {
  if (!email) return null;
  const localPart = email.split('@')[0];
  // 管理員帳號
  if (localPart === 'master') return null;
  return localPart;
}

/**
 * 取得當前用戶的完整資訊摘要
 * @returns {Object} 用戶資訊摘要
 */
function getUserSummary() {
  return {
    loggedIn: isUserLoggedIn(),
    initialized: _authInitialized,
    uid: getCurrentUserId(),
    email: getCurrentUserEmail(),
    name: getCurrentUserName(),
    role: _userProfile ? _userProfile.role : null,
    branchCode: getUserBranchCode(),
    isMaster: isMaster()
  };
}
