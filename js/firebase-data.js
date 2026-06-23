// ============================================
// 史貝斯商務中心日報系統 - Firebase Firestore 資料層
// ============================================
// 提供與 data.js 相同的 API，但使用 Firestore 作為後端
// 當 Firebase 未配置時，自動 fallback 到 localStorage
//
// 館別代碼對照：
//   tc_ck = 台中長榮館 | tp_zx = 台北內湖洲子館
//   tp_xg = 新北三重館 | tp_qw = 內湖麗緻站前館
//   tp_nl = 台北內湖館 | tc_qj = 台中澄清館
//   tc_sz = 台中向上館 | tc_yj = 台中永吉館
// ============================================

// ============ 常數與設定 ============

/** 本機儲存鍵名前綴（避免與其他資料衝突） */
const FB_LS_PREFIX = 'space_daily_fb_';

/** Firestore 集合名稱 */
const COLLECTIONS = {
  REPORTS: 'reports',
  USERS: 'users',
  METADATA: 'metadata'
};

// ============ 相容性變數 ============
// 用於模擬 data.js 的 in-memory 資料結構
let _fbBranches = [];
let _fbStaffByBranch = {};
let _fbReportDatesByBranch = {};

// ============================================
// 內部工具函數
// ============================================

/**
 * 產生 Firestore 文件 ID：格式為 {branch}_{dateKey}
 * 例如：tc_ck_20240115
 * @param {string} branchCode - 館別代碼
 * @param {string|Date} date - 日期
 * @returns {string} 文件 ID
 */
function _makeDocId(branchCode, date) {
  const dateKey = formatDateKey(date);
  return branchCode + '_' + dateKey;
}

/**
 * 解析文件 ID 為館別和日期
 * @param {string} docId - 文件 ID
 * @returns {{branch: string, dateKey: string}}
 */
function _parseDocId(docId) {
  const lastUnderscore = docId.lastIndexOf('_');
  const dateKey = docId.substring(lastUnderscore + 1);
  const branch = docId.substring(0, lastUnderscore);
  // 處理 branch 本身包含下底線的情況，如 tp_qw → 重新找到正確的 branch
  // 嘗試匹配所有已知館別
  for (let i = lastUnderscore; i >= 0; i--) {
    const possibleBranch = docId.substring(0, i);
    if (possibleBranch.length > 0) {
      return { branch: possibleBranch, dateKey: docId.substring(i + 1) };
    }
  }
  return { branch: docId.substring(0, lastUnderscore), dateKey };
}

/**
 * 將日期字串標準化為 YYYY/MM/DD 格式
 * @param {string} dateStr - 日期字串
 * @returns {string} 標準化後的日期
 */
function _normalizeDate(dateStr) {
  if (!dateStr) return '';
  const s = dateStr.replace(/[\-\.]/g, '/');
  // 確保月份和日期為兩位數
  const parts = s.split('/');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1].padStart(2, '0');
    const d = parts[2].padStart(2, '0');
    return `${y}/${m}/${d}`;
  }
  return s;
}

/**
 * 從日期字串取得 YYYYMM
 * @param {string} dateStr - YYYY/MM/DD 格式
 * @returns {string} YYYYMM
 */
function _getYearMonth(dateStr) {
  return dateStr.replace(/\//g, '').substring(0, 6);
}

/**
 * 產生當天日期字串 YYYY/MM/DD
 * @returns {string}
 */
function _todayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/**
 * 產生當月 YYYYMM
 * @returns {string}
 */
function _currentYearMonth() {
  return _getYearMonth(_todayString());
}

/**
 * 安全地從 localStorage 讀取 JSON
 * @param {string} key
 * @returns {any|null}
 */
function _lsGet(key) {
  try {
    const raw = localStorage.getItem(FB_LS_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('❌ localStorage 讀取失敗:', key, e.message);
    return null;
  }
}

/**
 * 安全地寫入 JSON 到 localStorage
 * @param {string} key
 * @param {any} value
 */
function _lsSet(key, value) {
  try {
    localStorage.setItem(FB_LS_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('❌ localStorage 寫入失敗:', key, e.message);
  }
}

/**
 * 從 localStorage 移除項目
 * @param {string} key
 */
function _lsRemove(key) {
  try {
    localStorage.removeItem(FB_LS_PREFIX + key);
  } catch (e) {
    console.error('❌ localStorage 移除失敗:', key, e.message);
  }
}

/**
 * 清除所有本機備援資料
 */
function _lsClearAll() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith(FB_LS_PREFIX)) {
        localStorage.removeItem(k);
      }
    });
  } catch (e) {
    console.error('❌ localStorage 清除失敗:', e.message);
  }
}

