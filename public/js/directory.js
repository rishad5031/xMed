// =============================================================
// xMED Doctors & Hospitals Directory Client Controller
// File: public/js/directory.js
// =============================================================

let allHospitalsData = [];
let allDoctorsList = [];

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const areaFilter = document.getElementById('areaFilter');
  const bookingModal = document.getElementById('bookingModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const bookingForm = document.getElementById('bookingForm');
  const modalIsEmergency = document.getElementById('modalIsEmergency');
  const emergencyReasonGroup = document.getElementById('emergencyReasonGroup');
  const modalDate = document.getElementById('modalDate');

  // Set minimum date to today
  const today = new Date().toISOString().slice(0, 10);
  modalDate.min = today;
  modalDate.value = today;

  // Auto-fill logged-in patient UID if available
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      if (u.role === 'patient' && u.uid) {
        document.getElementById('modalPatientUid').value = u.uid;
      }
    } catch (e) {}
  }

  // Load hospitals & doctors from API
  loadHospitals();

  // Search & Area Filter listeners
  searchInput.addEventListener('input', filterAndRenderDoctors);
  areaFilter.addEventListener('change', () => {
    loadHospitals(areaFilter.value);
  });

  // Emergency checkbox toggle
  modalIsEmergency.addEventListener('change', () => {
    if (modalIsEmergency.checked) {
      emergencyReasonGroup.classList.remove('hidden');
    } else {
      emergencyReasonGroup.classList.add('hidden');
    }
  });

  // Modal close handlers
  closeModalBtn.addEventListener('click', closeModal);
  cancelModalBtn.addEventListener('click', closeModal);
  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) closeModal();
  });

  // Booking Form Submission via sp_book_appointment endpoint
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBookingBtn');
    const notice = document.getElementById('bookingResultNotice');

    const doctorId = document.getElementById('modalDoctorId').value;
    const hospitalId = document.getElementById('modalHospitalId').value;
    const patientUid = document.getElementById('modalPatientUid').value.trim();
    const requestedDate = document.getElementById('modalDate').value;
    const isEmergency = document.getElementById('modalIsEmergency').checked;
    const emergencyReason = document.getElementById('modalEmergencyReason').value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Booking...';
    notice.className = 'p-3 rounded-xl text-xs font-medium bg-slate-800 text-slate-300';
    notice.textContent = 'Submitting reservation to National EHR queue...';
    notice.classList.remove('hidden');

    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          patient_uid: patientUid,
          doctor_id: doctorId,
          hospital_id: hospitalId,
          requested_date: requestedDate,
          is_emergency: isEmergency,
          emergency_reason: isEmergency ? emergencyReason : null
        })
      });

      const json = await res.json();

      if (json.success && json.data) {
        notice.className = 'p-3 rounded-xl text-xs font-semibold bg-emerald-950/80 border border-emerald-800 text-emerald-300';
        notice.innerHTML = `
          <div class="font-bold text-sm text-emerald-200 mb-1">🎉 ${json.message}</div>
          <div>Patient: <span class="text-white">${json.data.patient_name || patientUid}</span></div>
          <div>Allotted Serial: <span class="font-bold text-white">#${json.data.serial_no}</span> &bull; Estimated Time: <span class="text-white">${json.data.scheduled_time || 'On schedule'}</span></div>
          <div class="mt-1 text-[11px] text-emerald-400">View live status in your Patient Vault.</div>
        `;
        setTimeout(() => {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Booking';
        }, 2000);
      } else {
        notice.className = 'p-3 rounded-xl text-xs font-semibold bg-red-950/80 border border-red-800 text-red-300';
        notice.textContent = json.message || 'Failed to book appointment.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Booking';
      }
    } catch (err) {
      notice.className = 'p-3 rounded-xl text-xs font-semibold bg-red-950/80 border border-red-800 text-red-300';
      notice.textContent = 'Network or server error while booking appointment.';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Booking';
    }
  });
});

