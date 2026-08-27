// =============================================================
// xMED Patient Health Vault & Vitals Analytics Controller
// Unified Clinical Timeline & Self-Reported OTC Medicine Logging
// =============================================================

let vitalsChartBP = null;
let vitalsChartGlucose = null;
let currentPage = 1;
const PAGE_LIMIT = 50; // Show comprehensive timeline
let allPrescriptions = [];
let allSelfMeds = [];

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireRole('patient')) return;

  loadPatientDashboard();
  loadPatientAppointments();
  loadPatientVitals();
  setupReportUpload();
  setupSelfMedicationModal();
  setupLogout();
});

async function loadPatientDashboard(append = false) {
  const token = Auth.getToken();
  const loadingEl = document.getElementById('patient-dashboard-loading');
  const contentEl = document.getElementById('patient-dashboard-content');

  try {
    const res = await fetch(`/api/patient/dashboard?page=${currentPage}&limit=${PAGE_LIMIT}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success) {
      renderPatientProfile(data.citizen);
      
      if (append) {
        allPrescriptions = allPrescriptions.concat(data.prescriptions || []);
      } else {
        allPrescriptions = data.prescriptions || [];
      }

      allSelfMeds = data.self_medications || [];

      renderUnifiedTimeline(allPrescriptions, allSelfMeds, (data.prescriptions || []).length === PAGE_LIMIT);
      renderDiagnosticReports(data.reports);

      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');
    } else {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (contentEl) contentEl.classList.remove('hidden');
      showToast(data.message || 'Failed to load health records.', 'error');
    }
  } catch (err) {
    console.error('Error loading patient dashboard:', err);
    if (loadingEl) loadingEl.classList.add('hidden');
    if (contentEl) contentEl.classList.remove('hidden');
    showToast('Failed to load complete health records. Please refresh.', 'error');
  }
}

// Chart.js Vitals Trends Initialization
async function loadPatientVitals() {
  const token = Auth.getToken();
  try {
    const res = await fetch('/api/patient/vitals', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.vitals) {
      renderVitalsSummary(data.vitals.summary);
      renderBPChart(data.vitals.bloodPressure);
      renderGlucoseChart(data.vitals.bloodGlucose);
    }
  } catch (err) {
    console.error('Error loading vitals charts:', err);
  }
}

function renderVitalsSummary(summary) {
  if (!summary) return;
  safeSetText('vitals-current-bp', summary.currentBP);
  safeSetText('vitals-current-glucose', summary.currentGlucose);
  safeSetText('vitals-current-bmi', summary.currentBMI);
}

function renderBPChart(bpData) {
  const ctx = document.getElementById('chart-vitals-bp');
  if (!ctx) return;

  const isLight = document.documentElement.classList.contains('light');
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(255, 255, 255, 0.05)';

  if (vitalsChartBP) vitalsChartBP.destroy();

  vitalsChartBP = new Chart(ctx, {
    type: 'line',
    data: {
      labels: bpData.labels,
      datasets: [
        {
          label: 'Systolic (mmHg)',
          data: bpData.systolic,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Diastolic (mmHg)',
          data: bpData.diastolic,
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14, 165, 233, 0.08)',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { size: 10 }, boxWidth: 10 }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        },
        y: {
          min: 60,
          max: 160,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        }
      }
    }
  });
}

function renderGlucoseChart(glucoseData) {
  const ctx = document.getElementById('chart-vitals-glucose');
  if (!ctx) return;

  const isLight = document.documentElement.classList.contains('light');
  const textColor = isLight ? '#475569' : '#94a3b8';
  const gridColor = isLight ? 'rgba(226, 232, 240, 0.8)' : 'rgba(255, 255, 255, 0.05)';

  if (vitalsChartGlucose) vitalsChartGlucose.destroy();

  vitalsChartGlucose = new Chart(ctx, {
    type: 'line',
    data: {
      labels: glucoseData.labels,
      datasets: [
        {
          label: 'Fasting (mg/dL)',
          data: glucoseData.fasting,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Post-Prandial (mg/dL)',
          data: glucoseData.postPrandial,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: textColor, font: { size: 10 }, boxWidth: 10 }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        },
        y: {
          min: 50,
          max: 200,
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 10 } }
        }
      }
    }
  });
}

// Safe Text Helper
function safeSetText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = (val !== null && val !== undefined && val !== '') ? val : '--';
}

// Digital Health Identity Card Rendering
function renderPatientProfile(citizen) {
  if (!citizen) return;

  safeSetText('card-patient-name', citizen.full_name);
  safeSetText('card-patient-uid', citizen.uid);
  safeSetText('card-patient-blood', citizen.blood_group);
  safeSetText('card-patient-gender', citizen.gender);
  safeSetText('card-patient-age', citizen.age ? `${citizen.age} yrs` : 'N/A');
  safeSetText('card-patient-dob', citizen.dob ? new Date(citizen.dob).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : 'N/A');
  safeSetText('card-patient-phone', citizen.phone);
  safeSetText('card-patient-email', citizen.email);

  safeSetText('header-patient-name', citizen.full_name);
  safeSetText('header-patient-uid', citizen.uid);

  // Setup copy UID button
  const copyBtn = document.getElementById('btn-copy-uid');
  if (copyBtn) {
    copyBtn.onclick = () => copyToClipboard(citizen.uid, 'National UID');
  }
}

// Unified Chronological Medical Timeline Rendering
function renderUnifiedTimeline(prescriptions, selfMeds, hasMore) {
  const timelineContainer = document.getElementById('medical-timeline-container');
  const countBadge = document.getElementById('timeline-count-badge');
  timelineContainer.innerHTML = '';

  // Merge and sort all entries chronologically descending
  const unifiedEntries = [];

  (prescriptions || []).forEach(rx => {
    unifiedEntries.push({
      type: 'prescription',
      date: new Date(rx.created_at),
      data: rx
    });
  });

  (selfMeds || []).forEach(sm => {
    unifiedEntries.push({
      type: 'self_medication',
      date: new Date(sm.date_taken || sm.created_at),
      data: sm
    });
  });

  unifiedEntries.sort((a, b) => b.date.getTime() - a.date.getTime());

  if (unifiedEntries.length === 0) {
    countBadge.textContent = '0 records';
    timelineContainer.innerHTML = `
      <div class="glass-card p-8 rounded-2xl text-center space-y-2 border border-slate-700/40">
        <div class="w-12 h-12 rounded-full bg-sky-500/10 text-sky-400 mx-auto flex items-center justify-center">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
        </div>
        <div class="text-sm font-semibold text-slate-200">No Clinical History Recorded</div>
        <p class="text-xs text-slate-400">Doctor consultations and self-reported emergency medications will appear here chronologically.</p>
      </div>
    `;
    return;
  }

  const rxCount = (prescriptions || []).length;
  const smCount = (selfMeds || []).length;
  countBadge.textContent = `${unifiedEntries.length} entries (${rxCount} Consultations, ${smCount} OTC Logs)`;

  unifiedEntries.forEach((entry) => {
    const itemDate = entry.date;
    const formattedDate = itemDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = itemDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const timelineItem = document.createElement('div');
    timelineItem.className = 'relative pl-8 pb-8 last:pb-0 group';

    if (entry.type === 'prescription') {
      const rx = entry.data;
      let medsListHtml = '';
      if (rx.items && rx.items.length > 0) {
        medsListHtml = rx.items.map(m => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 gap-1.5 text-xs">
            <div>
              <span class="font-bold text-slate-100">${m.brand_name}</span>
              <span class="text-[11px] text-cyan-400 font-mono">(${m.strength} - ${m.dosage_form})</span>
              <div class="text-[10px] text-slate-400 italic">${m.generic_name}</div>
            </div>
            <div class="text-right">
              <span class="inline-block px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 font-mono text-[11px] border border-cyan-500/20">${m.dosage_instruction}</span>
              <span class="text-slate-400 text-[11px] block mt-0.5">${m.duration}</span>
            </div>
          </div>
        `).join('');
      }

      timelineItem.innerHTML = `
        <div class="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-cyan-400 timeline-dot border-2 border-slate-900 z-10 shadow-[0_0_10px_rgba(6,182,212,0.6)]"></div>
        <div class="absolute left-2 top-5 bottom-0 w-0.5 bg-slate-700/50 group-last:hidden"></div>

        <div class="glass-card rounded-2xl p-5 border border-cyan-500/30 hover:border-cyan-400/60 transition-all duration-200 space-y-3.5 shadow-lg">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/40 pb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Official Consultation
                </span>
                <span class="text-xs text-slate-400 font-mono">${formattedDate} &bull; ${formattedTime}</span>
              </div>
              <h4 class="text-base font-black text-slate-100 mt-1">${rx.diagnosis}</h4>
              <div class="text-xs text-slate-400 mt-0.5">
                Attending Physician: <span class="text-slate-200 font-semibold">${rx.doctor_name}</span> (${rx.doctor_specialization || 'Clinical Specialist'}) 
                <span class="font-mono text-[10px] text-cyan-300">#${rx.doctor_license || ''}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a href="/prescription-view?id=${rx.prescription_id}" target="_blank" class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:opacity-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                View / Print PDF
              </a>
            </div>
          </div>

          ${rx.clinical_notes ? `
            <div class="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-cyan-500/20 leading-relaxed">
              <strong class="text-cyan-300">Physician Clinical Advice:</strong> ${rx.clinical_notes}
            </div>
          ` : ''}

          <div class="space-y-2 pt-1">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prescribed Medication Regimen</span>
              <span class="text-xs text-slate-500 font-mono">${rx.items ? rx.items.length : 0} medications</span>
            </div>
            <div class="grid grid-cols-1 gap-2">
              ${medsListHtml || '<div class="text-xs text-slate-500 italic">No specific medications itemized.</div>'}
            </div>
          </div>
        </div>
      `;
    } else if (entry.type === 'self_medication') {
      const sm = entry.data;
      timelineItem.innerHTML = `
        <div class="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-amber-400 timeline-dot border-2 border-slate-900 z-10 shadow-[0_0_10px_rgba(245,158,11,0.6)]"></div>
        <div class="absolute left-2 top-5 bottom-0 w-0.5 bg-slate-700/50 group-last:hidden"></div>

        <div class="glass-card rounded-2xl p-5 border border-amber-500/40 hover:border-amber-400/60 transition-all duration-200 space-y-3 shadow-lg bg-amber-500/5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  ⚡ Self-Reported / Emergency
                </span>
                <span class="text-xs text-slate-400 font-mono">${formattedDate}</span>
              </div>
              <h4 class="text-base font-black text-white mt-1">${sm.medicine_name}</h4>
              <div class="text-xs text-amber-300/80 font-mono mt-0.5">
                Dosage: <strong>${sm.dosage_taken || 'As needed'}</strong>
              </div>
            </div>
            <span class="text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              Citizen Self-Log
            </span>
          </div>

          <div class="text-xs text-slate-200 bg-slate-900/80 p-3 rounded-xl border border-amber-500/20 leading-relaxed">
            <strong class="text-amber-300">Reason / Emergency Context:</strong> ${sm.reason_or_emergency}
          </div>

          <div class="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>Recorded in National EHR Vault</span>
            <span class="text-slate-500 font-mono text-[10px]">No Doctor Signature Required</span>
          </div>
        </div>
      `;
    }

    timelineContainer.appendChild(timelineItem);
  });

  // Load more button if applicable
  const loadMoreBtn = document.getElementById('btn-load-more-timeline');
  if (loadMoreBtn) {
    if (hasMore) {
      loadMoreBtn.classList.remove('hidden');
      loadMoreBtn.onclick = () => {
        currentPage++;
        loadPatientDashboard(true);
      };
    } else {
      loadMoreBtn.classList.add('hidden');
    }
  }
}