/**
 * 檢查是否使用 Firebase 還是 localStorage fallback
 * @returns {boolean} true = 使用 Firebase, false = 使用 localStorage
 */
function _useFirebase() {
  return typeof firebase !== 'undefined' &&
         FIREBASE_CONFIG &&
         FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY' &&
         _isFirebaseReady &&
         firebase.apps && firebase.apps.length > 0;
}

// 內部標記，initFirebase 成功後設為 true
let _isFirebaseReady = false;

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    _isFirebaseReady = typeof firebase !== 'undefined' &&
                        firebase.apps && firebase.apps.length > 0;
  }, 500);
});

/**
 * 將報告物件轉換為 Firestore 可儲存的格式
 * 移除 undefined 值，加入 metadata
 * @param {Object} report - 報告物件
 * @returns {Object} 清理後的報告物件
 */
function _cleanReportForFirestore(report) {
  if (!report) return {};
  const cleaned = {};
  Object.keys(report).forEach(key => {
    if (report[key] !== undefined) {
      cleaned[key] = report[key];
    }
  });
  // 加入/更新 metadata
  cleaned._lastModified = serverTimestamp ? serverTimestamp() : new Date().toISOString();
  cleaned._synced = true;
  return cleaned;
}

/**
 * 檢查用戶是否有指定館別的寫入權限
 * 若無認證則允許寫入（供離線使用）
 * @param {string} branchCode
 * @returns {boolean}
 */
function _canWriteBranch(branchCode) {
  if (typeof isMaster === 'function' && isMaster()) return true;
  if (typeof hasBranchAccess === 'function') {
    return hasBranchAccess(branchCode);
  }
  return true; // 無認證模組時預設允許
}

// ============================================
// 館別與人員資料管理（初始化設定）
// ============================================

/**
 * 設定館別列表（從主程式傳入）
 * @param {Array} branches - 館別列表
 */
function fbSetBranches(branches) {
  _fbBranches = branches || [];
}

/**
 * 設定各館人員資料（從主程式傳入）
 * @param {Object} staffData - { branchCode: [staffList] }
 */
function fbSetStaffData(staffData) {
  _fbStaffByBranch = staffData || {};
}

/**
 * 設定各館填報日期（從主程式傳入）
 * @param {Object} datesData - { branchCode: [dateList] }
 */
function fbSetReportDates(datesData) {
  _fbReportDatesByBranch = datesData || {};
}

// ============================================
// 報告 CRUD
// ============================================

/**
 * 取得單一館別的日報資料
 * @param {string} branchCode - 館別代碼
 * @param {string} date - 日期 (YYYY/MM/DD)
 * @returns {Promise<Object|null>} 報告物件或 null
 */
async function fbGetReport(branchCode, date) {
  if (!branchCode || !date) return null;
  const normDate = _normalizeDate(date);
  const docId = _makeDocId(branchCode, normDate);

  // 使用 Firestore
  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      const docRef = db.collection(COLLECTIONS.REPORTS).doc(docId);
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        const data = docSnap.data();
        data.id = docSnap.id;
        // 同步更新 localStorage 緩存
        const cacheKey = 'report_' + docId;
        _lsSet(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
      return null;
    } catch (err) {
      console.warn('⚠️ Firestore 讀取失敗，嘗試從緩存讀取 (%s):', docId, err.message);
      // 嘗試從 localStorage 緩存讀取
      const cacheKey = 'report_' + docId;
      const cached = _lsGet(cacheKey);
      return cached ? cached.data : null;
    }
  }

  // Fallback 到 localStorage
  const cacheKey = 'report_' + docId;
  const cached = _lsGet(cacheKey);
  return cached ? cached.data : null;
}

