// Simple mini-window notifications & confirmations (Toast + Confirm)

function ensureContainer() {
  let container = document.getElementById('sl-toast-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'sl-toast-root';
    container.className =
      'fixed top-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, { type = 'info', duration = 3000 } = {}) {
  const container = ensureContainer();

  const colorMap = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    warning: 'bg-amber-500',
    info: 'bg-slate-800',
  };

  const bg = colorMap[type] || colorMap.info;

  const el = document.createElement('div');
  el.className = `${bg} text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 pointer-events-auto animate-fade-in`;
  el.innerHTML = `
    <span class="material-symbols-outlined text-base">
      ${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info'}
    </span>
    <span>${message}</span>
  `;

  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-1');
    setTimeout(() => {
      el.remove();
    }, 200);
  }, duration);
}

export function showConfirm(message, { confirmText = 'Confirm', cancelText = 'Cancel' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className =
      'fixed inset-0 z-[9998] flex items-center justify-center bg-black/30 backdrop-blur-sm';

    overlay.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full mx-4 p-5 border border-slate-200 dark:border-slate-700">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-2">Confirmation</h3>
        <p class="text-sm text-slate-600 dark:text-slate-300 mb-4">${message}</p>
        <div class="flex justify-end gap-2">
          <button id="sl-confirm-cancel" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700">
            ${cancelText}
          </button>
          <button id="sl-confirm-ok" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-blue-700">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

    function cleanup(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    document.body.appendChild(overlay);

    overlay.querySelector('#sl-confirm-cancel')?.addEventListener('click', () => cleanup(false));
    overlay.querySelector('#sl-confirm-ok')?.addEventListener('click', () => cleanup(true));
  });
}

