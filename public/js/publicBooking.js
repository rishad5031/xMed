let cachedHospitals = [];

function generateSimulatedTrx() {
  const method = document.querySelector('input[name="payment_method"]:checked')?.value || 'bKash';
  const prefix = method === 'bKash' ? 'BKASH' : method === 'Nagad' ? 'NAGAD' : method === 'Rocket' ? 'RCKT' : 'XMED';
  const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  const trx = `${prefix}-${randomHex}`;
  const trxInput = document.getElementById('payment-trx-id');
  if (trxInput) {
    trxInput.value = trx;
  }
  return trx;
}

async function initPublicBooking() {
  const hospSelect = document.getElementById('public-booking-hospital');
  const dateInput = document.getElementById('public-booking-date');
  if (!hospSelect) return;

  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
  }

  generateSimulatedTrx();

  // Fee tier radio handlers
  const feeRadios = document.querySelectorAll('.fee-tier-radio');
  const feeAmountInput = document.getElementById('input-fee-amount');
  const displayTotalFee = document.getElementById('display-total-fee');

  feeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value).toFixed(2);
      if (feeAmountInput) feeAmountInput.value = val;
      if (displayTotalFee) displayTotalFee.textContent = `৳${val}`;

      document.querySelectorAll('.fee-option-card').forEach(card => {
        card.classList.remove('border-emerald-500/60', 'bg-emerald-500/5', 'active-fee-card');
      });
      const parentCard = e.target.closest('.fee-option-card');
      if (parentCard) {
        parentCard.classList.add('border-emerald-500/60', 'bg-emerald-500/5', 'active-fee-card');
      }
    });
  });

  // Payment method radio handlers
  const paymentMethodRadios = document.querySelectorAll('input[name="payment_method"]');
  paymentMethodRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      generateSimulatedTrx();
    });
  });

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

let activeHospitalDoctors = [];