/**
 * 儲存日報資料
 * 使用 Firestore transaction 確保資料一致性
 * @param {Object} report - 報告物件（需包含 branch, date）
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
async function fbSaveReport(report) {
  if (!report || !report.branch || !report.date) {
    return { success: false, error: '報告資料缺少 branch 或 date 欄位' };
  }

  const branchCode = report.branch;
  const normDate = _normalizeDate(report.date);
  report.date = normDate;
  const docId = _makeDocId(branchCode, normDate);

  // 權限檢查
  if (!_canWriteBranch(branchCode)) {
    return { success: false, error: '您沒有 ' + branchCode + ' 館的寫入權限' };
  }

  // 使用 Firestore
  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      const cleanedReport = _cleanReportForFirestore(report);
      const docRef = db.collection(COLLECTIONS.REPORTS).doc(docId);

      // 使用 set with merge 以支援部分更新
      await docRef.set(cleanedReport, { merge: true });

      // 同步更新緩存
      const cacheKey = 'report_' + docId;
      _lsSet(cacheKey, { data: cleanedReport, timestamp: Date.now() });

      console.log('✅ 報告已儲存至 Firestore:', docId);
      return { success: true, id: docId };
    } catch (err) {
      console.error('❌ Firestore 儲存失敗，寫入本機緩存 (%s):', docId, err.message);
      // 寫入 localStorage 作為備援
      const cacheKey = 'report_' + docId;
      report._synced = false;
      report._pendingSync = true;
      _lsSet(cacheKey, { data: report, timestamp: Date.now() });
      // 記錄待同步項目
      const pending = _lsGet('pending_sync') || [];
      if (!pending.includes(docId)) {
        pending.push(docId);
        _lsSet('pending_sync', pending);
      }
      return { success: true, id: docId, warning: '已儲存至本機，將於連線後同步' };
    }
  }

  // Fallback 到 localStorage
  const cacheKey = 'report_' + docId;
  report._synced = false;
  _lsSet(cacheKey, { data: report, timestamp: Date.now() });
  console.log('💾 報告已儲存至 localStorage:', docId);
  return { success: true, id: docId };
}

/**
 * 刪除日報資料
 * @param {string} branchCode - 館別代碼
 * @param {string} date - 日期 (YYYY/MM/DD)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function fbDeleteReport(branchCode, date) {
  if (!branchCode || !date) {
    return { success: false, error: '缺少 branchCode 或 date' };
  }

  const normDate = _normalizeDate(date);
  const docId = _makeDocId(branchCode, normDate);

  if (!_canWriteBranch(branchCode)) {
    return { success: false, error: '您沒有 ' + branchCode + ' 館的刪除權限' };
  }

  // 使用 Firestore
  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      await db.collection(COLLECTIONS.REPORTS).doc(docId).delete();

      // 清除緩存
      _lsRemove('report_' + docId);

      console.log('✅ 報告已從 Firestore 刪除:', docId);
      return { success: true };
    } catch (err) {
      console.error('❌ Firestore 刪除失敗 (%s):', docId, err.message);
      return { success: false, error: err.message };
    }
  }

  // Fallback 到 localStorage
  _lsRemove('report_' + docId);
  console.log('🗑️ 報告已從 localStorage 刪除:', docId);
  return { success: true };
}

// ============================================
// 批量查詢
// ============================================

/**
 * 取得指定館別的所有日報
 * @param {string} branchCode - 館別代碼
 * @param {Object} options - 選項 { limit, orderBy }
 * @returns {Promise<Array<Object>>} 報告陣列
 */
