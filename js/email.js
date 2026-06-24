// ============================================
// 史貝斯商務中心 - 日報統計郵件發送模組
// ============================================
// 方案 B：管理員後台手動發送
// - 生成郵件內容 + mailto 連結
// - 營業日判斷（排除週六日及國定假日）
// - 發送記錄防止重複
// ============================================

const EMAIL_CONFIG = {
  recipient: 'cs08@grandcentraltw.com',
  subjectPrefix: '【史貝斯商務中心】日報統計表'
};

const EMAIL_SENT_KEY = 'space_email_sent_dates';

// ============ 台灣國定假日（2024-2027） ============
const TAIWAN_HOLIDAYS = [
  // 2024
  '2024-01-01', '2024-02-08', '2024-02-09', '2024-02-10', '2024-02-11', '2024-02-12', '2024-02-13', '2024-02-14',
  '2024-02-28', '2024-04-04', '2024-04-05', '2024-05-01', '2024-06-10',
  '2024-09-17', '2024-10-10', '2024-10-11',
  // 2025
  '2025-01-01', '2025-01-27', '2025-01-28', '2025-01-29', '2025-01-30', '2025-01-31',
  '2025-02-01', '2025-02-02', '2025-02-28', '2025-04-03', '2025-04-04', '2025-05-01',
  '2025-05-30', '2025-05-31', '2025-06-01', '2025-10-06', '2025-10-10',
  // 2026
  '2026-01-01', '2026-01-02', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20',
  '2026-02-21', '2026-02-22', '2026-02-27', '2026-04-03', '2026-04-04', '2026-04-05',
  '2026-05-01', '2026-06-19', '2026-09-25', '2026-10-09', '2026-10-10',
  // 2027
  '2027-01-01', '2027-02-05', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09',
  '2027-02-10', '2027-02-11', '2027-02-12', '2027-02-13', '2027-02-16', '2027-04-04',
  '2027-04-05', '2027-05-01', '2027-06-09', '2027-09-16', '2027-10-10'
];

// ============ 營業日判斷 ============

/**
 * 判斷指定日期是否為營業日
 * 營業日 = 非週六、非週日、非國定假日
 */
function isBusinessDay(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0=週日, 6=週六

  // 週六或週日
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // 國定假日
  if (TAIWAN_HOLIDAYS.includes(dateStr)) {
    return false;
  }

  return true;
}

/**
 * 取得指定日期的下一個營業日
 */
function getNextBusinessDay(dateStr) {
  let d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  while (!isBusinessDay(formatDateISO(d))) {
    d.setDate(d.getDate() + 1);
  }
  return formatDateISO(d);
}

/**
 * 取得今天的營業日狀態說明
 */
function getBusinessDayStatus(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const holidayName = getHolidayName(dateStr);

  if (dayOfWeek === 0) return { isBusiness: false, reason: '週日（非營業日）' };
  if (dayOfWeek === 6) return { isBusiness: false, reason: '週六（非營業日）' };
  if (holidayName) return { isBusiness: false, reason: `國定假日：${holidayName}` };
  return { isBusiness: true, reason: '營業日' };
}