// Setup Modal for Logging Self-Medications / OTC
function setupSelfMedicationModal() {
  const modal = document.getElementById('modal-self-med');
  const btnOpen = document.getElementById('btn-open-self-med');
  const btnClose = document.getElementById('btn-close-self-med-modal');
  const btnCancel = document.getElementById('btn-cancel-self-med');
  const form = document.getElementById('form-self-med');
  const dateInput = document.getElementById('self-med-date');

  if (!modal || !btnOpen || !form) return;

  btnOpen.addEventListener('click', () => {
    // Default to today's date in YYYY-MM-DD
    if (dateInput) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
    modal.classList.remove('hidden');
    document.getElementById('self-med-name').focus();
  });

  const closeModal = () => modal.classList.add('hidden');
  if (btnClose) btnClose.addEventListener('click', closeModal);
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const medicine_name = document.getElementById('self-med-name').value.trim();
    const dosage_taken = document.getElementById('self-med-dosage').value.trim();
    const date_taken = document.getElementById('self-med-date').value;
    const reason_or_emergency = document.getElementById('self-med-reason').value.trim();

    if (!medicine_name || !reason_or_emergency || !date_taken) {
      showToast('Please fill in medicine name, reason, and date.', 'error');
      return;
    }

    const token = Auth.getToken();
    const submitBtn = document.getElementById('btn-submit-self-med');
    setLoading(submitBtn, true, 'Saving to Vault...');

    try {
      const res = await fetch('/api/patient/self-medications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          medicine_name,
          dosage_taken,
          date_taken,
          reason_or_emergency
        })
      });
      const data = await res.json();

      if (data.success) {
        showToast('Self-medication logged successfully into your EHR!', 'success');
        form.reset();
        closeModal();
        loadPatientDashboard();
      } else {
        showToast(data.message || 'Failed to log self-medication.', 'error');
      }
    } catch (err) {
      console.error('Self-medication error:', err);
      showToast('Network error while recording self-medication.', 'error');
    } finally {
      setLoading(submitBtn, false, 'Save to Timeline');
    }
  });
}

