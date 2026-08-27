// =============================================================
// xMED - Official Bangladesh Government Free Essential Drugs
// Directorate General of Health Services (DGHS) & EDCL Formulary
// =============================================================

let allGovtDrugs = [];
let activeCategory = 'All';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  loadEmergencyDrugs();
  setupCatalogModal();
});

/**
 * Fetch and render the Emergency Drug highlight cards on the welcome portal.
 */
async function loadEmergencyDrugs() {
  const container = document.getElementById('emergency-drugs-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/drugs/emergency');
    const json = await res.json();

    if (!json.success || !json.data || json.data.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-8 text-slate-400 text-sm">
          Unable to load emergency formulary at this moment. Please check back shortly.
        </div>
      `;
      return;
    }

    const emergencyDrugs = json.data;
    // Highlight top 8 prominent emergency medicines
    const displayList = emergencyDrugs.slice(0, 8);

    container.innerHTML = displayList.map(drug => `
      <div class="govt-drug-card rounded-2xl p-5 border transition-all hover:scale-[1.01] flex flex-col justify-between group">
        <div class="space-y-3">
          <!-- Top Badges -->
          <div class="flex items-center justify-between gap-2">
            <span class="govt-emergency-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              Emergency Supply
            </span>
            <span class="govt-free-tag inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold font-mono">
              <svg class="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
              100% Free
            </span>
          </div>

          <!-- Drug Names -->
          <div>
            <h4 class="govt-drug-title text-base font-black tracking-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              ${escapeHtml(drug.brand_name)}
            </h4>
            <p class="govt-drug-generic text-xs font-semibold pt-0.5">
              ${escapeHtml(drug.generic_name)} &bull; <span class="font-mono text-[11px] font-bold">${escapeHtml(drug.strength)}</span>
            </p>
          </div>

          <!-- Emergency Indication Note -->
          <div class="govt-drug-indication-box p-3 rounded-xl text-xs space-y-1">
            <div class="text-[10px] uppercase font-bold tracking-wider opacity-75">Emergency Role</div>
            <p class="text-xs leading-relaxed font-medium">
              ${escapeHtml(drug.emergency_indication || 'Life-saving critical care medication')}
            </p>
          </div>
        </div>

        <!-- Card Footer -->
        <div class="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div class="text-[11px] font-medium opacity-80 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
            <span>${escapeHtml(drug.facility_tier.split('&')[0].trim())}</span>
          </div>
          <button 
            type="button" 
            onclick="viewDrugDetails('${escapeHtml(drug.id)}')"
            class="govt-inspect-btn font-bold text-xs hover:underline flex items-center gap-1">
            Details &rarr;
          </button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error rendering emergency drugs:', err);
    container.innerHTML = `
      <div class="col-span-full text-center py-6 text-slate-400 text-sm">
        Failed to load government emergency drugs. Please refresh the page.
      </div>
    `;
  }
}

/**
 * Setup handlers for the Full National Drug Catalog Modal.
 */
function setupCatalogModal() {
  const openBtn = document.getElementById('btn-expand-drug-catalog');
  const modal = document.getElementById('govt-drugs-modal');
  const closeBtn = document.getElementById('btn-close-drugs-modal');
  const searchInput = document.getElementById('drug-catalog-search');

  if (openBtn && modal) {
    openBtn.addEventListener('click', () => {
      openCatalogModal();
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      closeCatalogModal();
    });
  }

  // Backdrop click
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeCatalogModal();
      }
    });
  }

  // ESC Key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeCatalogModal();
    }
  });

  // Search input debounced
  if (searchInput) {
    let timeout = null;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        filterAndRenderCatalog();
      }, 200);
    });
  }
}

