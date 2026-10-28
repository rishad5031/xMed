document.addEventListener('DOMContentLoaded', () => {
  const user = Auth.getUser();
  const token = Auth.getToken();
  if (token && user) {
    if (window.location.pathname === '/login' || window.location.pathname === '/register') {
      if (user.role === 'doctor') {
        window.location.href = '/doctor-dashboard';
      } else {
        window.location.href = '/patient-dashboard';
      }
    }
  }

  setupLoginTabs();
  setupRegisterTabs();
  setupAuthForms();
});

function setupLoginTabs() {
  const patientTabBtn = document.getElementById('tab-patient-login');
  const doctorTabBtn = document.getElementById('tab-doctor-login');
  const patientForm = document.getElementById('form-patient-login');
  const doctorForm = document.getElementById('form-doctor-login');
  const demoCitizensStrip = document.getElementById('demo-citizens-strip');
  const demoDoctorsStrip = document.getElementById('demo-doctors-strip');

  if (!patientTabBtn || !doctorTabBtn) return;

  const activeClasses = ['bg-emerald-500', 'bg-sky-500', 'bg-teal-500', 'text-white', 'shadow-lg', 'shadow-emerald-500/25', 'shadow-teal-500/25'];
  const inactiveClasses = ['text-slate-400', 'hover:text-white', 'bg-transparent', 'shadow-none'];

  patientTabBtn.addEventListener('click', () => {
    patientTabBtn.classList.remove(...activeClasses, ...inactiveClasses);
    doctorTabBtn.classList.remove(...activeClasses, ...inactiveClasses);

    patientTabBtn.classList.add('bg-emerald-500', 'text-white', 'shadow-lg', 'shadow-emerald-500/25');
    doctorTabBtn.classList.add('text-slate-400', 'hover:text-white', 'bg-transparent');

    if (patientForm) patientForm.classList.remove('hidden');
    if (doctorForm) doctorForm.classList.add('hidden');
    if (demoCitizensStrip) demoCitizensStrip.classList.remove('hidden');
    if (demoDoctorsStrip) demoDoctorsStrip.classList.add('hidden');
  });

  doctorTabBtn.addEventListener('click', () => {
    patientTabBtn.classList.remove(...activeClasses, ...inactiveClasses);
    doctorTabBtn.classList.remove(...activeClasses, ...inactiveClasses);

    doctorTabBtn.classList.add('bg-teal-500', 'text-white', 'shadow-lg', 'shadow-teal-500/25');
    patientTabBtn.classList.add('text-slate-400', 'hover:text-white', 'bg-transparent');

    if (doctorForm) doctorForm.classList.remove('hidden');
    if (patientForm) patientForm.classList.add('hidden');
    if (demoDoctorsStrip) demoDoctorsStrip.classList.remove('hidden');
    if (demoCitizensStrip) demoCitizensStrip.classList.add('hidden');
  });
}

function setupRegisterTabs() {
  const patientRegTabBtn = document.getElementById('tab-patient-reg');
  const doctorRegTabBtn = document.getElementById('tab-doctor-reg');
  const patientRegForm = document.getElementById('form-patient-reg');
  const doctorRegForm = document.getElementById('form-doctor-reg');

  if (!patientRegTabBtn || !doctorRegTabBtn) return;

  const activeClasses = ['bg-emerald-500', 'bg-sky-500', 'bg-teal-500', 'text-white', 'shadow-lg', 'shadow-emerald-500/25', 'shadow-teal-500/25'];
  const inactiveClasses = ['text-slate-400', 'hover:text-white', 'bg-transparent', 'shadow-none'];

  patientRegTabBtn.addEventListener('click', () => {
    patientRegTabBtn.classList.remove(...activeClasses, ...inactiveClasses);
    doctorRegTabBtn.classList.remove(...activeClasses, ...inactiveClasses);

    patientRegTabBtn.classList.add('bg-emerald-500', 'text-white', 'shadow-lg', 'shadow-emerald-500/25');
    doctorRegTabBtn.classList.add('text-slate-400', 'hover:text-white', 'bg-transparent');

    if (patientRegForm) patientRegForm.classList.remove('hidden');
    if (doctorRegForm) doctorRegForm.classList.add('hidden');
  });

  doctorRegTabBtn.addEventListener('click', () => {
    patientRegTabBtn.classList.remove(...activeClasses, ...inactiveClasses);
    doctorRegTabBtn.classList.remove(...activeClasses, ...inactiveClasses);

    doctorRegTabBtn.classList.add('bg-teal-500', 'text-white', 'shadow-lg', 'shadow-teal-500/25');
    patientRegTabBtn.classList.add('text-slate-400', 'hover:text-white', 'bg-transparent');

    if (doctorRegForm) doctorRegForm.classList.remove('hidden');
    if (patientRegForm) patientRegForm.classList.add('hidden');
  });
}

