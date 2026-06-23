// ============ 數據管理模組 ============
// 所有資料存儲於 localStorage，key: 'space_reports'

const STORAGE_KEY = 'space_reports';
const ADMIN_KEY = 'space_admin_logged_in';

// ============ 讀取/寫入 ============
function loadAllReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllReports(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ============ CRUD ============
function getReport(branchCode, date) {
  const data = loadAllReports();
  return data[`${branchCode}_${date}`] || null;
}

function saveReport(report) {
  const data = loadAllReports();
  data[`${report.branch}_${report.date}`] = report;
  saveAllReports(data);
}

function deleteReport(branchCode, date) {
  const data = loadAllReports();
  delete data[`${branchCode}_${date}`];
  saveAllReports(data);
}

// ============ 批量查詢 ============
function getReportsByBranch(branchCode) {
  const data = loadAllReports();
  return Object.values(data).filter(r => r.branch === branchCode).sort((a, b) => b.date.localeCompare(a.date));
}

function getReportsByMonth(yearMonth) {
  const data = loadAllReports();
  return Object.values(data).filter(r => r.date.startsWith(yearMonth)).sort((a, b) => a.date.localeCompare(b.date));
}

function getReportsByBranchMonth(branchCode, yearMonth) {
  const data = loadAllReports();
  return Object.values(data)
    .filter(r => r.branch === branchCode && r.date.startsWith(yearMonth))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getReportsByDate(date) {
  const data = loadAllReports();
  return Object.values(data).filter(r => r.date === date);
}

// ============ 月統計 ============
function calcBranchMonthStats(branchCode, yearMonth) {
  const reports = getReportsByBranchMonth(branchCode, yearMonth);
  const stats = {
    officeQuery: 0, registerQuery: 0, visits: 0,
    officeRenew: 0, officeNew: 0, registerNew: 0, registerRenew: 0,
    officeCancel: 0, officeDeposit: 0,
    signTotal: 0, reportDays: 0,
    avgOccupancy: 0, totalRented: 0, totalRooms: 0
  };
  reports.forEach(r => {
    stats.officeQuery += r.officeQuery || 0;
    stats.registerQuery += r.registerQuery || 0;
    stats.visits += r.visits || 0;
    stats.officeRenew += r.officeRenew?.count || 0;
    stats.officeNew += r.officeNew?.count || 0;
    stats.registerNew += r.registerNew || 0;
    stats.registerRenew += r.registerRenew || 0;
    stats.officeCancel += r.officeCancel?.count || 0;
    stats.officeDeposit += r.officeDeposit?.count || 0;
    stats.signTotal += calcSignTotal(r);
    stats.reportDays++;
    stats.totalRented += r.rentedCount || 0;
    stats.totalRooms += r.totalCount || 0;
  });
  stats.avgOccupancy = calcOccupancyRate(stats.totalRented, stats.totalRooms);
  return stats;
}

// ============ 館別今日填報狀態 ============
function getTodayReportStatus() {
  const today = todayStr();
  return BRANCHES.map(b => {
    const report = getReport(b.code, today);
    return { ...b, filled: !!report, author: report?.author || null };
  });
}

// ============ 館別全月填報率 ============
function getBranchMonthFillStatus(branchCode, yearMonth) {
  const days = getDaysInMonth(yearMonth);
  const reports = getReportsByBranchMonth(branchCode, yearMonth);
  return { filled: reports.length, total: days, rate: Math.round((reports.length / days) * 100) };
}

// ============ 管理員登入 ============
function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_KEY) === 'true';
}

function adminLogin() {
  sessionStorage.setItem(ADMIN_KEY, 'true');
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_KEY);
}

// ============ 全量備份/還原 ============
function exportAllData() {
  return {
    version: '1.0',
    exportTime: new Date().toISOString(),
    data: loadAllReports()
  };
}

function importAllData(backup) {
  if (backup && backup.data) {
    saveAllReports(backup.data);
    return true;
  }
  // 兼容直接是对象格式
  if (backup && typeof backup === 'object') {
    saveAllReports(backup);
    return true;
  }
  return false;
}