async function openCatalogModal() {
  const modal = document.getElementById('govt-drugs-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // If drugs not loaded yet, fetch full catalog
  if (allGovtDrugs.length === 0) {
    await fetchFullCatalog();
  } else {
    filterAndRenderCatalog();
  }
}

function closeCatalogModal() {
  const modal = document.getElementById('govt-drugs-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

/**
 * Fetch the complete list of 60+ government essential drugs.
 */
async function fetchFullCatalog() {
  const tableBody = document.getElementById('govt-catalog-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-12 text-slate-400 text-sm">
          <div class="inline-flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Loading official Bangladesh Government Essential Formulary...
          </div>
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('/api/drugs/government-essential');
    const json = await res.json();

    if (json.success && Array.isArray(json.data)) {
      allGovtDrugs = json.data;
      renderCategoryPills(json.categories || []);
      filterAndRenderCatalog();
    }
  } catch (e) {
    console.error('Error fetching full government drug catalog:', e);
  }
}

/**
 * Render category filter pill buttons.
 */
function renderCategoryPills(categories) {
  const pillContainer = document.getElementById('drug-category-pills');
  if (!pillContainer) return;

  const popularCategories = [
    'All',
    'Emergency & Critical Care',
    'Antibiotic',
    'Maternal & Child Health',
    'Gastrointestinal & Rehydration',
    'Respiratory',
    'Cardiovascular & Diuretics',
    'Analgesic & Antipyretic'
  ];

  pillContainer.innerHTML = popularCategories.map(cat => `
    <button 
      type="button" 
      class="drug-cat-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${cat === activeCategory ? 'drug-cat-active' : 'drug-cat-inactive'}"
      onclick="setDrugCategory('${escapeHtml(cat)}')">
      ${escapeHtml(cat)}
    </button>
  `).join('');
}

window.setDrugCategory = function(category) {
  activeCategory = category;
  // Update active pill button classes
  document.querySelectorAll('.drug-cat-pill').forEach(btn => {
    if (btn.textContent.trim() === category) {
      btn.classList.add('drug-cat-active');
      btn.classList.remove('drug-cat-inactive');
    } else {
      btn.classList.remove('drug-cat-active');
      btn.classList.add('drug-cat-inactive');
    }
  });

  filterAndRenderCatalog();
};

/**
 * Filter and render the table rows and count.
 */
function filterAndRenderCatalog() {
  const tableBody = document.getElementById('govt-catalog-table-body');
  const countBadge = document.getElementById('govt-catalog-count');
  if (!tableBody) return;

  let filtered = [...allGovtDrugs];

  if (activeCategory !== 'All') {
    filtered = filtered.filter(d => d.category.toLowerCase().includes(activeCategory.toLowerCase()));
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(d => 
      d.brand_name.toLowerCase().includes(q) ||
      d.generic_name.toLowerCase().includes(q) ||
      d.strength.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      (d.emergency_indication && d.emergency_indication.toLowerCase().includes(q))
    );
  }

  if (countBadge) {
    countBadge.textContent = `Showing ${filtered.length} of ${allGovtDrugs.length} Verified Free Medicines`;
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-10 text-slate-400 text-sm">
          No government essential drugs matched your search criteria ("${escapeHtml(searchQuery)}").
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(drug => `
    <tr class="govt-catalog-row border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <!-- ID & Status -->
      <td class="py-3.5 px-4 whitespace-nowrap">
        <span class="font-mono text-[11px] font-bold opacity-75">${escapeHtml(drug.id)}</span>
        ${drug.is_emergency ? `
          <span class="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            Emergency
          </span>
        ` : ''}
      </td>

      <!-- Brand / Official Supply Name -->
      <td class="py-3.5 px-4 font-bold text-xs">
        <div class="font-black text-slate-900 dark:text-slate-100">${escapeHtml(drug.brand_name)}</div>
        <div class="text-[11px] opacity-75 font-normal">${escapeHtml(drug.dosage_form)}</div>
      </td>

      <!-- Generic Substance & Strength -->
      <td class="py-3.5 px-4 text-xs">
        <div class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(drug.generic_name)}</div>
        <div class="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">${escapeHtml(drug.strength)}</div>
      </td>

      <!-- Therapeutic Category -->
      <td class="py-3.5 px-4 text-xs whitespace-nowrap">
        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium govt-category-badge">
          ${escapeHtml(drug.category)}
        </span>
      </td>

      <!-- Government Facility Availability Tier -->
      <td class="py-3.5 px-4 text-xs">
        <span class="text-[11px] font-medium opacity-90">${escapeHtml(drug.facility_tier)}</span>
      </td>

      <!-- Government Subsidized Price -->
      <td class="py-3.5 px-4 text-xs whitespace-nowrap text-right">
        <span class="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          ৳0.00 (Free)
        </span>
      </td>
    </tr>
  `).join('');
}

/**
 * Inspect single drug details modal.
 */
window.viewDrugDetails = function(drugId) {
  const drug = allGovtDrugs.find(d => d.id === drugId) || null;
  if (!drug) {
    // If not in cache, open modal and focus search on drugId
    openCatalogModal();
    const input = document.getElementById('drug-catalog-search');
    if (input) {
      input.value = drugId;
      searchQuery = drugId;
      filterAndRenderCatalog();
    }
    return;
  }

  // Open catalog and filter to this drug
  openCatalogModal();
  const input = document.getElementById('drug-catalog-search');
  if (input) {
    input.value = drug.generic_name;
    searchQuery = drug.generic_name;
    filterAndRenderCatalog();
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