async function fbGetReportsByBranch(branchCode, options) {
  if (!branchCode) return [];
  const opts = options || {};

  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      let query = db.collection(COLLECTIONS.REPORTS)
        .where('branch', '==', branchCode);

      if (opts.orderBy) {
        query = query.orderBy(opts.orderBy, opts.orderDir || 'desc');
      } else {
        query = query.orderBy('date', 'desc');
      }

      if (opts.limit) {
        query = query.limit(opts.limit);
      }

      const snapshot = await query.get();
      const reports = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        reports.push(data);
      });
      return reports;
    } catch (err) {
      console.warn('⚠️ Firestore 批量查詢失敗，使用本機資料:', err.message);
    }
  }

  // Fallback：掃描 localStorage 中的報告
  const reports = [];
  const prefix = FB_LS_PREFIX + 'report_' + branchCode + '_';
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        const cached = _lsGet(key.substring(FB_LS_PREFIX.length));
        if (cached && cached.data) {
          reports.push(cached.data);
        }
      }
    });
  } catch (e) {
    console.error('❌ 掃描本機資料失敗:', e.message);
  }

  // 按日期排序（新到舊）
  reports.sort((a, b) => {
    const da = (b.date || '').replace(/\//g, '');
    const db_ = (a.date || '').replace(/\//g, '');
    return da.localeCompare(db_);
  });

  if (opts.limit) {
    return reports.slice(0, opts.limit);
  }
  return reports;
}

/**
 * 取得指定月份的所有日報
 * @param {string} yearMonth - 年月 (YYYYMM)
 * @returns {Promise<Array<Object>>} 報告陣列
 */
async function fbGetReportsByMonth(yearMonth) {
  const ym = formatYearMonthKey(yearMonth);

  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      // 日期範圍查詢
      const startDate = ym.substring(0, 4) + '/' + ym.substring(4, 6) + '/01';
      const nextMonth = parseInt(ym.substring(4, 6), 10) + 1;
      const nextYear = parseInt(ym.substring(0, 4), 10);
      let endYear = nextYear;
      let endMonth = nextMonth;
      if (nextMonth > 12) {
        endYear = nextYear + 1;
        endMonth = 1;
      }
      const endDate = endYear + '/' + String(endMonth).padStart(2, '0') + '/01';

      const snapshot = await db.collection(COLLECTIONS.REPORTS)
        .where('date', '>=', startDate)
        .where('date', '<', endDate)
        .orderBy('date', 'desc')
        .get();

      const reports = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        reports.push(data);
      });
      return reports;
    } catch (err) {
      console.warn('⚠️ Firestore 月份查詢失敗:', err.message);
    }
  }

  // Fallback：掃描 localStorage
  const reports = [];
  const prefix = FB_LS_PREFIX + 'report_';
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        const cached = _lsGet(key.substring(FB_LS_PREFIX.length));
        if (cached && cached.data && cached.data.date) {
          const reportYm = cached.data.date.replace(/\//g, '').substring(0, 6);
          if (reportYm === ym) {
            reports.push(cached.data);
          }
        }
      }
    });
  } catch (e) {
    console.error('❌ 掃描本機資料失敗:', e.message);
  }

  reports.sort((a, b) => {
    const da = (b.date || '').replace(/\//g, '');
    const db_ = (a.date || '').replace(/\//g, '');
    return da.localeCompare(db_);
  });

  return reports;
}

/**
 * 取得指定館別指定月份的日報
 * @param {string} branchCode - 館別代碼
 * @param {string} yearMonth - 年月 (YYYYMM)
 * @returns {Promise<Array<Object>>} 報告陣列
 */
async function fbGetReportsByBranchMonth(branchCode, yearMonth) {
  if (!branchCode || !yearMonth) return [];
  const ym = formatYearMonthKey(yearMonth);

  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      const startDate = ym.substring(0, 4) + '/' + ym.substring(4, 6) + '/01';
      const nextMonth = parseInt(ym.substring(4, 6), 10) + 1;
      const nextYear = parseInt(ym.substring(0, 4), 10);
      let endYear = nextYear;
      let endMonth = nextMonth;
      if (nextMonth > 12) {
        endYear = nextYear + 1;
        endMonth = 1;
      }
      const endDate = endYear + '/' + String(endMonth).padStart(2, '0') + '/01';

      const snapshot = await db.collection(COLLECTIONS.REPORTS)
        .where('branch', '==', branchCode)
        .where('date', '>=', startDate)
        .where('date', '<', endDate)
        .orderBy('date', 'desc')
        .get();

      const reports = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        reports.push(data);
      });
      return reports;
    } catch (err) {
      console.warn('⚠️ Firestore 館別月份查詢失敗:', err.message);
    }
  }

  // Fallback：掃描 localStorage
  const reports = [];
  const prefix = FB_LS_PREFIX + 'report_' + branchCode + '_';
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        const cached = _lsGet(key.substring(FB_LS_PREFIX.length));
        if (cached && cached.data && cached.data.date) {
          const reportYm = cached.data.date.replace(/\//g, '').substring(0, 6);
          if (reportYm === ym) {
            reports.push(cached.data);
          }
        }
      }
    });
  } catch (e) {
    console.error('❌ 掃描本機資料失敗:', e.message);
  }

  reports.sort((a, b) => {
    const da = (b.date || '').replace(/\//g, '');
    const db_ = (a.date || '').replace(/\//g, '');
    return da.localeCompare(db_);
  });

  return reports;
}

/**
 * 取得指定日期的所有館別日報
 * @param {string} date - 日期 (YYYY/MM/DD)
 * @returns {Promise<Array<Object>>} 報告陣列
 */
async function fbGetReportsByDate(date) {
  if (!date) return [];
  const normDate = _normalizeDate(date);

  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      const snapshot = await db.collection(COLLECTIONS.REPORTS)
        .where('date', '==', normDate)
        .get();

      const reports = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        reports.push(data);
      });
      return reports;
    } catch (err) {
      console.warn('⚠️ Firestore 日期查詢失敗:', err.message);
    }
  }

  // Fallback：掃描 localStorage
  const reports = [];
  const suffix = '_' + normDate.replace(/\//g, '');
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(FB_LS_PREFIX + 'report_') && key.endsWith(suffix)) {
        const cached = _lsGet(key.substring(FB_LS_PREFIX.length));
        if (cached && cached.data) {
          reports.push(cached.data);
        }
      }
    });
  } catch (e) {
    console.error('❌ 掃描本機資料失敗:', e.message);
  }

  return reports;
}

