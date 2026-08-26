// =============================================================
// xMED Live Medicine Autocomplete Component (Enhanced Global & BD Catalog)
// =============================================================

function setupMedicineAutocomplete({ inputElement, dropdownElement, onSelect }) {
  let debounceTimeout = null;
  let activeIndex = -1;
  let currentResults = [];

  // 300ms Debounced input handler
  inputElement.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();

    if (query.length === 0) {
      closeDropdown();
      return;
    }

    debounceTimeout = setTimeout(async () => {
      showSkeletonLoading();
      try {
        const response = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.success && data.medicines.length > 0) {
          currentResults = data.medicines;
          renderResults(currentResults);
        } else {
          currentResults = [];
          renderEmpty();
        }
      } catch (err) {
        console.error('Medicine search error:', err);
        renderEmpty();
      }
    }, 280);
  });

  // Keyboard navigation
  inputElement.addEventListener('keydown', (e) => {
    const items = dropdownElement.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < currentResults.length) {
        e.preventDefault();
        selectMedicine(currentResults[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  function updateActiveItem(items) {
    items.forEach((item, index) => {
      if (index === activeIndex) {
        item.classList.add('bg-sky-500/20', 'border-sky-500/40');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-sky-500/20', 'border-sky-500/40');
      }
    });
  }

  function renderResults(medicines) {
    activeIndex = -1;
    dropdownElement.innerHTML = '';
    dropdownElement.classList.remove('hidden');

    medicines.forEach(med => {
      const isGovt = (med.origin || '').includes('EDCL') || (med.origin || '').includes('Govt');
      const item = document.createElement('div');
      item.className = 'autocomplete-item p-2.5 cursor-pointer rounded-xl hover:bg-sky-500/15 transition-colors border border-transparent flex items-center justify-between gap-2';
      
      item.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-bold text-xs text-slate-100 dark:text-slate-100">${med.brand_name}</span>
            <span class="text-[11px] text-sky-400 font-mono">(${med.strength})</span>
            ${isGovt ? `<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">BD GOVT (EDCL)</span>` : ''}
          </div>
          <div class="text-[11px] text-slate-400 dark:text-slate-400 italic truncate">${med.generic_name} &bull; <span class="text-slate-400 font-normal">${med.origin || 'Standard'}</span></div>
        </div>
        <div class="flex flex-col items-end gap-1 flex-shrink-0">
          <span class="text-[10px] px-2 py-0.5 rounded-full font-medium ${getDosageBadgeClass(med.dosage_form)}">
            ${med.dosage_form}
          </span>
          <span class="text-[9px] text-slate-400">${med.category || ''}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        selectMedicine(med);
      });

      dropdownElement.appendChild(item);
    });
  }

  function getDosageBadgeClass(form) {
    switch (form) {
      case 'Tablet': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
      case 'Capsule': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'Syrup': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'Injection': return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      case 'Drops': return 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
      case 'Inhaler': return 'bg-teal-500/20 text-teal-300 border border-teal-500/30';
      case 'Powder': return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
      default: return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    }
  }

  function renderEmpty() {
    dropdownElement.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400">
        No matching drug found in National/Global catalog.
      </div>
    `;
    dropdownElement.classList.remove('hidden');
  }

  function showSkeletonLoading() {
    dropdownElement.innerHTML = `
      <div class="p-3 space-y-2">
        <div class="h-4 skeleton rounded w-3/4"></div>
        <div class="h-3 skeleton rounded w-1/2"></div>
      </div>
    `;
    dropdownElement.classList.remove('hidden');
  }

  function selectMedicine(med) {
    inputElement.value = `${med.brand_name} (${med.strength})`;
    closeDropdown();
    if (onSelect) {
      onSelect(med);
    }
  }

  function closeDropdown() {
    dropdownElement.classList.add('hidden');
    dropdownElement.innerHTML = '';
    activeIndex = -1;
  }

  document.addEventListener('click', (e) => {
    if (!inputElement.contains(e.target) && !dropdownElement.contains(e.target)) {
      closeDropdown();
    }
  });

  return {
    close: closeDropdown
  };
}