function clearAllData() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============ 生成日報總表數據（指定日期） ============
function generateDailySummary(date) {
  const reports = getReportsByDate(date);
  const reportMap = Object.fromEntries(reports.map(r => [r.branch, r]));
  const rows = BRANCHES.map(b => {
    const r = reportMap[b.code];
    return {
      branchCode: b.code,
      branchName: b.name,
      filled: !!r,
      author: r?.author || '',
      officeQuery: r?.officeQuery || 0,
      registerQuery: r?.registerQuery || 0,
      visits: r?.visits || 0,
      officeRenew: r?.officeRenew?.count || 0,
      officeNew: r?.officeNew?.count || 0,
      registerNew: r?.registerNew || 0,
      registerRenew: r?.registerRenew || 0,
      signTotal: calcSignTotal(r),
      officeCancel: r?.officeCancel?.count || 0,
      officeDeposit: r?.officeDeposit?.count || 0,
      rentedCount: r?.rentedCount || 0,
      totalCount: r?.totalCount || 0,
      occupancyRate: calcOccupancyRate(r?.rentedCount || 0, r?.totalCount || 0)
    };
  });
  const totals = {
    branchCode: '', branchName: '全館合計',
    filled: rows.filter(r => r.filled).length,
    author: `${rows.filter(r => r.filled).length}/8 館已填報`,
    officeQuery: rows.reduce((s, r) => s + r.officeQuery, 0),
    registerQuery: rows.reduce((s, r) => s + r.registerQuery, 0),
    visits: rows.reduce((s, r) => s + r.visits, 0),
    officeRenew: rows.reduce((s, r) => s + r.officeRenew, 0),
    officeNew: rows.reduce((s, r) => s + r.officeNew, 0),
    registerNew: rows.reduce((s, r) => s + r.registerNew, 0),
    registerRenew: rows.reduce((s, r) => s + r.registerRenew, 0),
    signTotal: rows.reduce((s, r) => s + r.signTotal, 0),
    officeCancel: rows.reduce((s, r) => s + r.officeCancel, 0),
    officeDeposit: rows.reduce((s, r) => s + r.officeDeposit, 0),
    rentedCount: rows.reduce((s, r) => s + r.rentedCount, 0),
    totalCount: rows.reduce((s, r) => s + r.totalCount, 0),
    occupancyRate: calcOccupancyRate(
      rows.reduce((s, r) => s + r.rentedCount, 0),
      rows.reduce((s, r) => s + r.totalCount, 0)
    )
  };
  return { rows, totals };
}

// ============ 生成月報數據 ============
function generateMonthlySummary(yearMonth) {
  const rows = BRANCHES.map(b => {
    const stats = calcBranchMonthStats(b.code, yearMonth);
    const fill = getBranchMonthFillStatus(b.code, yearMonth);
    return {
      branchCode: b.code,
      branchName: b.name,
      ...stats,
      fillRate: fill.rate,
      fillDays: fill.filled,
      totalDays: fill.total
    };
  });
  const totals = {
    branchCode: '', branchName: '全館合計',
    officeQuery: rows.reduce((s, r) => s + r.officeQuery, 0),
    registerQuery: rows.reduce((s, r) => s + r.registerQuery, 0),
    visits: rows.reduce((s, r) => s + r.visits, 0),
    officeRenew: rows.reduce((s, r) => s + r.officeRenew, 0),
    officeNew: rows.reduce((s, r) => s + r.officeNew, 0),
    registerNew: rows.reduce((s, r) => s + r.registerNew, 0),
    registerRenew: rows.reduce((s, r) => s + r.registerRenew, 0),
    officeCancel: rows.reduce((s, r) => s + r.officeCancel, 0),
    officeDeposit: rows.reduce((s, r) => s + r.officeDeposit, 0),
    signTotal: rows.reduce((s, r) => s + r.signTotal, 0),
    reportDays: rows.reduce((s, r) => s + r.reportDays, 0),
    avgOccupancy: calcOccupancyRate(
      rows.reduce((s, r) => s + r.totalRented, 0),
      rows.reduce((s, r) => s + r.totalRooms, 0)
    )
  };
  return { rows, totals };
}