// ============================================
// 月統計
// ============================================

/**
 * 計算指定館別指定月份的統計資料
 * @param {string} branchCode - 館別代碼
 * @param {string} yearMonth - 年月 (YYYYMM)
 * @returns {Promise<Object>} 統計資料
 */
async function fbCalcBranchMonthStats(branchCode, yearMonth) {
  if (!branchCode || !yearMonth) return null;

  const reports = await fbGetReportsByBranchMonth(branchCode, yearMonth);
  if (!reports || reports.length === 0) return null;

  let totalStaffWork = 0;
  let totalStaffOff = 0;
  let totalCustCnt = 0;
  let totalSpaceUsage = 0;
  let totalIncomeA = 0;
  let totalIncomeB = 0;
  let totalIncomeC = 0;
  let totalIncomeD = 0;
  let totalIncomeE = 0;
  let totalExpense = 0;
  let dayCount = 0;

  reports.forEach(r => {
    const staffWork = parseInt(r.staffWork || r.workNum || 0, 10);
    const staffOff = parseInt(r.staffOff || r.offNum || 0, 10);
    const custCnt = parseInt(r.custCnt || r.custNum || 0, 10);
    const spaceUsage = parseFloat(r.spaceUsage || r.spaceRate || 0);

    totalStaffWork += staffWork;
    totalStaffOff += staffOff;
    totalCustCnt += custCnt;
    totalSpaceUsage += spaceUsage;
    totalIncomeA += parseFloat(r.incomeA || r.income.a || 0);
    totalIncomeB += parseFloat(r.incomeB || r.income?.b || 0);
    totalIncomeC += parseFloat(r.incomeC || r.income?.c || 0);
    totalIncomeD += parseFloat(r.incomeD || r.income?.d || 0);
    totalIncomeE += parseFloat(r.incomeE || r.income?.e || 0);
    totalExpense += parseFloat(r.expense || r.dailyExpense || 0);
    dayCount++;
  });

  const avgSpaceUsage = dayCount > 0 ? (totalSpaceUsage / dayCount).toFixed(1) : 0;
  const totalIncome = totalIncomeA + totalIncomeB + totalIncomeC + totalIncomeD + totalIncomeE;
  const netIncome = totalIncome - totalExpense;

  return {
    branch: branchCode,
    yearMonth: yearMonth,
    reportCount: dayCount,
    avgStaffWork: (totalStaffWork / dayCount).toFixed(1),
    avgStaffOff: (totalStaffOff / dayCount).toFixed(1),
    avgCustCnt: (totalCustCnt / dayCount).toFixed(1),
    avgSpaceUsage: avgSpaceUsage,
    totalStaffWork: totalStaffWork,
    totalStaffOff: totalStaffOff,
    totalCustCnt: totalCustCnt,
    totalIncomeA: totalIncomeA,
    totalIncomeB: totalIncomeB,
    totalIncomeC: totalIncomeC,
    totalIncomeD: totalIncomeD,
    totalIncomeE: totalIncomeE,
    totalIncome: totalIncome,
    totalExpense: totalExpense,
    netIncome: netIncome
  };
}

// ============================================
// 日報總表
// ============================================

/**
 * 產生指定日期的日報總表
 * 收集所有館別的當日報告，包含填報狀態
 * @param {string} date - 日期 (YYYY/MM/DD)
 * @returns {Promise<Object>} 總表資料
 */
