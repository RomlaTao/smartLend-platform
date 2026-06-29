/**
 * Header dùng chung: logo, tên trang (mặc định lấy từ document.title), thanh tìm kiếm (cạnh avatar), avatar.
 * Cách dùng: thêm <div id="app-header"></div> trên trang, rồi renderHeader(..., { searchPlaceholder, onSearch }).
 * Tên trang hiển thị = options.pageName nếu có, không thì dùng document.title.
 */
import { clearAuth, LOGIN_URL, PROFILE_URL, getStoredEmail } from '../utils/auth.js';

const DEFAULT_OPTIONS = {
  logoHref: '/index.html',
  logoText: 'SmartLend',
  pageName: null,
  searchPlaceholder: 'Tìm kiếm...',
  onSearch: null,
  userEmail: null,
  userAvatarUrl: null,
  /** HTML string rendered between search and avatar (e.g. action buttons) */
  actionsHtml: null,
};

/**
 * Render header vào container và gắn sự kiện.
 * @param {HTMLElement} container - Phần tử chứa header (vd document.getElementById('app-header'))
 * @param {Object} [options] - logoHref, logoText, pageName (mặc định = document.title), searchPlaceholder, onSearch(q), ...
 */
export function renderHeader(container, options = {}) {
  if (!container) return;
  
  // Cleanup previous event listeners if exists
  if (typeof container._headerCleanup === 'function') {
    container._headerCleanup();
  }
  
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const email = opts.userEmail ?? getStoredEmail();
  const avatarUrl = opts.userAvatarUrl || '';
  const pageName = opts.pageName != null && opts.pageName !== '' ? opts.pageName : (document.title || '');
  const pageNameHtml = pageName
    ? `<span class="shared-header-page-name text-black dark:text-white font-bold truncate border-l border-gray-200 dark:border-gray-600 pl-4 ml-1">${escapeHtml(pageName)}</span>`
    : '';

  container.innerHTML = `
    <header class="shared-header flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 lg:px-8 py-3 sticky top-0 z-50 dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-center min-w-0 shrink-0">
        <a href="${opts.logoHref}" class="flex items-center text-primary shrink-0" aria-label="${escapeHtml(opts.logoText)}">
          <span class="shared-header-logo flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-white">
            <span class="material-symbols-outlined text-xl">account_balance</span>
          </span>
        </a>
        ${pageNameHtml}
      </div>
      <div class="flex items-center gap-3 shrink-0 flex-1 justify-end min-w-0">
        <label class="hidden sm:flex items-center gap-2 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 w-40 lg:w-56 min-w-0">
          <span class="material-symbols-outlined text-gray-500 text-xl shrink-0">search</span>
          <input type="search" 
                 class="shared-header-search flex-1 min-w-0 bg-transparent border-none text-sm font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0" 
                 placeholder="${escapeHtml(opts.searchPlaceholder)}" 
                 autocomplete="off"/>
        </label>
        ${opts.actionsHtml ? `<div class="shared-header-actions shrink-0">${opts.actionsHtml}</div>` : ''}
        <div class="relative shared-header-avatar-wrap">
          <button type="button" 
                  class="shared-header-avatar flex items-center justify-center w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-primary/10 text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label="Menu tài khoản"
                  title="${escapeHtml(email || 'Tài khoản')}">
            ${avatarUrl
              ? `<img src="${escapeHtml(avatarUrl)}" alt="" class="w-full h-full object-cover"/>`
              : `<span class="material-symbols-outlined text-2xl">person</span>`
            }
          </button>
          <div class="shared-header-dropdown hidden absolute right-0 top-full mt-1 py-1 w-48 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
            <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 truncate">${escapeHtml(email || 'Đã đăng nhập')}</div>
            <a href="${PROFILE_URL}" class="shared-header-profile flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              <span class="material-symbols-outlined text-lg">person</span>
              Xem hồ sơ
            </a>
            <button type="button" class="shared-header-logout flex items-center gap-2 w-full px-4 py-2.5 text-sm font-semibold text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              <span class="material-symbols-outlined text-lg">logout</span>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  `;

  const searchInput = container.querySelector('.shared-header-search');
  const avatarBtn = container.querySelector('.shared-header-avatar');
  const dropdown = container.querySelector('.shared-header-dropdown');
  const logoutBtn = container.querySelector('.shared-header-logout');
  const profileLink = container.querySelector('.shared-header-profile');

  if (searchInput && typeof opts.onSearch === 'function') {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => opts.onSearch(searchInput.value.trim()), 200);
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') opts.onSearch(searchInput.value.trim());
    });
  }

  function toggleDropdown() {
    dropdown?.classList.toggle('hidden');
  }

  function closeDropdown() {
    dropdown?.classList.add('hidden');
  }

  // Close dropdown when clicking outside
  function handleDocumentClick(e) {
    if (!dropdown?.contains(e.target) && !avatarBtn?.contains(e.target)) {
      closeDropdown();
    }
  }

  // Avatar button click handler
  if (avatarBtn) {
    avatarBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDropdown();
    });
  }

  // Logout button click handler
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDropdown();
      clearAuth();
      window.location.href = LOGIN_URL;
    });
  }

  // Profile link click handler
  if (profileLink) {
    profileLink.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDropdown();
    });
  }

  // Prevent dropdown from closing when clicking inside
  if (dropdown) {
    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', handleDocumentClick);

  // Store cleanup function on container for later use
  container._headerCleanup = () => {
    document.removeEventListener('click', handleDocumentClick);
  };
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
