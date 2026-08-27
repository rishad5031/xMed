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
    await query('TRUNCATE TABLE blood_posts;');
    await query('TRUNCATE TABLE messages;');
    await query('TRUNCATE TABLE health_blogs;');
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

          try {
            await query(`
              INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration)
              VALUES (?, ?, ?, ?);
            `, [rxId, selectedMed.medicine_id, dosage, duration]);
            totalItemsSeeded++;
          } catch (itemErr) {
            if (itemErr.sqlMessage && itemErr.sqlMessage.includes('ALLERGY CONFLICT')) {
              // Trigger safely caught an allergy conflict
            } else {
              throw itemErr;
            }
          }
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

    // 7. Seed Blood Donation & Request Hub (50 Detailed Posts)
    console.log('[7/9] Seeding Blood Donation & Request Exchange Hub (50 Unique Posts)...');
    const hubBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const hubAreas = ['Dhanmondi', 'Uttara', 'Mirpur', 'Gulshan', 'Mohakhali', 'Agrabad', 'Banani', 'Badda'];
    const hospitalsList = [
      'Dhanmondi Care Hospital',
      'Uttara Central Specialized Hospital',
      'Mirpur General Hospital',
      'Gulshan Apex Medical Centre',
      'Mohakhali National Health Institute',
      'Chittagong Medical College Hospital',
      'Square Hospital',
      'United Hospital',
      'Evercare Hospital',
      'Kurmitola General Hospital'
    ];

    const bloodNotesLibrary = [
      'Emergency bypass surgery at Central Hospital; family donors unavailable.',
      'Regular voluntary donor, last donated 4 months ago. Healthy and ready.',
      'Thalassemia major child requiring bi-weekly packed red blood cell transfusion.',
      'Acute postpartum hemorrhage in maternity emergency ward; 2 bags required urgently.',
      'Scheduled elective orthopedic hip replacement surgery; blood cross-match ready.',
      'Dengue hemorrhagic fever patient with severe thrombocytopenia requiring immediate whole blood.',
      'Voluntary donor with verified hemoglobin > 14.5 g/dL. Available on short notice.',
      'Road traffic accident trauma victim in neuro-intensive care unit.',
      'Oncology chemotherapy patient with severe secondary bone marrow suppression.',
      'Healthy donor, non-smoker, universal plasma donor willing to travel across Dhaka.',
      'Dialysis patient with chronic kidney disease and refractory anemia.',
      'Severe gastrointestinal bleed secondary to peptic ulcer disease; CCU admission.'
    ];

    const bloodPostsData = [];
    for (let i = 0; i < 50; i++) {
      const authorUid = citizenUids[i % citizenUids.length] || `BD-2000-000${(i % 9) + 1}`;
      const isRequest = i < 25; // 25 REQUEST, 25 DONATE
      const postType = isRequest ? 'REQUEST' : 'DONATE';
      const bloodGroup = hubBloodGroups[i % hubBloodGroups.length];
      const area = hubAreas[i % hubAreas.length];
      const hospitalName = isRequest ? hospitalsList[i % hospitalsList.length] : null;
      
      // Status distribution: 35 OPEN, 10 FULFILLED, 5 CLOSED
      let status = 'OPEN';
      if (i >= 35 && i < 45) status = 'FULFILLED';
      else if (i >= 45) status = 'CLOSED';

      // Urgency distribution
      let urgency = 'NORMAL';
      if (isRequest) {
        if (i % 3 === 0) urgency = 'CRITICAL_EMERGENCY';
        else if (i % 3 === 1) urgency = 'URGENT';
        else urgency = 'NORMAL';
      }

      // Hemoglobin distribution: 12.0 - 16.0 for donors, null or lower for requests
      let hemoglobin = null;
      if (!isRequest) {
        hemoglobin = parseFloat((12.5 + ((i * 3) % 35) * 0.1).toFixed(1));
      } else if (i % 2 === 0) {
        hemoglobin = parseFloat((7.8 + ((i * 2) % 25) * 0.1).toFixed(1));
      }

      const units = isRequest ? (1 + (i % 3)) : 1;
      const phone = `+8801711${String(100000 + i).slice(-6)}`;
      const note = bloodNotesLibrary[i % bloodNotesLibrary.length];

      bloodPostsData.push({
        author_uid: authorUid,
        post_type: postType,
        blood_group: bloodGroup,
        hemoglobin_level: hemoglobin,
        units_needed: units,
        area: area,
        city: 'Dhaka',
        hospital_name: hospitalName,
        urgency: urgency,
        contact_phone: phone,
        status: status,
        notes: note
      });
    }

    let totalBloodPosts = 0;
    for (const bp of bloodPostsData) {
      await query(`
        INSERT INTO blood_posts 
          (author_uid, post_type, blood_group, hemoglobin_level, units_needed, area, city, hospital_name, urgency, contact_phone, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `, [
        bp.author_uid, bp.post_type, bp.blood_group, bp.hemoglobin_level, bp.units_needed,
        bp.area, bp.city, bp.hospital_name, bp.urgency, bp.contact_phone, bp.status, bp.notes
      ]);
      totalBloodPosts++;
    }
    console.log(`✓ Seeded ${totalBloodPosts} Blood Posts (25 DONATE & 25 REQUEST with 35 OPEN, 10 FULFILLED, 5 CLOSED).\n`);

    // 8. Seed Multi-Threaded Cross-Role Messaging System (Every Citizen <-> 5 Distinct Doctors)
    console.log('[8/9] Seeding Multi-Threaded Doctor-Patient Messages (100 Patients x 5 Doctors = 500 Threads)...');
    
    const dialogueArchetypes = [
      {
        topic: 'Hypertension Management',
        messages: [
          { role: 'cit', text: 'Good morning Doctor, I have been taking Amlodipine 5mg for 4 days as prescribed, but feel slightly lightheaded around noon. Should I adjust the timing?' },
          { role: 'doc', text: 'Hello! Mild lightheadedness can happen initially as peripheral vascular resistance drops. Please check your blood pressure at noon and take the tablet right after breakfast with a glass of water.' },
          { role: 'cit', text: 'Understood Doctor. Should I strictly restrict dietary salt, and are 30-minute morning brisk walks safe?' },
          { role: 'doc', text: 'Keep sodium under 2g daily. Moderate walks are safe and strongly encouraged. If systolic drops below 100 mmHg, message me immediately.' }
        ]
      },
      {
        topic: 'Type 2 Diabetes Glycemic Monitoring',
        messages: [
          { role: 'cit', text: 'Doctor, my fasting blood glucose was 7.8 mmol/L and 2-hour post-meal was 11.2 mmol/L. I am taking Metformin 500mg twice daily.' },
          { role: 'doc', text: 'Thank you for tracking. Since post-prandial remains above our 8.5 target, ensure you take Metformin with meals and minimize refined carbohydrates in your evening diet.' },
          { role: 'cit', text: 'Should I schedule an HbA1c and kidney function test before our upcoming clinic review?' },
          { role: 'doc', text: 'Yes, please complete an HbA1c and serum creatinine test next week, then upload the PDF report directly to your xMED vault.' },
          { role: 'cit', text: 'Will do Doctor, uploaded last month’s lipid panel as well.' }
        ]
      },
      {
        topic: 'Seasonal Fever & Dengue Precautions',
        messages: [
          { role: 'cit', text: 'Hello Doctor, I developed a sudden fever of 102°F yesterday with retro-orbital eye pain and severe body ache. Could this be dengue?' },
          { role: 'doc', text: 'Given seasonal trends, do NOT take any Ibuprofen or Aspirin. Take only Paracetamol 500mg up to every 6 hours and drink plenty of ORS and coconut water.' },
          { role: 'cit', text: 'Should I get a Complete Blood Count (CBC) and Dengue NS1 antigen test done today?' },
          { role: 'doc', text: 'Yes, get a CBC and NS1 antigen test today. If platelets drop below 100,000 or you notice severe abdominal pain, proceed to the hospital emergency triage.' }
        ]
      },
      {
        topic: 'Gastritis & Acid Reflux',
        messages: [
          { role: 'cit', text: 'Dr. Kabir, I have severe burning in my upper chest at night, despite taking Omeprazole 20mg daily.' },
          { role: 'doc', text: 'Make sure you take Omeprazole 30 minutes before breakfast on an empty stomach. Avoid spicy dinners and do not lie flat within 2 hours of eating.' },
          { role: 'cit', text: 'Can I take a chewable antacid if nighttime burning wakes me up?' },
          { role: 'doc', text: 'Yes, an aluminum-magnesium hydroxide chewable antacid can be taken for breakthrough nocturnal acidity.' },
          { role: 'cit', text: 'Thank you Doctor, adjusting my meal schedule tonight.' },
          { role: 'doc', text: 'You are welcome. Keep a symptom diary for the next 7 days.' }
        ]
      },
      {
        topic: 'Pediatric Asthma & Bronchospasm',
        messages: [
          { role: 'cit', text: 'Doctor, my child has been coughing persistently at night and has a faint wheezing sound during running.' },
          { role: 'doc', text: 'This suggests reactive airway bronchospasm. Please administer the Salbutamol 100mcg inhaler with a spacer: 2 puffs as directed.' },
          { role: 'cit', text: 'How frequently can we repeat the inhaler puffs if coughing persists?' },
          { role: 'doc', text: 'You can repeat 2 puffs after 20 minutes once. If chest indrawing or breathlessness appears, visit our emergency center immediately.' }
        ]
      },
      {
        topic: 'Allergic Dermatitis & Skin Rash',
        messages: [
          { role: 'cit', text: 'Hello Doctor, the red itchy rash on my forearms has flared up after using synthetic laundry powder.' },
          { role: 'doc', text: 'Apply the Hydrocortisone cream thinly twice daily for 5 days only, followed by liberal amounts of plain petroleum jelly.' },
          { role: 'cit', text: 'Can I take an antihistamine like Cetirizine 10mg at night for the itching?' },
          { role: 'doc', text: 'Yes, Cetirizine 10mg at bedtime will relieve nighttime itching and help you rest without scratching.' }
        ]
      },
      {
        topic: 'Post-Operative Suture Care',
        messages: [
          { role: 'cit', text: 'Good afternoon Doctor, my abdominal surgical incision looks slightly pink, but there is no fever or pus.' },
          { role: 'doc', text: 'Mild pink erythema is normal during surgical wound remodeling. Keep the area completely dry and clean with sterile dressing.' },
          { role: 'cit', text: 'When should I visit the outpatient clinic for suture removal?' },
          { role: 'doc', text: 'Please visit the surgical OPD this Thursday between 9 AM and 1 PM for stitch removal and scar assessment.' }
        ]
      },
      {
        topic: 'Dyslipidemia & Statin Instructions',
        messages: [
          { role: 'cit', text: 'Doctor, my fasting lipid profile shows LDL 155 mg/dL. I have started Atorvastatin 10mg nightly.' },
          { role: 'doc', text: 'Atorvastatin works best when taken at bedtime to target peak hepatic cholesterol synthesis. Continue taking it nightly.' },
          { role: 'cit', text: 'Should I be concerned about muscle soreness or liver enzymes?' },
          { role: 'doc', text: 'Mild fatigue is rare, but report any severe unexplained muscle cramps. We will recheck liver enzymes and lipid levels in 8 weeks.' }
        ]
      },
      {
        topic: 'Migraine Headache Management',
        messages: [
          { role: 'cit', text: 'Dr. Tanvir, I get throbbing one-sided headaches preceded by bright zigzag lines in my visual field.' },
          { role: 'doc', text: 'These are classic migraine episodes with aura. Take Naproxen 500mg immediately when the visual aura begins, before the pain peaks.' },
          { role: 'cit', text: 'Should I avoid specific dietary triggers like aged cheese or caffeine?' },
          { role: 'doc', text: 'Yes, maintain a regular sleep schedule, stay hydrated, and note down food triggers in your daily health journal.' }
        ]
      },
      {
        topic: 'Thyroid Hormone Adjustment',
        messages: [
          { role: 'cit', text: 'Doctor, my TSH is 5.8 mIU/L on Levothyroxine 50mcg. I still feel unusually cold and sluggish in the morning.' },
          { role: 'doc', text: 'Your dose requires a slight adjustment. Increase Levothyroxine to 75mcg daily, taken with plain water 45 minutes before breakfast.' },
          { role: 'cit', text: 'Can I take my calcium and vitamin D tablets together with the thyroid pill?' },
          { role: 'doc', text: 'No, calcium binds to thyroxine and blocks absorption. Separate calcium supplements by at least 4 hours.' }
        ]
      }
    ];

    let totalMessagesSeeded = 0;
    const messageBatch = [];

    for (let cIdx = 0; cIdx < citizenUids.length; cIdx++) {
      const patientUid = citizenUids[cIdx];

      // Assign 5 distinct doctors for every patient
      for (let k = 0; k < 5; k++) {
        const docIndex = (cIdx * 3 + k) % doctorIds.length;
        const doctorUid = `DOC-${1001 + docIndex}`;
        const archetype = dialogueArchetypes[(cIdx * 5 + k) % dialogueArchetypes.length];

        const daysAgo = 1 + ((cIdx * 7 + k * 3) % 13);
        const threadBaseTime = new Date();
        threadBaseTime.setDate(threadBaseTime.getDate() - daysAgo);

        for (let m = 0; m < archetype.messages.length; m++) {
          const item = archetype.messages[m];
          const isCitizen = item.role === 'cit';
          const senderUid = isCitizen ? patientUid : doctorUid;
          const receiverUid = isCitizen ? doctorUid : patientUid;

          // Sequential timestamps spaced by 30 to 90 minutes
          const msgTime = new Date(threadBaseTime.getTime() + m * (45 * 60 * 1000) + (cIdx * 60000));

          // Older messages are read; the final message has a realistic chance of being unread (for notification testing)
          const isLastMessage = m === archetype.messages.length - 1;
          const isRead = isLastMessage ? (((cIdx + k) % 3 === 0) ? 0 : 1) : 1;

          messageBatch.push([senderUid, receiverUid, item.text, isRead, msgTime]);
        }
      }
    }

    // Batch insert messages in chunks of 300 to optimize throughput
    const chunkSize = 300;
    for (let i = 0; i < messageBatch.length; i += chunkSize) {
      const chunk = messageBatch.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '(?, ?, ?, ?, ?)').join(', ');
      const flatParams = chunk.flat();

      await query(`
        INSERT INTO messages (sender_uid, receiver_uid, message_text, is_read, created_at)
        VALUES ${placeholders};
      `, flatParams);
      totalMessagesSeeded += chunk.length;
    }
    console.log(`✓ Seeded ${totalMessagesSeeded} Cross-Role Messages across 500 Patient-Doctor conversation threads.\n`);

    // 9. Seed Community Health Blogs (16+ Articles)
    console.log('[9/9] Seeding Community Health Blogs & Clinical Knowledge Feed (16 Detailed Articles)...');
    const blogsData = [
      {
        author_id: 1,
        title: 'Recognizing Early Signs of Heart Disease: What Every Adult Should Know',
        category: 'Cardiology & Vascular',
        tags: 'Cardiology, Heart Attack, Angina, Prevention',
        content: `Cardiovascular disease remains the leading cause of premature adult mortality in South Asia. While crushing central chest pain is the classic presentation of an acute myocardial infarction, early ischemia often manifests subtly as unexplained exertional fatigue, dull aching radiating into the lower jaw or left shoulder, or shortness of breath while ascending stairs.

In diabetic patients and elderly women, autonomic neuropathy may completely mask chest pain, producing 'silent ischemia' that presents only as sudden dizziness, cold sweats, or indigestion-like epigastric discomfort. Early clinical screening using resting 12-lead electrocardiography (ECG), lipid profiling, and baseline echocardiograms allows physicians to initiate preventive statin and antiplatelet regimens before irreversible myocardial necrosis occurs.

Regular aerobic physical activity—at least 150 minutes of moderate exercise per week—alongside strict blood pressure control (targeting systolic < 130 mmHg) reduces the relative risk of acute coronary syndrome by up to 40%. Consult your doctor if you experience exertional discomfort.`
      },
      {
        author_id: 2,
        title: 'Managing Asthma and Seasonal Allergies in Urban Environments',
        category: 'Pulmonology & Respiratory',
        tags: 'Asthma, Allergies, Inhaler, Air Quality',
        content: `Urban air quality in densely populated cities frequently reaches hazardous particulate levels (PM2.5 > 150 µg/m³), triggering acute airway hyperreactivity, bronchial inflammation, and nocturnal bronchospasm. Asthma is not a disease of muscle constriction alone; it is fundamentally a chronic eosinophilic inflammatory disorder of the bronchial mucosa.

Relying exclusively on short-acting rescue inhalers like Salbutamol provides temporary bronchodilation but fails to resolve the underlying mucosal edema. Maintenance treatment requires low-dose Inhaled Corticosteroids (ICS) paired with Long-Acting Beta Agonists (LABA), which suppress airway remodeling and reduce life-threatening exacerbation risks.

Patients should use spacer devices to maximize pulmonary deposition and minimize oral candidiasis. In addition, installing HEPA air filters, washing bedding weekly in hot water, and wearing particulate-filtering masks outdoors during high-AQI days significantly cuts emergency room visits.`
      },
      {
        author_id: 3,
        title: 'Understanding Acid Reflux, Gastritis, and Long-Term Gut Health',
        category: 'Gastroenterology',
        tags: 'GERD, Gastritis, Omeprazole, Digestion',
        content: `Gastroesophageal Reflux Disease (GERD) and peptic gastritis are among the most frequent clinical presentations in Bangladesh, often exacerbated by high dietary oil consumption, irregular meal timings, and widespread unprescribed consumption of NSAIDs. When the lower esophageal sphincter relaxes inappropriately, hydrochloric acid and pepsin regurgitate, producing burning retrosternal discomfort and mucosal erosion.

While Proton Pump Inhibitors (PPIs) such as Omeprazole and Esomeprazole effectively suppress acid secretion, chronic unmonitored use spanning years can impair dietary calcium and Vitamin B12 absorption, while increasing susceptibility to Clostridium difficile enteritis. PPIs should be taken 30 to 45 minutes prior to the first meal of the day to achieve maximal receptor inhibition.

Long-term resolution requires lifestyle modifications: elevating the head of the bed by 15 cm, refraining from lying down within three hours of dinner, maintaining ideal body weight, and undergoing diagnostic endoscopy if red-flag symptoms such as dysphagia, anemia, or unintentional weight loss occur.`
      },
      {
        author_id: 4,
        title: 'Essential Immunization Timelines and Childhood Nutrition Guidelines',
        category: 'Pediatrics & Child Health',
        tags: 'Pediatrics, Vaccines, Nutrition, Stunting',
        content: `The first 1,000 days of life—from conception through the child’s second birthday—form the critical biological window for neurological development, linear bone growth, and lifelong immune competence. Strict adherence to the Expanded Programme on Immunization (EPI) schedule protects against formerly catastrophic childhood infections including measles, pertussis, diphtheria, and rotavirus diarrhea.

Exclusive breastfeeding for the first six months provides irreplaceable secretory IgA antibodies, optimal whey-casein ratios, and protective lactoferrin. Introducing nutrient-dense complementary feeding at six months—incorporating mashed egg yolk, animal protein, green leafy vegetables, and fortified cereal—prevents stunting and iron-deficiency anemia.

Parents should monitor development using standardized WHO growth charts. Ensure high-dose Vitamin A supplementation is received bi-annually and seek prompt clinical attention for persistent diarrhea or rapid respiratory rates (> 50 breaths/minute in infants).`
      },
      {
        author_id: 5,
        title: 'Protecting Your Skin: Daily Habits Against Sun Damage and Eczema',
        category: 'Dermatology & Skin Care',
        tags: 'Dermatology, Eczema, Sunscreen, Skin Health',
        content: `The human skin barrier serves as our primary physical defense against microbial invasion and environmental ultraviolet radiation. In humid tropical climates, high solar UV indexes generate reactive oxygen species that degrade collagen fibers, leading to photoaging, hyperpigmentation, and increased risk of cutaneous malignancies.

Applying broad-spectrum sunscreen with SPF 50+ and PA++++ every morning—and reapplying every 2 to 3 hours during prolonged sun exposure—is the single most effective dermatological intervention. For patients suffering from atopic dermatitis and eczema, the epidermal stratum corneum is genetically deficient in ceramides and filaggrin, causing trans-epidermal water loss and intense pruritus.

Management centers on minimizing harsh surfactants, taking short lukewarm showers, and applying thick petroleum or ceramide-rich moisturizers to damp skin within 3 minutes of bathing. Topical corticosteroid ointments should be reserved for acute flares under physician supervision to prevent skin atrophy.`
      },
      {
        author_id: 6,
        title: 'Hydration and Electrolyte Balance in Humid Climates',
        category: 'General & Preventive Health',
        tags: 'Hydration, Electrolytes, Heatstroke, Wellness',
        content: `Under tropical conditions where ambient temperature exceeds 35°C and relative humidity surpasses 80%, evaporative cooling via perspiration becomes significantly impaired. Profuse sweating rapidly depletes both intravascular volume and essential serum ions, particularly sodium, chloride, and potassium, leading to heat exhaustion and potential heatstroke.

Drinking plain water alone during high sweat-loss activities can precipitate exercise-associated hyponatremia (water intoxication), characterized by headache, nausea, cerebral edema, and muscle cramping. Incorporating oral rehydration salts (ORS) containing glucose and electrolytes ensures rapid co-transport across the intestinal lumen into the bloodstream.

Healthy adults require 2.5 to 3.5 liters of fluid daily during hot seasons. Monitor your hydration status using urine color: pale straw indicates eavolemia, while dark amber signifies urgent rehydration requirements. Avoid excessive caffeinated and sweetened beverages, which accelerate renal fluid excretion.`
      },
      {
        author_id: 7,
        title: 'Intermittent Fasting: Clinical Benefits vs Common Myths',
        category: 'Endocrinology & Nutrition',
        tags: 'Nutrition, Fasting, Metabolism, Weight Loss',
        content: `Intermittent fasting (IF)—most commonly the 16:8 time-restricted feeding regimen—has transitioned from a fitness trend into a clinically studied metabolic intervention. By extending the overnight fasting interval to 16 hours, systemic insulin levels decline, triggering hepatic glycogen depletion and initiating metabolic switching toward free fatty acid beta-oxidation and ketogenesis.

Cellular biology studies demonstrate that sustained fasting upregulates autophagy—the lysosomal degradation and recycling of senescent organelles and misfolded proteins—while improving peripheral insulin receptor sensitivity in skeletal muscle. This produces tangible improvements in fasting glucose, HbA1c, and visceral adipose tissue volume.

However, fasting is contraindicated in Type 1 diabetics on insulin therapy, pregnant and lactating mothers, and individuals with a history of eating disorders. Fasting is not a license to overindulge during the 8-hour feeding window; nutrient density, high protein intake, and adequate micronutrients remain paramount.`
      },
      {
        author_id: 8,
        title: 'Early Warning Signs of Dengue & Fluid Management in Upazila Centers',
        category: 'Infectious Disease',
        tags: 'Dengue, Platelets, Fluid Therapy, Emergency',
        content: `Dengue fever presents in three distinct phases: febrile, critical, and recovery. The most hazardous period is the critical phase, occurring around days 3 to 7 as the initial fever resolves. During this 24 to 48-hour window, systemic plasma leakage from endothelial dysfunction can trigger severe intravascular hypovolemia, shock, and organ hypoperfusion.

Frequent clinical monitoring is essential: hematocrit elevation > 20% indicates hemoconcentration and significant plasma leakage, preceding a steep decline in platelet counts. Warning signs including persistent vomiting, severe abdominal pain, clinical fluid accumulation (pleural effusion or ascites), and lethargy require immediate admission.

Judicious fluid administration with isotonic crystalloids (Normal Saline or Ringer’s Lactate) titrated strictly to clinical response avoids both hypovolemic shock and iatrogenic pulmonary edema. Routine prophylactic platelet transfusions are contraindicated unless active life-threatening mucosal hemorrhage occurs.`
      },
      {
        author_id: 9,
        title: 'Comprehensive Guide to Diabetes HbA1c Control and Renal Protection',
        category: 'Endocrinology & Diabetology',
        tags: 'Diabetes, HbA1c, Nephropathy, Metformin',
        content: `Diabetic kidney disease (diabetic nephropathy) develops in approximately 30-40% of patients with chronic diabetes mellitus and represents the leading cause of end-stage renal disease worldwide. Persistent hyperglycemia leads to advanced glycation end-products (AGEs), mesangial expansion, and glomerular hyperfiltration.

Routine annual screening for microalbuminuria (urine albumin-to-creatinine ratio) detects early subclinical glomerular damage years before serum creatinine rises. Initiating SGLT2 inhibitors (such as Empagliflozin or Dapagliflozin) or ACE inhibitors / ARBs reduces intraglomerular pressure, halting the progression of proteinuric renal failure.

Targeting an individualized HbA1c of 6.5% to 7.0% in early disease preserves microvascular endothelial function. Patients must adhere to a low-glycemic Mediterranean-style diet, eliminate tobacco use, and achieve blood pressure under 130/80 mmHg for optimal nephroprotection.`
      },
      {
        author_id: 10,
        title: 'Managing Chronic Migraine: Triggers, Sleep Hygiene, and Acute Therapy',
        category: 'Neurology & Brain Health',
        tags: 'Migraine, Headache, Aura, Neurology',
        content: `Migraine is a complex neurovascular disorder characterized by recurrent attacks of moderate-to-severe throbbing headache, typically unilateral, accompanied by photophobia, phonophobia, and nausea. In approximately 25% of patients, neurological aura precedes the headache phase by 20 to 60 minutes.

Pathophysiologically, cortical spreading depression triggers activation of the trigeminovascular system, releasing calcitonin gene-related peptide (CGRP) and substance P, causing sterile neurogenic inflammation around cerebral blood vessels. Abortive therapy—such as Triptans or high-dose NSAIDs—must be taken at the earliest onset of pain to halt peripheral and central sensitization.

Preventive pharmacotherapy is indicated when patients experience four or more debilitating headache days per month. Maintaining regular sleep-wake cycles, consistent hydration, and minimizing screen exposure under poor ambient lighting forms the cornerstone of non-pharmacological management.`
      },
      {
        author_id: 1,
        title: 'Hypertension: The Silent Killer and Practical Daily Home Monitoring',
        category: 'Cardiology & Vascular',
        tags: 'Hypertension, Blood Pressure, Monitoring, Salt',
        content: `Systemic hypertension is termed the silent killer because severe arterial wall damage occurs over decades without producing perceptible symptoms. Elevated hydrostatic pressure accelerates atherosclerosis, causing coronary artery disease, hypertensive nephrosclerosis, and hemorrhagic stroke.

Home blood pressure monitoring using an automated, validated upper-arm oscillometric cuff yields far more reliable prognostic data than isolated in-clinic measurements, avoiding 'white coat hypertension'. Patients should rest quietly for 5 minutes, keep their back supported and feet flat on the floor, and avoid caffeine or tobacco for 30 minutes prior to measurement.

Adopting the DASH (Dietary Approaches to Stop Hypertension) diet—rich in potassium, magnesium, and dietary fiber, and restricting sodium intake to < 1,500 mg daily—lowers systolic blood pressure by up to 11 mmHg, rivaling single-agent pharmacotherapy.`
      },
      {
        author_id: 2,
        title: 'Rational Antibiotic Use: Combating Antimicrobial Resistance (AMR)',
        category: 'Pharmacology & Public Health',
        tags: 'Antibiotics, AMR, Microbiology, Infection',
        content: `Antimicrobial Resistance (AMR) is one of the top ten global public health threats facing humanity. The routine over-the-counter dispensing of third-generation cephalosporins, macrolides, and fluoroquinolones for viral upper respiratory tract infections has selected for multi-drug resistant pathogens, including carbapenem-resistant Enterobacteriaceae.

Antibiotics exert selective pressure: while susceptible bacteria perish, spontaneous genetic mutations and plasmid-mediated resistance genes allow resistant clones to proliferate and spread within community reservoirs. Viral infections—including acute bronchitis, common colds, and most diarrheal episodes—do not respond to antimicrobials.

Physicians must practice antibiotic stewardship by obtaining microbiological cultures whenever feasible, selecting narrow-spectrum agents, and prescribing strictly indicated durations. Patients must complete their entire prescribed course and never self-administer leftover antibiotics.`
      },
      {
        author_id: 3,
        title: 'The Vital Importance of Voluntary Blood Donation in Bangladesh',
        category: 'Hematology & Blood Banking',
        tags: 'Blood Bank, Transfusion, Voluntary Donor, Hemoglobin',
        content: `Voluntary, non-remunerated blood donation represents the ethical and clinical lifeblood of the healthcare system. Component separation allows a single whole blood unit to be processed into Packed Red Blood Cells (PRBCs) for acute trauma or severe anemia, Fresh Frozen Plasma (FFP) for coagulopathies, and Platelet Concentrates for oncology and dengue patients.

Healthy adults aged 18 to 60 with a body weight of at least 48 kg and a screening hemoglobin level > 12.5 g/dL can donate whole blood every 120 days with zero negative health consequences. The human bone marrow replenishes lost fluid volume within 24 to 48 hours and erythrocyte mass within 4 to 6 weeks.

Rigorous serological screening for transfusion-transmitted infections (HIV, Hepatitis B and C, Syphilis, and Malaria) ensures recipient safety. Participating in organized voluntary donor registries, such as xMED's real-time national hub, saves countless lives daily.`
      },
      {
        author_id: 4,
        title: 'Thyroid Disorders in Women: Hypothyroidism, Goiter, and Fertility',
        category: 'Endocrinology & Women Health',
        tags: 'Thyroid, TSH, Women Health, Levothyroxine',
        content: `Thyroid disorders affect women five to eight times more frequently than men, primarily due to autoimmune susceptibility (Hashimoto’s thyroiditis). Thyroid hormones (T3 and T4) act as master metabolic regulators, governing basal metabolic rate, cardiac output, lipid oxidation, and ovarian steroidogenesis.

Subclinical and overt hypothyroidism frequently causes menstrual irregularities, anovulation, and recurrent early pregnancy loss. Elevated thyroid-stimulating hormone (TSH) stimulates prolactin secretion, disrupting the pulsatile release of GnRH and luteinizing hormone.

Women planning conception should target a preconception TSH between 0.5 and 2.5 mIU/L. During pregnancy, fetal reliance on maternal thyroxine for first-trimester cerebral cortex development necessitates prompt 30-50% dosage escalation of Levothyroxine upon pregnancy confirmation.`
      },
      {
        author_id: 5,
        title: 'Kidney Stones: Clinical Prevention, Dietary Oxalates, and Hydration',
        category: 'Nephrology & Urology',
        tags: 'Kidney Stones, Nephrology, Hydration, Calcium',
        content: `Nephrolithiasis (kidney stones) predominantly presents as agonizing flank pain radiating to the groin, accompanied by microscopic hematuria, nausea, and dysuria. Over 80% of calculi are composed of calcium oxalate, formed when urinary concentrations of calcium and oxalate exceed solubility thresholds.

The single most effective preventative intervention is maintaining a daily urinary volume > 2.5 liters, which dilutes lithogenic solutes. Restricting dietary calcium is a widespread clinical misconception; low calcium intake actually increases free oxalate absorption in the gut, elevating urinary oxalate and paradoxically increasing stone risk.

Patients should consume normal dietary calcium with meals, restrict high-oxalate foods (spinach, beetroot, nuts), moderate animal purine intake, and increase urinary citrate excretion by regularly consuming fresh lemon water.`
      },
      {
        author_id: 6,
        title: 'Mental Health in Modern Life: Navigating Anxiety, Burnout, and Sleep',
        category: 'Psychiatry & Behavioral Health',
        tags: 'Mental Health, Anxiety, Stress, Sleep Hygiene',
        content: `Chronic psychological stress activates the hypothalamic-pituitary-adrenal (HPA) axis, leading to sustained glucocorticoid secretion, systemic low-grade inflammation, and autonomic imbalance. Modern hyperconnectivity, prolonged work hours, and disrupted circadian rhythms have precipitated unprecedented rates of generalized anxiety and professional burnout.

Sleep architecture is vital for neurocognitive restoration. During slow-wave and REM sleep, the cerebral glymphatic system clears metabolic byproducts, including amyloid beta. Exposure to blue-spectrum screen light within two hours of sleep suppresses nocturnal pineal melatonin release, delaying sleep onset and fragmenting sleep cycles.

Adopting progressive muscle relaxation, cognitive reframing, and seeking early clinical counseling prevents acute stress from transitioning into major depressive disorder. Mental health is an indispensable pillar of comprehensive physical well-being.`
      }
    ];

    let totalHealthBlogs = 0;
    for (const b of blogsData) {
      await query(`
        INSERT INTO health_blogs (author_id, title, category, content, tags)
        VALUES (?, ?, ?, ?, ?);
      `, [b.author_id, b.title, b.category, b.content, b.tags]);
      totalHealthBlogs++;
    }
    console.log(`✓ Seeded ${totalHealthBlogs} Community Health Blog Articles.\n`);

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
    console.log(`  • Blood Posts:         ${totalBloodPosts}`);
    console.log(`  • Direct Messages:     ${totalMessagesSeeded}`);
    console.log(`  • Health Blogs:        ${totalHealthBlogs}`);
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
