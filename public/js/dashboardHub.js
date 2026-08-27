// =============================================================
// xMED - Universal Dashboard Hub Controller
// Unified Multi-Tab Modular Interface for Patient & Doctor Portals
// =============================================================

function switchDashboardTab(tabId) {
  // 1. Hide all panels
  document.querySelectorAll('.dashboard-tab-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  // 2. Remove active class from all tab buttons
  document.querySelectorAll('.liquid-tab-btn').forEach(btn => {
    btn.classList.remove('liquid-tab-active');
  });

  // 3. Show targeted panel
  const targetPanel = document.getElementById(`panel-${tabId}`);
  if (targetPanel) {
    targetPanel.classList.remove('hidden');
    targetPanel.classList.add('animate-liquid-entrance');
  }

  // 4. Highlight active button
  const targetBtn = document.getElementById(`tab-btn-${tabId}`);
  if (targetBtn) {
    targetBtn.classList.add('liquid-tab-active');
  }

  // 5. Trigger lazy loading / component activation
  if (tabId === 'blood' && typeof loadBloodPosts === 'function') {
    loadBloodStats();
    loadBloodPosts();
  } else if (tabId === 'messages' && typeof loadConversations === 'function') {
    loadConversations();
  } else if (tabId === 'medicines') {
    loadDashboardMedicines();
  } else if (tabId === 'blogs') {
    loadDashboardBlogs();
  }
}

// Medicine Catalog Tab Loader
async function loadDashboardMedicines(query = '') {
  const container = document.getElementById('dashboard-medicines-list');
  if (!container) return;

  container.innerHTML = `
    <div class="p-8 text-center text-xs text-slate-400">
      <span class="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping inline-block mr-2"></span>
      Searching medicine dictionary & Bangladesh Govt Essential Formulary...
    </div>
  `;

  try {
    let url = '/api/drugs/government-essential';
    if (query && query.trim()) {
      url += `?search=${encodeURIComponent(query.trim())}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-xs text-slate-400">
          No matching medicines found. Try another generic name or therapeutic category.
        </div>
      `;
      return;
    }

    container.innerHTML = result.data.slice(0, 30).map(med => `
      <div class="p-4 rounded-2xl liquid-card liquid-hover flex items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold text-teal-400">${med.id || 'EDCL'}</span>
            <strong class="text-sm text-slate-100">${med.brand_name}</strong>
            ${med.is_emergency ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold blood-badge-emergency">Emergency</span>' : ''}
          </div>
          <p class="text-xs text-slate-300">
            ${med.generic_name} • <span class="text-slate-400">${med.dosage_form || 'Solid/Liquid'}</span>
          </p>
          <p class="text-[11px] text-slate-400">
            Facility: <strong>${med.facility_tier || 'Upazila & District'}</strong> • Cat: ${med.category || 'General'}
          </p>
        </div>
        <div class="text-right flex-shrink-0">
          <span class="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ${med.price || '৳0.00 Free'}
          </span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('[DashboardHub] Error loading medicines:', err);
    container.innerHTML = `<div class="p-4 text-center text-xs text-rose-400">Failed to load medicines list.</div>`;
  }
}

// Health Blog Articles Tab Loader
async function loadDashboardBlogs(query = '') {
  const container = document.getElementById('dashboard-blogs-grid');
  if (!container) return;

  container.innerHTML = `
    <div class="col-span-full p-8 text-center text-xs text-slate-400">
      <span class="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping inline-block mr-2"></span>
      Retrieving doctor-authored clinical insights & community blogs...
    </div>
  `;

  try {
    let url = '/api/blogs';
    if (query && query.trim()) {
      url += `?search=${encodeURIComponent(query.trim())}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    if (!result.success || !result.blogs || result.blogs.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center text-xs text-slate-400">
          No clinical articles found.
        </div>
      `;
      return;
    }

    container.innerHTML = result.blogs.map(blog => `
      <div class="liquid-card p-6 liquid-hover flex flex-col justify-between space-y-4">
        <div class="space-y-2.5">
          <div class="flex items-center justify-between text-xs">
            <span class="px-2.5 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px]">
              ${blog.category || 'Clinical Medicine'}
            </span>
            <span class="text-slate-400 font-mono text-[11px]">${blog.read_time || '3 min read'}</span>
          </div>

          <h4 class="text-base font-black text-slate-100 leading-snug hover:text-teal-400 transition-colors">
            ${blog.title}
          </h4>

          <p class="text-xs text-slate-300 leading-relaxed line-clamp-3">
            ${blog.summary || blog.content.slice(0, 180)}...
          </p>
        </div>

        <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div>
            <div class="font-bold text-slate-200">${blog.author_name || 'Verified Physician'}</div>
            <div class="text-[10px] text-slate-400">${blog.author_specialization || 'Consultant'}</div>
          </div>
          <button type="button" onclick="viewArticleDetail(${blog.blog_id})" class="text-teal-400 font-bold hover:underline flex items-center gap-1">
            <span>Read</span> &rarr;
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('[DashboardHub] Error loading blogs:', err);
    container.innerHTML = `<div class="col-span-full p-4 text-center text-xs text-rose-400">Failed to load articles.</div>`;
  }
}

async function viewArticleDetail(blogId) {
  try {
    const res = await fetch(`/api/blogs/${blogId}`);
    const result = await res.json();
    if (result.success && result.blog) {
      const b = result.blog;
      const modal = document.getElementById('blog-detail-modal');
      const titleEl = document.getElementById('blog-detail-title');
      const metaEl = document.getElementById('blog-detail-meta');
      const contentEl = document.getElementById('blog-detail-content');

      if (titleEl) titleEl.textContent = b.title;
      if (metaEl) metaEl.textContent = `${b.author_name} • ${b.author_specialization || ''} • ${b.category}`;
      if (contentEl) contentEl.innerHTML = `<p class="whitespace-pre-line text-xs sm:text-sm leading-relaxed">${b.content}</p>`;
      if (modal) modal.classList.remove('hidden');
    }
  } catch (err) {
    alert('Could not load article detail.');
  }
}

function closeBlogDetailModal() {
  const modal = document.getElementById('blog-detail-modal');
  if (modal) modal.classList.add('hidden');
}

// Attach listener to search inputs
document.addEventListener('DOMContentLoaded', () => {
  const medSearch = document.getElementById('dashboard-med-search');
  if (medSearch) {
    let timer;
    medSearch.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadDashboardMedicines(medSearch.value), 350);
    });
  }

  const blogSearch = document.getElementById('dashboard-blog-search');
  if (blogSearch) {
    let timer;
    blogSearch.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => loadDashboardBlogs(blogSearch.value), 350);
    });
  }
});