// Diagnostic Lab Reports Vault
function renderDiagnosticReports(reports) {
  const container = document.getElementById('patient-reports-list');
  const countBadge = document.getElementById('reports-count-badge');
  container.innerHTML = '';

  if (!reports || reports.length === 0) {
    countBadge.textContent = '0 files';
    container.innerHTML = `
      <div class="p-6 text-center text-xs text-slate-400">
        No diagnostic lab reports uploaded yet.
      </div>
    `;
    return;
  }

  countBadge.textContent = `${reports.length} files`;

  reports.forEach(rep => {
    const uploadDate = new Date(rep.uploaded_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    const isPdf = rep.report_file_url.toLowerCase().endsWith('.pdf');

    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-3.5 rounded-xl glass-card border border-slate-700/40 hover:border-sky-500/40 transition-colors';
    item.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl ${isPdf ? 'bg-rose-500/20 text-rose-400' : 'bg-teal-500/20 text-teal-400'} flex items-center justify-center flex-shrink-0">
          ${isPdf ? `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
          ` : `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          `}
        </div>
        <div>
          <div class="text-sm font-semibold text-slate-200">${rep.test_name}</div>
          <div class="text-xs text-slate-400">Uploaded on ${uploadDate} &bull; Verified in EHR</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <a href="${rep.report_file_url}" target="_blank" download class="p-2 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors" title="Download / Open">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
        </a>
        <button type="button" class="btn-delete-report p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors" data-id="${rep.report_id}" title="Remove Report">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    `;

    item.querySelector('.btn-delete-report').addEventListener('click', async () => {
      if (!confirm('Are you sure you want to remove this diagnostic report?')) return;
      const token = Auth.getToken();
      try {
        const delRes = await fetch(`/api/patient/reports/${rep.report_id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const delData = await delRes.json();
        if (delData.success) {
          showToast('Report deleted successfully', 'info');
          loadPatientDashboard();
        } else {
          showToast(delData.message || 'Failed to delete report', 'error');
        }
      } catch (err) {
        showToast('Network error while deleting report', 'error');
      }
    });

    container.appendChild(item);
  });
}

