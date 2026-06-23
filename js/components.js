// ============ 共享 UI 組件 ============

// 返回按鈕
function BackButton(to = '#') {
  return `<a href="${to}" class="inline-flex items-center gap-2 text-purple-700 hover:text-purple-900 font-medium transition-colors no-underline">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
    返回首頁
  </a>`;
}

// 頁面標題
function PageHeader(title, subtitle = '') {
  return `
    <div class="bg-gradient-to-r from-purple-600 via-purple-500 to-fuchsia-500 text-white px-4 py-6 shadow-lg">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">${escapeHtml(title)}</h1>
        ${subtitle ? `<p class="text-purple-100 mt-1 text-sm md:text-base">${escapeHtml(subtitle)}</p>` : ''}
      </div>
    </div>
  `;
}

// 館別標識顏色
function branchColorClass(city) {
  if (city === '台中') return 'border-l-4 border-purple-500';
  if (city === '台北') return 'border-l-4 border-blue-500';
  return 'border-l-4 border-emerald-500';
}

// 統計卡片
function StatCard(label, value, unit = '', color = 'purple') {
  const colors = {
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };
  return `
    <div class="bg-white rounded-2xl p-5 shadow-lg shadow-gray-100/50 border border-gray-100">
      <div class="text-sm text-gray-500 mb-1">${escapeHtml(label)}</div>
      <div class="text-3xl font-bold bg-gradient-to-r ${colors[color] || colors.purple} bg-clip-text text-transparent stat-number">
        ${value}<span class="text-lg ml-1">${escapeHtml(unit)}</span>
      </div>
    </div>
  `;
}

// 空狀態
function EmptyState(message) {
  return `
    <div class="text-center py-16 text-gray-400">
      <svg class="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
      <p class="text-lg">${escapeHtml(message)}</p>
    </div>
  `;
}

// 加載中
function LoadingSpinner() {
  return `
    <div class="flex items-center justify-center py-12">
      <div class="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
    </div>
  `;
}

// 表單區塊標題
function SectionTitle(icon, title) {
  return `
    <div class="flex items-center gap-2 mb-4 pb-2 border-b border-purple-100">
      <span class="text-xl">${icon}</span>
      <h3 class="text-lg font-bold section-title">${escapeHtml(title)}</h3>
    </div>
  `;
}

// 數字輸入組
function NumberInput(label, name, value = 0, placeholder = '0') {
  return `
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">${escapeHtml(label)}</label>
      <input type="number" name="${name}" value="${value}" min="0" placeholder="${placeholder}"
        class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-xl font-semibold text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[56px] touch-manipulation">
    </div>
  `;
}

// 房號輸入組
// countLabel: 自訂「間數」欄位的標籤文字，預設為「間數」
function RoomInput(label, name, countValue = 0, roomsValue = '', countLabel = '間數') {
  return `
    <div class="grid grid-cols-[1fr_2fr] gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">${escapeHtml(countLabel)}</label>
        <input type="number" name="${name}Count" value="${countValue}" min="0" placeholder="0"
          class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[52px]">
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-500 mb-1">房號（逗號分隔）</label>
        <input type="text" name="${name}Rooms" value="${escapeHtml(roomsValue)}" placeholder="如: A01, A02"
          class="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all min-h-[52px]">
      </div>
    </div>
  `;
}

// 確認刪除模態框
function DeleteConfirmModal(onConfirm, onCancel) {
  const id = 'delete-modal';
  return `
    <div id="${id}" class="fixed inset-0 modal-overlay z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 page-enter">
        <div class="text-center mb-6">
          <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-1">確認刪除</h3>
          <p class="text-gray-500 text-sm">刪除後無法恢復，確定要刪除嗎？</p>
        </div>
        <div class="flex gap-3">
          <button id="cancel-delete" class="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all">取消</button>
          <button id="confirm-delete" class="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all">確定刪除</button>
        </div>
      </div>
    </div>
  `;
}

// 綁定刪除確認事件
function bindDeleteModal(onConfirm) {
  document.getElementById('cancel-delete')?.addEventListener('click', () => {
    document.getElementById('delete-modal')?.remove();
  });
  document.getElementById('confirm-delete')?.addEventListener('click', () => {
    onConfirm();
    document.getElementById('delete-modal')?.remove();
  });
}