async function fbGenerateDailySummary(date) {
  if (!date) date = _todayString();
  const normDate = _normalizeDate(date);

  // 取得所有館別列表
  const branches = _fbBranches;
  if (!branches || branches.length === 0) {
    console.warn('⚠️ 未設定館別列表，請先呼叫 fbSetBranches()');
    return { date: normDate, branches: [], filled: 0, total: 0, unfilledBranches: [] };
  }

  // 取得該日期的所有報告
  const reports = await fbGetReportsByDate(normDate);
  const reportMap = {};
  reports.forEach(r => {
    reportMap[r.branch] = r;
  });

  const branchSummaries = [];
  let filled = 0;
  const unfilledBranches = [];

  branches.forEach(branch => {
    const report = reportMap[branch.code];
    const summary = {
      branchCode: branch.code,
      branchName: branch.name,
      filled: !!report,
      staffWork: report ? (report.staffWork || report.workNum || 0) : 0,
      staffOff: report ? (report.staffOff || report.offNum || 0) : 0,
      custCnt: report ? (report.custCnt || report.custNum || 0) : 0,
      spaceUsage: report ? (report.spaceUsage || report.spaceRate || 0) : 0,
      incomeA: report ? (report.incomeA || report.income?.a || 0) : 0,
      incomeB: report ? (report.incomeB || report.income?.b || 0) : 0,
      incomeC: report ? (report.incomeC || report.income?.c || 0) : 0,
      incomeD: report ? (report.incomeD || report.income?.d || 0) : 0,
      incomeE: report ? (report.incomeE || report.income?.e || 0) : 0,
      expense: report ? (report.expense || report.dailyExpense || 0) : 0,
      note: report ? (report.note || '') : ''
    };
    branchSummaries.push(summary);
    if (report) {
      filled++;
    } else {
      unfilledBranches.push(branch.name);
    }
  });

  return {
    date: normDate,
    branches: branchSummaries,
    filled: filled,
    total: branches.length,
    unfilledBranches: unfilledBranches,
    fillRate: branches.length > 0 ? ((filled / branches.length) * 100).toFixed(1) : 0
  };
}

/**
 * 產生指定月份的月報總表
 * @param {string} yearMonth - 年月 (YYYYMM)
 * @returns {Promise<Object>} 月報總表
 */
async function fbGenerateMonthlySummary(yearMonth) {
  const ym = formatYearMonthKey(yearMonth);
  const branches = _fbBranches;
  if (!branches || branches.length === 0) {
    return { yearMonth: ym, branches: [], totalFilledDays: 0 };
  }

  const branchStats = [];
  let grandTotalIncome = 0;
  let grandTotalExpense = 0;

  for (const branch of branches) {
    const stats = await fbCalcBranchMonthStats(branch.code, ym);
    if (stats) {
      branchStats.push({
        branchCode: branch.code,
        branchName: branch.name,
        ...stats
      });
      grandTotalIncome += stats.totalIncome;
      grandTotalExpense += stats.totalExpense;
    } else {
      branchStats.push({
        branchCode: branch.code,
        branchName: branch.name,
        yearMonth: ym,
        reportCount: 0,
        avgStaffWork: 0,
        avgStaffOff: 0,
        avgCustCnt: 0,
        avgSpaceUsage: 0,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0
      });
    }
  }

  const totalFilledDays = branchStats.reduce((sum, s) => sum + s.reportCount, 0);

  return {
    yearMonth: ym,
    branches: branchStats,
    totalFilledDays: totalFilledDays,
    grandTotalIncome: grandTotalIncome,
    grandTotalExpense: grandTotalExpense,
    grandNetIncome: grandTotalIncome - grandTotalExpense
  };
}

/**
 * 產生年度總表（所有館別）
 * @param {number|string} year - 年份
 * @returns {Promise<Object>} 年度總表
 */
async function fbGenerateYearlySummary(year) {
  const y = String(year);
  const branches = _fbBranches;
  if (!branches || branches.length === 0) {
    return { year: y, months: [], branches: [] };
  }

  const monthlyData = [];
  for (let m = 1; m <= 12; m++) {
    const ym = y + String(m).padStart(2, '0');
    const monthSummary = await fbGenerateMonthlySummary(ym);
    monthlyData.push(monthSummary);
  }

  return {
    year: y,
    months: monthlyData,
    branches: branches.map(b => b.name)
  };
}

/**
 * 產生指定館別的年度總表
 * @param {string} branchCode - 館別代碼
 * @param {number|string} year - 年份
 * @returns {Promise<Object>} 館別年度統計
 */
async function fbGenerateBranchYearlySummary(branchCode, year) {
  const y = String(year);
  if (!branchCode) return null;

  const monthlyStats = [];
  let yearlyTotalIncome = 0;
  let yearlyTotalExpense = 0;
  let yearlyTotalDays = 0;

  for (let m = 1; m <= 12; m++) {
    const ym = y + String(m).padStart(2, '0');
    const stats = await fbCalcBranchMonthStats(branchCode, ym);
    if (stats) {
      monthlyStats.push(stats);
      yearlyTotalIncome += stats.totalIncome;
      yearlyTotalExpense += stats.totalExpense;
      yearlyTotalDays += stats.reportCount;
    } else {
      monthlyStats.push({
        branch: branchCode,
        yearMonth: ym,
        reportCount: 0,
        avgStaffWork: 0,
        avgStaffOff: 0,
        avgCustCnt: 0,
        avgSpaceUsage: 0,
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0
      });
    }
  }

  // 取得館別名稱
  const branch = _fbBranches.find(b => b.code === branchCode);

  return {
    branchCode: branchCode,
    branchName: branch ? branch.name : branchCode,
    year: y,
    months: monthlyStats,
    yearlyTotalIncome: yearlyTotalIncome,
    yearlyTotalExpense: yearlyTotalExpense,
    yearlyNetIncome: yearlyTotalIncome - yearlyTotalExpense,
    yearlyTotalDays: yearlyTotalDays,
    yearlyAvgIncome: yearlyTotalDays > 0 ? (yearlyTotalIncome / yearlyTotalDays).toFixed(2) : 0
  };
}

