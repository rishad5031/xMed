// =============================================================
// xMED Massive Clinical Seed Data Generator
// Unified Seeding Pipeline: 6 Hospitals, 20 Doctors, 100 Patients,
// 500+ Historical Prescriptions, OTC Self-Meds, and 50+ Multi-Status Appointments
// All passwords default to: Password123!
// =============================================================

const bcrypt = require('bcryptjs');
const { query, getConnection } = require('../config/db');

async function seedDatabase() {
  console.log('======================================================');
  console.log('🚀 Starting xMED Unified Migration & Seeding Pipeline...');
  console.log('======================================================\n');

  try {
    // 1. Generate Global Password Hash
    const rawPassword = 'Password123!';
    console.log(`[1/6] Hashing global password "${rawPassword}"...`);
    const passwordHash = bcrypt.hashSync(rawPassword, 10);
    console.log('✓ Password hash generated.\n');

    // 2. Seed 6 Distinct Hospitals
    console.log('[2/6] Seeding 6 Distinct Academic & Specialized Hospitals...');
    const hospitalData = [
      {
        name: 'Dhanmondi Care Hospital',
        area: 'Dhanmondi',
        city: 'Dhaka',
        address: 'House 42, Road 7/A, Dhanmondi, Dhaka-1209',
        contact_number: '+88029661234'
      },
      {
        name: 'Uttara Central Specialized Hospital',
        area: 'Uttara',
        city: 'Dhaka',
        address: 'Sector 3, Rabindra Sarani, Uttara, Dhaka-1230',
        contact_number: '+88028954321'
      },
      {
        name: 'Mirpur General Hospital',
        area: 'Mirpur',
        city: 'Dhaka',
        address: 'Section 10, Mirpur Circle-10, Dhaka-1216',
        contact_number: '+88029012345'
      },
      {
        name: 'Gulshan Apex Medical Centre',
        area: 'Gulshan',
        city: 'Dhaka',
        address: 'Road 113, Block D, Gulshan-2, Dhaka-1212',
        contact_number: '+88028829988'
      },
      {
        name: 'Mohakhali National Health Institute',
        area: 'Mohakhali',
        city: 'Dhaka',
        address: 'TB Gate, Mohakhali Health Complex, Dhaka-1212',
        contact_number: '+88029881122'
      },
      {
        name: 'Chittagong Medical Center',
        area: 'Agrabad',
        city: 'Chittagong',
        address: 'Agrabad Commercial Area, Chittagong-4100',
        contact_number: '+88031712233'
      }
    ];

    const hospitalIds = [];
    for (const h of hospitalData) {
      const sql = `
        INSERT INTO hospitals (name, area, city, address, contact_number)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          area = VALUES(area),
          city = VALUES(city),
          address = VALUES(address),
          contact_number = VALUES(contact_number);
      `;
      await query(sql, [h.name, h.area, h.city, h.address, h.contact_number]);

      const [row] = await query('SELECT hospital_id FROM hospitals WHERE name = ? LIMIT 1;', [h.name]);
      hospitalIds.push(row.hospital_id);
    }
    console.log(`✓ Successfully seeded/verified 6 Hospitals (${hospitalIds.length} IDs mapped).\n`);

    // 3. Seed 20 Unique Doctors (Distributed & Enhanced)
    console.log('[3/6] Seeding 20 Unique Certified Doctors with Shifts & Biographies...');
    const doctorProfiles = [
      {
        name: 'Dr. Tanvir Ahmed',
        spec: 'Cardiology',
        phone: '+8801711000001',
        email: 'dr.tanvir@xmed.gov.bd',
        hospIndex: 0, // Dhanmondi
        fee: 1000.00,
        days: 'Sat,Sun,Mon,Tue,Wed',
        start: '09:00:00',
        end: '13:00:00',
        slots: 20,
        bio: 'MBBS (DMC), FCPS (Cardiology), Fellow at Royal College of Physicians. 15+ years clinical experience in cardiovascular risk modeling, hypertension, and coronary interventions.'
      },
      {
        name: 'Dr. Nusrat Jahan Chowdhury',
        spec: 'Pulmonology',
        phone: '+8801711000002',
        email: 'dr.nusrat@xmed.gov.bd',
        hospIndex: 1, // Uttara
        fee: 800.00,
        days: 'Sun,Mon,Tue,Wed,Thu',
        start: '16:00:00',
        end: '20:00:00',
        slots: 25,
        bio: 'MBBS (SSMC), MD (Pulmonology). Senior Consultant Chest Specialist with expertise in chronic bronchial asthma, COPD, and post-viral pulmonary fibrosis.'
      },
      {
        name: 'Dr. Shakil Hossain',
        spec: 'Dermatology',
        phone: '+8801711000003',
        email: 'dr.shakil@xmed.gov.bd',
        hospIndex: 2, // Mirpur
        fee: 600.00,
        days: 'Sat,Mon,Wed,Fri',
        start: '10:00:00',
        end: '18:00:00',
        slots: 30,
        bio: 'MBBS (DMC), DDV, FCPS (Dermatology). Renowned clinical dermatologist specializing in chronic psoriasis, allergic dermatitis, and modern phototherapy.'
      },
      {
        name: 'Dr. Farzana Kabir',
        spec: 'Pediatrics',
        phone: '+8801711000004',
        email: 'dr.farzana@xmed.gov.bd',
        hospIndex: 3, // Gulshan
        fee: 1200.00,
        days: 'Sat,Sun,Tue,Thu',
        start: '09:00:00',
        end: '13:00:00',
        slots: 20,
        bio: 'MBBS (DMC), DCH, FCPS (Pediatrics). Consultant Pediatrician specializing in neonatal developmental care, pediatric immunization, and acute febrile management.'
      },
      {
        name: 'Dr. Mahmudul Hasan',
        spec: 'General Surgery',
        phone: '+8801711000005',
        email: 'dr.mahmudul@xmed.gov.bd',
        hospIndex: 4, // Mohakhali
        fee: 900.00,
        days: 'Sat,Sun,Mon,Tue,Wed',
        start: '10:00:00',
        end: '18:00:00',
        slots: 15,
        bio: 'MBBS (SOMC), MS (General Surgery), FRCS (Glasgow). 18+ years operating experience in minimally invasive laparoscopic abdominal and gastrointestinal procedures.'
      },
      {
        name: 'Dr. Sharmin Akter',
        spec: 'Orthopedics',
        phone: '+8801711000006',
        email: 'dr.sharmin@xmed.gov.bd',
        hospIndex: 5, // Agrabad
        fee: 800.00,
        days: 'Sat,Sun,Mon,Wed,Thu',
        start: '16:00:00',
        end: '20:00:00',
        slots: 20,
        bio: 'MBBS (CMC), MS (Orthopedics). Specialist trauma surgeon and joint preservation expert focusing on arthroscopic knee repair and geriatric osteoporosis.'
      },
      {
        name: 'Dr. Kazi Arifur Rahman',
        spec: 'Neuromedicine',
        phone: '+8801711000007',
        email: 'dr.kazi.arifur@xmed.gov.bd',
        hospIndex: 0, // Dhanmondi
        fee: 1200.00,
        days: 'Sat,Sun,Tue,Wed',
        start: '16:00:00',
        end: '20:00:00',
        slots: 15,
        bio: 'MBBS (DMC), MD (Neuromedicine). 14+ years experience treating acute ischemic stroke, epilepsy syndromes, Parkinsonism, and peripheral neuropathies.'
      },
      {
        name: 'Dr. Samira Khanam',
        spec: 'Gastroenterology',
        phone: '+8801711000008',
        email: 'dr.samira@xmed.gov.bd',
        hospIndex: 1, // Uttara
        fee: 900.00,
        days: 'Sat,Sun,Mon,Tue,Wed',
        start: '09:00:00',
        end: '13:00:00',
        slots: 20,
        bio: 'MBBS (DMC), FCPS (Gastroenterology). Expert in therapeutic endoscopy, GERD management, inflammatory bowel diseases, and chronic liver cirrhosis.'
      },
      {
        name: 'Dr. Mokhlesur Rahman',
        spec: 'Nephrology',
        phone: '+8801711000009',
        email: 'dr.mokhlesur@xmed.gov.bd',
        hospIndex: 2, // Mirpur
        fee: 800.00,
        days: 'Sun,Mon,Tue,Thu',
        start: '16:00:00',
        end: '20:00:00',
        slots: 20,
        bio: 'MBBS (RMC), MD (Nephrology). Consultant nephrologist with specialized research in early diabetic kidney disease deceleration and peritoneal dialysis.'
      },
      {
        name: 'Dr. Sabina Yeasmin',
        spec: 'Endocrinology',
        phone: '+8801711000010',
        email: 'dr.sabina@xmed.gov.bd',
        hospIndex: 3, // Gulshan
        fee: 1000.00,
        days: 'Sat,Mon,Wed,Thu',
        start: '10:00:00',
        end: '18:00:00',
        slots: 25,
        bio: 'MBBS (DMC), DEM, MD (Endocrinology). Highly sought clinical diabetologist specializing in brittle diabetes, gestational endocrine disorders, and thyroid nodules.'
      },
      {
        name: 'Dr. Imtiaz Ahmed',
        spec: 'Otolaryngology (ENT)',
        phone: '+8801711000011',
        email: 'dr.imtiaz@xmed.gov.bd',
        hospIndex: 4, // Mohakhali
        fee: 700.00,
        days: 'Sat,Sun,Mon,Tue,Wed',
        start: '09:00:00',
        end: '13:00:00',
        slots: 25,
        bio: 'MBBS (DMC), DLO, MS (ENT). Head and neck clinical surgeon with special focus on endoscopic sinus surgery, tympanoplasty, and allergic rhinitis.'
      },
      {
        name: 'Dr. Rashedul Islam',
        spec: 'Psychiatry',
        phone: '+8801711000012',
        email: 'dr.rashedul@xmed.gov.bd',
        hospIndex: 5, // Agrabad
        fee: 800.00,
        days: 'Sun,Tue,Thu,Fri',
        start: '16:00:00',
        end: '20:00:00',
        slots: 15,
        bio: 'MBBS (CMC), MD (Psychiatry), Member of World Psychiatric Association. 11+ years clinical focus on generalized anxiety disorders, clinical depression, and PTSD.'
      },
      {
        name: 'Dr. Shireen Parveen',
        spec: 'Oncology',
        phone: '+8801711000013',
        email: 'dr.shireen@xmed.gov.bd',
        hospIndex: 0, // Dhanmondi
        fee: 1500.00,
        days: 'Sat,Sun,Mon,Tue',
        start: '10:00:00',
        end: '18:00:00',
        slots: 15,
        bio: 'MBBS (DMC), FCPS (Radiotherapy), MD (Medical Oncology). Senior Medical Oncologist coordinating precision targeted chemotherapy and biological regimens.'
      },
      {
        name: 'Dr. Zahirul Haque',
        spec: 'Urology',
        phone: '+8801711000014',
        email: 'dr.zahirul@xmed.gov.bd',
        hospIndex: 1, // Uttara
        fee: 900.00,
        days: 'Sun,Mon,Wed,Thu',
        start: '16:00:00',
        end: '20:00:00',
        slots: 20,
        bio: 'MBBS (SOMC), MS (Urology). Specialist urologist providing laser lithotripsy for renal calculi, prostate health management, and reconstructive urology.'
      },
      {
        name: 'Dr. Mehreen Sultana',
        spec: 'Rheumatology',
        phone: '+8801711000015',
        email: 'dr.mehreen@xmed.gov.bd',
        hospIndex: 2, // Mirpur
        fee: 700.00,
        days: 'Sat,Mon,Tue,Wed',
        start: '09:00:00',
        end: '13:00:00',
        slots: 20,
        bio: 'MBBS (DMC), MD (Rheumatology). Clinical rheumatologist dedicated to early rheumatoid arthritis remission, systemic lupus erythematosus (SLE), and gouty arthritis.'
      },
      {
        name: 'Dr. Asaduzzaman Khan',
        spec: 'Ophthalmology',
        phone: '+8801711000016',
        email: 'dr.asad@xmed.gov.bd',
        hospIndex: 3, // Gulshan
        fee: 1000.00,
        days: 'Sat,Sun,Tue,Wed',
        start: '10:00:00',
        end: '18:00:00',
        slots: 25,
        bio: 'MBBS (DMC), DO, FCPS (Ophthalmology). Consultant Eye Specialist and Phaco Surgeon specializing in micro-incision cataract surgery and diabetic retinopathy screening.'
      },
      {
        name: 'Dr. Laila Anjum',
        spec: 'Hematology',
        phone: '+8801711000017',
        email: 'dr.laila@xmed.gov.bd',
        hospIndex: 4, // Mohakhali
        fee: 900.00,
        days: 'Sun,Mon,Wed,Thu',
        start: '09:00:00',
        end: '13:00:00',
        slots: 20,
        bio: 'MBBS (DMC), MD (Hematology). Specialized clinical hematologist handling complex thalassemias, refractory iron-deficiency anemias, and coagulation disorders.'
      },
      {
        name: 'Dr. Monirul Islam',
        spec: 'Family Medicine',
        phone: '+8801711000018',
        email: 'dr.monirul@xmed.gov.bd',
        hospIndex: 5, // Agrabad
        fee: 500.00,
        days: 'Sat,Sun,Mon,Tue,Wed,Thu',
        start: '10:00:00',
        end: '18:00:00',
        slots: 35,
        bio: 'MBBS (CMC), MCPS (Family Medicine). General physician providing continuous preventive health screenings, geriatric wellness checkups, and chronic disease counseling.'
      },
      {
        name: 'Dr. Tasneem Fariha',
        spec: 'Internal Medicine',
        phone: '+8801711000019',
        email: 'dr.tasneem@xmed.gov.bd',
        hospIndex: 0, // Dhanmondi
        fee: 900.00,
        days: 'Sat,Sun,Mon,Tue,Wed',
        start: '16:00:00',
        end: '20:00:00',
        slots: 25,
        bio: 'MBBS (DMC), FCPS (Medicine), MRCP (UK). Consultant Internist handling undifferentiated multisystem systemic fevers, metabolic syndrome, and autoimmune workups.'
      },
      {
        name: 'Dr. Golam Kibria',
        spec: 'Emergency Medicine',
        phone: '+8801711000020',
        email: 'dr.kibria@xmed.gov.bd',
        hospIndex: 1, // Uttara
        fee: 1000.00,
        days: 'Sat,Sun,Mon,Tue,Wed,Thu',
        start: '10:00:00',
        end: '18:00:00',
        slots: 30,
        bio: 'MBBS (DMC), MS (Critical Care), Fellow in Emergency Medicine. Lead Acute Resuscitation Director with 16+ years managing poly-trauma, septic shock, and acute arrests.'
      }
    ];

    const doctorIds = [];
    for (let i = 0; i < doctorProfiles.length; i++) {
      const doc = doctorProfiles[i];
      const uid = `DOC-${1001 + i}`;
      const license_number = `BMDC-${10001 + i}`;
      const hospital_id = hospitalIds[doc.hospIndex];

      const insertDocSql = `
        INSERT INTO doctors (
          uid, name, full_name, license_number, license_no, specialization, phone, email, password_hash,
          hospital_id, consultation_fee, working_days, shift_start, shift_end, max_daily_slots, biography, verified
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)
        ON DUPLICATE KEY UPDATE 
          uid = VALUES(uid),
          name = VALUES(name),
          full_name = VALUES(full_name),
          license_number = VALUES(license_number),
          license_no = VALUES(license_no),
          specialization = VALUES(specialization),
          hospital_id = VALUES(hospital_id),
          consultation_fee = VALUES(consultation_fee),
          working_days = VALUES(working_days),
          shift_start = VALUES(shift_start),
          shift_end = VALUES(shift_end),
          max_daily_slots = VALUES(max_daily_slots),
          biography = VALUES(biography),
          password_hash = VALUES(password_hash);
      `;
      await query(insertDocSql, [
        uid, doc.name, doc.name, license_number, license_number, doc.spec, doc.phone, doc.email, passwordHash,
        hospital_id, doc.fee, doc.days, doc.start, doc.end, doc.slots, doc.bio
      ]);

      const [row] = await query('SELECT doctor_id FROM doctors WHERE license_number = ? OR license_no = ? LIMIT 1;', [license_number, license_number]);
      if (row) {
        doctorIds.push(row.doctor_id);
      }
    }
    console.log(`✓ Successfully seeded 20 Doctors (DOC-1001 to DOC-1020, BMDC-10001 to BMDC-10020) across 6 Hospitals.\n`);

    // 4. Seed 100 Unique Citizens/Patients with Location Details
    console.log('[4/6] Seeding 100 Unique Citizens (BD-2000-0001 to BD-2000-0100) with Location & Addresses...');
    const firstNames = [
      'Rahim', 'Karim', 'Nafis', 'Siddiq', 'Tanvir', 'Hasan', 'Mahmud', 'Arif', 'Salman', 'Jubayer',
      'Fatima', 'Ayesha', 'Nusrat', 'Sadia', 'Farhana', 'Tahmina', 'Zannatul', 'Mariam', 'Tasnia', 'Ruksana',
      'Shahriar', 'Ashiq', 'Fahim', 'Mehedi', 'Anisur', 'Rashed', 'Kamrul', 'Shafiq', 'Habib', 'Tariq',
      'Nasrin', 'Shirin', 'Rumana', 'Dilruba', 'Sabrina', 'Shamima', 'Mousumi', 'Afroza', 'Samia', 'Nahid'
    ];
    const lastNames = [
      'Chowdhury', 'Ahmed', 'Hossain', 'Rahman', 'Khan', 'Sarker', 'Bhuiyan', 'Haque', 'Islam', 'Ali',
      'Talukder', 'Uddin', 'Miah', 'Siddique', 'Bari', 'Akter', 'Begum', 'Sultana', 'Jahan', 'Khanam'
    ];
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const areas = ['Dhanmondi', 'Uttara', 'Mirpur', 'Gulshan', 'Mohakhali', 'Agrabad'];
    const cities = ['Dhaka', 'Dhaka', 'Dhaka', 'Dhaka', 'Dhaka', 'Chittagong'];

    const citizenUids = [];

    for (let i = 1; i <= 100; i++) {
      const padNum = String(i).padStart(4, '0');
      const uid = `BD-2000-${padNum}`;
      citizenUids.push(uid);

      const fName = firstNames[(i - 1) % firstNames.length];
      const lName = lastNames[(i * 3) % lastNames.length];
      const fullName = `${fName} ${lName}`;
      
      const gender = (i % 2 === 0) ? 'Female' : 'Male';
      const blood = bloodGroups[i % bloodGroups.length];
      
      // DOB between 2000-01-01 and 2024-01-01 (Strictly satisfies dob >= '2000-01-01' and dob <= CURRENT_DATE)
      const birthYear = 2000 + (i % 24);
      const birthMonth = String(1 + (i % 12)).padStart(2, '0');
      const birthDay = String(1 + (i % 28)).padStart(2, '0');
      const dob = `${birthYear}-${birthMonth}-${birthDay}`;

      const phone = `+8801811${String(i).padStart(6, '0')}`;
      const email = `citizen${padNum}@xmed.gov.bd`;

      const areaIndex = (i - 1) % areas.length;
      const area = areas[areaIndex];
      const city = cities[areaIndex];
      const address = `House ${10 + (i % 40)}, Road ${1 + (i % 15)}, Block ${(i % 2 === 0 ? 'B' : 'D')}, ${area}, ${city}`;

      const insertCitizenSql = `
        INSERT INTO citizens (uid, name, full_name, dob, gender, blood_group, phone, email, password_hash, area, city, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          full_name = VALUES(full_name),
          dob = VALUES(dob),
          gender = VALUES(gender),
          blood_group = VALUES(blood_group),
          phone = VALUES(phone),
          email = VALUES(email),
          area = VALUES(area),
          city = VALUES(city),
          address = VALUES(address),
          password_hash = VALUES(password_hash);
      `;
      await query(insertCitizenSql, [uid, fullName, fullName, dob, gender, blood, phone, email, passwordHash, area, city, address]);
    }
    console.log(`✓ Successfully seeded 100 Citizens (BD-2000-0001 to BD-2000-0100) mapped to 6 Regional Areas.\n`);

    // 5. Seed 500+ Historical Prescriptions & Self-Medications
    console.log('[5/6] Seeding 500+ Historical Prescriptions and Emergency Self-Medications...');

    // Fetch medicine catalog
    const medicines = await query('SELECT medicine_id, brand_name, generic_name, dosage_form, strength FROM medicines;');
    if (!medicines || medicines.length === 0) {
      throw new Error('No medicines found in database! Please run scripts/init_db.js first.');
    }

    const diagnosesCatalog = [
      {
        diag: 'Acute Bronchitis & Pharyngitis',
        notes: 'Take prescribed medicines regularly. Avoid cold beverages and air draft. Perform warm salt water gargling thrice daily.'
      },
      {
        diag: 'Primary Essential Hypertension (Stage 1)',
        notes: 'Strict salt restriction (<4g daily). Avoid tobacco and caffeinated energy drinks. Perform daily 30-minute brisk walk.'
      },
      {
        diag: 'Acute Erosive Gastritis & Dyspepsia',
        notes: 'Eat meals at fixed intervals. Avoid spicy, excessively oily and deep-fried dishes. Do not lie down immediately after dinner.'
      },
      {
        diag: 'Migraine with Visual Aura',
        notes: 'Avoid sensory triggers, prolonged screen glare, and erratic sleep schedules. Keep well hydrated.'
      },
      {
        diag: 'Seasonal Viral Pyrexia (Fever)',
        notes: 'Tepid sponge if temperature exceeds 101 F. Complete bed rest and high fluid intake. Return if persistent vomiting occurs.'
      },
      {
        diag: 'Type 2 Diabetes Mellitus',
        notes: 'Monitor fasting blood glucose twice weekly. Avoid refined carbohydrates, sodas, and sweets. Maintain foot hygiene.'
      },
      {
        diag: 'Perennial Allergic Rhinitis & Sinusitis',
        notes: 'Use steam inhalation before bed. Wear face mask in dusty outdoor environments. Keep bed linens washed in hot water.'
      },
      {
        diag: 'Chronic Lumbar Spondylosis & Muscle Spasm',
        notes: 'Avoid bending forward with heavy weights. Maintain ergonomic back posture while sitting. Perform gentle lumbar extension exercises.'
      },
      {
        diag: 'Tension-Type Headache & Physical Fatigue',
        notes: 'Ensure 7 to 8 hours of continuous sleep. Take regular breaks during desk work. Practice relaxation breathing exercises.'
      },
      {
        diag: 'Acute Gastroenteritis with Mild Dehydration',
        notes: 'Drink 1 glass of reconstituted Oral Rehydration Salts (ORS) after each loose stool. Eat light bland khichuri and green bananas.'
      }
    ];

    const dosageInstructions = [
      '1+0+1 After meals',
      '0+0+1 After dinner',
      '1+1+1 After meals',
      '1+0+0 Morning empty stomach (30 mins before breakfast)',
      '1 tablet SOS (as needed for severe pain/fever)',
      '1 puff twice daily after rinsing mouth',
      '2 teaspoonfuls thrice daily after meals'
    ];

    const durations = [
      '5 days',
      '7 days',
      '10 days',
      '14 days',
      '1 month',
      'Continue as daily maintenance'
    ];

    const selfMedSamples = [
      {
        name: 'Napa Extra 500mg/65mg (Paracetamol + Caffeine)',
        dosage: '1 tablet with water',
        reason: 'Sudden onset high fever of 102.4°F late at night with severe throbbing body ache.'
      },
      {
        name: 'EDCL Antacid Compound Chewable',
        dosage: '2 tablets chewed thoroughly',
        reason: 'Acute retrosternal heartburn and acid regurgitation after wedding feast.'
      },
      {
        name: 'EDCL Oral Rehydration Salts (ORS)',
        dosage: '500ml reconstituted solution',
        reason: 'Sudden watery diarrhea and dizziness caused by food contamination.'
      },
      {
        name: 'EDCL Chlorpheniramine Maleate 4mg',
        dosage: '1 tablet before bed',
        reason: 'Intense sneezing bouts and runny nose caused by seasonal house dust exposure.'
      },
      {
        name: 'Advil 400mg (Ibuprofen)',
        dosage: '1 tablet with milk',
        reason: 'Acute ankle sprain and localized swelling suffered while stepping off a rickshaw.'
      }
    ];

    // Clear existing prescriptions & items to guarantee fresh atomic seeding
    await query('SET FOREIGN_KEY_CHECKS = 0;');
    await query('TRUNCATE TABLE prescription_items;');
    await query('TRUNCATE TABLE prescription_audit_logs;');
    await query('TRUNCATE TABLE prescriptions;');
    await query('TRUNCATE TABLE patient_self_medications;');
    await query('TRUNCATE TABLE appointments;');
    await query('SET FOREIGN_KEY_CHECKS = 1;');

    let totalPrescriptionsSeeded = 0;
    let totalItemsSeeded = 0;
    let totalSelfMedsSeeded = 0;

    for (let cIdx = 0; cIdx < citizenUids.length; cIdx++) {
      const patientUid = citizenUids[cIdx];
      // 5 to 10 prescriptions per patient = ~750 total prescriptions
      const rxCountForPatient = 5 + (cIdx % 6);

      for (let r = 0; r < rxCountForPatient; r++) {
        // Distribute across 20 doctors
        const docId = doctorIds[(cIdx * 3 + r) % doctorIds.length];
        const diagObj = diagnosesCatalog[(cIdx + r * 2) % diagnosesCatalog.length];

        // Stagger dates backwards over past 24 months
        const daysAgo = 1 + (r * 45) + (cIdx % 15);
        const rxDate = new Date();
        rxDate.setDate(rxDate.getDate() - daysAgo);

        const insertRxSql = `
          INSERT INTO prescriptions (patient_uid, doctor_id, diagnosis, clinical_notes, created_at)
          VALUES (?, ?, ?, ?, ?);
        `;
        const rxResult = await query(insertRxSql, [patientUid, docId, diagObj.diag, diagObj.notes, rxDate]);
        const rxId = rxResult.insertId;
        totalPrescriptionsSeeded++;

        // Add 2 to 4 medicines per prescription
        const itemCount = 2 + ((cIdx + r) % 3);
        for (let it = 0; it < itemCount; it++) {
          const medIndex = (cIdx * 7 + r * 3 + it * 5) % medicines.length;
          const selectedMed = medicines[medIndex];
          const dosage = dosageInstructions[(cIdx + it) % dosageInstructions.length];
          const duration = durations[(r + it) % durations.length];

          await query(`
            INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration)
            VALUES (?, ?, ?, ?);
          `, [rxId, selectedMed.medicine_id, dosage, duration]);
          totalItemsSeeded++;
        }
      }

      // Seed 1 to 3 self-medications per patient
      const selfMedCount = 1 + (cIdx % 3);
      for (let sm = 0; sm < selfMedCount; sm++) {
        const sample = selfMedSamples[(cIdx + sm) % selfMedSamples.length];
        const smDaysAgo = 2 + (sm * 25) + (cIdx % 20);
        const smDate = new Date();
        smDate.setDate(smDate.getDate() - smDaysAgo);
        const smDateStr = smDate.toISOString().slice(0, 10);

        await query(`
          INSERT INTO patient_self_medications (patient_uid, medicine_name, reason_or_emergency, dosage_taken, date_taken, created_at)
          VALUES (?, ?, ?, ?, ?, ?);
        `, [patientUid, sample.name, sample.reason, sample.dosage, smDateStr, smDate]);
        totalSelfMedsSeeded++;
      }
    }
    console.log(`✓ Seeded ${totalPrescriptionsSeeded} Prescriptions, ${totalItemsSeeded} Items, and ${totalSelfMedsSeeded} Self-Meds.\n`);

    // 6. Seed 50+ Multi-Status Appointments
    console.log('[6/6] Seeding 50+ Multi-Status Appointments (Pending FCFS, Patient Emergencies, Doctor-Approved)...');
    const emergencyReasons = [
      'Severe acute crushing substernal chest pain radiating to left shoulder with heavy sweating.',
      'Sudden high-grade fever of 104°F with severe febrile convulsion symptoms and confusion.',
      'Uncontrolled severe bronchial asthma attack with cyanosis and oxygen saturation falling to 88%.',
      'Acute intense lower abdominal colic with intractable vomiting and peritoneal rigidity.',
      'Sudden left-sided facial weakness and arm numbness with speech slurring (suspected TIA/stroke).',
      'Profuse hematemesis (vomiting blood) and dark tarry stools with rapid heart rate.',
      'Severe open fracture of the tibia with significant soft-tissue trauma from road accident.',
      'Acute severe anaphylactic allergic reaction with throat tightness, wheezing, and facial edema.'
    ];

    const appointmentStatuses = ['PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

    let totalAppointmentsSeeded = 0;

    for (let aptIdx = 1; aptIdx <= 60; aptIdx++) {
      const patientUid = citizenUids[(aptIdx * 3) % citizenUids.length];
      const docIndex = (aptIdx * 2) % doctorProfiles.length;
      const docId = doctorIds[docIndex];
      const hospId = hospitalIds[doctorProfiles[docIndex].hospIndex];

      // Schedule dates: upcoming 7 days or past 3 days
      const daysOffset = (aptIdx % 10) - 3;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysOffset);
      const requestedDateStr = targetDate.toISOString().slice(0, 10);

      let status = 'PENDING';
      let isEmergency = false;
      let emergencyReason = null;
      let priorityLevel = 1;
      let scheduledTime = null;
      let serialNo = null;

      if (aptIdx % 5 === 0) {
        // Group A: Doctor-Approved Emergencies (priority 3, top of schedule)
        isEmergency = true;
        emergencyReason = emergencyReasons[aptIdx % emergencyReasons.length];
        priorityLevel = 3;
        status = 'ACCEPTED';
        serialNo = 1;
        scheduledTime = '09:15:00';
      } else if (aptIdx % 4 === 0) {
        // Group B: Patient-Flagged Emergency (priority 2, urgent review)
        isEmergency = true;
        emergencyReason = emergencyReasons[aptIdx % emergencyReasons.length];
        priorityLevel = 2;
        status = 'PENDING';
      } else if (aptIdx % 3 === 0) {
        // Group C: Regular Doctor-Accepted appointment
        isEmergency = false;
        priorityLevel = 1;
        status = 'ACCEPTED';
        serialNo = 2 + (aptIdx % 10);
        scheduledTime = `${10 + (aptIdx % 6)}:30:00`;
      } else if (aptIdx % 7 === 0) {
        // Group D: Completed appointment
        isEmergency = false;
        priorityLevel = 1;
        status = 'COMPLETED';
        serialNo = 5;
        scheduledTime = '11:00:00';
      } else if (aptIdx % 11 === 0) {
        // Group E: Cancelled / Rejected
        isEmergency = false;
        priorityLevel = 1;
        status = (aptIdx % 2 === 0) ? 'CANCELLED' : 'REJECTED';
      } else {
        // Group F: Standard Pending FCFS request
        isEmergency = false;
        priorityLevel = 1;
        status = 'PENDING';
      }

      const insertAptSql = `
        INSERT INTO appointments (
          patient_uid, doctor_id, hospital_id, requested_date, scheduled_time, serial_no,
          status, is_emergency, emergency_reason, priority_level
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      await query(insertAptSql, [
        patientUid, docId, hospId, requestedDateStr, scheduledTime, serialNo,
        status, isEmergency, emergencyReason, priorityLevel
      ]);
      totalAppointmentsSeeded++;
    }
    console.log(`✓ Seeded ${totalAppointmentsSeeded} Multi-Status Appointments across 6 Hospitals.\n`);

    // 7. Seed Allergens & Patient Contraindications
    console.log('[7/8] Seeding Allergens, Drug Contraindications & Patient Allergy Profiles...');
    const allergenList = ['Penicillin', 'Sulfa drugs', 'Aspirin', 'Cephalosporins', 'NSAIDs'];
    const allergenMap = new Map();

    for (const alg of allergenList) {
      await query(`INSERT INTO allergens (name) VALUES (?) ON DUPLICATE KEY UPDATE name = VALUES(name);`, [alg]);
      const [row] = await query(`SELECT allergen_id FROM allergens WHERE name = ? LIMIT 1;`, [alg]);
      allergenMap.set(alg, row.allergen_id);
    }

    // Map medicines to allergens
    const penId = allergenMap.get('Penicillin');
    const aspId = allergenMap.get('Aspirin');
    const sulId = allergenMap.get('Sulfa drugs');
    const nsaId = allergenMap.get('NSAIDs');

    let totalMedAllergens = 0;
    for (const m of medicines) {
      const g = (m.generic_name || '').toLowerCase();
      const b = (m.brand_name || '').toLowerCase();

      if (g.includes('amoxicillin') || g.includes('ampicillin') || g.includes('penicillin') || b.includes('augmentin') || b.includes('moxacil')) {
        await query(`INSERT IGNORE INTO medicine_allergens (medicine_id, allergen_id) VALUES (?, ?);`, [m.medicine_id, penId]);
        totalMedAllergens++;
      } else if (g.includes('aspirin') || g.includes('acetylsalicylic') || b.includes('ecospirin') || b.includes('disprin')) {
        await query(`INSERT IGNORE INTO medicine_allergens (medicine_id, allergen_id) VALUES (?, ?);`, [m.medicine_id, aspId]);
        totalMedAllergens++;
      } else if (g.includes('sulfa') || g.includes('cotrimoxazole') || g.includes('sulfamethoxazole')) {
        await query(`INSERT IGNORE INTO medicine_allergens (medicine_id, allergen_id) VALUES (?, ?);`, [m.medicine_id, sulId]);
        totalMedAllergens++;
      } else if (g.includes('ibuprofen') || g.includes('naproxen') || g.includes('diclofenac') || b.includes('advil') || b.includes('voltarol')) {
        await query(`INSERT IGNORE INTO medicine_allergens (medicine_id, allergen_id) VALUES (?, ?);`, [m.medicine_id, nsaId]);
        totalMedAllergens++;
      }
    }

    // Seed test patient allergies (including BD-2000-0001 Penicillin SEVERE)
    const patientAllergySeeds = [
      { uid: 'BD-2000-0001', allergen: 'Penicillin', severity: 'SEVERE' },
      { uid: 'BD-2000-0002', allergen: 'Aspirin', severity: 'MODERATE' },
      { uid: 'BD-2000-0003', allergen: 'Sulfa drugs', severity: 'SEVERE' },
      { uid: 'BD-2000-0004', allergen: 'NSAIDs', severity: 'SEVERE' },
      { uid: 'BD-2000-0005', allergen: 'Penicillin', severity: 'MILD' },
      { uid: 'BD-2026-8841', allergen: 'Penicillin', severity: 'SEVERE' }
    ];

    let totalPatientAllergies = 0;
    for (const pa of patientAllergySeeds) {
      const aId = allergenMap.get(pa.allergen);
      if (aId) {
        await query(`
          INSERT INTO patient_allergies (patient_uid, allergen_id, severity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE severity = VALUES(severity);
        `, [pa.uid, aId, pa.severity]);
        totalPatientAllergies++;
      }
    }
    console.log(`✓ Seeded ${allergenList.length} Allergens, ${totalMedAllergens} Drug Mappings, and ${totalPatientAllergies} Patient Profiles.\n`);

    // 8. Seed Hospital Departments & Ward Beds
    console.log('[8/8] Seeding Hospital Departments & Real-Time Ward Beds...');
    const departmentNames = [
      'Cardiology Ward',
      'Intensive Care Unit (ICU)',
      'General Medicine Ward',
      'Emergency Resuscitation',
      'Pediatrics Ward',
      'Orthopedic Trauma'
    ];

    let totalDepts = 0;
    let totalBeds = 0;

    for (let hIdx = 0; hIdx < hospitalIds.length; hIdx++) {
      const hId = hospitalIds[hIdx];

      for (let dIdx = 0; dIdx < departmentNames.length; dIdx++) {
        const dName = departmentNames[dIdx];
        const [existingDept] = await query('SELECT department_id FROM departments WHERE hospital_id = ? AND name = ? LIMIT 1;', [hId, dName]);
        
        let deptId;
        if (existingDept) {
          deptId = existingDept.department_id;
        } else {
          const deptRes = await query('INSERT INTO departments (hospital_id, name) VALUES (?, ?);', [hId, dName]);
          deptId = deptRes.insertId;
        }
        totalDepts++;

        // Seed 4 beds per department
        for (let b = 1; b <= 4; b++) {
          const bedNumber = `B-${hId}${dIdx + 1}-0${b}`;
          let status = 'AVAILABLE';
          let patientUid = null;

          if (b === 1) {
            status = 'OCCUPIED';
            patientUid = citizenUids[(hIdx * 10 + dIdx * 2) % citizenUids.length];
          } else if (b === 4 && dIdx % 2 === 0) {
            status = 'MAINTENANCE';
          }

          await query(`
            INSERT INTO hospital_beds (department_id, bed_number, status, current_patient_uid)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE status = VALUES(status), current_patient_uid = VALUES(current_patient_uid);
          `, [deptId, bedNumber, status, patientUid]);
          totalBeds++;
        }
      }
    }
    console.log(`✓ Seeded ${totalDepts} Departments and ${totalBeds} Beds across 6 Hospitals.\n`);

    console.log('======================================================');
    console.log('🎉 UNIFIED MIGRATION & SEEDING PIPELINE COMPLETED!');
    console.log('======================================================');
    console.log(`Summary of Seeded Data:`);
    console.log(`  • Hospitals:           ${hospitalIds.length}`);
    console.log(`  • Doctors:             ${doctorIds.length} (DOC-1001 to DOC-1020)`);
    console.log(`  • Patients/Citizens:   ${citizenUids.length} (BD-2000-0001 to BD-2000-0100)`);
    console.log(`  • Prescriptions:       ${totalPrescriptionsSeeded}`);
    console.log(`  • Prescription Items:  ${totalItemsSeeded}`);
    console.log(`  • Self-Medications:    ${totalSelfMedsSeeded}`);
    console.log(`  • Appointments:        ${totalAppointmentsSeeded} (FCFS + Emergencies)`);
    console.log(`  • Allergens:           ${allergenList.length}`);
    console.log(`  • Drug Contraindics:   ${totalMedAllergens}`);
    console.log(`  • Patient Allergies:   ${totalPatientAllergies}`);
    console.log(`  • Departments:         ${totalDepts}`);
    console.log(`  • Ward Beds:           ${totalBeds}`);
    console.log(`  • Global Password:     ${rawPassword}`);
    console.log('======================================================\n');

  } catch (error) {
    console.error('❌ Seeding pipeline error:', error.message);
    throw error;
  }
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
