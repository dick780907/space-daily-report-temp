// ============================================
// 史貝斯商務中心 - 分館轉介查詢記錄管理
// ============================================
// 總管理者接收其他分館轉介的客戶查詢，記錄與追蹤
// ============================================

const QUERIES_STORAGE_KEY = 'space_branch_queries';

// ============ CRUD 操作 ============

function loadAllQueries() {
  try {
    const raw = localStorage.getItem(QUERIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllQueries(queries) {
  localStorage.setItem(QUERIES_STORAGE_KEY, JSON.stringify(queries));
}

// 新增查詢記錄
function addQuery(queryData) {
  const queries = loadAllQueries();
  const newQuery = {
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    date: queryData.date || todayStr(),
    sourceBranch: queryData.sourceBranch || '',
    customerName: queryData.customerName || '',
    contact: queryData.contact || '',
    queryType: queryData.queryType || '辦公室租借',
    content: queryData.content || '',
    status: queryData.status || 'pending',
    note: queryData.note || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  queries.unshift(newQuery);
  saveAllQueries(queries);
  return newQuery;
}

// 更新查詢記錄
function updateQuery(id, updates) {
  const queries = loadAllQueries();
  const idx = queries.findIndex(q => q.id === id);
  if (idx === -1) return null;
  queries[idx] = { ...queries[idx], ...updates, updatedAt: new Date().toISOString() };
  saveAllQueries(queries);
  return queries[idx];
}

// 更新狀態
function updateQueryStatus(id, status) {
  return updateQuery(id, { status });
}

// 刪除查詢記錄
function deleteQuery(id) {
  const queries = loadAllQueries();
  const filtered = queries.filter(q => q.id !== id);
  saveAllQueries(filtered);
  return filtered.length < queries.length;
}

// 取得單筆查詢
function getQuery(id) {
  return loadAllQueries().find(q => q.id === id);
}

// ============ 查詢與篩選 ============

function getAllQueries(options = {}) {
  let queries = loadAllQueries();

  // 按來源館別篩選
  if (options.sourceBranch) {
    queries = queries.filter(q => q.sourceBranch === options.sourceBranch);
  }

  // 按狀態篩選
  if (options.status) {
    queries = queries.filter(q => q.status === options.status);
  }

  // 按日期範圍篩選
  if (options.startDate) {
    queries = queries.filter(q => q.date >= options.startDate);
  }
  if (options.endDate) {
    queries = queries.filter(q => q.date <= options.endDate);
  }

  // 按關鍵字搜尋
  if (options.keyword) {
    const kw = options.keyword.toLowerCase();
    queries = queries.filter(q =>
      (q.customerName || '').toLowerCase().includes(kw) ||
      (q.content || '').toLowerCase().includes(kw) ||
      (q.contact || '').toLowerCase().includes(kw) ||
      (q.note || '').toLowerCase().includes(kw)
    );
  }

  // 預設按日期新到舊排序
  queries.sort((a, b) => b.date.localeCompare(a.date));

  return queries;
}

// 取得統計數據
function getQueryStats() {
  const queries = loadAllQueries();
  const today = todayStr();
  const thisMonth = currentYearMonth();

  return {
    total: queries.length,
    pending: queries.filter(q => q.status === 'pending').length,
    processing: queries.filter(q => q.status === 'processing').length,
    completed: queries.filter(q => q.status === 'completed').length,
    todayNew: queries.filter(q => q.date === today).length,
    thisMonth: queries.filter(q => q.date.startsWith(thisMonth)).length
  };
}

// 按館別統計
function getQueryStatsByBranch() {
  const queries = loadAllQueries();
  const stats = {};
  BRANCHES.forEach(b => {
    const branchQueries = queries.filter(q => q.sourceBranch === b.code);
    stats[b.code] = {
      name: b.name,
      total: branchQueries.length,
      pending: branchQueries.filter(q => q.status === 'pending').length,
      processing: branchQueries.filter(q => q.status === 'processing').length,
      completed: branchQueries.filter(q => q.status === 'completed').length
    };
  });
  return stats;
}

// ============ 狀態標籤 ============

const QUERY_STATUS_LABELS = {
  'pending': { label: '待處理', color: 'red', bgClass: 'bg-red-50', textClass: 'text-red-600', borderClass: 'border-red-200' },
  'processing': { label: '處理中', color: 'amber', bgClass: 'bg-amber-50', textClass: 'text-amber-600', borderClass: 'border-amber-200' },
  'completed': { label: '已完成', color: 'green', bgClass: 'bg-green-50', textClass: 'text-green-600', borderClass: 'border-green-200' }
};

const QUERY_TYPE_OPTIONS = [
  '辦公室租借',
  '營業登記',
  '虛擬辦公室',
  '會議室租借',
  '其他'
];

function getQueryStatusLabel(status) {
  return QUERY_STATUS_LABELS[status] || QUERY_STATUS_LABELS['pending'];
}

// ============ 匯出 ============

function exportQueriesToCSV() {
  const queries = loadAllQueries();
  const rows = queries.map(q => ({
    '日期': q.date,
    '來源館別': BRANCH_MAP[q.sourceBranch]?.name || q.sourceBranch,
    '客戶姓名': q.customerName,
    '聯絡方式': q.contact,
    '查詢類型': q.queryType,
    '查詢內容': q.content,
    '處理狀態': QUERY_STATUS_LABELS[q.status]?.label || q.status,
    '備註': q.note
  }));
  downloadCSV('分館查詢記錄.csv', rows);
}