// ============================================
// 填報狀態
// ============================================

/**
 * 取得當天各館填報狀態
 * @returns {Promise<Object>} 填報狀態統計
 */
async function fbGetTodayReportStatus() {
  return await fbGenerateDailySummary(_todayString());
}

// ============================================
// 資料管理（匯出/匯入/清除）
// ============================================

/**
 * 匯出所有日報資料
 * 回傳完整資料結構，可用於備份或轉移
 * @returns {Promise<Object>} 完整資料物件
 */
async function fbExportAllData() {
  const result = {
    exportDate: new Date().toISOString(),
    version: '1.0',
    source: 'firebase-data',
    reports: [],
    localBackup: []
  };

  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      const snapshot = await db.collection(COLLECTIONS.REPORTS).get();
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        // 移除 Firestore 內部欄位
        delete data._synced;
        delete data._pendingSync;
        result.reports.push(data);
      });
      console.log('✅ 已從 Firestore 匯出 %d 筆報告', result.reports.length);
    } catch (err) {
      console.error('❌ Firestore 匯出失敗:', err.message);
    }
  }

  // 同時收集本機緩存資料
  try {
    const prefix = FB_LS_PREFIX + 'report_';
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        const cached = _lsGet(key.substring(FB_LS_PREFIX.length));
        if (cached && cached.data) {
          result.localBackup.push(cached.data);
        }
      }
    });
    console.log('💾 本機備份 %d 筆報告', result.localBackup.length);
  } catch (e) {
    console.error('❌ 本機備份讀取失敗:', e.message);
  }

  return result;
}

/**
 * 匯入日報資料
 * 將資料寫入 Firestore 和 localStorage
 * @param {Object} data - 要匯入的資料物件（fbExportAllData 的格式）
 * @returns {Promise<{success: boolean, imported: number, errors: Array, error?: string}>}
 */
async function fbImportAllData(data) {
  if (!data || !data.reports || !Array.isArray(data.reports)) {
    return { success: false, imported: 0, errors: [], error: '資料格式不正確' };
  }

  const reports = data.reports;
  let imported = 0;
  const errors = [];

  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      // 使用 batch write 提高效率（每批最多 500 筆）
      const batchSize = 450;
      for (let i = 0; i < reports.length; i += batchSize) {
        const batch = db.batch();
        const chunk = reports.slice(i, i + batchSize);

        chunk.forEach(report => {
          const branch = report.branch;
          const date = report.date;
          if (!branch || !date) {
            errors.push({ report, error: '缺少 branch 或 date' });
            return;
          }
          const docId = _makeDocId(branch, date);
          const cleaned = _cleanReportForFirestore(report);
          const docRef = db.collection(COLLECTIONS.REPORTS).doc(docId);
          batch.set(docRef, cleaned, { merge: true });
        });

        await batch.commit();
        imported += chunk.length;
        console.log('✅ 批次匯入完成: %d / %d', imported, reports.length);
      }
    } catch (err) {
      console.error('❌ Firestore 匯入失敗:', err.message);
      errors.push({ error: err.message });
    }
  }

  // 同步寫入 localStorage 作為備援
  reports.forEach(report => {
    try {
      const docId = _makeDocId(report.branch, report.date);
      const cacheKey = 'report_' + docId;
      _lsSet(cacheKey, { data: report, timestamp: Date.now() });
    } catch (e) {
      errors.push({ report, error: e.message });
    }
  });

  return {
    success: errors.length === 0 || imported > 0,
    imported: imported,
    errors: errors
  };
}

/**
 * 清除所有日報資料（管理員功能）
 * 會同時清除 Firestore 和 localStorage 中的報告資料
 * @returns {Promise<{success: boolean, deleted: number, error?: string}>}
 */
