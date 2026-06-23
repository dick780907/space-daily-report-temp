// ============================================
// 史貝斯商務中心日報系統 - Firebase 初始化配置
// ============================================
// 使用 Firebase CDN compat 版本（全局變數方式）
// 用戶需填入自己的 Firebase 專案配置資訊
// ============================================

/**
 * Firebase 專案配置
 * -----------------
 * 請將以下值替換為您 Firebase 專案的實際資訊。
 * 您可以在 Firebase Console > 專案設定 > 一般 > 您的應用程式 中找到這些值。
 *
 * 安裝步驟：
 * 1. 前往 https://console.firebase.google.com/ 建立專案
 * 2. 新增 Web 應用程式
 * 3. 複製 firebaseConfig 物件的值，貼到下方
 * 4. 啟用 Firestore Database 和 Authentication
 * 5. 將 Security Rules 貼到 Firestore Database > Rules
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC3iK2FOeUtkK99_XFfOtofkxcP-99pLkc",
  authDomain: "slasherspace-e37bc.firebaseapp.com",
  projectId: "slasherspace-e37bc",
  storageBucket: "slasherspace-e37bc.firebasestorage.app",
  messagingSenderId: "818404438552",
  appId: "1:818404438552:web:29e13a4e3aa31220ffc96d"
};

// Firebase 初始化狀態標記
let _firebaseInitialized = false;
let _firebaseAvailable = false;

/**
 * 檢查 Firebase SDK 是否已載入
 * @returns {boolean} SDK 是否可用
 */
function isFirebaseSDKLoaded() {
  return typeof firebase !== 'undefined' &&
         typeof firebase.initializeApp === 'function';
}

/**
 * 檢查 Firebase 配置是否已設定（非預設值）
 * @returns {boolean} 配置是否有效
 */
function isFirebaseConfigured() {
  return FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' &&
         FIREBASE_CONFIG.apiKey !== '' &&
         FIREBASE_CONFIG.projectId !== 'YOUR_PROJECT_ID';
}

/**
 * 初始化 Firebase
 * 如果尚未初始化，則執行初始化並啟用離線持久化
 * @returns {boolean} 初始化是否成功
 */
function initFirebase() {
  // 檢查 Firebase SDK 是否已載入
  if (!isFirebaseSDKLoaded()) {
    console.error('❌ Firebase SDK 未載入，請檢查 index.html 中的 CDN 連結');
    console.info('💡 請在 index.html 的 <head> 中加入以下 CDN：');
    console.info('   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>');
    console.info('   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>');
    console.info('   <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>');
    _firebaseAvailable = false;
    return false;
  }

  // 檢查配置是否已設定
  if (!isFirebaseConfigured()) {
    console.warn('⚠️ Firebase 配置尚未設定，請編輯 firebase-config.js 填入您的專案資訊');
    console.info('💡 您需要將 FIREBASE_CONFIG 中的 YOUR_API_KEY、YOUR_PROJECT_ID 等值替換為實際值');
    _firebaseAvailable = false;
    return false;
  }

  // 避免重複初始化
  if (_firebaseInitialized) {
    return true;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
      console.log('✅ Firebase 初始化成功 (Project: %c' + FIREBASE_CONFIG.projectId + '%c)', 'color: #00c853; font-weight: bold;', '');
    }
    _firebaseInitialized = true;
    _firebaseAvailable = true;
    return true;
  } catch (err) {
    console.error('❌ Firebase 初始化失敗:', err.message);
    _firebaseAvailable = false;
    return false;
  }
}

/**
 * 取得 Firestore 實例
 * 使用前需先呼叫 initFirebase()
 * @returns {firebase.firestore.Firestore|null} Firestore 實例，未初始化則回傳 null
 */
function getDb() {
  if (!initFirebase()) return null;
  return firebase.firestore();
}

/**
 * 取得 Authentication 實例
 * 使用前需先呼叫 initFirebase()
 * @returns {firebase.auth.Auth|null} Auth 實例，未初始化則回傳 null
 */
function getAuth() {
  if (!initFirebase()) return null;
  return firebase.auth();
}

/**
 * 啟用 Firestore 離線持久化
 * - 支援多分頁同步（synchronizeTabs: true）
 * - 離線時自動緩存資料，連線後自動同步
 * - 需在 Firestore 首次操作前呼叫
 */
function enableOfflinePersistence() {
  if (!initFirebase()) return;

  const db = getDb();
  if (!db) return;

  db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      console.log('✅ Firestore 離線持久化已啟用（多分頁同步）');
    })
    .catch(err => {
      if (err.code === 'failed-precondition') {
        // 多個分頁同時開啟時，只有一個分頁可以啟用持久化
        console.warn('⚠️ 離線持久化無法啟用：多個分頁同時開啟，僅主分頁可使用');
      } else if (err.code === 'unimplemented') {
        // 瀏覽器不支援
        console.warn('⚠️ 目前瀏覽器不支援離線持久化功能');
      } else {
        console.error('❌ 離線持久化啟用失敗:', err.message);
      }
    });
}

/**
 * 取得 Firebase 可用狀態
 * @returns {boolean} Firebase 是否可用
 */
function isFirebaseReady() {
  return _firebaseAvailable && _firebaseInitialized;
}

/**
 * 取得 Firestore 時間戳記
 * 用於在資料中記錄建立/更新時間
 * @returns {firebase.firestore.FieldValue} serverTimestamp
 */
function serverTimestamp() {
  if (!initFirebase()) return null;
  return firebase.firestore.FieldValue.serverTimestamp();
}

/**
 * 從 Firestore Timestamp 轉換為 JavaScript Date
 * @param {firebase.firestore.Timestamp} timestamp
 * @returns {Date|null}
 */
function timestampToDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
}

/**
 * 格式化日期為 Firestore 文件 ID 格式 (YYYYMMDD)
 * @param {string|Date} date - 日期字串或 Date 物件
 * @returns {string} 格式化後的日期字串
 */
function formatDateKey(date) {
  if (!date) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  if (typeof date === 'string') {
    // 移除分隔符：2024/01/15 → 20240115
    return date.replace(/[\/\-]/g, '');
  }
  if (date instanceof Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  return String(date).replace(/[\/\-]/g, '');
}

/**
 * 格式化年月為查詢鍵 (YYYYMM)
 * @param {string|Date} yearMonth - 年月字串或 Date 物件
 * @returns {string} 格式化後的年月字串
 */
function formatYearMonthKey(yearMonth) {
  if (!yearMonth) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }
  if (typeof yearMonth === 'string') {
    return yearMonth.replace(/[\/\-]/g, '').substring(0, 6);
  }
  if (yearMonth instanceof Date) {
    const y = yearMonth.getFullYear();
    const m = String(yearMonth.getMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }
  return String(yearMonth).substring(0, 6);
}

// ============================================
// 在 DOM 載入後顯示 Firebase 狀態提示
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  // 延遲檢查，確保其他腳本已載入
  setTimeout(function() {
    if (!isFirebaseSDKLoaded()) {
      console.warn('⚠️ Firebase SDK 未載入，系統將使用 localStorage 模式運作');
    } else if (!isFirebaseConfigured()) {
      console.warn('⚠️ Firebase 配置尚未設定，系統將使用 localStorage 模式運作');
      console.info('💡 若要啟用 Firebase 功能，請編輯 app/js/firebase-config.js 填入您的專案資訊');
    } else {
      console.log('📡 Firebase SDK 已就緒，正在初始化...');
      initFirebase();
    }
  }, 100);
});
