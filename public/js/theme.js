// =============================================================
// xMED Global Theme & Fluid Magnetic Cursor Aura Engine
// =============================================================

// 1. Theme Management (Light / Dark)
(function initTheme() {
  const savedTheme = localStorage.getItem('xmed_theme') || 'dark';
  applyTheme(savedTheme);
})();

function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.classList.add('light');
    html.classList.remove('dark');
    html.setAttribute('data-theme', 'light');
  } else {
    html.classList.add('dark');
    html.classList.remove('light');
    html.setAttribute('data-theme', 'dark');
  }
  localStorage.setItem('xmed_theme', theme);
  updateThemeToggleButtons(theme);
}

function toggleTheme() {
  const current = localStorage.getItem('xmed_theme') || 'dark';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

function updateThemeToggleButtons(theme) {
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    if (theme === 'light') {
      btn.innerHTML = `
        <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
      `;
      btn.setAttribute('title', 'Switch to Dark Mode');
    } else {
      btn.innerHTML = `
        <svg class="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
        </svg>
      `;
      btn.setAttribute('title', 'Switch to Light Mode');
    }
  });
}

// 2. Initialize Theme Toggle on Load
document.addEventListener('DOMContentLoaded', () => {
  // Setup theme toggle buttons
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', toggleTheme);
  });
  updateThemeToggleButtons(localStorage.getItem('xmed_theme') || 'dark');
});

// 3. Global Toast Notifications
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
  } else if (type === 'error') {
    iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
  } else {
    iconSvg = `<svg class="w-5 h-5 flex-shrink-0 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.innerHTML = `
    ${iconSvg}
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 4. Clipboard helper
function copyToClipboard(text, label = 'UID') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${label} copied to clipboard!`, 'success');
  }).catch(() => {
    showToast('Failed to copy to clipboard', 'error');
  });
}

// 5. Auth & Session Management
const Auth = {
  getToken: () => localStorage.getItem('xmed_token') || localStorage.getItem('token'),
  getUser: () => {
    try {
      const u = localStorage.getItem('xmed_user') || localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setSession: (token, user) => {
    localStorage.setItem('xmed_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('xmed_user', JSON.stringify(user));
    localStorage.setItem('user', JSON.stringify(user));
    if (user && user.uid) {
      localStorage.setItem('user_uid', user.uid);
    }
    document.cookie = `xmed_token=${token}; path=/; max-age=604800; SameSite=Lax`;
  },
  clearSession: () => {
    localStorage.removeItem('xmed_token');
    localStorage.removeItem('token');
    localStorage.removeItem('xmed_user');
    localStorage.removeItem('user');
    localStorage.removeItem('user_uid');
    document.cookie = 'xmed_token=; path=/; max-age=0; SameSite=Lax';
  },
  requireRole: (expectedRole, redirectPath = '/login') => {
    const token = Auth.getToken();
    const user = Auth.getUser();
    if (!token || !user || user.role !== expectedRole) {
      window.location.href = redirectPath;
      return false;
    }
    return true;
  }
};
