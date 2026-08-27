// =============================================================
// xMED - Blood Donation & Request Exchange Client Script
// Life-Saving Voluntary Community Blood Bank
// =============================================================

let activeBloodType = '';
let activeBloodGroup = '';
let activeUrgency = '';

async function loadBloodStats() {
  try {
    const res = await fetch('/api/blood/stats');
    const data = await res.json();
    if (data.success && data.data) {
      const stats = data.data;
      const donorsEl = document.getElementById('stat-active-donors');
      const requestsEl = document.getElementById('stat-pending-requests');
      const emergenciesEl = document.getElementById('stat-critical-emergencies');
      const fulfilledEl = document.getElementById('stat-fulfilled-donations');

      if (donorsEl) donorsEl.textContent = stats.active_donors || 0;
      if (requestsEl) requestsEl.textContent = stats.pending_requests || 0;
      if (emergenciesEl) emergenciesEl.textContent = stats.critical_emergencies || 0;
      if (fulfilledEl) fulfilledEl.textContent = stats.fulfilled_donations || 0;
    }
  } catch (err) {
    console.warn('[BloodExchange] Could not load stats:', err.message);
  }
}

async function loadBloodPosts() {
  const container = document.getElementById('blood-posts-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full text-center py-12">
      <div class="inline-flex items-center gap-2 text-slate-400 text-xs">
        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
        Synchronizing National Blood Exchange records...
      </div>
    </div>
  `;

  try {
    let url = '/api/blood/posts?status=OPEN';
    if (activeBloodType) url += `&type=${encodeURIComponent(activeBloodType)}`;
    if (activeBloodGroup) url += `&blood_group=${encodeURIComponent(activeBloodGroup)}`;
    if (activeUrgency) url += `&urgency=${encodeURIComponent(activeUrgency)}`;

    const areaInput = document.getElementById('blood-search-area');
    if (areaInput && areaInput.value.trim()) {
      url += `&area=${encodeURIComponent(areaInput.value.trim())}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 liquid-card p-8 text-slate-400">
          <svg class="w-12 h-12 mx-auto text-slate-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          <div class="text-sm font-bold text-slate-200">No Blood Posts Found</div>
          <p class="text-xs text-slate-400 mt-1">Try adjusting the filter criteria or post a new request/donation offer.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = result.data.map(post => {
      const isRequest = post.post_type === 'REQUEST';
      const isCritical = post.urgency === 'CRITICAL_EMERGENCY';
      const isUrgent = post.urgency === 'URGENT';

      let urgencyBadge = '';
      if (isCritical) {
        urgencyBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-black blood-badge-emergency">CRITICAL EMERGENCY</span>`;
      } else if (isUrgent) {
        urgencyBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">URGENT</span>`;
      } else {
        urgencyBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/15 text-slate-300 border border-slate-500/30">ROUTINE</span>`;
      }

      const typeBadge = isRequest
        ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">BLOOD NEEDED (${post.units_needed || 1} Bag)</span>`
        : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-black blood-donor-badge">DONOR AVAILABLE</span>`;

      return `
        <div class="liquid-glass-card p-5.5 flex flex-col justify-between space-y-4 ${isCritical ? 'border-rose-500/50 shadow-rose-900/30' : ''}">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="blood-group-pill text-sm font-black">${post.blood_group}</span>
              <div class="flex items-center gap-1.5">
                ${urgencyBadge}
                ${typeBadge}
              </div>
            </div>

            <div>
              <div class="text-sm font-bold text-slate-100 flex items-center justify-between">
                <span>${post.author_name || 'Citizen Donor'}</span>
                <span class="text-[11px] font-mono text-slate-400">${post.author_uid}</span>
              </div>
              <div class="text-xs text-slate-300 flex items-center gap-1 mt-1">
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>${post.hospital_name ? `${post.hospital_name}, ` : ''}${post.area}, ${post.city}</span>
              </div>
            </div>

            ${post.hemoglobin_level ? `
              <div class="text-xs px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono inline-block">
                Hemoglobin: <strong>${post.hemoglobin_level} g/dL</strong> (Safe & Verified)
              </div>
            ` : ''}

            ${post.notes ? `
              <div class="text-xs p-3 rounded-2xl bg-black/20 border border-white/10 text-slate-200 leading-relaxed italic">
                "${post.notes}"
              </div>
            ` : ''}
          </div>

          <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
            <a href="tel:${post.contact_phone}" class="btn-liquid-primary py-2 px-3 text-xs flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              <span>Call ${post.contact_phone}</span>
            </a>

            <button type="button" onclick="startDirectChat('${post.author_uid}', '${post.author_name}')" class="btn-liquid-secondary py-2 px-3 text-xs flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
              <span>Message</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('[BloodExchange] Error loading posts:', err);
    container.innerHTML = `
      <div class="col-span-full text-center py-8 text-rose-400 text-xs">
        Failed to retrieve blood exchange records.
      </div>
    `;
  }
}

function setBloodFilter(type, btn) {
  activeBloodType = type;
  document.querySelectorAll('.btn-blood-type-filter').forEach(b => {
    b.classList.remove('liquid-tab-active');
    b.classList.add('opacity-70');
  });
  if (btn) {
    btn.classList.add('liquid-tab-active');
    btn.classList.remove('opacity-70');
  }
  loadBloodPosts();
}

function setBloodGroupFilter(group) {
  activeBloodGroup = group;
  loadBloodPosts();
}

async function handlePublishBloodPost(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorAlert = document.getElementById('blood-modal-error');
  if (errorAlert) errorAlert.classList.add('hidden');

  const payload = {
    post_type: form.post_type.value,
    blood_group: form.blood_group.value,
    hemoglobin_level: form.hemoglobin_level.value ? parseFloat(form.hemoglobin_level.value) : null,
    units_needed: form.units_needed ? parseInt(form.units_needed.value, 10) : 1,
    area: form.area.value.trim(),
    city: form.city.value.trim() || 'Dhaka',
    hospital_name: form.hospital_name ? form.hospital_name.value.trim() : null,
    urgency: form.urgency.value,
    contact_phone: form.contact_phone.value.trim(),
    notes: form.notes.value.trim()
  };

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    if (submitBtn) submitBtn.disabled = true;
    const res = await fetch('/api/blood/posts', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.message || 'Could not publish blood post.');
    }

    form.reset();
    closeBloodModal();
    loadBloodStats();
    loadBloodPosts();
  } catch (err) {
    if (errorAlert) {
      errorAlert.textContent = err.message;
      errorAlert.classList.remove('hidden');
    } else {
      alert(err.message);
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function startDirectChat(authorUid, authorName) {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) {
    showLoginRequiredModal('To send a direct message to this donor or requester, please sign in with your xMED account.');
    return;
  }

  // If in dashboard, switch to messages tab and open thread
  if (typeof switchDashboardTab === 'function') {
    switchDashboardTab('messages');
    if (typeof openChatThread === 'function') {
      openChatThread(authorUid, authorName);
    }
  } else {
    // If on public landing page or public blood page, redirect to dashboard
    window.location.href = '/patient-dashboard?tab=messages&chatWith=' + encodeURIComponent(authorUid);
  }
}

function openBloodModal() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) {
    showLoginRequiredModal('To create a blood request or register as a blood donor, please sign in with your verified xMED account.');
    return;
  }
  const modal = document.getElementById('blood-post-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeBloodModal() {
  const modal = document.getElementById('blood-post-modal');
  if (modal) modal.classList.add('hidden');
}

function showLoginRequiredModal(customMessage) {
  let modal = document.getElementById('liquid-login-required-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'liquid-login-required-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in';
    modal.innerHTML = `
      <div class="liquid-glass-panel p-6 sm:p-8 max-w-md w-full relative space-y-5 text-center">
        <div class="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border border-emerald-500/40 flex items-center justify-center text-3xl shadow-lg">
          🔒
        </div>
        <div class="space-y-1.5">
          <h3 class="text-xl font-black text-slate-100 tracking-tight">Authentication Required</h3>
          <p id="liquid-login-required-msg" class="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
            ${customMessage || 'To request or offer blood, or to message donors directly, please sign in to your xMED account.'}
          </p>
        </div>
        <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 text-left space-y-1">
          <div class="font-bold flex items-center gap-1.5">
            <span>🛡️</span> <span>Public Transparency Notice</span>
          </div>
          <p class="text-slate-300">
            Anyone can freely view, filter, and call emergency contact numbers directly without an account. Posting and messaging require verified authentication to protect clinical safety.
          </p>
        </div>
        <div class="flex gap-2 pt-2">
          <button type="button" onclick="closeLoginRequiredModal()" class="btn-liquid-secondary flex-1 py-3 text-xs font-semibold rounded-xl">
            Dismiss
          </button>
          <a href="/login" class="btn-liquid-primary flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
            <span>Sign In</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    const msgEl = document.getElementById('liquid-login-required-msg');
    if (msgEl && customMessage) msgEl.textContent = customMessage;
    modal.classList.remove('hidden');
  }
}

function closeLoginRequiredModal() {
  const modal = document.getElementById('liquid-login-required-modal');
  if (modal) modal.classList.add('hidden');
}

// Initializer
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('blood-posts-grid')) {
    loadBloodStats();
    loadBloodPosts();

    const areaInput = document.getElementById('blood-search-area');
    if (areaInput) {
      let debounceTimer;
      areaInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(loadBloodPosts, 350);
      });
    }

    const bloodForm = document.getElementById('form-create-blood-post');
    if (bloodForm) {
      bloodForm.addEventListener('submit', handlePublishBloodPost);
    }
  }
});