function setupReportUpload() {
  const dropZone = document.getElementById('report-drop-zone');
  const fileInput = document.getElementById('report-file-input');
  const testNameInput = document.getElementById('report-test-name');
  const uploadForm = document.getElementById('form-upload-report');
  const fileNameDisplay = document.getElementById('selected-file-name');
  const submitBtn = document.getElementById('btn-submit-report');

  if (!dropZone || !fileInput) return;

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('border-sky-500', 'bg-sky-500/10');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-sky-500', 'bg-sky-500/10');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      updateFileName();
    }
  });

  fileInput.addEventListener('change', updateFileName);

  function updateFileName() {
    if (fileInput.files && fileInput.files[0]) {
      fileNameDisplay.textContent = `Selected: ${fileInput.files[0].name} (${(fileInput.files[0].size / 1024 / 1024).toFixed(2)} MB)`;
      fileNameDisplay.classList.remove('hidden');
    } else {
      fileNameDisplay.textContent = '';
      fileNameDisplay.classList.add('hidden');
    }
  }

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const testName = testNameInput.value.trim();

    if (!testName) {
      showToast('Please enter the Diagnostic Test Name.', 'error');
      return;
    }

    if (!fileInput.files || !fileInput.files[0]) {
      showToast('Please select a report file.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('test_name', testName);
    formData.append('report_file', fileInput.files[0]);

    setLoading(submitBtn, true, 'Uploading & Encrypting Document...');

    const token = Auth.getToken();

    try {
      const res = await fetch('/api/patient/reports', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        showToast('Diagnostic report successfully added to your EHR!', 'success');
        testNameInput.value = '';
        fileInput.value = '';
        fileNameDisplay.classList.add('hidden');
        loadPatientDashboard();
      } else {
        showToast(data.message || 'Upload failed.', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Network error during report upload.', 'error');
    } finally {
      setLoading(submitBtn, false, 'Upload to Health Vault');
    }
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

async function loadPatientAppointments() {
  const container = document.getElementById('patient-appointments-container');
  if (!container) return;

  try {
    const token = Auth.getToken();
    const res = await fetch('/api/appointments', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();

    if (json.success && Array.isArray(json.data)) {
      renderPatientAppointments(json.data);
    } else {
      container.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">No appointments scheduled.</div>';
    }
  } catch (err) {
    container.innerHTML = '<div class="text-center py-6 text-slate-500 text-xs">Failed to load appointments.</div>';
  }
}

function renderPatientAppointments(appointments) {
  const container = document.getElementById('patient-appointments-container');
  if (!container) return;

  if (!appointments || appointments.length === 0) {
    container.innerHTML = `
      <div class="text-center py-6 text-slate-500 text-xs">
        No appointments booked yet. <a href="/doctors" class="text-sky-400 hover:underline font-bold">Find a doctor</a> to schedule your visit.
      </div>
    `;
    return;
  }

  container.innerHTML = appointments.map(apt => {
    let statusClass = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (apt.status === 'ACCEPTED') statusClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (apt.status === 'COMPLETED') statusClass = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    if (apt.status === 'CANCELLED' || apt.status === 'REJECTED') statusClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

    const isEmerg = Boolean(apt.is_emergency);
    const dateStr = apt.requested_date ? new Date(apt.requested_date).toISOString().slice(0, 10) : 'Upcoming';

    return `
      <div class="p-3.5 rounded-2xl bg-slate-900/60 border ${isEmerg ? 'border-red-500/40 bg-red-950/10' : 'border-slate-800'} flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="font-bold text-white text-sm">${escapeHtml(apt.doctor_name || 'Doctor')}</span>
            <span class="text-[11px] text-sky-400 font-medium">${escapeHtml(apt.doctor_specialization || 'Specialist')}</span>
            ${isEmerg ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">🚨 EMERGENCY</span>' : ''}
          </div>
          <div class="text-[11px] text-slate-400">
            <span>${escapeHtml(apt.hospital_name || 'Hospital')}</span>
            <span class="text-slate-500">&bull; ${escapeHtml(apt.hospital_area || 'Area')}</span>
          </div>
          <div class="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Date: <strong class="text-slate-200 font-mono">${dateStr}</strong></span>
            <span>&bull;</span>
            <span>Estimated Time: <strong class="text-slate-200 font-mono">${apt.scheduled_time || 'Pending triage'}</strong></span>
          </div>
          ${apt.emergency_reason ? `<div class="text-[10px] text-red-300 italic">Emergency note: ${escapeHtml(apt.emergency_reason)}</div>` : ''}
        </div>

        <div class="flex items-center gap-3 self-end sm:self-center">
          <div class="text-right">
            <div class="text-[10px] uppercase font-bold text-slate-500">Queue Serial</div>
            <div class="text-base font-black text-sky-300 font-mono">#${apt.serial_no ? String(apt.serial_no).padStart(2, '0') : '--'}</div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusClass}">
            ${apt.status}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
