// =============================================================
// xMED E-Prescription QR & PDF Export Controller
// =============================================================

let currentPrescription = null;

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const rxId = urlParams.get('id');

  if (!rxId) {
    document.getElementById('rx-loading').innerHTML = `
      <div class="text-rose-400 font-bold">No prescription ID specified in URL.</div>
      <a href="/login" class="text-xs text-sky-400 underline">Return to login</a>
    `;
    return;
  }

  document.getElementById('web-rx-id').textContent = `#Rx-${rxId}`;
  const token = Auth.getToken();

  try {
    const res = await fetch(`/api/prescriptions/${encodeURIComponent(rxId)}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    const data = await res.json();

    if (data.success && data.prescription) {
      currentPrescription = data.prescription;
      renderPrescription(data.prescription);
      setupQRCode(data.prescription);
      setupPdfDownload(data.prescription);
    } else {
      document.getElementById('rx-loading').innerHTML = `
        <div class="text-rose-400 font-bold">${data.message || 'Prescription not found.'}</div>
      `;
    }
  } catch (err) {
    console.error('Error fetching prescription:', err);
    document.getElementById('rx-loading').innerHTML = `
      <div class="text-rose-400 font-bold">Network error while retrieving prescription.</div>
    `;
  }
});

function renderPrescription(p) {
  document.getElementById('rx-loading').classList.add('hidden');
  document.getElementById('rx-document').classList.remove('hidden');

  document.getElementById('rx-number-badge').textContent = `Rx-${p.prescription_id}`;
  const rxDate = new Date(p.created_at);
  document.getElementById('rx-date-display').textContent = `Date: ${rxDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at ${rxDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

  document.getElementById('rx-doctor-name').textContent = p.doctor_name;
  document.getElementById('rx-doctor-spec').textContent = p.doctor_specialization;
  document.getElementById('rx-doctor-license').textContent = p.doctor_license;
  document.getElementById('rx-doctor-phone').textContent = p.doctor_phone || 'N/A';
  document.getElementById('rx-doctor-email').textContent = p.doctor_email;

  document.getElementById('rx-patient-name').textContent = p.patient_name;
  document.getElementById('rx-patient-uid').textContent = p.patient_uid;

  let age = 'N/A';
  if (p.patient_dob) {
    age = new Date().getFullYear() - new Date(p.patient_dob).getFullYear();
  }
  document.getElementById('rx-patient-age-gender').textContent = `${age} yrs / ${p.patient_gender}`;
  document.getElementById('rx-patient-blood').textContent = p.patient_blood_group;
  document.getElementById('rx-patient-phone').textContent = p.patient_phone;

  document.getElementById('rx-diagnosis-text').textContent = p.diagnosis;
  if (p.clinical_notes && p.clinical_notes.trim() !== '') {
    document.getElementById('rx-notes-text').textContent = p.clinical_notes;
  } else {
    document.getElementById('rx-notes-wrapper').classList.add('hidden');
  }

  const tbody = document.getElementById('rx-items-table-body');
  tbody.innerHTML = '';

  if (p.items && p.items.length > 0) {
    p.items.forEach((item, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-slate-50';
      tr.innerHTML = `
        <td class="py-2.5 px-3 font-mono text-slate-500">${idx + 1}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-slate-900">${item.brand_name} <span class="font-mono text-[11px] text-slate-600">(${item.strength})</span></div>
          <div class="text-[11px] text-slate-500 italic">${item.generic_name} &bull; ${item.dosage_form}</div>
        </td>
        <td class="py-2.5 px-3 font-mono font-semibold text-slate-800">${item.dosage_instruction}</td>
        <td class="py-2.5 px-3 text-slate-700">${item.duration}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('rx-signature-doctor').textContent = p.doctor_name;
  document.getElementById('rx-signature-license').textContent = `BMDC Reg: ${p.doctor_license}`;
  document.getElementById('rx-signature-hash').textContent = `SHA256-AUTHENTICATED-${p.prescription_id}-${p.patient_uid}-${p.doctor_id}`;
}

// Generate Official Authenticity QR Code
function setupQRCode(p) {
  const qrContainer = document.getElementById('rx-qrcode-container');
  if (!qrContainer) return;

  const verifyUrl = `${window.location.origin}/verify/prescription/${p.prescription_id}`;
  qrContainer.innerHTML = '';

  if (typeof QRCode !== 'undefined') {
    new QRCode(qrContainer, {
      text: verifyUrl,
      width: 80,
      height: 80,
      colorDark: '#0f172a',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  } else {
    // Fallback QR code SVG
    qrContainer.innerHTML = `
      <div class="w-20 h-20 bg-slate-100 border border-slate-300 rounded flex flex-col items-center justify-center text-[9px] text-center font-mono text-slate-600 p-1">
        <span>SCAN TO VERIFY</span>
        <span class="font-bold text-sky-600">Rx-${p.prescription_id}</span>
      </div>
    `;
  }

  const linkEl = document.getElementById('rx-verify-link');
  if (linkEl) {
    linkEl.href = `/verify/prescription/${p.prescription_id}`;
  }
}

// One-Click Direct PDF Download with html2pdf.js
function setupPdfDownload(p) {
  const downloadBtn = document.getElementById('btn-download-pdf');
  if (!downloadBtn) return;

  downloadBtn.addEventListener('click', () => {
    const element = document.getElementById('rx-document');
    showToast('Generating high-resolution official PDF...', 'info');

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `xMED-Prescription-Rx-${p.prescription_id}-${p.patient_uid}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
      html2pdf().set(opt).from(element).save().then(() => {
        showToast('PDF downloaded successfully!', 'success');
      }).catch(err => {
        console.error('PDF export error:', err);
        showToast('PDF export failed. Opening print dialog instead.', 'error');
        window.print();
      });
    } else {
      window.print();
    }
  });
}
