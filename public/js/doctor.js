// =============================================================
// xMED Doctor Clinical Workspace & Analytics Controller
// =============================================================

let currentPatient = null;
let medicineRowCount = 0;
let consultationChart = null;
let drugCategoryChart = null;

// Therapeutic drug conflict map for interaction warnings
const THERAPEUTIC_CLASSES = {
  'PPI': ['omeprazole', 'esomeprazole', 'pantoprazole', 'seclo', 'sergel', 'pantonix', 'maxpro'],
  'NSAID_PARACETAMOL': ['paracetamol', 'napa', 'ace', 'ace plus', 'napa extra', 'napa rapid'],
  'ANTIHISTAMINE': ['fexofenadine', 'fexo', 'cetirizine', 'alatrol', 'ketotifen', 'tofen'],
  'MACROLIDE': ['azithromycin', 'azithrocin']
};

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireRole('doctor')) return;

  loadDoctorProfile();
  initDoctorAnalytics();
  initDoctorTriageBoard();
  setupPatientSearch();
  setupPrescriptionForm();
  setupLogout();
});

// Load Doctor Header Profile & Metrics
async function loadDoctorProfile() {
  const token = Auth.getToken();
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success && data.user) {
      const doc = data.user;
      document.getElementById('doc-display-name').textContent = doc.full_name;
      document.getElementById('doc-display-license').textContent = doc.license_no;
      document.getElementById('doc-display-spec').textContent = doc.specialization;

      if (doc.stats) {
        document.getElementById('doc-stat-rx').textContent = doc.stats.total_prescriptions || 0;
        document.getElementById('doc-stat-patients').textContent = doc.stats.total_patients || 0;
      }
    }
  } catch (err) {
    console.error('Failed to load doctor profile:', err);
  }
}

// Chart.js Doctor Analytics Initialization
async function initDoctorAnalytics() {
  const token = Auth.getToken();
  try {
    const res = await fetch('/api/doctor/analytics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.analytics) {
      renderConsultationChart(data.analytics.trends);
      renderCategoryChart(data.analytics.categories);
    }
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

function renderConsultationChart(trends) {
  const ctx = document.getElementById('chart-consultations');
  if (!ctx) return;

  const isLight = document.documentElement.classList.contains('light');
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(255, 255, 255, 0.05)';

  if (consultationChart) consultationChart.destroy();

  consultationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: trends.map(t => t.label),
      datasets: [{
        label: 'Consultations',
        data: trends.map(t => t.count),
        backgroundColor: 'rgba(14, 165, 233, 0.75)',
        borderColor: '#0284c7',
        borderWidth: 1.5,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isLight ? '#ffffff' : '#0f172a',
          titleColor: isLight ? '#0f172a' : '#f8fafc',
          bodyColor: isLight ? '#334155' : '#cbd5e1',
          borderColor: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 }, stepSize: 2 }
        }
      }
    }
  });
}

function renderCategoryChart(categories) {
  const ctx = document.getElementById('chart-categories');
  if (!ctx) return;

  const isLight = document.documentElement.classList.contains('light');

  if (drugCategoryChart) drugCategoryChart.destroy();

  drugCategoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories.map(c => c.category),
      datasets: [{
        data: categories.map(c => c.count),
        backgroundColor: [
          '#0ea5e9',
          '#14b8a6',
          '#f59e0b',
          '#8b5cf6',
          '#ec4899',
          '#64748b'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: isLight ? '#334155' : '#cbd5e1',
            font: { size: 10 },
            boxWidth: 10
          }
        }
      },
      cutout: '68%'
    }
  });
}

// Patient Lookup by UID
function setupPatientSearch() {
  const searchInput = document.getElementById('search-patient-uid');
  const searchBtn = document.getElementById('btn-search-patient');

  searchBtn.addEventListener('click', () => {
    executePatientSearch(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executePatientSearch(searchInput.value);
    }
  });

  // Quick Demo Pills
  document.querySelectorAll('.btn-quick-patient-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const uid = pill.dataset.uid;
      searchInput.value = uid;
      executePatientSearch(uid);
    });
  });
}

