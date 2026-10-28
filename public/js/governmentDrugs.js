let allGovtDrugs = [];
let activeCategory = 'All';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  loadEmergencyDrugs();
  setupCatalogModal();
  setupSingleDrugModal();
});

function getDrugImage(drug) {
  if (!drug) return '/images/drugs/tablets.svg';
  if (drug.image) return drug.image;

  const form = (drug.dosage_form || '').toLowerCase();
  const name = ((drug.brand_name || '') + ' ' + (drug.generic_name || '')).toLowerCase();

  if (name.includes('povidone') || name.includes('iodine') || form.includes('topical solution')) {
    return '/images/drugs/antiseptic.svg';
  }
  if (form.includes('ors') || form.includes('powder for solution') || name.includes('oral rehydration') || name.includes('ors')) {
    return '/images/drugs/ors.svg';
  }
  if (form.includes('inhal') || form.includes('nebul') || form.includes('respule') || form.includes('evohaler')) {
    return '/images/drugs/inhaler.svg';
  }
  if (form.includes('infusion') || form.includes('saline') || form.includes('iv fluid') || form.includes('bag')) {
    return '/images/drugs/iv-infusion.svg';
  }
  if (form.includes('eye') || form.includes('ear') || form.includes('drops') || form.includes('ophthalmic') || form.includes('otic')) {
    return '/images/drugs/eyedrops.svg';
  }
  if (form.includes('cream') || form.includes('ointment') || form.includes('tube') || form.includes('emulsion') || form.includes('gel')) {
    return '/images/drugs/cream-tube.svg';
  }
  if (form.includes('vial') || name.includes('vial') || name.includes('insulin') || name.includes('hydrocortisone') || name.includes('ceftriaxone')) {
    return '/images/drugs/vial.svg';
  }
  if (form.includes('ampoule') || form.includes('injection') || name.includes('adrenaline') || name.includes('atropine') || name.includes('diazepam') || name.includes('furosemide') || name.includes('magnesium') || name.includes('oxytocin') || name.includes('tetanus')) {
    return '/images/drugs/ampoule.svg';
  }
  if (form.includes('syrup') || form.includes('suspension') || form.includes('liquid') || form.includes('elixir')) {
    return '/images/drugs/syrup.svg';
  }
  if (form.includes('capsule') || form.includes('softgel') || name.includes('capsule') || name.includes('omeprazole 20mg')) {
    return '/images/drugs/capsules.svg';
  }
  return '/images/drugs/tablets.svg';
}