async function loadHospitals(area = '') {
  const grid = document.getElementById('doctorsGrid');
  grid.innerHTML = '<div class="col-span-full py-12 text-center text-slate-500 text-xs">Loading doctors...</div>';

  try {
    let url = '/api/hospitals';
    if (area) url += `?area=${encodeURIComponent(area)}`;

    const res = await fetch(url);
    const json = await res.json();

    if (json.success && Array.isArray(json.data)) {
      allHospitalsData = json.data;
      // Flatten doctors with hospital context
      allDoctorsList = [];
      allHospitalsData.forEach(h => {
        if (Array.isArray(h.doctors)) {
          h.doctors.forEach(d => {
            allDoctorsList.push({
              ...d,
              hospital_id: h.hospital_id,
              hospital_name: h.name,
              hospital_area: h.area,
              hospital_city: h.city,
              hospital_address: h.address
            });
          });
        }
      });

      filterAndRenderDoctors();
    } else {
      grid.innerHTML = '<div class="col-span-full py-12 text-center text-red-400 text-xs">Failed to load directory.</div>';
    }
  } catch (err) {
    grid.innerHTML = '<div class="col-span-full py-12 text-center text-red-400 text-xs">Network error loading directory.</div>';
  }
}

function filterAndRenderDoctors() {
  const searchInput = document.getElementById('searchInput');
  const term = (searchInput.value || '').toLowerCase().trim();
  const countEl = document.getElementById('doctorCount');
  const grid = document.getElementById('doctorsGrid');

  const filtered = allDoctorsList.filter(d => {
    const matchName = (d.name || '').toLowerCase().includes(term);
    const matchSpec = (d.specialization || '').toLowerCase().includes(term);
    const matchHosp = (d.hospital_name || '').toLowerCase().includes(term);
    return matchName || matchSpec || matchHosp;
  });

  countEl.textContent = filtered.length;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500 text-xs">
        No doctors found matching "${term}". Try another specialty or location.
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(d => `
    <div class="glass-card-sm rounded-2xl p-5 flex flex-col justify-between hover:border-sky-500/40 transition-all group">
      <div>
        <!-- Doctor Top Row -->
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-sky-500/20">
              Dr
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">${escapeHtml(d.name)}</h3>
                <svg class="w-3.5 h-3.5 text-sky-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <span class="text-[11px] font-semibold text-sky-400">${escapeHtml(d.specialization)}</span>
            </div>
          </div>
          <span class="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            ৳ ${parseFloat(d.consultation_fee || 500).toFixed(0)}
          </span>
        </div>

        <!-- Hospital Info -->
        <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mb-2">
          <svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
          </svg>
          <span class="truncate font-medium text-slate-300">${escapeHtml(d.hospital_name)}</span>
          <span class="text-slate-500">&bull; ${escapeHtml(d.hospital_area)}</span>
        </div>

        <!-- Schedule & Shifts -->
        <div class="text-[11px] text-slate-400 flex items-center gap-1.5 mb-3">
          <svg class="w-3.5 h-3.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>${escapeHtml(d.working_days || 'Sat-Wed')}</span>
          <span class="text-slate-500">&bull; ${d.shift_start ? d.shift_start.slice(0,5) : '09:00'} - ${d.shift_end ? d.shift_end.slice(0,5) : '17:00'}</span>
        </div>

        <!-- Biography snippet -->
        <p class="text-[11px] text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          ${escapeHtml(d.biography || 'Consultant Specialist offering comprehensive outpatient diagnostic evaluations and treatment management.')}
        </p>
      </div>

      <!-- Book Visit Action -->
      <button 
        onclick="openBookingModal(${d.doctor_id}, ${d.hospital_id}, '${escapeQuote(d.name)}', '${escapeQuote(d.specialization)}', '${escapeQuote(d.hospital_name)}')"
        class="w-full py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500 text-sky-300 hover:text-white border border-sky-500/30 hover:border-sky-500 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
      >
        <span>Book Appointment</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>
  `).join('');
}

function openBookingModal(doctorId, hospitalId, doctorName, spec, hospitalName) {
  document.getElementById('modalDoctorId').value = doctorId;
  document.getElementById('modalHospitalId').value = hospitalId;
  document.getElementById('modalDoctorSub').textContent = `${doctorName} (${spec}) • ${hospitalName}`;
  document.getElementById('modalIsEmergency').checked = false;
  document.getElementById('emergencyReasonGroup').classList.add('hidden');
  document.getElementById('modalEmergencyReason').value = '';
  document.getElementById('bookingResultNotice').classList.add('hidden');

  document.getElementById('bookingModal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('bookingModal').classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeQuote(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'");
}