async function executePatientSearch(uid) {
  const cleanUid = uid.trim().toUpperCase();
  if (!cleanUid) {
    showToast('Please enter a Patient UID to search', 'error');
    return;
  }

  const resultContainer = document.getElementById('patient-dossier-container');
  const emptyState = document.getElementById('patient-empty-state');
  const skeleton = document.getElementById('patient-search-skeleton');

  emptyState.classList.add('hidden');
  resultContainer.classList.add('hidden');
  skeleton.classList.remove('hidden');

  const token = Auth.getToken();

  try {
    const res = await fetch(`/api/doctor/patient/${encodeURIComponent(cleanUid)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.patient) {
      currentPatient = data.patient;
      renderPatientDossier(data.patient, data.prescriptions, data.reports);
      document.getElementById('rx-patient-uid-display').textContent = data.patient.uid;
      document.getElementById('rx-patient-name-display').textContent = data.patient.full_name;
      document.getElementById('rx-patient-target-panel').classList.remove('hidden');
      document.getElementById('rx-no-patient-warning').classList.add('hidden');
      document.getElementById('rx-submit-btn').disabled = false;
      showToast(`Loaded medical record for ${data.patient.full_name}`, 'success');
    } else {
      currentPatient = null;
      emptyState.classList.remove('hidden');
      emptyState.querySelector('p').textContent = data.message || `No citizen record found for UID ${cleanUid}`;
      showToast(data.message || 'Patient not found', 'error');
      document.getElementById('rx-patient-target-panel').classList.add('hidden');
      document.getElementById('rx-no-patient-warning').classList.remove('hidden');
      document.getElementById('rx-submit-btn').disabled = true;
    }
  } catch (err) {
    console.error('Patient search error:', err);
    showToast('Network error while searching patient dossier', 'error');
    emptyState.classList.remove('hidden');
  } finally {
    skeleton.classList.add('hidden');
  }
}

function renderPatientDossier(patient, prescriptions, reports) {
  const container = document.getElementById('patient-dossier-container');
  container.classList.remove('hidden');

  document.getElementById('p-dossier-name').textContent = patient.full_name;
  document.getElementById('p-dossier-uid').textContent = patient.uid;
  document.getElementById('p-dossier-blood').textContent = patient.blood_group;
  document.getElementById('p-dossier-gender').textContent = patient.gender;
  document.getElementById('p-dossier-age').textContent = patient.age ? `${patient.age} yrs` : 'N/A';
  document.getElementById('p-dossier-phone').textContent = patient.phone;

  // Prescriptions
  const rxListEl = document.getElementById('p-dossier-rx-list');
  rxListEl.innerHTML = '';

  if (prescriptions && prescriptions.length > 0) {
    prescriptions.forEach(rx => {
      const dateFormatted = new Date(rx.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      let itemsHtml = '';
      if (rx.items && rx.items.length > 0) {
        itemsHtml = rx.items.map(it => `
          <div class="flex items-center justify-between text-xs py-1 border-b border-slate-700/30 last:border-0">
            <span class="font-medium text-slate-200">${it.brand_name} <span class="text-sky-400 font-mono text-[11px]">(${it.strength})</span></span>
            <span class="text-slate-400 font-mono text-[11px]">${it.dosage_instruction} &bull; ${it.duration}</span>
          </div>
        `).join('');
      }

      const card = document.createElement('div');
      card.className = 'glass-card p-4 rounded-xl border border-slate-700/50 space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-sky-400 uppercase tracking-wider">${dateFormatted}</span>
          <a href="/prescription-view?id=${rx.prescription_id}" target="_blank" class="text-xs text-sky-400 hover:text-sky-300 underline flex items-center gap-1">
            Print Rx #Rx-${rx.prescription_id}
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
        <div class="text-sm font-medium text-slate-100">${rx.diagnosis}</div>
        <div class="text-xs text-slate-400">By ${rx.doctor_name} (${rx.doctor_specialization || rx.doctor_license})</div>
        ${rx.clinical_notes ? `<div class="text-xs text-slate-300 bg-slate-800/40 p-2 rounded-lg italic">Notes: ${rx.clinical_notes}</div>` : ''}
        <div class="bg-slate-900/40 p-2.5 rounded-lg mt-2">
          <div class="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Prescribed Medicines</div>
          ${itemsHtml}
        </div>
      `;
      rxListEl.appendChild(card);
    });
  } else {
    rxListEl.innerHTML = `<div class="text-xs text-slate-400 p-3 text-center">No past prescriptions recorded for this citizen.</div>`;
  }

  // Diagnostic Lab Reports
  const reportsListEl = document.getElementById('p-dossier-reports-list');
  reportsListEl.innerHTML = '';

  if (reports && reports.length > 0) {
    reports.forEach(rep => {
      const uploadDate = new Date(rep.uploaded_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });

      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-sky-500/40 transition-colors';
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div>
            <div class="text-sm font-semibold text-slate-200">${rep.test_name}</div>
            <div class="text-xs text-slate-400">${uploadDate}</div>
          </div>
        </div>
        <a href="${rep.report_file_url}" target="_blank" class="px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-xs font-medium flex items-center gap-1.5">
          View Report
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      `;
      reportsListEl.appendChild(item);
    });
  } else {
    reportsListEl.innerHTML = `<div class="text-xs text-slate-400 p-3 text-center">No diagnostic lab reports uploaded.</div>`;
  }
}

// Drug Conflict & Interaction Evaluation Engine
function evaluateDrugInteractions() {
  const rows = document.querySelectorAll('.med-row');
  const selectedMedNames = [];

  rows.forEach(row => {
    const medName = row.querySelector('.med-search-input').value.toLowerCase().trim();
    if (medName) selectedMedNames.push(medName);
  });

  const conflictAlertEl = document.getElementById('drug-conflict-alert');
  if (!conflictAlertEl) return;

  const conflicts = [];

  // Check PPI duplicates
  const ppiMatches = selectedMedNames.filter(name => 
    THERAPEUTIC_CLASSES.PPI.some(ppi => name.includes(ppi))
  );
  if (ppiMatches.length > 1) {
    conflicts.push(`Duplicate Proton Pump Inhibitors (PPIs) detected: ${ppiMatches.join(' and ')}. Co-prescribing multiple acid suppressants is clinically discouraged.`);
  }

  // Check Antihistamine duplicates
  const antihistamineMatches = selectedMedNames.filter(name => 
    THERAPEUTIC_CLASSES.ANTIHISTAMINE.some(ah => name.includes(ah))
  );
  if (antihistamineMatches.length > 1) {
    conflicts.push(`Multiple Antihistamines selected: ${antihistamineMatches.join(' and ')}. Consider evaluating combined sedative effects.`);
  }

  if (conflicts.length > 0) {
    conflictAlertEl.innerHTML = `
      <div class="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs animate-fade-in">
        <svg class="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <div>
          <strong class="font-bold">Drug Interaction Warning:</strong>
          <div class="mt-0.5 leading-relaxed">${conflicts.join('<br>')}</div>
        </div>
      </div>
    `;
    conflictAlertEl.classList.remove('hidden');
  } else {
    conflictAlertEl.classList.add('hidden');
    conflictAlertEl.innerHTML = '';
  }
}

// Dynamic E-Prescription Builder
function setupPrescriptionForm() {
  const addMedicineBtn = document.getElementById('btn-add-medicine-row');
  const prescriptionForm = document.getElementById('form-create-prescription');

  addMedicineBtn.addEventListener('click', () => {
    addMedicineRow();
  });

  addMedicineRow();

  prescriptionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentPatient) {
      showToast('Please search and select a patient first before issuing a prescription.', 'error');
      return;
    }

    const diagnosis = document.getElementById('rx-diagnosis').value.trim();
    const clinicalNotes = document.getElementById('rx-clinical-notes').value.trim();
    const submitBtn = document.getElementById('rx-submit-btn');

    if (!diagnosis) {
      showToast('Clinical Diagnosis is required.', 'error');
      return;
    }

    const rows = document.querySelectorAll('.med-row');
    const items = [];

    for (const row of rows) {
      const medId = row.querySelector('.med-id-input').value;
      const medName = row.querySelector('.med-search-input').value.trim();
      const dosage = row.querySelector('.med-dosage-input').value.trim();
      const duration = row.querySelector('.med-duration-input').value.trim();

      if (!medId || !medName) {
        showToast('Please select a valid medicine from the autocomplete dropdown for all rows.', 'error');
        return;
      }
      if (!dosage) {
        showToast(`Please specify dosage instruction for ${medName}.`, 'error');
        return;
      }
      if (!duration) {
        showToast(`Please specify duration for ${medName}.`, 'error');
        return;
      }

      items.push({
        medicine_id: medId,
        dosage_instruction: dosage,
        duration: duration
      });
    }

    if (items.length === 0) {
      showToast('Please add at least one medication to the prescription.', 'error');
      return;
    }

    setLoading(submitBtn, true, 'Committing Transaction to EHR...');

    const token = Auth.getToken();

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patient_uid: currentPatient.uid,
          diagnosis,
          clinical_notes: clinicalNotes,
          items
        })
      });

      const data = await res.json();

      if (data.success && data.prescription) {
        showToast('Prescription saved and registered into National EHR!', 'success', 5000);
        showPrescriptionSuccessModal(data.prescription.prescription_id);

        document.getElementById('rx-diagnosis').value = '';
        document.getElementById('rx-clinical-notes').value = '';
        document.getElementById('rx-medicines-container').innerHTML = '';
        medicineRowCount = 0;
        addMedicineRow();

        executePatientSearch(currentPatient.uid);
        loadDoctorProfile();
        initDoctorAnalytics();
      } else {
        showToast(data.message || 'Failed to save prescription.', 'error');
      }
    } catch (err) {
      console.error('Prescription save error:', err);
      showToast('Network error while committing prescription transaction.', 'error');
    } finally {
      setLoading(submitBtn, false, 'Issue & Register Official Prescription');
    }
  });
}

function addMedicineRow() {
  medicineRowCount++;
  const container = document.getElementById('rx-medicines-container');

  const row = document.createElement('div');
  row.className = 'med-row p-4 rounded-xl glass-card border border-slate-700/40 relative space-y-3 animate-fade-in';
  row.id = `med-row-${medicineRowCount}`;

  row.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Medication #${medicineRowCount}</span>
      <button type="button" class="btn-remove-row text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        Remove
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
      <div class="md:col-span-5 relative">
        <label class="block text-xs font-medium text-slate-300 mb-1">Brand / Generic Name</label>
        <input type="text" class="med-search-input w-full px-3 py-2 text-sm rounded-lg glass-input" placeholder="Type medicine e.g. Napa, Seclo..." autocomplete="off">
        <input type="hidden" class="med-id-input">
        <div class="med-dropdown absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-xl glass-card border border-slate-600/60 shadow-2xl z-50 hidden bg-slate-900/95 p-1"></div>
      </div>

      <div class="md:col-span-4">
        <label class="block text-xs font-medium text-slate-300 mb-1">Dosage Instruction</label>
        <div class="flex gap-1.5">
          <input type="text" class="med-dosage-input w-full px-3 py-2 text-sm rounded-lg glass-input font-mono" placeholder="e.g. 1+0+1 after meal">
          <select class="med-dosage-preset px-2 py-2 text-xs rounded-lg glass-input text-slate-300" title="Quick Presets">
            <option value="">Presets</option>
            <option value="1+0+1 after meal">1+0+1 (After Meal)</option>
            <option value="1+1+1 after meal">1+1+1 (After Meal)</option>
            <option value="1+0+0 before meal">1+0+0 (Before Meal)</option>
            <option value="0+0+1 at night">0+0+1 (At Night)</option>
            <option value="1+0+1 before meal">1+0+1 (Before Meal)</option>
            <option value="As needed">As needed (SOS)</option>
          </select>
        </div>
      </div>

      <div class="md:col-span-3">
        <label class="block text-xs font-medium text-slate-300 mb-1">Duration</label>
        <div class="flex gap-1.5">
          <input type="text" class="med-duration-input w-full px-3 py-2 text-sm rounded-lg glass-input" placeholder="e.g. 7 days">
          <select class="med-duration-preset px-2 py-2 text-xs rounded-lg glass-input text-slate-300" title="Quick Presets">
            <option value="">Presets</option>
            <option value="3 days">3 days</option>
            <option value="5 days">5 days</option>
            <option value="7 days">7 days</option>
            <option value="14 days">14 days</option>
            <option value="1 month">1 month</option>
            <option value="Continue">Continue</option>
          </select>
        </div>
      </div>
    </div>
  `;

  const inputEl = row.querySelector('.med-search-input');
  const dropdownEl = row.querySelector('.med-dropdown');
  const idInput = row.querySelector('.med-id-input');

  setupMedicineAutocomplete({
    inputElement: inputEl,
    dropdownElement: dropdownEl,
    onSelect: (med) => {
      idInput.value = med.medicine_id;
      evaluateDrugInteractions();
    }
  });

  const dosagePreset = row.querySelector('.med-dosage-preset');
  const dosageInput = row.querySelector('.med-dosage-input');
  dosagePreset.addEventListener('change', (e) => {
    if (e.target.value) dosageInput.value = e.target.value;
  });

  const durationPreset = row.querySelector('.med-duration-preset');
  const durationInput = row.querySelector('.med-duration-input');
  durationPreset.addEventListener('change', (e) => {
    if (e.target.value) durationInput.value = e.target.value;
  });

  row.querySelector('.btn-remove-row').addEventListener('click', () => {
    const totalRows = container.querySelectorAll('.med-row').length;
    if (totalRows <= 1) {
      showToast('Prescription must contain at least one medication row.', 'info');
      return;
    }
    row.remove();
    evaluateDrugInteractions();
  });

  container.appendChild(row);
}

function showPrescriptionSuccessModal(rxId) {
  let modal = document.getElementById('rx-success-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'rx-success-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="glass-card max-w-md w-full p-6 rounded-2xl border border-emerald-500/40 text-center space-y-4 shadow-2xl bg-slate-900/90">
      <div class="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
      </div>
      <h3 class="text-xl font-bold text-slate-100">Prescription Issued Successfully</h3>
      <p class="text-sm text-slate-300">
        Prescription record <span class="font-mono text-emerald-400 font-bold">#Rx-${rxId}</span> has been securely committed into the National Electronic Health Record.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <a href="/prescription-view?id=${rxId}" target="_blank" class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-95 shadow-lg">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Open Printable Layout
        </a>
        <button type="button" id="btn-close-rx-modal" class="py-2.5 px-4 rounded-xl glass-card text-slate-300 text-sm font-medium hover:text-white">
          Close
        </button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.getElementById('btn-close-rx-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.clearSession();
    });
  }
}