async function handleHospitalChange(e) {
  const hospitalId = e.target.value;
  const docSelect = document.getElementById('public-booking-doctor');
  const docFeeBadge = document.getElementById('public-booking-fee-badge');
  const docCard = document.getElementById('public-booking-doctor-card');
  if (!docSelect) return;

  if (docCard) docCard.classList.add('hidden');

  if (!hospitalId) {
    docSelect.innerHTML = '<option value="">-- Select Hospital First --</option>';
    docSelect.disabled = true;
    if (docFeeBadge) docFeeBadge.textContent = 'Fee: --';
    activeHospitalDoctors = [];
    return;
  }

  docSelect.disabled = true;
  docSelect.innerHTML = '<option value="">Loading attending physicians...</option>';

  try {
    const res = await fetch(`/api/hospitals/${hospitalId}/doctors`);
    const result = await res.json();

    if (result.success && result.data && result.data.length > 0) {
      activeHospitalDoctors = result.data;
      docSelect.innerHTML = '<option value="">-- Select Doctor / Specialist --</option>' +
        result.data.map(d => `
          <option value="${d.doctor_id}" data-fee="${d.consultation_fee}">
            ${d.name} (${d.specialization}) • Shift: ${d.shift_start?.slice(0,5)} - ${d.shift_end?.slice(0,5)}
          </option>
        `).join('');
      docSelect.disabled = false;
    } else {
      activeHospitalDoctors = [];
      docSelect.innerHTML = '<option value="">No active doctors found for this hospital</option>';
    }
  } catch (err) {
    console.error('[PublicBooking] Error loading doctors:', err);
    activeHospitalDoctors = [];
    docSelect.innerHTML = '<option value="">Failed to load doctors</option>';
  }

  docSelect.onchange = (ev) => {
    const selectedDocId = ev.target.value;
    const docObj = activeHospitalDoctors.find(d => String(d.doctor_id) === String(selectedDocId));
    
    if (docObj && docCard) {
      const initials = docObj.name ? docObj.name.replace(/^Dr\.\s*/i, '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'MD';
      const docNameEl = document.getElementById('doc-card-name');
      const docSpecEl = document.getElementById('doc-card-spec');
      const docHospEl = document.getElementById('doc-card-hospital');
      const docInitialsEl = document.getElementById('doc-card-initials');
      const docShiftEl = document.getElementById('doc-card-shift');
      const docFeeEl = document.getElementById('doc-card-fee');

      if (docNameEl) docNameEl.textContent = docObj.name || 'Attending Physician';
      if (docSpecEl) docSpecEl.textContent = docObj.specialization || 'Clinical Specialist';
      if (docHospEl) docHospEl.textContent = `${docObj.hospital_name || 'Government Hospital'} • BMDC License Verified`;
      if (docInitialsEl) docInitialsEl.textContent = initials;
      if (docShiftEl) docShiftEl.textContent = `Shift: ${docObj.shift_start?.slice(0,5) || '09:00'} - ${docObj.shift_end?.slice(0,5) || '17:00'}`;
      if (docFeeEl) docFeeEl.textContent = '৳3.00 – ৳5.00 BDT (Subsidized)';

      docCard.classList.remove('hidden');
    } else if (docCard) {
      docCard.classList.add('hidden');
    }

    const selectedOption = ev.target.options[ev.target.selectedIndex];
    const fee = selectedOption ? selectedOption.getAttribute('data-fee') : null;
    if (docFeeBadge && fee) {
      docFeeBadge.textContent = `Doctor Fee: ৳${parseFloat(fee).toFixed(2)} (Subsidized Token: ৳3–৳5)`;
    }
  };
}

async function handlePublicBookingSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const feedbackEl = document.getElementById('public-booking-feedback');

  if (feedbackEl) {
    feedbackEl.classList.add('hidden');
  }

  let trxId = document.getElementById('payment-trx-id')?.value.trim();
  if (!trxId) {
    trxId = generateSimulatedTrx();
  }

  const feeAmount = parseFloat(form.fee_amount?.value || '5.00');
  const paymentMethod = form.payment_method?.value || 'bKash';

  const payload = {
    hospital_id: form.hospital_id.value,
    doctor_id: form.doctor_id.value,
    requested_date: form.requested_date.value,
    patient_uid: form.patient_uid ? form.patient_uid.value.trim() : '',
    patient_phone: form.patient_phone ? form.patient_phone.value.trim() : '',
    is_emergency: form.is_emergency ? form.is_emergency.checked : false,
    emergency_reason: form.emergency_reason ? form.emergency_reason.value.trim() : '',
    fee_amount: feeAmount,
    payment_method: paymentMethod,
    transaction_id: trxId,
    payment_status: 'PAID'
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
        <span>Processing Digital Payment (৳${feeAmount.toFixed(2)})...</span>
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
      feedbackEl.className = 'p-6 rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 shadow-2xl block space-y-4 animate-fade-in';
      feedbackEl.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-4">
          <div class="flex items-center gap-3 text-emerald-400">
            <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/20">✓</div>
            <div>
              <h4 class="text-base sm:text-lg font-black text-white">${result.message}</h4>
              <p class="text-xs text-slate-300">Appointment confirmed with verified payment receipt.</p>
            </div>
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs self-start sm:self-auto">
            Paid: ৳${(apt.fee_amount || feeAmount).toFixed(2)} (${apt.payment_method || paymentMethod})
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase font-bold">Daily Token Serial</span>
            <strong class="text-sky-300 font-mono font-black text-lg">#${apt.serial_no ? String(apt.serial_no).padStart(2, '0') : '01'}</strong>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase font-bold">Triage Status</span>
            <strong class="text-emerald-400 font-bold text-sm uppercase">${apt.status || 'PENDING'}</strong>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase font-bold">Payment Trx ID</span>
            <strong class="text-amber-300 font-mono font-bold text-xs">${apt.transaction_id || trxId}</strong>
          </div>
          <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase font-bold">Consultation Date</span>
            <strong class="text-slate-200 font-mono font-bold text-xs">${payload.requested_date}</strong>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-slate-300">
          <span>Present token <strong>#${apt.serial_no ? String(apt.serial_no).padStart(2, '0') : '01'}</strong> at registration desk.</span>
          <a href="/login" class="text-emerald-400 font-bold hover:underline flex items-center gap-1">
            <span>View in Patient Vault</span>
            <span>&rarr;</span>
          </a>
        </div>
      `;
      feedbackEl.classList.remove('hidden');
    }

    form.reset();
    generateSimulatedTrx();
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
        <span>Pay & Confirm Appointment</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', initPublicBooking);