function getHolidayName(dateStr) {
  const holidayNames = {
    '2024-01-01': '元旦', '2024-02-08': '農曆除夕', '2024-02-09': '農曆春節',
    '2024-02-10': '農曆春節', '2024-02-11': '農曆春節', '2024-02-12': '農曆春節',
    '2024-02-13': '農曆春節', '2024-02-14': '農曆春節', '2024-02-28': '和平紀念日',
    '2024-04-04': '兒童節', '2024-04-05': '清明節', '2024-05-01': '勞動節',
    '2024-06-10': '端午節', '2024-09-17': '中秋節', '2024-10-10': '國慶日',
    '2025-01-01': '元旦', '2025-01-27': '農曆春節', '2025-01-28': '農曆除夕',
    '2025-01-29': '農曆春節', '2025-01-30': '農曆春節', '2025-01-31': '農曆春節',
    '2025-02-01': '農曆春節', '2025-02-02': '農曆春節', '2025-02-28': '和平紀念日',
    '2025-04-03': '兒童節', '2025-04-04': '清明節', '2025-05-01': '勞動節',
    '2025-05-30': '端午節', '2025-05-31': '端午節', '2025-06-01': '端午節',
    '2025-10-06': '中秋節', '2025-10-10': '國慶日',
    '2026-01-01': '元旦', '2026-01-02': '元旦補假',
    '2026-02-16': '農曆春節', '2026-02-17': '農曆除夕', '2026-02-18': '農曆春節',
    '2026-02-19': '農曆春節', '2026-02-20': '農曆春節', '2026-02-21': '農曆春節',
    '2026-02-22': '農曆春節', '2026-02-27': '和平紀念日',
    '2026-04-03': '兒童節', '2026-04-04': '清明節', '2026-04-05': '清明節',
    '2026-05-01': '勞動節', '2026-06-19': '端午節',
    '2026-09-25': '中秋節', '2026-10-09': '國慶日', '2026-10-10': '國慶日',
    '2027-02-05': '農曆春節', '2027-02-06': '農曆春節', '2027-02-07': '農曆春節',
    '2027-02-08': '農曆除夕', '2027-02-09': '農曆春節', '2027-02-10': '農曆春節',
    '2027-02-11': '農曆春節', '2027-02-12': '農曆春節', '2027-02-13': '農曆春節',
    '2027-02-16': '和平紀念日', '2027-04-04': '兒童節/清明節', '2027-04-05': '清明節',
    '2027-05-01': '勞動節', '2027-06-09': '端午節',
    '2027-09-16': '中秋節', '2027-10-10': '國慶日'
  };
  return holidayNames[dateStr] || null;
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ============ 發送記錄 ============

function getSentDates() {
  try {
    const raw = localStorage.getItem(EMAIL_SENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function markDateAsSent(dateStr) {
  const dates = getSentDates();
  if (!dates.includes(dateStr)) {
    dates.push(dateStr);
    localStorage.setItem(EMAIL_SENT_KEY, JSON.stringify(dates));
  }
}

function isDateAlreadySent(dateStr) {
  return getSentDates().includes(dateStr);
}

// ============ 郵件內容生成 ============

/**
 * 生成日報統計郵件的純文字內容
 */
function generateDailyEmailBody(date) {
  const { rows, totals } = generateDailySummary(date);
  const dateLabel = formatDate(date);
  const dayStatus = getBusinessDayStatus(date);

  // 取得總管理處數據
  const masterReport = getReport('MASTER', date);
  const masterRow = masterReport ? {
    branchName: '總管理處',
    filled: true,
    author: masterReport.author || '',
    officeQuery: masterReport.officeQuery || 0,
    registerQuery: masterReport.registerQuery || 0,
    visits: masterReport.visits || 0,
    officeRenew: masterReport.officeRenew?.count || 0,
    officeNew: masterReport.officeNew?.count || 0,
    registerNew: masterReport.registerNew || 0,
    registerRenew: masterReport.registerRenew || 0,
    signTotal: calcSignTotal(masterReport),
    officeCancel: masterReport.officeCancel?.count || 0,
    officeDeposit: masterReport.officeDeposit?.count || 0,
    occupancyRate: calcOccupancyRate(masterReport.rentedCount || 0, masterReport.totalCount || 0)
  } : {
    branchName: '總管理處',
    filled: false,
    author: '',
    officeQuery: 0, registerQuery: 0, visits: 0,
    officeRenew: 0, officeNew: 0, registerNew: 0, registerRenew: 0,
    signTotal: 0, officeCancel: 0, officeDeposit: 0, occupancyRate: 0
  };

  // 全館合計包含總管理處
  const allRows = [...rows, masterRow];
  const grandTotals = {
    officeQuery: allRows.reduce((s, r) => s + r.officeQuery, 0),
    registerQuery: allRows.reduce((s, r) => s + r.registerQuery, 0),
    visits: allRows.reduce((s, r) => s + r.visits, 0),
    officeRenew: allRows.reduce((s, r) => s + r.officeRenew, 0),
    officeNew: allRows.reduce((s, r) => s + r.officeNew, 0),
    registerNew: allRows.reduce((s, r) => s + r.registerNew, 0),
    registerRenew: allRows.reduce((s, r) => s + r.registerRenew, 0),
    signTotal: allRows.reduce((s, r) => s + r.signTotal, 0),
    officeCancel: allRows.reduce((s, r) => s + r.officeCancel, 0),
    officeDeposit: allRows.reduce((s, r) => s + r.officeDeposit, 0),
    occupancyRate: calcOccupancyRate(
      allRows.reduce((s, r) => s + (r.rentedCount || 0), 0),
      allRows.reduce((s, r) => s + (r.totalCount || 0), 0)
    )
  };

  let body = `史貝斯商務中心 日報統計表\n`;
  body += `================================\n`;
  body += `日期：${dateLabel}\n`;
  body += `狀態：${dayStatus.reason}\n`;
  body += `================================\n\n`;

  // 各館明細
  rows.forEach(r => {
    body += `【${r.branchName}】${r.filled ? '已填報' : '未填報'} ${r.filled ? '(' + r.author + ')' : ''}\n`;
    if (r.filled) {
      body += `  辦公室查詢：${r.officeQuery} | 營業登記查詢：${r.registerQuery} | 參觀：${r.visits}\n`;
      body += `  辦公室續約：${r.officeRenew} | 辦公室新簽：${r.officeNew}\n`;
      body += `  營業登記新簽：${r.registerNew} | 營業登記續約：${r.registerRenew}\n`;
      body += `  退租：${r.officeCancel} | 付定：${r.officeDeposit} | 出租率：${r.occupancyRate}%\n`;
    }
    body += `\n`;
  });

  // 總管理處
  body += `【總管理處】${masterRow.filled ? '已填報' : '未填報'} ${masterRow.filled ? '(' + masterRow.author + ')' : ''}\n`;
  if (masterRow.filled) {
    body += `  辦公室查詢：${masterRow.officeQuery} | 營業登記查詢：${masterRow.registerQuery} | 參觀：${masterRow.visits}\n`;
    body += `  辦公室續約：${masterRow.officeRenew} | 辦公室新簽：${masterRow.officeNew}\n`;
    body += `  營業登記新簽：${masterRow.registerNew} | 營業登記續約：${masterRow.registerRenew}\n`;
    body += `  退租：${masterRow.officeCancel} | 付定：${masterRow.officeDeposit} | 出租率：${masterRow.occupancyRate}%\n`;
  }
  body += `\n`;

  // 全館合計
  body += `================================\n`;
  body += `【全館合計（含總管理處）】\n`;
  body += `辦公室查詢：${grandTotals.officeQuery} | 營業登記查詢：${grandTotals.registerQuery} | 參觀：${grandTotals.visits}\n`;
  body += `辦公室續約：${grandTotals.officeRenew} | 辦公室新簽：${grandTotals.officeNew}\n`;
  body += `營業登記新簽：${grandTotals.registerNew} | 營業登記續約：${grandTotals.registerRenew}\n`;
  body += `簽約合計：${grandTotals.signTotal}\n`;
  body += `退租：${grandTotals.officeCancel} | 付定：${grandTotals.officeDeposit}\n`;
  body += `平均出租率：${grandTotals.occupancyRate}%\n`;
  body += `================================\n\n`;
  body += `本郵件由史貝斯商務中心日報系統自動生成\n`;

  return body;
}

/**
 * 生成日報統計郵件的 HTML 內容
 */
function generateDailyEmailHTML(date) {
  const { rows, totals } = generateDailySummary(date);
  const dateLabel = formatDate(date);
  const dayStatus = getBusinessDayStatus(date);

  // 取得總管理處數據
  const masterReport = getReport('MASTER', date);
  const masterRow = masterReport ? {
    branchName: '總管理處',
    filled: true,
    author: masterReport.author || '',
    officeQuery: masterReport.officeQuery || 0,
    registerQuery: masterReport.registerQuery || 0,
    visits: masterReport.visits || 0,
    officeRenew: masterReport.officeRenew?.count || 0,
    officeNew: masterReport.officeNew?.count || 0,
    registerNew: masterReport.registerNew || 0,
    registerRenew: masterReport.registerRenew || 0,
    signTotal: calcSignTotal(masterReport),
    officeCancel: masterReport.officeCancel?.count || 0,
    officeDeposit: masterReport.officeDeposit?.count || 0,
    occupancyRate: calcOccupancyRate(masterReport.rentedCount || 0, masterReport.totalCount || 0)
  } : {
    branchName: '總管理處',
    filled: false,
    author: '',
    officeQuery: 0, registerQuery: 0, visits: 0,
    officeRenew: 0, officeNew: 0, registerNew: 0, registerRenew: 0,
    signTotal: 0, officeCancel: 0, officeDeposit: 0, occupancyRate: 0
  };

  // 全館合計包含總管理處
  const allRows = [...rows, masterRow];
  const grandTotals = {
    officeQuery: allRows.reduce((s, r) => s + r.officeQuery, 0),
    registerQuery: allRows.reduce((s, r) => s + r.registerQuery, 0),
    visits: allRows.reduce((s, r) => s + r.visits, 0),
    officeRenew: allRows.reduce((s, r) => s + r.officeRenew, 0),
    officeNew: allRows.reduce((s, r) => s + r.officeNew, 0),
    registerNew: allRows.reduce((s, r) => s + r.registerNew, 0),
    registerRenew: allRows.reduce((s, r) => s + r.registerRenew, 0),
    signTotal: allRows.reduce((s, r) => s + r.signTotal, 0),
    officeCancel: allRows.reduce((s, r) => s + r.officeCancel, 0),
    officeDeposit: allRows.reduce((s, r) => s + r.officeDeposit, 0),
    occupancyRate: calcOccupancyRate(
      allRows.reduce((s, r) => s + (r.rentedCount || 0), 0),
      allRows.reduce((s, r) => s + (r.totalCount || 0), 0)
    )
  };

  let filledCount = allRows.filter(r => r.filled).length;
  let totalCount = allRows.length;

  let html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Microsoft JhengHei',sans-serif; color:#333; line-height:1.6;">
  <div style="max-width:700px; margin:0 auto;">
    <div style="background:linear-gradient(135deg,#7c3aed,#a855f7); color:#fff; padding:20px; border-radius:12px 12px 0 0;">
      <h2 style="margin:0; font-size:20px;">史貝斯商務中心 日報統計表</h2>
      <p style="margin:5px 0 0; opacity:0.9; font-size:14px;">${dateLabel} | ${dayStatus.reason} | 已填報 ${filledCount}/${totalCount} 館（含總管理處）</p>
    </div>
    <div style="background:#fff; padding:20px; border:1px solid #e5e7eb; border-top:none;">
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <thead>
          <tr style="background:#f3e8ff;">
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:left;">館別</th>
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:center;">狀態</th>
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:left;">填表人</th>
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:center;">辦公室查詢</th>
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:center;">營登查詢</th>
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:center;">參觀</th>
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:center;">簽約合計</th>
            <th style="padding:8px; border:1px solid #d8b4fe; text-align:center;">出租率</th>
          </tr>
        </thead>
        <tbody>`;

  rows.forEach(r => {
    const statusColor = r.filled ? '#16a34a' : '#dc2626';
    const statusBg = r.filled ? '#dcfce7' : '#fee2e2';
    const statusLabel = r.filled ? '已填報' : '未填報';
    html += `
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px; border:1px solid #f3f4f6; font-weight:600;">${r.branchName}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;"><span style="background:${statusBg}; color:${statusColor}; padding:2px 8px; border-radius:10px; font-size:12px; font-weight:600;">${statusLabel}</span></td>
            <td style="padding:8px; border:1px solid #f3f4f6;">${r.author || '-'}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;">${r.officeQuery}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;">${r.registerQuery}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;">${r.visits}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center; font-weight:700;">${r.signTotal}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center; font-weight:600; color:${r.occupancyRate >= 80 ? '#16a34a' : r.occupancyRate >= 50 ? '#ca8a04' : '#dc2626'};">${r.occupancyRate}%</td>
          </tr>`;
  });

  // 總管理處行
  const mStatusColor = masterRow.filled ? '#16a34a' : '#dc2626';
  const mStatusBg = masterRow.filled ? '#dcfce7' : '#fee2e2';
  const mStatusLabel = masterRow.filled ? '已填報' : '未填報';
  html += `
          <tr style="border-bottom:1px solid #f3f4f6; background:#f0f9ff;">
            <td style="padding:8px; border:1px solid #f3f4f6; font-weight:600;">🏢 總管理處</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;"><span style="background:${mStatusBg}; color:${mStatusColor}; padding:2px 8px; border-radius:10px; font-size:12px; font-weight:600;">${mStatusLabel}</span></td>
            <td style="padding:8px; border:1px solid #f3f4f6;">${masterRow.author || '-'}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;">${masterRow.officeQuery}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;">${masterRow.registerQuery}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center;">${masterRow.visits}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center; font-weight:700;">${masterRow.signTotal}</td>
            <td style="padding:8px; border:1px solid #f3f4f6; text-align:center; font-weight:600; color:${masterRow.occupancyRate >= 80 ? '#16a34a' : masterRow.occupancyRate >= 50 ? '#ca8a04' : '#dc2626'};">${masterRow.occupancyRate}%</td>
          </tr>`;

  html += `
          <tr style="background:#f3e8ff; font-weight:700;">
            <td style="padding:8px; border:1px solid #d8b4fe;" colspan="3">全館合計（含總管理處）</td>
            <td style="padding:8px; border:1px solid #d8b4fe; text-align:center;">${grandTotals.officeQuery}</td>
            <td style="padding:8px; border:1px solid #d8b4fe; text-align:center;">${grandTotals.registerQuery}</td>
            <td style="padding:8px; border:1px solid #d8b4fe; text-align:center;">${grandTotals.visits}</td>
            <td style="padding:8px; border:1px solid #d8b4fe; text-align:center;">${grandTotals.signTotal}</td>
            <td style="padding:8px; border:1px solid #d8b4fe; text-align:center;">${grandTotals.occupancyRate}%</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="background:#f9fafb; padding:15px 20px; border-radius:0 0 12px 12px; border:1px solid #e5e7eb; border-top:none; font-size:12px; color:#6b7280; text-align:center;">
      本郵件由史貝斯商務中心日報系統自動生成
    </div>
  </div>
</body>
</html>`;

  return html;
}

// ============ 郵件發送 ============

/**
 * 打開郵件客戶端發送日報統計
 * 使用 mailto: 協議 + body 參數
 */
function sendDailyEmail(date) {
  const dayStatus = getBusinessDayStatus(date);
  if (!dayStatus.isBusiness) {
    return { success: false, error: `今日為${dayStatus.reason}，非營業日，不發送日報統計。` };
  }

  if (isDateAlreadySent(date)) {
    return { success: false, error: `今日（${formatDate(date)}）的日報統計已發送過。`, alreadySent: true };
  }

  const subject = `${EMAIL_CONFIG.subjectPrefix} - ${formatDate(date)}`;
  const body = generateDailyEmailBody(date);

  // 生成 mailto 連結
  const mailtoLink = `mailto:${EMAIL_CONFIG.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // 嘗試打開郵件客戶端
  window.open(mailtoLink, '_blank');

  // 標記為已發送
  markDateAsSent(date);

  return { success: true, message: `已開啟郵件客戶端，請確認發送日報統計至 ${EMAIL_CONFIG.recipient}` };
}

/**
 * 取得發送按鈕的狀態資訊（用於 UI 顯示）
 */
function getEmailSendButtonStatus(date) {
  const dayStatus = getBusinessDayStatus(date);
  const alreadySent = isDateAlreadySent(date);

  if (!dayStatus.isBusiness) {
    return {
      canSend: false,
      label: `非營業日（${dayStatus.reason}）`,
      style: 'gray',
      tooltip: dayStatus.reason
    };
  }

  if (alreadySent) {
    return {
      canSend: false,
      label: '今日已發送',
      style: 'green',
      tooltip: `${formatDate(date)} 的日報統計已發送`
    };
  }

  return {
    canSend: true,
    label: '發送日報統計郵件',
    style: 'primary',
    tooltip: `發送今日日報統計至 ${EMAIL_CONFIG.recipient}`
  };
}