function getDrugFormBadge(drug) {
  const form = (drug.dosage_form || '').toLowerCase();
  const name = ((drug.brand_name || '') + ' ' + (drug.generic_name || '')).toLowerCase();

  if (name.includes('povidone') || name.includes('iodine')) return 'Antiseptic 100ml';
  if (form.includes('ors') || name.includes('ors')) return 'ORS Sachet';
  if (form.includes('inhal') || form.includes('evohaler')) return 'MDI Inhaler';
  if (form.includes('infusion')) return 'IV Infusion';
  if (form.includes('drops')) return 'Dropper 5ml';
  if (form.includes('cream') || form.includes('ointment')) return 'Topical Tube';
  if (form.includes('vial') || name.includes('insulin') || name.includes('ceftriaxone')) return 'Sterile Vial';
  if (form.includes('ampoule') || form.includes('injection')) return 'Glass Ampoule';
  if (form.includes('syrup') || form.includes('suspension')) return 'Syrup Bottle';
  if (form.includes('capsule')) return 'Oral Capsule';
  return 'Tablet Strip';
}

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

    const emergencyDrugs = json.data || json.emergency_drugs || [];
    const displayList = emergencyDrugs.slice(0, 8);

    container.innerHTML = displayList.map(drug => {
      const drugId = drug.medicine_id || drug.id || '';
      const imageSrc = getDrugImage(drug);
      const formBadge = getDrugFormBadge(drug);

      return `
      <div class="govt-drug-card rounded-3xl p-4 border transition-all hover:scale-[1.02] flex flex-col justify-between group overflow-hidden relative">
        <div>
          <div class="flex items-center justify-between gap-2 z-10 mb-2.5">
            <span class="govt-emergency-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              Emergency
            </span>
            <span class="govt-free-tag inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono">
              <svg class="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
              ৳0.00 Free
            </span>
          </div>

          <div class="relative w-full h-36 rounded-2xl bg-gradient-to-b from-white/5 to-white/0 flex items-center justify-center p-2 mb-3 border border-white/5 group-hover:border-emerald-500/30 transition-all overflow-hidden cursor-pointer" onclick="viewDrugDetails('${escapeHtml(drugId)}')">
            <div class="absolute inset-0 bg-radial-gradient from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <img src="${imageSrc}" alt="${escapeHtml(drug.brand_name)}" class="w-24 h-24 object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md" loading="lazy" />
            <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-black/70 backdrop-blur-md text-slate-300 border border-white/10">
              ${escapeHtml(formBadge)}
            </span>
          </div>

          <div class="space-y-1">
            <h4 class="govt-drug-title text-sm font-black tracking-tight group-hover:text-emerald-400 transition-colors line-clamp-1" title="${escapeHtml(drug.brand_name)}">
              ${escapeHtml(drug.brand_name)}
            </h4>
            <div class="flex items-center justify-between text-xs pt-0.5">
              <span class="govt-drug-generic font-medium text-slate-400 truncate max-w-[130px]" title="${escapeHtml(drug.generic_name)}">
                ${escapeHtml(drug.generic_name)}
              </span>
              <span class="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                ${escapeHtml(drug.strength)}
              </span>
            </div>
          </div>
        </div>

        <div class="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-xs">
          <span class="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            ${escapeHtml(drug.stock_status || 'In Stock')}
          </span>
          <button 
            type="button" 
            onclick="viewDrugDetails('${escapeHtml(drugId)}')"
            class="govt-inspect-btn font-bold text-xs hover:underline flex items-center gap-1 cursor-pointer">
            Details &rarr;
          </button>
        </div>
      </div>
    `;
    }).join('');

  } catch (err) {
    console.error('Error rendering emergency drugs:', err);
    container.innerHTML = `
      <div class="col-span-full text-center py-6 text-slate-400 text-sm">
        Failed to load government emergency drugs. Please refresh the page.
      </div>
    `;
  }
}

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

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeCatalogModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal && !modal.classList.contains('hidden')) {
        closeCatalogModal();
      }
      const singleModal = document.getElementById('single-drug-modal');
      if (singleModal && !singleModal.classList.contains('hidden')) {
        closeDrugDetailsModal();
      }
    }
  });

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

function setupSingleDrugModal() {
  const modal = document.getElementById('single-drug-modal');
  const closeBtn = document.getElementById('btn-close-single-drug-modal');
  const closeFooterBtn = document.getElementById('btn-close-single-drug-footer');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeDrugDetailsModal);
  }
  if (closeFooterBtn) {
    closeFooterBtn.addEventListener('click', closeDrugDetailsModal);
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeDrugDetailsModal();
      }
    });
  }
}

window.openDrugDetailsModal = function(drugOrId) {
  let drug = typeof drugOrId === 'object' ? drugOrId : null;
  if (!drug && typeof drugOrId === 'string') {
    drug = allGovtDrugs.find(d => d.id === drugOrId || d.medicine_id === drugOrId);
  }

  const modal = document.getElementById('single-drug-modal');
  if (!modal) return;

  if (drug) {
    populateSingleDrugModal(drug);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  } else {
    fetchDrugAndOpenModal(drugOrId);
  }
};

async function fetchDrugAndOpenModal(drugId) {
  try {
    const res = await fetch(`/api/drugs/${encodeURIComponent(drugId)}`);
    const json = await res.json();
    if (json.success && json.data) {
      populateSingleDrugModal(json.data);
      const modal = document.getElementById('single-drug-modal');
      if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    } else {
      openCatalogModal();
      const input = document.getElementById('drug-catalog-search');
      if (input) {
        input.value = drugId;
        searchQuery = drugId;
        filterAndRenderCatalog();
      }
    }
  } catch (e) {
    console.error('Error opening drug details:', e);
  }
}

