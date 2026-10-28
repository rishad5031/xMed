(function () {

  'use strict';

  const AuthState = {

    user: null,

    token: null,

    isInitialized: false,

    /**
     * init:
     * Line-by-Line Breakdown:
     * 1. Checks if already initialized; if so, exits early.
     * 2. Sets isInitialized to true.
     * 3. Fetches cached token and user object from localStorage for zero-flicker render.
     * 4. If cached user exists, immediately renders authenticated profile capsule pill.
     *    Otherwise, renders public unauthenticated buttons ('Sign In' & 'Get Citizen UID').
     * 5. Concurrently fires background verification request GET /api/auth/me to confirm validity with server.
     * 6. Attaches cross-tab storage event listeners so login/logout in one tab syncs across all tabs.
     */
    init: async function () {
      if (this.isInitialized) return;
      this.isInitialized = true;

      this.token = this.getCachedToken();
      this.user = this.getCachedUser();

      if (this.user) {
        this.renderNavBar(this.user);
      } else {
        this.renderPublicNav();
      }

      await this.verifySession();

      this.setupCrossTabSync();
    },

    getCachedToken: function () {
      return localStorage.getItem('xmed_token') || localStorage.getItem('token') || null;
    },

    getCachedUser: function () {
      try {
        const raw = localStorage.getItem('xmed_user') || localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    /**
     * setSession:
     * Saves JWT token and user profile into localStorage and cookies.
     * Emits a timestamp ping to synchronize open browser tabs.
     */
    setSession: function (token, user) {
      this.token = token;
      this.user = user;

      localStorage.setItem('xmed_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('xmed_user', JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
      if (user && user.uid) {
        localStorage.setItem('user_uid', user.uid);
      }
      document.cookie = `xmed_token=${token}; path=/; max-age=604800; SameSite=Lax`;
      
      localStorage.setItem('xmed_auth_ping', Date.now().toString());

      this.renderNavBar(user);
    },

    /**
     * verifySession:
     * Queries /api/auth/me with Authorization: Bearer <token>.
     * If valid, updates local cache with latest server data.
     * If 401 or invalid, clears session and renders public navigation.
     */
    verifySession: async function () {
      try {
        if (!this.token) return;

        const headers = { 'Accept': 'application/json' };
        headers['Authorization'] = `Bearer ${this.token}`;

        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers,
          credentials: 'same-origin'
        });

        if (!res.ok) {
          if (res.status === 401) {
            this.clearLocalSession();
            this.renderPublicNav();
          }
          return;
        }

        const data = await res.json();
        if ((data.authenticated || data.success) && data.user) {
          this.user = data.user;

          localStorage.setItem('xmed_user', JSON.stringify(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));
          if (data.user.uid) {
            localStorage.setItem('user_uid', data.user.uid);
          }

          this.renderNavBar(data.user);
        } else if (data.authenticated === false) {

          this.clearLocalSession();
          this.renderPublicNav();
        }
      } catch (err) {
        console.warn('[AuthState] Session probe network notice:', err.message);
      }
    },

    clearLocalSession: function () {
      this.user = null;
      this.token = null;
      localStorage.removeItem('xmed_token');
      localStorage.removeItem('token');
      localStorage.removeItem('xmed_user');
      localStorage.removeItem('user');
      localStorage.removeItem('user_uid');
      document.cookie = 'xmed_token=; path=/; max-age=0; SameSite=Lax';
    },

    /**
     * logout:
     * Dispatches POST /api/auth/logout, clears client cache, broadcasts logout ping,
     * displays toast alert, and safely redirects to home if on protected dashboard.
     */
    logout: async function () {
      try {

        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin'
        }).catch(() => {});
      } catch (e) {}

      this.clearLocalSession();

      localStorage.setItem('xmed_auth_ping', 'logout_' + Date.now());

      if (typeof window.showToast === 'function') {
        window.showToast('You have been logged out successfully.', 'info');
      }

      const path = window.location.pathname;
      if (path.includes('dashboard')) {
        window.location.href = '/';
      } else {

        this.renderPublicNav();
      }
    },

    setupCrossTabSync: function () {
      window.addEventListener('storage', (e) => {
        if (e.key === 'xmed_auth_ping' || e.key === 'xmed_user' || e.key === 'xmed_token') {
          const freshUser = this.getCachedUser();
          this.token = this.getCachedToken();
          if (freshUser) {
            this.user = freshUser;
            this.renderNavBar(freshUser);
          } else {
            this.user = null;
            this.renderPublicNav();
            if (window.location.pathname.includes('dashboard')) {
              window.location.href = '/login';
            }
          }
        }
      });
    },

    getInitials: function (name) {
      if (!name) return 'XM';
      const clean = name.replace(/^Dr\.\s*/i, '').trim();
      const parts = clean.split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    renderNavBar: function (user) {
      const container = document.getElementById('navbar-auth-actions');
      if (!container) return;

      const isDoctor = user.role === 'doctor';
      const dashboardUrl = isDoctor ? '/doctor-dashboard' : '/patient-dashboard';
      const roleBadge = isDoctor ? 'Doctor' : 'Citizen';
      const displayName = user.full_name || user.name || (isDoctor ? 'Doctor' : 'Citizen');
      const shortName = displayName.replace(/^Dr\.\s*/i, '').split(' ')[0];
      const initials = this.getInitials(displayName);
      const identifier = user.uid || (isDoctor ? (user.license_no || `DOC-${user.doctor_id || 1}`) : 'EHR Verified');

      container.innerHTML = `
        <div class="flex items-center gap-2.5">
          <!-- User Profile Capsule Pill -->
          <div class="px-3 py-1.5 rounded-full bg-[#12161A] border border-white/20 flex items-center gap-2.5 shadow-lg">
            <!-- User Avatar Bubble -->
            <div class="w-7 h-7 rounded-full bg-gradient-to-tr ${isDoctor ? 'from-teal-500 to-emerald-600' : 'from-amber-400 to-amber-500'} flex items-center justify-center font-bold ${isDoctor ? 'text-white' : 'text-slate-950'} text-xs shadow-sm flex-shrink-0">
              ${initials}
            </div>

            <!-- Identity Info -->
            <div class="hidden sm:flex flex-col text-left leading-tight pr-1">
              <span class="text-xs font-bold text-slate-100 truncate max-w-[120px]" title="${displayName}">
                ${isDoctor ? 'Dr. ' : ''}${shortName}
              </span>
              <span class="text-[10px] font-mono text-emerald-400 font-semibold truncate max-w-[120px]">
                ${roleBadge} &bull; ${identifier}
              </span>
            </div>

            <!-- Quick Dashboard Jump -->
            <a href="${dashboardUrl}" class="px-3 py-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-full flex items-center gap-1 shadow-sm transition-all">
              <span>Dashboard</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </a>

            <!-- Logout Button -->
            <button type="button" onclick="AuthState.logout()" title="Sign Out of Session" class="w-7 h-7 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      `;

      const clinicalLoginLinks = document.querySelectorAll('nav a[href="/login"], nav a[href="/doctor-dashboard"], nav a[href="/patient-dashboard"]');
      clinicalLoginLinks.forEach(link => {
        link.textContent = isDoctor ? 'Doctor Workspace' : 'Citizen Dashboard';
        link.href = dashboardUrl;
      });
    },

    renderPublicNav: function () {
      const container = document.getElementById('navbar-auth-actions');
      if (!container) return;

      container.innerHTML = `
        <div class="flex items-center gap-2.5">
          <a href="/login" class="brand-outline-pill px-4 py-2 text-xs font-bold transition-all">
            Sign In
          </a>
          <a href="/register" class="px-4 sm:px-5 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold shadow-[0_0_18px_rgba(251,191,36,0.35)] transition-all">
            Get Citizen UID
          </a>
        </div>
      `;

      const clinicalLoginLinks = document.querySelectorAll('nav a[href="/doctor-dashboard"], nav a[href="/patient-dashboard"]');
      clinicalLoginLinks.forEach(link => {
        link.textContent = 'Clinical Login';
        link.href = '/login';
      });
    }
  };

  window.AuthState = AuthState;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthState.init());
  } else {
    AuthState.init();
  }
})();