function setupAuthForms() {
  const patientLoginForm = document.getElementById('form-patient-login');
  if (patientLoginForm) {
    patientLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('patient-login-id').value.trim();
      const password = document.getElementById('patient-login-pass').value;
      const submitBtn = patientLoginForm.querySelector('button[type="submit"]');

      setLoading(submitBtn, true, 'Verifying National UID...');

      try {
        const res = await fetch('/api/auth/login-citizen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();

        if (data.success) {
          Auth.setSession(data.token, data.user);
          if (window.AuthState) window.AuthState.setSession(data.token, data.user);
          showToast(`Welcome back, ${data.user.full_name}!`, 'success');
          setTimeout(() => {
            window.location.href = '/patient-dashboard';
          }, 600);
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
      } catch (err) {
        showToast('Network connection error', 'error');
      } finally {
        setLoading(submitBtn, false, 'Sign In');
      }
    });
  }

  const doctorLoginForm = document.getElementById('form-doctor-login');
  if (doctorLoginForm) {
    doctorLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identifier = document.getElementById('doctor-login-id').value.trim();
      const password = document.getElementById('doctor-login-pass').value;
      const submitBtn = doctorLoginForm.querySelector('button[type="submit"]');

      setLoading(submitBtn, true, 'Verifying BMDC Credentials...');

      try {
        const res = await fetch('/api/auth/login-doctor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        const data = await res.json();

        if (data.success) {
          Auth.setSession(data.token, data.user);
          if (window.AuthState) window.AuthState.setSession(data.token, data.user);
          showToast(`Welcome Dr. ${data.user.full_name}!`, 'success');
          setTimeout(() => {
            window.location.href = '/doctor-dashboard';
          }, 600);
        } else {
          showToast(data.message || 'Login failed', 'error');
        }
      } catch (err) {
        showToast('Network connection error', 'error');
      } finally {
        setLoading(submitBtn, false, 'Sign In');
      }
    });
  }

  const citizenRegForm = document.getElementById('form-patient-reg');
  if (citizenRegForm) {
    citizenRegForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const full_name = document.getElementById('reg-name').value.trim();
      const dob = document.getElementById('reg-dob').value;
      const gender = document.getElementById('reg-gender').value;
      const blood_group = document.getElementById('reg-blood').value;
      const phone = document.getElementById('reg-phone').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-pass').value;
      const submitBtn = citizenRegForm.querySelector('button[type="submit"]');

      setLoading(submitBtn, true, 'Generating Unique National UID...');

      try {
        const res = await fetch('/api/auth/register-citizen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_name, dob, gender, blood_group, phone, email, password })
        });
        const data = await res.json();

        if (data.success) {
          Auth.setSession(data.token, data.user);
          showToast(`Registered successfully! Your UID: ${data.user.uid}`, 'success', 5000);
          setTimeout(() => {
            window.location.href = '/patient-dashboard';
          }, 900);
        } else {
          showToast(data.message || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast('Network error during registration', 'error');
      } finally {
        setLoading(submitBtn, false, 'Create Citizen UID');
      }
    });
  }

  const doctorRegForm = document.getElementById('form-doctor-reg');
  if (doctorRegForm) {
    doctorRegForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const license_no = document.getElementById('doc-license').value.trim();
      const full_name = document.getElementById('doc-name').value.trim();
      const specialization = document.getElementById('doc-spec').value.trim();
      const phone = document.getElementById('doc-phone').value.trim();
      const email = document.getElementById('doc-email').value.trim();
      const password = document.getElementById('doc-pass').value;
      const submitBtn = doctorRegForm.querySelector('button[type="submit"]');

      setLoading(submitBtn, true, 'Validating Medical Credentials...');

      try {
        const res = await fetch('/api/auth/register-doctor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ license_no, full_name, specialization, phone, email, password })
        });
        const data = await res.json();

        if (data.success) {
          Auth.setSession(data.token, data.user);
          showToast('Doctor profile created successfully!', 'success');
          setTimeout(() => {
            window.location.href = '/doctor-dashboard';
          }, 800);
        } else {
          showToast(data.message || 'Doctor registration failed', 'error');
        }
      } catch (err) {
        showToast('Network error during doctor registration', 'error');
      } finally {
        setLoading(submitBtn, false, 'Submit for Verification');
      }
    });
  }
}

function setLoading(btn, isLoading, text) {
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${text}
      </span>
    `;
  } else {
    btn.disabled = false;
    btn.innerHTML = text || btn.dataset.originalText;
  }
}

function fillDemoPatient() {
  const idInput = document.getElementById('patient-login-id');
  const passInput = document.getElementById('patient-login-pass');
  if (idInput && passInput) {
    idInput.value = 'BD-2026-8841';
    passInput.value = 'Patient@123';
    showToast('Filled demo citizen credentials (BD-2026-8841)', 'info');
  }
}

function fillDemoDoctor() {
  const idInput = document.getElementById('doctor-login-id');
  const passInput = document.getElementById('doctor-login-pass');
  if (idInput && passInput) {
    idInput.value = 'doctor@xmed.gov.bd';
    passInput.value = 'Doctor@123';
    showToast('Filled demo doctor credentials (Dr. Tanvir Ahmed)', 'info');
  }
}