async function fbClearAllData() {
  if (typeof isMaster === 'function' && !isMaster()) {
    return { success: false, deleted: 0, error: '只有管理員可以清除資料' };
  }

  let deleted = 0;

  if (_useFirebase()) {
    try {
      const db = getDb();
      if (!db) throw new Error('Firestore 未就緒');

      // Firestore 不支援批次刪除全部，需逐一刪除或使用 Cloud Function
      // 此處採用分批刪除（每批 100 筆）
      let lastDoc = null;
      const batchSize = 100;
      let hasMore = true;

      while (hasMore) {
        let query = db.collection(COLLECTIONS.REPORTS).limit(batchSize);
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
          deleted++;
        });

        await batch.commit();
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        if (snapshot.size < batchSize) {
          hasMore = false;
        }
      }

      console.log('✅ 已從 Firestore 刪除 %d 筆報告', deleted);
    } catch (err) {
      console.error('❌ Firestore 清除失敗:', err.message);
      return { success: false, deleted: deleted, error: err.message };
    }
  }

  // 清除本機緩存
  try {
    let localDeleted = 0;
    const prefix = FB_LS_PREFIX + 'report_';
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
        localDeleted++;
      }
    });
    console.log('🗑️ 已清除 %d 筆本機備援資料', localDeleted);
  } catch (e) {
    console.error('❌ 本機資料清除失敗:', e.message);
  }

  return { success: true, deleted: deleted };
}

// ============================================
// 同步管理
// ============================================

/**
 * 檢查是否有待同步的本機資料
 * @returns {Array<string>} 待同步的文件 ID 列表
 */
function fbGetPendingSync() {
  return _lsGet('pending_sync') || [];
}

/**
 * 嘗試將本機緩存資料同步到 Firestore
 * 在網路恢復時呼叫
 * @returns {Promise<{success: boolean, synced: number, failed: number}>}
 */
async function fbSyncPendingData() {
  if (!_useFirebase()) {
    return { success: false, synced: 0, failed: 0, error: 'Firebase 未就緒' };
  }

  const pending = fbGetPendingSync();
  if (pending.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;
  const stillPending = [];
  const db = getDb();

  if (!db) {
    return { success: false, synced: 0, failed: pending.length, error: 'Firestore 未就緒' };
  }

  for (const docId of pending) {
    try {
      const cacheKey = 'report_' + docId;
      const cached = _lsGet(cacheKey);
      if (!cached || !cached.data) {
        continue; // 已無資料，跳過
      }

      const cleaned = _cleanReportForFirestore(cached.data);
      await db.collection(COLLECTIONS.REPORTS).doc(docId).set(cleaned, { merge: true });
      synced++;
      console.log('🔄 已同步:', docId);
    } catch (err) {
      failed++;
      stillPending.push(docId);
      console.error('❌ 同步失敗 (%s):', docId, err.message);
    }
  }

  // 更新待同步列表
  _lsSet('pending_sync', stillPending);

  if (synced > 0) {
    console.log('✅ 同步完成: %d 成功, %d 失敗, %d 待重試', synced, failed, stillPending.length);
  }

  return { success: failed === 0, synced, failed };
}

/**
 * 監聽網路狀態，自動同步
 * 在 DOMContentLoaded 後自動啟動
 */
function fbEnableAutoSync() {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('🌐 網路已恢復，開始同步本機資料...');
      fbSyncPendingData().then(result => {
        if (result.synced > 0) {
          console.log('✅ 自動同步完成: %d 筆', result.synced);
        }
      });
    });

    window.addEventListener('offline', () => {
      console.log('📴 網路已中斷，切換至離線模式（資料將暫存本機）');
    });
  }
}

// 頁面載入時自動啟用網路監聽
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(fbEnableAutoSync, 1000);
});

// ============================================
// Firestore Security Rules（供參考）
// ============================================
// 請將以下規則貼到 Firebase Console > Firestore Database > Rules：
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // 用戶資料：只能讀取自己的資料
//     match /users/{userId} {
//       allow read: if request.auth != null && request.auth.uid == userId;
//       allow write: if false; // 僅透過 Admin SDK 或 Cloud Function 寫入
//     }
//     // 日報資料：
//     // - 管理員可讀寫全部
//     // - 館別人員只能讀寫自己館別的資料
//     match /reports/{reportId} {
//       allow read: if request.auth != null && (
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'master' ||
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branchCode == resource.data.branch
//       );
//       allow create, update: if request.auth != null && (
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'master' ||
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branchCode == request.resource.data.branch
//       );
//       allow delete: if request.auth != null && (
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'master' ||
//         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.branchCode == resource.data.branch
//       );
//     }
//   }
// }