function populateSingleDrugModal(drug) {
  const idEl = document.getElementById('modal-drug-id');
  const titleEl = document.getElementById('modal-drug-title');
  const imgEl = document.getElementById('modal-drug-image');
  const formBadgeEl = document.getElementById('modal-drug-form-badge');
  const genericEl = document.getElementById('modal-drug-generic');
  const strengthEl = document.getElementById('modal-drug-strength');
  const categoryEl = document.getElementById('modal-drug-category');
  const indicationEl = document.getElementById('modal-drug-indication');
  const facilityEl = document.getElementById('modal-drug-facility');
  const routeEl = document.getElementById('modal-drug-route');

  const drugId = drug.medicine_id || drug.id || 'EDCL-MED';
  const img = getDrugImage(drug);
  const badge = getDrugFormBadge(drug);

  if (idEl) idEl.textContent = drugId;
  if (titleEl) titleEl.textContent = drug.brand_name || 'Government Essential Medicine';
  if (imgEl) {
    imgEl.src = img;
    imgEl.alt = drug.brand_name || '';
  }
  if (formBadgeEl) formBadgeEl.textContent = badge;
  if (genericEl) genericEl.textContent = drug.generic_name || 'Essential Active Substance';
  if (strengthEl) strengthEl.textContent = drug.strength || 'Standard';
  if (categoryEl) categoryEl.textContent = drug.category || 'Essential Formulary';
  if (indicationEl) {
    indicationEl.textContent = drug.emergency_indication || 'Supplied under National Essential Drug Formulary for outpatient and inpatient clinical care.';
  }
  if (facilityEl) {
    facilityEl.textContent = drug.facility_tier || 'Community Clinic, Upazila Health Complex & All Govt Hospitals';
  }
  if (routeEl) {
    routeEl.textContent = drug.route_of_admin || (drug.dosage_form && drug.dosage_form.includes('Injection') ? 'Intramuscular / Intravenous' : 'Oral');
  }
}

window.closeDrugDetailsModal = function() {
  const modal = document.getElementById('single-drug-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  const catalogModal = document.getElementById('govt-drugs-modal');
  if (!catalogModal || catalogModal.classList.contains('hidden')) {
    document.body.style.overflow = '';
  }
};

window.viewDrugDetails = function(drugId) {
  window.openDrugDetailsModal(drugId);
};

async function openCatalogModal() {
  const modal = document.getElementById('govt-drugs-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

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

function renderCategoryPills(categories) {
  const pillContainer = document.getElementById('drug-category-pills');
  if (!pillContainer) return;

  const popularCategories = [
    'All',
    'Emergency',
    'Antibiotics',
    'Maternal & Child',
    'GI & Rehydration',
    'Respiratory',
    'Cardiovascular',
    'Analgesics'
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

  tableBody.innerHTML = filtered.map(drug => {
    const drugId = drug.medicine_id || drug.id || '';
    const facilityTier = drug.facility_tier || (drug.origin && drug.origin.includes('EDCL') ? 'Community Clinics & Upazila' : 'Tertiary & Upazila ER');
    const isEmergency = drug.is_emergency || drug.category === 'Emergency';
    const imageSrc = getDrugImage(drug);

    return `
    <tr class="govt-catalog-row border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onclick="openDrugDetailsModal('${escapeHtml(drugId)}')">
      <td class="py-3.5 px-4 whitespace-nowrap">
        <span class="font-mono text-[11px] font-bold opacity-75">EDCL-${escapeHtml(drugId)}</span>
        ${isEmergency ? `
          <span class="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            Emergency
          </span>
        ` : ''}
      </td>

      <td class="py-3.5 px-4 font-bold text-xs">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-1 flex-shrink-0">
            <img src="${imageSrc}" alt="" class="w-7 h-7 object-contain">
          </div>
          <div>
            <div class="font-black text-slate-900 dark:text-slate-100">${escapeHtml(drug.brand_name)}</div>
            <div class="text-[11px] opacity-75 font-normal">${escapeHtml(drug.dosage_form || 'Tablet')}</div>
          </div>
        </div>
      </td>

      <td class="py-3.5 px-4 text-xs">
        <div class="font-semibold text-slate-800 dark:text-slate-200">${escapeHtml(drug.generic_name)}</div>
        <div class="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">${escapeHtml(drug.strength || '')}</div>
      </td>

      <td class="py-3.5 px-4 text-xs whitespace-nowrap">
        <span class="px-2.5 py-1 rounded-full text-[11px] font-medium govt-category-badge">
          ${escapeHtml(drug.category || 'Essential')}
        </span>
      </td>

      <td class="py-3.5 px-4 text-xs">
        <span class="text-[11px] font-medium opacity-90">${escapeHtml(facilityTier)}</span>
      </td>

      <td class="py-3.5 px-4 text-xs whitespace-nowrap text-right">
        <span class="px-2.5 py-1 rounded-lg text-xs font-black font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
          ৳0.00 (Free)
        </span>
      </td>
    </tr>
  `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
