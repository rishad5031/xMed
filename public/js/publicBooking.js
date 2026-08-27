// =============================================================
// xMED - Public Express Outpatient Booking Engine
// Accessible directly from Landing Page without prior login
// =============================================================

let cachedHospitals = [];

async function initPublicBooking() {
  const hospSelect = document.getElementById('public-booking-hospital');
  const dateInput = document.getElementById('public-booking-date');
  if (!hospSelect) return;

  // Set minimum date to today (YYYY-MM-DD)
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  try {
    const res = await fetch('/api/hospitals');
    const result = await res.json();

    if (result.success && result.data) {
      cachedHospitals = result.data;
      hospSelect.innerHTML = '<option value="">-- Select Hospital / Clinical Center --</option>' +
        cachedHospitals.map(h => `
          <option value="${h.hospital_id}">${h.name} (${h.area}, ${h.city})</option>
        `).join('');
    }
  } catch (err) {
    console.error('[PublicBooking] Error loading hospitals:', err);
  }

  hospSelect.addEventListener('change', handleHospitalChange);

  const form = document.getElementById('form-public-booking');
  if (form) {
    form.addEventListener('submit', handlePublicBookingSubmit);
  }
}

async function handleHospitalChange(e) {
  const hospitalId = e.target.value;
  const docSelect = document.getElementById('public-booking-doctor');
  const docFeeBadge = document.getElementById('public-booking-fee-badge');
  if (!docSelect) return;

  if (!hospitalId) {
    docSelect.innerHTML = '<option value="">-- Select Hospital First --</option>';
    docSelect.disabled = true;
    if (docFeeBadge) docFeeBadge.textContent = 'Fee: --';
    return;
  }

  docSelect.disabled = true;
  docSelect.innerHTML = '<option value="">Loading attending physicians...</option>';

  try {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctors`);
    const result = await res.json();

    if (result.success && result.data && result.data.length > 0) {
      docSelect.innerHTML = '<option value="">-- Select Doctor / Specialist --</option>' +
        result.data.map(d => `
          <option value="${d.doctor_id}" data-fee="${d.consultation_fee}">
            ${d.name} (${d.specialization}) • Shift: ${d.shift_start?.slice(0,5)} - ${d.shift_end?.slice(0,5)}
          </option>
        `).join('');
      docSelect.disabled = false;
    } else {
      docSelect.innerHTML = '<option value="">No active doctors found for this hospital</option>';
    }
  } catch (err) {
    console.error('[PublicBooking] Error loading doctors:', err);
    docSelect.innerHTML = '<option value="">Failed to load doctors</option>';
  }

  docSelect.addEventListener('change', (ev) => {
    const selectedOption = ev.target.options[ev.target.selectedIndex];
    const fee = selectedOption.getAttribute('data-fee');
    if (docFeeBadge && fee) {
      docFeeBadge.textContent = `Consultation Fee: ৳${parseFloat(fee).toFixed(2)}`;
    }
  });
}

async function handlePublicBookingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const feedbackEl = document.getElementById('public-booking-feedback');

  if (feedbackEl) {
    feedbackEl.classList.add('hidden');
  }

  const payload = {
    hospital_id: form.hospital_id.value,
    doctor_id: form.doctor_id.value,
    requested_date: form.requested_date.value,
    patient_uid: form.patient_uid ? form.patient_uid.value.trim() : '',
    patient_phone: form.patient_phone ? form.patient_phone.value.trim() : '',
    is_emergency: form.is_emergency ? form.is_emergency.checked : false,
    emergency_reason: form.emergency_reason ? form.emergency_reason.value.trim() : ''
  };

  if (!payload.hospital_id || !payload.doctor_id || !payload.requested_date) {
    alert('Please select hospital, doctor, and consultation date.');
    return;
  }

  if (!payload.patient_uid && !payload.patient_phone) {
    alert('Please provide your Citizen UID or Mobile Phone number for booking confirmation.');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="w-3.5 h-3.5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin"></span>
        <span>Registering Outpatient Token...</span>
      `;
    }

    const res = await fetch('/api/appointments/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.message || 'Booking request could not be completed.');
    }

    const apt = result.data;
    if (feedbackEl) {
      feedbackEl.className = 'p-6 rounded-2xl border liquid-card animate-liquid-spring block space-y-3';
      feedbackEl.innerHTML = `
        <div class="flex items-center gap-3 text-emerald-400">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center font-bold text-lg">✓</div>
          <div>
            <h4 class="text-sm sm:text-base font-black text-slate-100">${result.message}</h4>
            <p class="text-xs text-slate-400">Your request has been filed in the national FCFS hospital queue.</p>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase">Daily Token #</span>
            <strong class="text-sky-400 font-mono font-bold text-sm">#${apt.serial_no || 1}</strong>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase">Triage Status</span>
            <strong class="text-amber-400 font-bold text-sm">${apt.status || 'PENDING'}</strong>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase">Citizen Identifier</span>
            <strong class="text-teal-400 font-mono font-bold text-sm">${apt.patient_uid}</strong>
          </div>
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase">Consultation Date</span>
            <strong class="text-slate-200 font-mono font-bold text-sm">${payload.requested_date}</strong>
          </div>
        </div>

        <div class="text-[11px] text-slate-400 flex items-center justify-between pt-2">
          <span>Present this Token Number at Hospital Registration Counter.</span>
          <a href="/login" class="text-teal-400 font-bold hover:underline">Citizen Login &rarr;</a>
        </div>
      `;
      feedbackEl.classList.remove('hidden');
    }

    form.reset();
  } catch (err) {
    if (feedbackEl) {
      feedbackEl.className = 'p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs block';
      feedbackEl.textContent = err.message;
      feedbackEl.classList.remove('hidden');
    } else {
      alert(err.message);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <span>Confirm & Book Appointment</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', initPublicBooking);
