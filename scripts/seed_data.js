// =============================================================
// xMED Massive Clinical Seed Data Generator
// Populates 20 Doctors, 100 Citizens, 600+ Prescriptions & Self-Meds
// All passwords default to: Password123!
// =============================================================

const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

async function seedDatabase() {
  console.log('======================================================');
  console.log('🚀 Starting xMED Massive Clinical Database Seeding...');
  console.log('======================================================\n');

  try {
    // 1. Hash the default global password
    const rawPassword = 'Password123!';
    console.log(`[1/5] Hashing global password "${rawPassword}"...`);
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    console.log('✓ Password hash generated.\n');

    // 2. Fetch available medicines to map prescription items
    console.log('[2/5] Fetching medicine catalog from database...');
    const medicines = await query('SELECT medicine_id, brand_name, generic_name, dosage_form, strength FROM medicines;');
    if (!medicines || medicines.length === 0) {
      throw new Error('No medicines found in database! Please run scripts/init_db.js first.');
    }
    console.log(`✓ Loaded ${medicines.length} medicines into memory for item mapping.\n`);

    // 3. Seed 20 Unique Doctors
    console.log('[3/5] Seeding 20 Unique Certified Doctors...');
    const doctorProfiles = [
      { name: 'Dr. Tanvir Ahmed', spec: 'Cardiology', phone: '+8801711000001', email: 'dr.tanvir@xmed.gov.bd' },
      { name: 'Dr. Nusrat Jahan Chowdhury', spec: 'Pulmonology', phone: '+8801711000002', email: 'dr.nusrat@xmed.gov.bd' },
      { name: 'Dr. Shakil Hossain', spec: 'Dermatology', phone: '+8801711000003', email: 'dr.shakil@xmed.gov.bd' },
      { name: 'Dr. Farzana Kabir', spec: 'Pediatrics', phone: '+8801711000004', email: 'dr.farzana@xmed.gov.bd' },
      { name: 'Dr. Mahmudul Hasan', spec: 'General Medicine', phone: '+8801711000005', email: 'dr.mahmudul@xmed.gov.bd' },
      { name: 'Dr. Sharmin Akter', spec: 'Orthopedics', phone: '+8801711000006', email: 'dr.sharmin@xmed.gov.bd' },
      { name: 'Dr. Kazi Arifur Rahman', spec: 'Neurology', phone: '+8801711000007', email: 'dr.kazi.arifur@xmed.gov.bd' },
      { name: 'Dr. Samira Khanam', spec: 'Gastroenterology', phone: '+8801711000008', email: 'dr.samira@xmed.gov.bd' },
      { name: 'Dr. Mokhlesur Rahman', spec: 'Nephrology', phone: '+8801711000009', email: 'dr.mokhlesur@xmed.gov.bd' },
      { name: 'Dr. Sabina Yeasmin', spec: 'Endocrinology', phone: '+8801711000010', email: 'dr.sabina@xmed.gov.bd' },
      { name: 'Dr. Imtiaz Ahmed', spec: 'Otolaryngology (ENT)', phone: '+8801711000011', email: 'dr.imtiaz@xmed.gov.bd' },
      { name: 'Dr. Rashedul Islam', spec: 'Psychiatry', phone: '+8801711000012', email: 'dr.rashedul@xmed.gov.bd' },
      { name: 'Dr. Shireen Parveen', spec: 'Oncology', phone: '+8801711000013', email: 'dr.shireen@xmed.gov.bd' },
      { name: 'Dr. Zahirul Haque', spec: 'Urology', phone: '+8801711000014', email: 'dr.zahirul@xmed.gov.bd' },
      { name: 'Dr. Mehreen Sultana', spec: 'Rheumatology', phone: '+8801711000015', email: 'dr.mehreen@xmed.gov.bd' },
      { name: 'Dr. Asaduzzaman Khan', spec: 'Ophthalmology', phone: '+8801711000016', email: 'dr.asad@xmed.gov.bd' },
      { name: 'Dr. Laila Anjum', spec: 'Hematology', phone: '+8801711000017', email: 'dr.laila@xmed.gov.bd' },
      { name: 'Dr. Monirul Islam', spec: 'Family Medicine', phone: '+8801711000018', email: 'dr.monirul@xmed.gov.bd' },
      { name: 'Dr. Tasneem Fariha', spec: 'Internal Medicine', phone: '+8801711000019', email: 'dr.tasneem@xmed.gov.bd' },
      { name: 'Dr. Golam Kibria', spec: 'Emergency Medicine', phone: '+8801711000020', email: 'dr.kibria@xmed.gov.bd' }
    ];

    const doctorIds = [];
    for (let i = 0; i < doctorProfiles.length; i++) {
      const doc = doctorProfiles[i];
      const license_no = `BMDC-${10001 + i}`;
      
      const insertDocSql = `
        INSERT INTO doctors (license_no, full_name, specialization, phone, email, password_hash)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          full_name = VALUES(full_name),
          specialization = VALUES(specialization),
          password_hash = VALUES(password_hash);
      `;
      await query(insertDocSql, [license_no, doc.name, doc.spec, doc.phone, doc.email, passwordHash]);
      
      // Get the doctor_id
      const [row] = await query('SELECT doctor_id FROM doctors WHERE license_no = ? LIMIT 1;', [license_no]);
      if (row) {
        doctorIds.push(row.doctor_id);
      }
    }
    console.log(`✓ Successfully seeded/verified 20 Doctors (BMDC-10001 to BMDC-10020).\n`);

    // 4. Seed 100 Unique Citizens/Patients
    console.log('[4/5] Seeding 100 Unique Citizens (BD-2000-0001 to BD-2000-0100)...');
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
    const genders = ['Male', 'Female'];

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
      
      // DOB between 2000 and 2024 (strictly satisfies dob >= '2000-01-01')
      const birthYear = 2000 + (i % 24);
      const birthMonth = String(1 + (i % 12)).padStart(2, '0');
      const birthDay = String(1 + (i % 28)).padStart(2, '0');
      const dob = `${birthYear}-${birthMonth}-${birthDay}`;

      const phone = `+8801811${String(i).padStart(6, '0')}`;
      const email = `citizen${padNum}@xmed.gov.bd`;

      const insertCitizenSql = `
        INSERT INTO citizens (uid, full_name, dob, gender, blood_group, phone, email, password_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          full_name = VALUES(full_name),
          dob = VALUES(dob),
          gender = VALUES(gender),
          blood_group = VALUES(blood_group),
          password_hash = VALUES(password_hash);
      `;
      await query(insertCitizenSql, [uid, fullName, dob, gender, blood, phone, email, passwordHash]);
    }
    console.log(`✓ Successfully seeded/verified 100 Citizens (BD-2000-0001 to BD-2000-0100).\n`);

    // 5. Seed 5 to 10 Prescriptions per Citizen + Self Medications
    console.log('[5/5] Seeding 5 to 10 Prescriptions per Citizen and Emergency Self-Medications...');

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
        name: 'Alatrol 10mg (Cetirizine)',
        dosage: '1 tablet before sleep',
        reason: 'Severe acute sneezing fits, runny nose, and itching caused by old file dust.'
      },
      {
        name: 'Seclo 20mg (Omeprazole)',
        dosage: '1 capsule morning',
        reason: 'Persistent morning stomach cramps and empty stomach gastric burn.'
      }
    ];

    let totalPrescriptions = 0;
    let totalItems = 0;
    let totalSelfMeds = 0;

    for (let c = 0; c < citizenUids.length; c++) {
      const patientUid = citizenUids[c];
      
      // Determine number of prescriptions for this patient: 5 to 10
      const rxCount = 5 + ((c * 7) % 6); // Gives 5, 6, 7, 8, 9, 10
      
      for (let r = 0; r < rxCount; r++) {
        // Select doctor from the 20 seeded doctors
        const doctorId = doctorIds[(c * 3 + r * 5) % doctorIds.length];
        const diagTemplate = diagnosesCatalog[(c + r) % diagnosesCatalog.length];

        // Spread dates between 2018 and 2026
        const year = 2018 + Math.floor((r / rxCount) * 8); // 2018 to 2026
        const month = String(1 + ((c + r * 2) % 12)).padStart(2, '0');
        const day = String(1 + ((c * 2 + r * 3) % 28)).padStart(2, '0');
        const hour = String(9 + (r % 10)).padStart(2, '0');
        const minute = String((r * 15) % 60).padStart(2, '0');
        const createdAt = `${year}-${month}-${day} ${hour}:${minute}:00`;

        // Insert prescription
        const insertRxSql = `
          INSERT INTO prescriptions (patient_uid, doctor_id, diagnosis, clinical_notes, created_at)
          VALUES (?, ?, ?, ?, ?);
        `;
        const rxResult = await query(insertRxSql, [
          patientUid,
          doctorId,
          diagTemplate.diag,
          diagTemplate.notes,
          createdAt
        ]);
        const prescriptionId = rxResult.insertId;
        totalPrescriptions++;

        // Insert 2 to 4 prescription items
        const numItems = 2 + ((c + r) % 3); // 2, 3, or 4 items
        for (let it = 0; it < numItems; it++) {
          const med = medicines[(c * 11 + r * 7 + it * 13) % medicines.length];
          const dosage = dosageInstructions[(c + r + it) % dosageInstructions.length];
          const duration = durations[(c * 2 + r + it) % durations.length];

          const insertItemSql = `
            INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration)
            VALUES (?, ?, ?, ?);
          `;
          await query(insertItemSql, [prescriptionId, med.medicine_id, dosage, duration]);
          totalItems++;
        }
      }

      // Insert 1 to 3 Self-Reported / Emergency Medications for each citizen
      const selfCount = 1 + (c % 3); // 1, 2, or 3 self-medications
      for (let s = 0; s < selfCount; s++) {
        const sm = selfMedSamples[(c + s) % selfMedSamples.length];
        const sYear = 2023 + (s % 4); // 2023 to 2026
        const sMonth = String(1 + ((c * 3 + s) % 12)).padStart(2, '0');
        const sDay = String(1 + ((c * 5 + s * 4) % 28)).padStart(2, '0');
        const dateTaken = `${sYear}-${sMonth}-${sDay}`;

        const insertSelfSql = `
          INSERT INTO patient_self_medications 
            (patient_uid, medicine_name, reason_or_emergency, dosage_taken, date_taken)
          VALUES (?, ?, ?, ?, ?);
        `;
        await query(insertSelfSql, [
          patientUid,
          sm.name,
          sm.reason,
          sm.dosage,
          dateTaken
        ]);
        totalSelfMeds++;
      }
    }

    console.log(`✓ Inserted ${totalPrescriptions} Clinical Prescriptions across all 100 Citizens.`);
    console.log(`✓ Inserted ${totalItems} Prescription Items mapped to the medicine catalog.`);
    console.log(`✓ Inserted ${totalSelfMeds} Self-Reported Emergency Medications.\n`);

    console.log('======================================================');
    console.log('🎉 MASSIVE CLINICAL SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Summary of Seeded Records:');
    console.log('  • Doctors: 20 Doctors (BMDC-10001 to BMDC-10020)');
    console.log('  • Citizens: 100 Citizens (BD-2000-0001 to BD-2000-0100)');
    console.log(`  • Prescriptions: ${totalPrescriptions} Consultations (5 to 10 per citizen)`);
    console.log(`  • Prescription Items: ${totalItems} Items`);
    console.log(`  • Self-Reported OTC Medications: ${totalSelfMeds} Logs`);
    console.log('  • Default Password for ALL Seeded Accounts: "Password123!"');
    console.log('======================================================\n');

  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seedDatabase();