// ============ 生成年報數據 ============
function generateYearlySummary(year) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    const summary = generateMonthlySummary(ym);
    months.push({
      month: `${m}月`,
      monthNum: m,
      officeQuery: summary.totals.officeQuery,
      registerQuery: summary.totals.registerQuery,
      visits: summary.totals.visits,
      officeRenew: summary.totals.officeRenew,
      officeNew: summary.totals.officeNew,
      registerNew: summary.totals.registerNew,
      registerRenew: summary.totals.registerRenew,
      signTotal: summary.totals.signTotal,
      officeCancel: summary.totals.officeCancel,
      officeDeposit: summary.totals.officeDeposit,
      reportDays: summary.totals.reportDays,
      avgOccupancy: summary.totals.avgOccupancy
    });
  }
  const totals = {
    month: '年度合計',
    officeQuery: months.reduce((s, m) => s + m.officeQuery, 0),
    registerQuery: months.reduce((s, m) => s + m.registerQuery, 0),
    visits: months.reduce((s, m) => s + m.visits, 0),
    officeRenew: months.reduce((s, m) => s + m.officeRenew, 0),
    officeNew: months.reduce((s, m) => s + m.officeNew, 0),
    registerNew: months.reduce((s, m) => s + m.registerNew, 0),
    registerRenew: months.reduce((s, m) => s + m.registerRenew, 0),
    signTotal: months.reduce((s, m) => s + m.signTotal, 0),
    officeCancel: months.reduce((s, m) => s + m.officeCancel, 0),
    officeDeposit: months.reduce((s, m) => s + m.officeDeposit, 0),
    reportDays: months.reduce((s, m) => s + m.reportDays, 0),
    avgOccupancy: months.length > 0 ? Math.round(months.reduce((s, m) => s + m.avgOccupancy, 0) / months.filter(m => m.reportDays > 0).length * 10) / 10 || 0 : 0
  };
  return { months, totals };
}

// ============ 生成館別年報數據 ============
function generateBranchYearlySummary(branchCode, year) {
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    const stats = calcBranchMonthStats(branchCode, ym);
    const fill = getBranchMonthFillStatus(branchCode, ym);
    months.push({
      month: `${m}月`,
      monthNum: m,
      officeQuery: stats.officeQuery,
      registerQuery: stats.registerQuery,
      visits: stats.visits,
      officeRenew: stats.officeRenew,
      officeNew: stats.officeNew,
      registerNew: stats.registerNew,
      registerRenew: stats.registerRenew,
      signTotal: stats.signTotal,
      officeCancel: stats.officeCancel,
      officeDeposit: stats.officeDeposit,
      reportDays: stats.reportDays,
      avgOccupancy: stats.avgOccupancy
    });
  }
  const totals = {
    month: '年度合計',
    officeQuery: months.reduce((s, m) => s + m.officeQuery, 0),
    registerQuery: months.reduce((s, m) => s + m.registerQuery, 0),
    visits: months.reduce((s, m) => s + m.visits, 0),
    officeRenew: months.reduce((s, m) => s + m.officeRenew, 0),
    officeNew: months.reduce((s, m) => s + m.officeNew, 0),
    registerNew: months.reduce((s, m) => s + m.registerNew, 0),
    registerRenew: months.reduce((s, m) => s + m.registerRenew, 0),
    signTotal: months.reduce((s, m) => s + m.signTotal, 0),
    officeCancel: months.reduce((s, m) => s + m.officeCancel, 0),
    officeDeposit: months.reduce((s, m) => s + m.officeDeposit, 0),
    reportDays: months.reduce((s, m) => s + m.reportDays, 0),
    avgOccupancy: months.length > 0 ? Math.round(months.reduce((s, m) => s + m.avgOccupancy, 0) / months.filter(m => m.reportDays > 0).length * 10) / 10 || 0 : 0
  };
  return { months, totals };
}