function initDoctorTriageBoard() {
  const refreshBtn = document.getElementById('btn-refresh-triage');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadDoctorTriageQueue);
  }
  loadDoctorTriageQueue();
}

async function loadDoctorTriageQueue() {
  const token = Auth.getToken();
  const emergList = document.getElementById('triage-emergency-list');
  const regList = document.getElementById('triage-regular-list');
  const emergCountEl = document.getElementById('triage-emergency-count');
  const regCountEl = document.getElementById('triage-regular-count');

  if (!emergList || !regList) return;

  try {
    const res = await fetch('/api/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();

    if (json.success && Array.isArray(json.data)) {
      const emergencies = json.data.filter(a => Boolean(a.is_emergency) || a.priority_level >= 2);
      const regulars = json.data.filter(a => !a.is_emergency && a.priority_level < 2);

      if (emergCountEl) emergCountEl.textContent = emergencies.length;
      if (regCountEl) regCountEl.textContent = regulars.length;

      renderEmergencyTriage(emergList, emergencies);
      renderRegularTriage(regList, regulars);
    } else {
      emergList.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No pending emergency visits.</div>';
      regList.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No pending queue requests.</div>';
      if (emergCountEl) emergCountEl.textContent = '0';
      if (regCountEl) regCountEl.textContent = '0';
    }
  } catch (err) {
    console.error('Error loading triage queue:', err);
    emergList.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No pending emergency visits.</div>';
    regList.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No pending queue requests.</div>';
  }
}

function renderEmergencyTriage(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No pending emergency visits.</div>';
    return;
  }

  container.innerHTML = items.map(apt => {
    const isAccepted = apt.status === 'ACCEPTED';
    const isCompleted = apt.status === 'COMPLETED';
    const isPending = apt.status === 'PENDING';
    const dateStr = apt.requested_date ? new Date(apt.requested_date).toISOString().slice(0, 10) : 'Today';

    return `
      <div class="p-3 rounded-xl bg-slate-900/80 border border-rose-500/40 text-xs space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-bold text-white flex items-center gap-1.5">
              <span>${escapeHtml(apt.patient_name)}</span>
              <span class="text-[10px] font-mono text-rose-400 font-bold">${escapeHtml(apt.patient_uid)}</span>
            </div>
            <div class="text-[10px] text-slate-400">Date: ${dateStr} &bull; Time: ${apt.scheduled_time || 'Immediate'} &bull; Serial #${apt.serial_no || 1}</div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isAccepted ? 'bg-emerald-500/20 text-emerald-300' : isCompleted ? 'bg-sky-500/20 text-sky-300' : 'bg-rose-500/20 text-rose-300'}">
            ${apt.status}
          </span>
        </div>

        ${apt.emergency_reason ? `
          <div class="p-2 rounded-lg bg-rose-950/60 border border-rose-800/60 text-[11px] text-rose-200 font-medium leading-snug">
            🚨 ${escapeHtml(apt.emergency_reason)}
          </div>
        ` : ''}

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button 
            onclick="selectPatientForPrescription('${escapeHtml(apt.patient_uid)}')"
            class="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500 hover:text-white text-[11px] font-semibold transition-colors"
          >
            Start Rx Dossier
          </button>
          <div class="flex items-center gap-1.5">
            ${isPending ? `
              <button 
                onclick="updateTriageStatus(${apt.appointment_id}, 'ACCEPTED', 3)"
                class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-sm"
              >
                Accept Priority
              </button>
              <button 
                onclick="updateTriageStatus(${apt.appointment_id}, 'REJECTED')"
                class="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[11px] font-medium"
              >
                Reject
              </button>
            ` : isAccepted ? `
              <button 
                onclick="updateTriageStatus(${apt.appointment_id}, 'COMPLETED')"
                class="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold"
              >
                Mark Done
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderRegularTriage(container, items) {
  if (!items || items.length === 0) {
    container.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No pending queue requests.</div>';
    return;
  }

  container.innerHTML = items.map(apt => {
    const isAccepted = apt.status === 'ACCEPTED';
    const isCompleted = apt.status === 'COMPLETED';
    const isPending = apt.status === 'PENDING';
    const dateStr = apt.requested_date ? new Date(apt.requested_date).toISOString().slice(0, 10) : 'Today';

    return `
      <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-bold text-white flex items-center gap-1.5">
              <span>${escapeHtml(apt.patient_name)}</span>
              <span class="text-[10px] font-mono text-sky-400">${escapeHtml(apt.patient_uid)}</span>
            </div>
            <div class="text-[10px] text-slate-400">Date: ${dateStr} &bull; Time: ${apt.scheduled_time || 'Shift Slot'} &bull; Serial #${apt.serial_no || '--'}</div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isAccepted ? 'bg-emerald-500/20 text-emerald-300' : isCompleted ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-400'}">
            ${apt.status}
          </span>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <button 
            onclick="selectPatientForPrescription('${escapeHtml(apt.patient_uid)}')"
            class="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 hover:bg-sky-500 hover:text-white text-[11px] font-semibold transition-colors"
          >
            Start Rx Dossier
          </button>
          <div class="flex items-center gap-1.5">
            ${isPending ? `
              <button 
                onclick="updateTriageStatus(${apt.appointment_id}, 'ACCEPTED')"
                class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold transition-all"
              >
                Accept
              </button>
              <button 
                onclick="updateTriageStatus(${apt.appointment_id}, 'REJECTED')"
                class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-[11px]"
              >
                Reject
              </button>
            ` : isAccepted ? `
              <button 
                onclick="updateTriageStatus(${apt.appointment_id}, 'COMPLETED')"
                class="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold"
              >
                Mark Done
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function updateTriageStatus(appointmentId, status, priorityLevel) {
  const token = Auth.getToken();
  try {
    const payload = { status };
    if (priorityLevel !== undefined) payload.priority_level = priorityLevel;

    const res = await fetch(`/api/appointments/${appointmentId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Appointment status updated to ${status}.`, 'success');
      loadDoctorTriageQueue();
    } else {
      showToast(json.message || 'Failed to update appointment.', 'error');
    }
  } catch (err) {
    showToast('Error updating appointment status.', 'error');
  }
}

function selectPatientForPrescription(patientUid) {
  const searchInput = document.getElementById('search-patient-uid');
  if (searchInput) {
    searchInput.value = patientUid;
    const searchBtn = document.getElementById('btn-search-patient');
    if (searchBtn) searchBtn.click();
    window.scrollTo({ top: searchInput.offsetTop - 100, behavior: 'smooth' });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
