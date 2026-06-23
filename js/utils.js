// ============ 工具函数 ============

const BRANCHES = [
  { code: 'TC_CK', name: '台中-中港館', city: '台中' },
  { code: 'TC_YT', name: '台中-英才館', city: '台中' },
  { code: 'TC_CC', name: '台中-中清館', city: '台中' },
  { code: 'TC_CF1', name: '台中-七期1館', city: '台中' },
  { code: 'TC_CF2', name: '台中-七期2館', city: '台中' },
  { code: 'TP_ZX', name: '台北-忠孝館', city: '台北' },
  { code: 'TP_XZ1', name: '新北-汐止1館', city: '新北' },
  { code: 'TP_XZ2', name: '新北-汐止2館', city: '新北' }
];

const BRANCH_MAP = Object.fromEntries(BRANCHES.map(b => [b.code, b]));

const ADMIN_PASSWORD = 'admin123';

// ============ 日期工具 ============
function todayStr() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().split('T')[0];
}

function currentYearMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentYear() {
  return new Date().getFullYear().toString();
}

function getYearMonth(dateStr) {
  return dateStr.substring(0, 7);
}

function getYear(dateStr) {
  return dateStr.substring(0, 4);
}

function getMonth(dateStr) {
  return parseInt(dateStr.substring(5, 7));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

// ============ 计算工具 ============
function calcSignTotal(report) {
  return (report?.officeRenew?.count || 0)
    + (report?.officeNew?.count || 0)
    + (report?.registerNew || 0)
    + (report?.registerRenew || 0);
}

function calcOccupancyRate(rented, total) {
  if (!total) return 0;
  return Math.round((rented / total) * 1000) / 10;
}

function weightedOccupancyRate(reports) {
  let totalRented = 0, totalRooms = 0;
  reports.forEach(r => {
    totalRented += r.rentedCount || 0;
    totalRooms += r.totalCount || 0;
  });
  return calcOccupancyRate(totalRented, totalRooms);
}

// ============ CSV 工具 ============
function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============ JSON 工具 ============
function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readJSONFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try { resolve(JSON.parse(e.target.result)); }
      catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// ============ 月份天数 ============
function getDaysInMonth(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function getDaysArray(yearMonth) {
  const days = getDaysInMonth(yearMonth);
  const arr = [];
  for (let i = 1; i <= days; i++) {
    arr.push(`${yearMonth}-${String(i).padStart(2, '0')}`);
  }
  return arr;
}

// ============ 确认框 ============
function confirmAction(message) {
  return new Promise(resolve => {
    const confirmed = window.confirm(message);
    resolve(confirmed);
  });
}

// ============ Toast 提示 ============
function showToast(message, type = 'success') {
  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  };
  const existing = document.getElementById('toast-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300';
  container.innerHTML = `
    <div class="${colors[type]} text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 min-w-[200px] justify-center">
      <span class="text-lg">${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span class="font-medium">${message}</span>
    </div>
  `;
  document.body.appendChild(container);
  setTimeout(() => {
    container.style.opacity = '0';
    container.style.transform = 'translate(-50%, -20px)';
    setTimeout(() => container.remove(), 300);
  }, 2500);
}

// ============ 安全HTML转义 ============
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============ 防抖 ============
function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}