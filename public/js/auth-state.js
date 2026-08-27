// =============================================================
// xMED Global Authentication State Engine & Navigation Dock
// File: public/js/auth-state.js
// Designed by F'Studio
// =============================================================

(function () {
  'use strict';

  const AuthState = {
    user: null,
    token: null,
    isInitialized: false,

    // 1. Initialize Auth State on Page Load
    init: async function () {
      if (this.isInitialized) return;
      this.isInitialized = true;

      // First check cached local session for instant zero-flicker render
      this.token = this.getCachedToken();
      this.user = this.getCachedUser();

      if (this.user) {
        this.renderNavBar(this.user);
      } else {
        this.renderPublicNav();
      }

      // Concurrently verify with the backend probe GET /api/auth/me
      await this.verifySession();

      // Listen for cross-tab storage changes
      this.setupCrossTabSync();
    },

    // Retrieve cached token across supported keys
    getCachedToken: function () {
      return localStorage.getItem('xmed_token') || localStorage.getItem('token') || null;
    },

    // Retrieve cached user object across supported keys
    getCachedUser: function () {
      try {
        const raw = localStorage.getItem('xmed_user') || localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    // Save session to localStorage and cookie
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
      
      // Notify other tabs
      localStorage.setItem('xmed_auth_ping', Date.now().toString());
      this.renderNavBar(user);
    },

    // Probe the backend to verify token authenticity and validity
    verifySession: async function () {
      try {
        const headers = { 'Accept': 'application/json' };
        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const res = await fetch('/api/auth/me', {
          method: 'GET',
          headers,
          credentials: 'same-origin'
        });

        if (!res.ok) {
          this.clearLocalSession();
          this.renderPublicNav();
          return;
        }

        const data = await res.json();
        if (data.authenticated && data.user) {
          this.user = data.user;
          // Synchronize cached user with fresh server details
          localStorage.setItem('xmed_user', JSON.stringify(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));
          if (data.user.uid) {
            localStorage.setItem('user_uid', data.user.uid);
          }
          this.renderNavBar(data.user);
        } else {
          // Server says not authenticated; clear stale client storage
          if (this.user) {
            this.clearLocalSession();
            this.renderPublicNav();
          }
        }
      } catch (err) {
        console.warn('[AuthState] Session probe network notice:', err.message);
      }
    },

    // Purely clears client-side cache
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

    // Execute full logout
    logout: async function () {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin'
        }).catch(() => {});
      } catch (e) {}

      this.clearLocalSession();
      // Notify other open tabs
      localStorage.setItem('xmed_auth_ping', 'logout_' + Date.now());

      if (typeof window.showToast === 'function') {
        window.showToast('You have been logged out successfully.', 'info');
      }

      // If on protected dashboard, redirect to home
      const path = window.location.pathname;
      if (path.includes('dashboard')) {
        window.location.href = '/';
      } else {
        this.renderPublicNav();
      }
    },

    // Setup cross-tab sync via browser StorageEvent
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

    // Helper to get user initials
    getInitials: function (name) {
      if (!name) return 'XM';
      const clean = name.replace(/^Dr\.\s*/i, '').trim();
      const parts = clean.split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    },

    // Render Authenticated Apple Liquid Glass User Profile Pill
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
          <!-- Apple Liquid Glass Profile Pill -->
          <div class="liquid-glass-dock px-3 py-1.5 flex items-center gap-3 border border-white/20 shadow-lg">
            <!-- User Avatar Bubble -->
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr ${isDoctor ? 'from-teal-500 to-emerald-600' : 'from-sky-500 to-teal-500'} flex items-center justify-center font-bold text-white text-xs shadow-sm flex-shrink-0 border border-white/30">
              ${initials}
            </div>

            <!-- Identity Info -->
            <div class="hidden sm:flex flex-col text-left leading-tight pr-1">
              <span class="text-xs font-bold text-slate-100 truncate max-w-[130px]" title="${displayName}">
                ${isDoctor ? 'Dr. ' : ''}${shortName}
              </span>
              <span class="text-[10px] font-mono text-teal-400 font-semibold truncate max-w-[130px]">
                ${roleBadge} &bull; ${identifier}
              </span>
            </div>

            <!-- Quick Dashboard Jump -->
            <a href="${dashboardUrl}" class="btn-liquid-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 rounded-full shadow-sm">
              <span>Dashboard</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </a>

            <!-- Logout Button -->
            <button type="button" onclick="AuthState.logout()" title="Sign Out of Session" class="w-8 h-8 rounded-full bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
              </svg>
            </button>
          </div>
        </div>
      `;
    },

    // Render Public Unauthenticated Actions
    renderPublicNav: function () {
      const container = document.getElementById('navbar-auth-actions');
      if (!container) return;

      container.innerHTML = `
        <div class="flex items-center gap-2.5">
          <a href="/login" class="nav-signin-btn px-4 py-2 rounded-xl text-xs font-bold transition-all">
            Sign In
          </a>
          <a href="/register" class="nav-register-btn px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg transition-all">
            Get Citizen UID
          </a>
        </div>
      `;
    }
  };

  // Expose globally
  window.AuthState = AuthState;

  // Auto-run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthState.init());
  } else {
    AuthState.init();
  }
})();
