const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || '192.168.0.186',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  connectTimeout: 10000,
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'xmed_db';

async function initializeDatabase() {
  console.log(`[xMED DB Init] Attempting connection to MySQL at ${config.host}:${config.port} as user '${config.user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log(`[xMED DB Init] Connected to MySQL server successfully.`);

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    console.log(`[xMED DB Init] Verifying and updating core tables...`);

    // 1. citizens
    await connection.query(`
      CREATE TABLE IF NOT EXISTS citizens (
        uid VARCHAR(20) PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        dob DATE NOT NULL,
        gender ENUM('Male', 'Female', 'Other') NOT NULL,
        blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
        phone VARCHAR(15) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. doctors
    await connection.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        doctor_id INT AUTO_INCREMENT PRIMARY KEY,
        license_no VARCHAR(50) UNIQUE NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        specialization VARCHAR(100) NOT NULL,
        phone VARCHAR(15) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        verified BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 3. medicines
    await connection.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        medicine_id INT AUTO_INCREMENT PRIMARY KEY,
        brand_name VARCHAR(100) NOT NULL,
        generic_name VARCHAR(100) NOT NULL,
        dosage_form VARCHAR(50) NOT NULL,
        strength VARCHAR(50) NOT NULL,
        category VARCHAR(50) DEFAULT 'General',
        origin VARCHAR(50) DEFAULT 'Global',
        FULLTEXT INDEX ft_medicine (brand_name, generic_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Alter column to VARCHAR(50) if it was previously an ENUM
    try {
      await connection.query(`ALTER TABLE medicines MODIFY COLUMN dosage_form VARCHAR(50) NOT NULL;`);
    } catch (e) {}

    // Ensure category and origin columns exist
    try {
      await connection.query(`ALTER TABLE medicines ADD COLUMN category VARCHAR(50) DEFAULT 'General';`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE medicines ADD COLUMN origin VARCHAR(50) DEFAULT 'Global';`);
    } catch (e) {}

    // 4. prescriptions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id INT AUTO_INCREMENT PRIMARY KEY,
        patient_uid VARCHAR(20) NOT NULL,
        doctor_id INT NOT NULL,
        diagnosis TEXT NOT NULL,
        clinical_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_uid) REFERENCES citizens(uid) ON DELETE RESTRICT,
        FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 5. prescription_items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prescription_items (
        item_id INT AUTO_INCREMENT PRIMARY KEY,
        prescription_id INT NOT NULL,
        medicine_id INT NOT NULL,
        dosage_instruction VARCHAR(100) NOT NULL,
        duration VARCHAR(50) NOT NULL,
        FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
        FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6. diagnostic_reports
    await connection.query(`
      CREATE TABLE IF NOT EXISTS diagnostic_reports (
        report_id INT AUTO_INCREMENT PRIMARY KEY,
        patient_uid VARCHAR(20) NOT NULL,
        test_name VARCHAR(150) NOT NULL,
        report_file_url VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_uid) REFERENCES citizens(uid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 6.1 patient_self_medications (Self-Reported / Emergency OTC Medications)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS patient_self_medications (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        patient_uid VARCHAR(20) NOT NULL,
        medicine_name VARCHAR(150) NOT NULL,
        reason_or_emergency TEXT NOT NULL,
        dosage_taken VARCHAR(100),
        date_taken DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_self_med_patient FOREIGN KEY (patient_uid) REFERENCES citizens(uid) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 7. blogs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        blog_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        author_name VARCHAR(100) NOT NULL,
        author_specialization VARCHAR(150) NOT NULL,
        author_license VARCHAR(50) NOT NULL,
        read_time VARCHAR(20) NOT NULL,
        summary TEXT NOT NULL,
        content MEDIUMTEXT NOT NULL,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8. ADVANCED DBMS: Audit Trail & Analytics Tables
    console.log(`[xMED DB Init] Initializing immutable audit logging & analytics infrastructure...`);

    // 8.1 Prescription Audit Logs
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prescription_audit_logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        prescription_id INT NOT NULL,
        action_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
        performed_by_doctor_id INT,
        old_data JSON,
        new_data JSON,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8.2 Daily Analytics Summary (for Event Scheduler)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS daily_analytics_summary (
        summary_id INT AUTO_INCREMENT PRIMARY KEY,
        summary_date DATE UNIQUE NOT NULL,
        total_consultations INT DEFAULT 0,
        total_prescriptions INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 8.3 Alter medicines table to add total_prescribed_count
    try {
      await connection.query(`ALTER TABLE medicines ADD COLUMN IF NOT EXISTS total_prescribed_count INT DEFAULT 0;`);
    } catch (e) {}

    // 8.4 Targeted Indexes (Composite, B-Tree, Full-Text) & Constraints
    console.log(`[xMED DB Init] Optimizing query plans with advanced indexes & constraints...`);
    try {
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_presc_patient_created ON prescriptions(patient_uid, created_at DESC);`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_presc_patient_date ON prescriptions(patient_uid, created_at DESC);`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_items_lookup ON prescription_items(prescription_id, medicine_id);`);
      await connection.query(`CREATE INDEX IF NOT EXISTS idx_reports_patient ON diagnostic_reports(patient_uid, uploaded_at DESC);`);
      await connection.query(`CREATE FULLTEXT INDEX IF NOT EXISTS idx_ft_medicines ON medicines(brand_name, generic_name);`);
    } catch (e) {
      console.log(`[xMED DB Init] Index notice:`, e.message);
    }

    try {
      await connection.query(`ALTER TABLE citizens ADD CONSTRAINT chk_citizen_dob CHECK (dob >= '1900-01-01');`);
    } catch (e) {}
    try {
      await connection.query(`ALTER TABLE prescription_items ADD CONSTRAINT chk_item_duration CHECK (duration != '');`);
    } catch (e) {}

    // 8.5 Automated Database Triggers
    console.log(`[xMED DB Init] Compiling automated database triggers...`);

    // Trigger 1: Medicine prescription counter
    await connection.query(`DROP TRIGGER IF EXISTS trg_update_medicine_usage;`);
    await connection.query(`
      CREATE TRIGGER trg_update_medicine_usage
      AFTER INSERT ON prescription_items
      FOR EACH ROW
      BEGIN
        UPDATE medicines 
        SET total_prescribed_count = total_prescribed_count + 1 
        WHERE medicine_id = NEW.medicine_id;
      END;
    `);

    // Trigger 2: Prescription insertion audit log
    await connection.query(`DROP TRIGGER IF EXISTS trg_after_prescription_insert;`);
    await connection.query(`
      CREATE TRIGGER trg_after_prescription_insert
      AFTER INSERT ON prescriptions
      FOR EACH ROW
      BEGIN
        INSERT INTO prescription_audit_logs (
          prescription_id, action_type, performed_by_doctor_id, old_data, new_data
        ) VALUES (
          NEW.prescription_id, 'INSERT', NEW.doctor_id, NULL,
          JSON_OBJECT(
            'prescription_id', NEW.prescription_id,
            'patient_uid', NEW.patient_uid,
            'doctor_id', NEW.doctor_id,
            'diagnosis', NEW.diagnosis,
            'clinical_notes', NEW.clinical_notes,
            'created_at', NEW.created_at
          )
        );
      END;
    `);

    // Trigger 3: Prescription update audit log
    await connection.query(`DROP TRIGGER IF EXISTS trg_after_prescription_update;`);
    await connection.query(`
      CREATE TRIGGER trg_after_prescription_update
      AFTER UPDATE ON prescriptions
      FOR EACH ROW
      BEGIN
        INSERT INTO prescription_audit_logs (
          prescription_id, action_type, performed_by_doctor_id, old_data, new_data
        ) VALUES (
          NEW.prescription_id, 'UPDATE', NEW.doctor_id,
          JSON_OBJECT(
            'prescription_id', OLD.prescription_id,
            'patient_uid', OLD.patient_uid,
            'doctor_id', OLD.doctor_id,
            'diagnosis', OLD.diagnosis,
            'clinical_notes', OLD.clinical_notes
          ),
          JSON_OBJECT(
            'prescription_id', NEW.prescription_id,
            'patient_uid', NEW.patient_uid,
            'doctor_id', NEW.doctor_id,
            'diagnosis', NEW.diagnosis,
            'clinical_notes', NEW.clinical_notes
          )
        );
      END;
    `);

    // 8.6 Stored Procedures with ACID Transactions
    console.log(`[xMED DB Init] Compiling stored procedures with ACID transaction handlers...`);

    // Stored Procedure 1: sp_CreatePrescriptionWithItems
    await connection.query(`DROP PROCEDURE IF EXISTS sp_CreatePrescriptionWithItems;`);
    await connection.query(`
      CREATE PROCEDURE sp_CreatePrescriptionWithItems(
        IN p_patient_uid VARCHAR(20),
        IN p_doctor_id INT,
        IN p_diagnosis TEXT,
        IN p_notes TEXT,
        IN p_items_json LONGTEXT,
        OUT p_prescription_id INT
      )
      BEGIN
        DECLARE v_rx_id INT;
        DECLARE i INT DEFAULT 0;
        DECLARE total_items INT DEFAULT 0;
        DECLARE v_med_id INT;
        DECLARE v_dosage VARCHAR(100);
        DECLARE v_duration VARCHAR(50);

        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
          ROLLBACK;
          RESIGNAL;
        END;

        START TRANSACTION;

        INSERT INTO prescriptions (patient_uid, doctor_id, diagnosis, clinical_notes)
        VALUES (p_patient_uid, p_doctor_id, p_diagnosis, p_notes);

        SET v_rx_id = LAST_INSERT_ID();
        SET p_prescription_id = v_rx_id;

        SET total_items = IFNULL(JSON_LENGTH(p_items_json), 0);

        WHILE i < total_items DO
          SET v_med_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].medicine_id'))) AS UNSIGNED);
          SET v_dosage = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].dosage_instruction')));
          SET v_duration = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', i, '].duration')));

          IF v_med_id IS NOT NULL AND v_med_id > 0 THEN
            INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration)
            VALUES (v_rx_id, v_med_id, IFNULL(v_dosage, 'As directed'), IFNULL(v_duration, '7 days'));
          END IF;

          SET i = i + 1;
        END WHILE;

        COMMIT;

        SELECT v_rx_id AS prescription_id;
      END;
    `);

    // Stored Procedure 2: sp_GetPatientLongitudinalHistory
    await connection.query(`DROP PROCEDURE IF EXISTS sp_GetPatientLongitudinalHistory;`);
    await connection.query(`
      CREATE PROCEDURE sp_GetPatientLongitudinalHistory(
        IN p_patient_uid VARCHAR(20),
        IN p_limit INT,
        IN p_offset INT
      )
      BEGIN
        SELECT 
          c.uid,
          c.full_name,
          c.dob,
          c.gender,
          c.blood_group,
          c.phone,
          c.email,
          COUNT(DISTINCT p.prescription_id) AS total_visits,
          COUNT(DISTINCT r.report_id) AS total_lab_reports
        FROM citizens c
        LEFT JOIN prescriptions p ON c.uid = p.patient_uid
        LEFT JOIN diagnostic_reports r ON c.uid = r.patient_uid
        WHERE c.uid = p_patient_uid
        GROUP BY c.uid;

        SELECT 
          p.prescription_id,
          p.patient_uid,
          p.diagnosis,
          p.clinical_notes,
          p.created_at,
          d.full_name AS doctor_name,
          d.specialization AS doctor_specialization,
          d.license_no AS doctor_license,
          CONCAT('[', IFNULL(GROUP_CONCAT(
            JSON_OBJECT(
              'item_id', pi.item_id,
              'medicine_id', m.medicine_id,
              'brand_name', m.brand_name,
              'generic_name', m.generic_name,
              'dosage_instruction', pi.dosage_instruction,
              'duration', pi.duration
            )
          ), ''), ']') AS items_json
        FROM prescriptions p
        JOIN doctors d ON p.doctor_id = d.doctor_id
        LEFT JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
        LEFT JOIN medicines m ON pi.medicine_id = m.medicine_id
        WHERE p.patient_uid = p_patient_uid
        GROUP BY p.prescription_id
        ORDER BY p.created_at DESC
        LIMIT p_limit OFFSET p_offset;
      END;
    `);

    // 8.7 Optimized Relational & Analytical Views
    console.log(`[xMED DB Init] Compiling relational and analytical views...`);

    // View 1: Complete patient history
    await connection.query(`DROP VIEW IF EXISTS vw_complete_patient_history;`);
    await connection.query(`
      CREATE VIEW vw_complete_patient_history AS
      SELECT 
        c.uid AS patient_uid,
        c.full_name AS patient_name,
        c.dob AS patient_dob,
        c.gender AS patient_gender,
        c.blood_group AS patient_blood_group,
        p.prescription_id,
        p.created_at AS prescription_date,
        p.diagnosis,
        p.clinical_notes,
        d.doctor_id,
        d.full_name AS doctor_name,
        d.specialization AS doctor_specialization,
        d.license_no AS doctor_license,
        CONCAT('[', IFNULL(GROUP_CONCAT(
          JSON_OBJECT(
            'medicine_id', m.medicine_id,
            'brand_name', m.brand_name,
            'generic_name', m.generic_name,
            'dosage_instruction', pi.dosage_instruction,
            'duration', pi.duration
          )
        ), ''), ']') AS prescribed_medications
      FROM citizens c
      JOIN prescriptions p ON c.uid = p.patient_uid
      JOIN doctors d ON p.doctor_id = d.doctor_id
      LEFT JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
      LEFT JOIN medicines m ON pi.medicine_id = m.medicine_id
      GROUP BY p.prescription_id;
    `);

    // View 2: Doctor clinical analytics
    await connection.query(`DROP VIEW IF EXISTS vw_doctor_clinical_analytics;`);
    await connection.query(`
      CREATE VIEW vw_doctor_clinical_analytics AS
      SELECT 
        d.doctor_id,
        d.full_name AS doctor_name,
        d.specialization,
        COUNT(DISTINCT p.prescription_id) AS total_consultations,
        COUNT(DISTINCT p.patient_uid) AS unique_patients_treated,
        COUNT(pi.item_id) AS total_medicines_prescribed,
        MIN(p.created_at) AS first_consultation,
        MAX(p.created_at) AS latest_consultation
      FROM doctors d
      LEFT JOIN prescriptions p ON d.doctor_id = p.doctor_id
      LEFT JOIN prescription_items pi ON p.prescription_id = pi.prescription_id
      GROUP BY d.doctor_id;
    `);

    // 8.8 MySQL Event Scheduler
    try {
      await connection.query(`SET GLOBAL event_scheduler = ON;`);
      await connection.query(`DROP EVENT IF EXISTS evt_daily_health_summary;`);
      await connection.query(`
        CREATE EVENT evt_daily_health_summary
        ON SCHEDULE EVERY 1 DAY
        STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
        ON COMPLETION PRESERVE
        ENABLE
        DO
        BEGIN
          INSERT INTO daily_analytics_summary (summary_date, total_consultations, total_prescriptions)
          VALUES (
            CURRENT_DATE - INTERVAL 1 DAY,
            (SELECT COUNT(*) FROM prescriptions WHERE DATE(created_at) = CURRENT_DATE - INTERVAL 1 DAY),
            (SELECT COUNT(*) FROM prescriptions WHERE DATE(created_at) = CURRENT_DATE - INTERVAL 1 DAY)
          )
          ON DUPLICATE KEY UPDATE
            total_consultations = VALUES(total_consultations),
            total_prescriptions = VALUES(total_prescriptions);
        END;
      `);
      console.log(`[xMED DB Init] Recurring MySQL maintenance event evt_daily_health_summary active.`);
    } catch (e) {
      console.log(`[xMED DB Init] Event scheduler notice:`, e.message);
    }

    console.log(`[xMED DB Init] Core schema and advanced DBMS infrastructure verified.`);

    // =========================================================
    // 8. SEED EXPANDED MEDICINES (Worldwide & Bangladesh Govt EDCL)
    // =========================================================
    const [medCountRows] = await connection.query(`SELECT COUNT(*) AS count FROM medicines;`);
    // If fewer than 50 medicines, populate the full global & national catalog
    if (medCountRows[0].count < 50) {
      console.log(`[xMED DB Init] Seeding extensive worldwide and Bangladesh government essential drug dataset...`);
      
      const fullCatalog = [
        // --- 1. BANGLADESH GOVERNMENT OFFICIAL ESSENTIAL DRUGS (EDCL / DGHS) ---
        ['EDCL Paracetamol 500mg', 'Paracetamol', 'Tablet', '500mg', 'Analgesic', 'BD Govt Essential (EDCL)'],
        ['EDCL Paracetamol Syrup', 'Paracetamol', 'Syrup', '120mg/5ml', 'Analgesic & Antipyretic', 'BD Govt Essential (EDCL)'],
        ['EDCL Antacid Compound', 'Aluminium Hydroxide + Magnesium Hydroxide', 'Tablet', 'Standard Chewable', 'Antacid', 'BD Govt Essential (EDCL)'],
        ['EDCL Antacid Suspension', 'Aluminium Hydroxide + Magnesium Hydroxide', 'Syrup', '200ml', 'Antacid', 'BD Govt Essential (EDCL)'],
        ['EDCL Albendazole 400mg', 'Albendazole', 'Tablet', '400mg', 'Anthelmintic (Deworming)', 'BD Govt Essential (EDCL)'],
        ['EDCL Cotrimoxazole 480mg', 'Sulfamethoxazole + Trimethoprim', 'Tablet', '400mg + 80mg', 'Antibiotic', 'BD Govt Essential (EDCL)'],
        ['EDCL Cotrimoxazole Suspension', 'Sulfamethoxazole + Trimethoprim', 'Syrup', '200mg + 40mg/5ml', 'Antibiotic', 'BD Govt Essential (EDCL)'],
        ['EDCL Oral Rehydration Salts (ORS)', 'Oral Rehydration Salts Formula', 'Powder', 'Packet for 500ml', 'Electrolyte Rehydration', 'BD Govt Essential (EDCL)'],
        ['EDCL Iron & Folic Acid', 'Ferrous Sulfate + Folic Acid', 'Tablet', '200mg + 0.5mg', 'Hematinic / Maternal Health', 'BD Govt Essential (EDCL)'],
        ['EDCL Metronidazole 400mg', 'Metronidazole', 'Tablet', '400mg', 'Antiprotozoal & Antibacterial', 'BD Govt Essential (EDCL)'],
        ['EDCL Chlorpheniramine Maleate', 'Chlorpheniramine Maleate', 'Tablet', '4mg', 'Antihistamine', 'BD Govt Essential (EDCL)'],
        ['EDCL Vitamin B-Complex', 'Vitamin B1 + B2 + B6 + Nicotinamide', 'Tablet', 'Standard', 'Vitamin Supplement', 'BD Govt Essential (EDCL)'],
        ['EDCL Amoxicillin 250mg', 'Amoxicillin Trihydrate', 'Capsule', '250mg', 'Antibiotic (Penicillin)', 'BD Govt Essential (EDCL)'],
        ['EDCL Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Capsule', '500mg', 'Antibiotic (Penicillin)', 'BD Govt Essential (EDCL)'],
        ['EDCL Amoxicillin Dry Syrup', 'Amoxicillin Trihydrate', 'Syrup', '125mg/5ml', 'Antibiotic (Penicillin)', 'BD Govt Essential (EDCL)'],
        ['EDCL Ciprofloxacin 500mg', 'Ciprofloxacin Hydrochloride', 'Tablet', '500mg', 'Antibiotic (Fluoroquinolone)', 'BD Govt Essential (EDCL)'],
        ['EDCL Ceftriaxone 1g Injection', 'Ceftriaxone Sodium', 'Injection', '1g Vial', 'Antibiotic (Cephalosporin)', 'BD Govt Essential (EDCL)'],
        ['EDCL Diazepam 5mg', 'Diazepam', 'Tablet', '5mg', 'Anxiolytic / Anticonvulsant', 'BD Govt Essential (EDCL)'],
        ['EDCL Salbutamol 4mg', 'Salbutamol Sulfate', 'Tablet', '4mg', 'Bronchodilator', 'BD Govt Essential (EDCL)'],
        ['EDCL Dexamethasone 0.5mg', 'Dexamethasone', 'Tablet', '0.5mg', 'Corticosteroid', 'BD Govt Essential (EDCL)'],
        ['EDCL Silver Sulfadiazine 1%', 'Silver Sulfadiazine', 'Ointment', '25g Tube', 'Burn Wound Care', 'BD Govt Essential (EDCL)'],
        ['EDCL Gentamicin 0.3% Eye Drops', 'Gentamicin Sulfate', 'Drops', '5ml Bottle', 'Ophthalmic Antibiotic', 'BD Govt Essential (EDCL)'],
        ['EDCL Atenolol 50mg', 'Atenolol', 'Tablet', '50mg', 'Antihypertensive (Beta Blocker)', 'BD Govt Essential (EDCL)'],
        ['EDCL Hydrochlorothiazide 25mg', 'Hydrochlorothiazide', 'Tablet', '25mg', 'Diuretic / Antihypertensive', 'BD Govt Essential (EDCL)'],
        ['EDCL Omeprazole 20mg', 'Omeprazole', 'Capsule', '20mg', 'PPI (Proton Pump Inhibitor)', 'BD Govt Essential (EDCL)'],

        // --- 2. WORLDWIDE TOP ESSENTIAL PHARMACEUTICALS ---
        ['Lipitor', 'Atorvastatin Calcium', 'Tablet', '20mg', 'Lipid-Lowering (Statin)', 'Global (Pfizer)'],
        ['Atorvastatin 10mg', 'Atorvastatin Calcium', 'Tablet', '10mg', 'Lipid-Lowering (Statin)', 'Global Standard'],
        ['Atorvastatin 40mg', 'Atorvastatin Calcium', 'Tablet', '40mg', 'Lipid-Lowering (Statin)', 'Global Standard'],
        ['Glucophage', 'Metformin Hydrochloride', 'Tablet', '500mg', 'Antidiabetic (Biguanide)', 'Global (Merck)'],
        ['Metformin 850mg', 'Metformin Hydrochloride', 'Tablet', '850mg', 'Antidiabetic (Biguanide)', 'Global Standard'],
        ['Metformin XR 500mg', 'Metformin Hydrochloride Extended Release', 'Tablet', '500mg', 'Antidiabetic', 'Global Standard'],
        ['Norvasc', 'Amlodipine Besylate', 'Tablet', '5mg', 'Antihypertensive (CCB)', 'Global (Pfizer)'],
        ['Amlodipine 10mg', 'Amlodipine Besylate', 'Tablet', '10mg', 'Antihypertensive (CCB)', 'Global Standard'],
        ['Cozaar', 'Losartan Potassium', 'Tablet', '50mg', 'Antihypertensive (ARB)', 'Global (Organon)'],
        ['Losartan 100mg', 'Losartan Potassium', 'Tablet', '100mg', 'Antihypertensive (ARB)', 'Global Standard'],
        ['Crestor', 'Rosuvastatin Calcium', 'Tablet', '10mg', 'Lipid-Lowering (Statin)', 'Global (AstraZeneca)'],
        ['Rosuvastatin 20mg', 'Rosuvastatin Calcium', 'Tablet', '20mg', 'Lipid-Lowering (Statin)', 'Global Standard'],
        ['Plavix', 'Clopidogrel Bisulfate', 'Tablet', '75mg', 'Antiplatelet', 'Global (Sanofi)'],
        ['Clopidogrel 75mg', 'Clopidogrel Bisulfate', 'Tablet', '75mg', 'Antiplatelet', 'Global Standard'],
        ['Januvia', 'Sitagliptin Phosphate', 'Tablet', '50mg', 'Antidiabetic (DPP-4 Inhibitor)', 'Global (MSD)'],
        ['Januvia 100mg', 'Sitagliptin Phosphate', 'Tablet', '100mg', 'Antidiabetic (DPP-4 Inhibitor)', 'Global (MSD)'],
        ['Jardiance', 'Empagliflozin', 'Tablet', '10mg', 'Antidiabetic (SGLT2 Inhibitor)', 'Global (Boehringer)'],
        ['Jardiance 25mg', 'Empagliflozin', 'Tablet', '25mg', 'Antidiabetic (SGLT2 Inhibitor)', 'Global (Boehringer)'],
        ['Forxiga', 'Dapagliflozin', 'Tablet', '10mg', 'Antidiabetic (SGLT2 Inhibitor)', 'Global (AstraZeneca)'],
        ['Synthroid', 'Levothyroxine Sodium', 'Tablet', '50mcg', 'Thyroid Hormone', 'Global (AbbVie)'],
        ['Levothyroxine 100mcg', 'Levothyroxine Sodium', 'Tablet', '100mcg', 'Thyroid Hormone', 'Global Standard'],
        ['Ventolin Evohaler', 'Salbutamol Sulfate', 'Inhaler', '100mcg/dose', 'Bronchodilator (Inhaled)', 'Global (GSK)'],
        ['Seretide Evohaler', 'Fluticasone Propionate + Salmeterol', 'Inhaler', '125mcg/25mcg', 'Asthma / COPD Maintenance', 'Global (GSK)'],
        ['Zoloft', 'Sertraline Hydrochloride', 'Tablet', '50mg', 'Antidepressant (SSRI)', 'Global (Viatris)'],
        ['Lexapro', 'Escitalopram Oxalate', 'Tablet', '10mg', 'Antidepressant (SSRI)', 'Global (Lundbeck)'],
        ['Neurontin', 'Gabapentin', 'Capsule', '300mg', 'Neuropathic Pain / Anticonvulsant', 'Global (Pfizer)'],
        ['Lyrica', 'Pregabalin', 'Capsule', '75mg', 'Neuropathic Pain', 'Global (Pfizer)'],
        ['Augmentin 625mg', 'Amoxicillin + Clavulanate Potassium', 'Tablet', '500mg + 125mg', 'Antibiotic (Broad Spectrum)', 'Global (GSK)'],
        ['Augmentin 1g', 'Amoxicillin + Clavulanate Potassium', 'Tablet', '875mg + 125mg', 'Antibiotic (Broad Spectrum)', 'Global (GSK)'],
        ['Zithromax', 'Azithromycin Dihydrate', 'Tablet', '500mg', 'Antibiotic (Macrolide)', 'Global (Pfizer)'],
        ['Cipro 500mg', 'Ciprofloxacin', 'Tablet', '500mg', 'Antibiotic (Fluoroquinolone)', 'Global (Bayer)'],
        ['Rocephin', 'Ceftriaxone Sodium', 'Injection', '1g IV/IM', 'Antibiotic (Cephalosporin)', 'Global (Roche)'],
        ['Suprax', 'Cefixime Trihydrate', 'Capsule', '400mg', 'Antibiotic (Cephalosporin)', 'Global (Lupin)'],
        ['Vibramycin', 'Doxycycline Hyclate', 'Capsule', '100mg', 'Antibiotic (Tetracycline)', 'Global (Pfizer)'],
        ['Diflucan', 'Fluconazole', 'Capsule', '150mg', 'Antifungal', 'Global (Pfizer)'],
        ['Lasix', 'Furosemide', 'Tablet', '40mg', 'Loop Diuretic', 'Global (Sanofi)'],
        ['Lasix Injection', 'Furosemide', 'Injection', '20mg/2ml', 'Loop Diuretic', 'Global (Sanofi)'],
        ['Concor 5mg', 'Bisoprolol Fumarate', 'Tablet', '5mg', 'Cardiovascular (Beta Blocker)', 'Global (Merck)'],
        ['Carvedilol 6.25mg', 'Carvedilol', 'Tablet', '6.25mg', 'Heart Failure / Beta Blocker', 'Global Standard'],
        ['Advil 400mg', 'Ibuprofen', 'Tablet', '400mg', 'NSAID Analgesic', 'Global (Pfizer)'],
        ['Aleve 220mg', 'Naproxen Sodium', 'Tablet', '220mg', 'NSAID Analgesic', 'Global (Bayer)'],
        ['Tramadol 50mg', 'Tramadol Hydrochloride', 'Capsule', '50mg', 'Opioid Analgesic', 'Global Standard'],
        ['Lantus Solostar', 'Insulin Glargine', 'Injection', '100 units/ml (3ml Pen)', 'Long-Acting Basal Insulin', 'Global (Sanofi)'],
        ['Novorapid Flexpen', 'Insulin Aspart', 'Injection', '100 units/ml (3ml Pen)', 'Rapid-Acting Mealtime Insulin', 'Global (Novo Nordisk)'],
        ['Mixtard 30/70', 'Biphasic Isophane Insulin', 'Injection', '100 IU/ml 10ml', 'Premixed Insulin', 'Global (Novo Nordisk)'],

        // --- 3. POPULAR BANGLADESH COMMERCIAL PHARMACEUTICALS ---
        ['Napa Extra', 'Paracetamol + Caffeine', 'Tablet', '500mg + 65mg', 'Analgesic', 'Beximco Pharmaceuticals'],
        ['Napa', 'Paracetamol', 'Tablet', '500mg', 'Analgesic', 'Beximco Pharmaceuticals'],
        ['Napa Rapid', 'Paracetamol Fast Dissolving', 'Tablet', '500mg', 'Analgesic', 'Beximco Pharmaceuticals'],
        ['Napa Syrup', 'Paracetamol', 'Syrup', '120mg/5ml', 'Analgesic Pediatric', 'Beximco Pharmaceuticals'],
        ['Ace Plus', 'Paracetamol + Caffeine', 'Tablet', '500mg + 65mg', 'Analgesic', 'Square Pharmaceuticals'],
        ['Ace 500', 'Paracetamol', 'Tablet', '500mg', 'Analgesic', 'Square Pharmaceuticals'],
        ['Ace XR', 'Paracetamol Extended Release', 'Tablet', '665mg', 'Analgesic', 'Square Pharmaceuticals'],
        ['Seclo 20', 'Omeprazole', 'Capsule', '20mg', 'PPI (Proton Pump Inhibitor)', 'Square Pharmaceuticals'],
        ['Seclo 40', 'Omeprazole', 'Capsule', '40mg', 'PPI (Proton Pump Inhibitor)', 'Square Pharmaceuticals'],
        ['Sergel 20', 'Esomeprazole Magnesium', 'Tablet', '20mg', 'PPI (Proton Pump Inhibitor)', 'Incepta Pharmaceuticals'],
        ['Sergel 40', 'Esomeprazole Magnesium', 'Tablet', '40mg', 'PPI (Proton Pump Inhibitor)', 'Incepta Pharmaceuticals'],
        ['Pantonix 20', 'Pantoprazole Sodium', 'Tablet', '20mg', 'PPI (Proton Pump Inhibitor)', 'Incepta Pharmaceuticals'],
        ['Pantonix 40', 'Pantoprazole Sodium', 'Tablet', '40mg', 'PPI (Proton Pump Inhibitor)', 'Incepta Pharmaceuticals'],
        ['Maxpro 20', 'Esomeprazole Magnesium', 'Capsule', '20mg', 'PPI (Proton Pump Inhibitor)', 'Renata Limited'],
        ['Maxpro 40', 'Esomeprazole Magnesium', 'Capsule', '40mg', 'PPI (Proton Pump Inhibitor)', 'Renata Limited'],
        ['Fexo 120', 'Fexofenadine Hydrochloride', 'Tablet', '120mg', 'Antihistamine', 'Square Pharmaceuticals'],
        ['Fexo 180', 'Fexofenadine Hydrochloride', 'Tablet', '180mg', 'Antihistamine', 'Square Pharmaceuticals'],
        ['Alatrol 10', 'Cetirizine Dihydrochloride', 'Tablet', '10mg', 'Antihistamine', 'Square Pharmaceuticals'],
        ['Alatrol Syrup', 'Cetirizine Dihydrochloride', 'Syrup', '5mg/5ml', 'Antihistamine', 'Square Pharmaceuticals'],
        ['Tofen 1mg', 'Ketotifen Fumarate', 'Tablet', '1mg', 'Antihistamine / Antiasthmatic', 'Beximco Pharmaceuticals'],
        ['Tofen Syrup', 'Ketotifen Fumarate', 'Syrup', '1mg/5ml', 'Antihistamine Pediatric', 'Beximco Pharmaceuticals'],
        ['Monas 10', 'Montelukast Sodium', 'Tablet', '10mg', 'Leukotriene Receptor Antagonist', 'Acme Laboratories'],
        ['Monas 4 Chewable', 'Montelukast Sodium', 'Tablet', '4mg', 'Pediatric Asthma', 'Acme Laboratories'],
        ['Monas 5 Chewable', 'Montelukast Sodium', 'Tablet', '5mg', 'Pediatric Asthma', 'Acme Laboratories'],
        ['Azithrocin 500', 'Azithromycin', 'Tablet', '500mg', 'Antibiotic (Macrolide)', 'Square Pharmaceuticals'],
        ['Ciprocin 500', 'Ciprofloxacin', 'Tablet', '500mg', 'Antibiotic (Fluoroquinolone)', 'Square Pharmaceuticals'],
        ['Moxaclav 625', 'Amoxicillin + Clavulanic Acid', 'Tablet', '625mg', 'Antibiotic (Penicillin)', 'Square Pharmaceuticals'],
        ['Cef-3 200', 'Cefixime', 'Capsule', '200mg', 'Antibiotic (Cephalosporin)', 'Square Pharmaceuticals'],
        ['Cef-3 400', 'Cefixime', 'Capsule', '400mg', 'Antibiotic (Cephalosporin)', 'Square Pharmaceuticals'],
        ['Flamyd 400', 'Metronidazole', 'Tablet', '400mg', 'Antiprotozoal / Antibacterial', 'Square Pharmaceuticals'],
        ['Entacyd Plus', 'Magaldrate + Simethicone', 'Syrup', '200ml', 'Antacid Suspension', 'Square Pharmaceuticals'],
        ['Bizoran 5/20', 'Amlodipine + Olmesartan Medoxomil', 'Tablet', '5mg + 20mg', 'Antihypertensive', 'Square Pharmaceuticals'],
        ['Bizoran 5/40', 'Amlodipine + Olmesartan Medoxomil', 'Tablet', '5mg + 40mg', 'Antihypertensive', 'Square Pharmaceuticals'],
        ['Camlosart 5/20', 'Amlodipine + Olmesartan', 'Tablet', '5mg + 20mg', 'Antihypertensive', 'Beximco Pharmaceuticals'],
        ['Bextram Gold', '32 Multivitamins & Minerals with Lutein', 'Tablet', 'Standard A-Z', 'Supplement', 'Beximco Pharmaceuticals'],
        ['Filwel Silver', 'Multivitamins & Minerals for 50+', 'Tablet', 'Complete Micronutrient', 'Supplement', 'Square Pharmaceuticals'],
        ['Neotack 150', 'Ranitidine Hydrochloride', 'Tablet', '150mg', 'H2 Receptor Blocker', 'Square Pharmaceuticals'],
        ['Betameson Drops', 'Betamethasone Sodium Phosphate', 'Drops', '5ml', 'Corticosteroid', 'Square Pharmaceuticals'],
        ['Burnsil 1%', 'Silver Sulfadiazine', 'Ointment', '25g', 'Burn Wound Care', 'Square Pharmaceuticals'],
        ['D-Balm', 'Diclofenac Diethylamine', 'Ointment', '20g', 'Topical NSAID Analgesic', 'Square Pharmaceuticals'],
        ['Clofenac 50', 'Diclofenac Sodium', 'Tablet', '50mg', 'NSAID Analgesic', 'Square Pharmaceuticals'],
        ['Napryn 500', 'Naproxen', 'Tablet', '500mg', 'NSAID Analgesic', 'Square Pharmaceuticals'],
        ['Gluconor 500', 'Metformin Hydrochloride', 'Tablet', '500mg', 'Antidiabetic', 'Square Pharmaceuticals'],
        ['Lipicon 10', 'Atorvastatin', 'Tablet', '10mg', 'Lipid Lowering', 'Square Pharmaceuticals'],
        ['Lipicon 20', 'Atorvastatin', 'Tablet', '20mg', 'Lipid Lowering', 'Square Pharmaceuticals'],
        ['Rovator 10', 'Rosuvastatin', 'Tablet', '10mg', 'Lipid Lowering', 'Square Pharmaceuticals'],
        ['Anclog 75', 'Clopidogrel', 'Tablet', '75mg', 'Antiplatelet', 'Square Pharmaceuticals']
      ];

      // Clean existing medicines if fewer than full set
      await connection.query(`DELETE FROM prescription_items;`);
      await connection.query(`DELETE FROM prescriptions;`);
      await connection.query(`DELETE FROM medicines;`);

      await connection.query(
        `INSERT INTO medicines (brand_name, generic_name, dosage_form, strength, category, origin) VALUES ?`,
        [fullCatalog]
      );
      console.log(`[xMED DB Init] Inserted ${fullCatalog.length} comprehensive medicines.`);
    }

    // =========================================================
    // 9. SEED CERTIFIED DOCTORS SUITE (4 Doctors)
    // =========================================================
    console.log(`[xMED DB Init] Seeding certified doctors suite...`);
    const salt = await bcrypt.genSalt(10);
    const doctorPassHash = await bcrypt.hash('Doctor@123', salt);

    const doctorsList = [
      {
        license: 'BMDC-A10982',
        name: 'Dr. Tanvir Ahmed',
        spec: 'Senior Consultant & Cardiologist',
        phone: '+8801711998877',
        email: 'doctor@xmed.gov.bd'
      },
      {
        license: 'BMDC-A20194',
        name: 'Dr. Sabrina Hossain',
        spec: 'Consultant Physician & Diabetologist',
        phone: '+8801819223344',
        email: 'dr.sabrina@xmed.gov.bd'
      },
      {
        license: 'BMDC-A33821',
        name: 'Dr. Kazi Arifur Rahman',
        spec: 'Associate Professor of Neurology & Health Informatics',
        phone: '+8801914556677',
        email: 'dr.kazi@xmed.gov.bd'
      },
      {
        license: 'BMDC-A41908',
        name: 'Dr. Farhana Sultana',
        spec: 'Consultant Pediatrician & Child Health Specialist',
        phone: '+8801612778899',
        email: 'dr.farhana@xmed.gov.bd'
      }
    ];

    for (const doc of doctorsList) {
      const [existing] = await connection.query(`SELECT doctor_id FROM doctors WHERE email = ?;`, [doc.email]);
      if (existing.length === 0) {
        await connection.query(`
          INSERT INTO doctors (license_no, full_name, specialization, phone, email, password_hash, verified)
          VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `, [doc.license, doc.name, doc.spec, doc.phone, doc.email, doctorPassHash]);
      }
    }

    // =========================================================
    // 10. SEED CITIZENS / PATIENTS SUITE (4 Patients)
    // =========================================================
    console.log(`[xMED DB Init] Seeding diverse citizen patient profiles...`);
    const patientPassHash = await bcrypt.hash('Patient@123', salt);

    const patientsList = [
      {
        uid: 'BD-2026-8841',
        name: 'Md. Rahim Chowdhury',
        dob: '1992-05-14',
        gender: 'Male',
        blood: 'O+',
        phone: '01711223344',
        email: 'patient@xmed.gov.bd',
        diagnosis: 'Acute Bronchitis with Mild Hypertension',
        notes: 'Advised warm saline gargle, complete bed rest for 3 days, avoid air conditioner exposure.'
      },
      {
        uid: 'BD-2026-A102',
        name: 'Nusrat Jahan',
        dob: '1996-08-22',
        gender: 'Female',
        blood: 'A+',
        phone: '01722334455',
        email: 'nusrat@xmed.gov.bd',
        diagnosis: 'Type-2 Diabetes Mellitus & Allergic Rhinitis',
        notes: 'Monitor fasting blood sugar weekly. Moderate walking 30 mins daily. Low carbohydrate diet.'
      },
      {
        uid: 'BD-2026-B509',
        name: 'Hasan Ali',
        dob: '1971-03-10',
        gender: 'Male',
        blood: 'B+',
        phone: '01833445566',
        email: 'hasan@xmed.gov.bd',
        diagnosis: 'Ischemic Heart Disease & Hyperlipidemia',
        notes: 'Low-sodium, low-fat cardiac diet. Recheck lipid profile and resting ECG after 1 month.'
      },
      {
        uid: 'BD-2026-C881',
        name: 'Ayesha Siddiqua',
        dob: '1983-11-05',
        gender: 'Female',
        blood: 'AB-',
        phone: '01944556677',
        email: 'ayesha@xmed.gov.bd',
        diagnosis: 'Moderate Persistent Bronchial Asthma & Acid Peptic Disorder',
        notes: 'Use inhaler technique precisely. Avoid direct dust, cold drafts, and tobacco smoke.'
      }
    ];

    const [allDocs] = await connection.query(`SELECT doctor_id FROM doctors ORDER BY doctor_id ASC;`);
    const docId1 = allDocs[0] ? allDocs[0].doctor_id : 1;
    const docId2 = allDocs[1] ? allDocs[1].doctor_id : docId1;

    for (const p of patientsList) {
      const [existingPat] = await connection.query(`SELECT uid FROM citizens WHERE uid = ?;`, [p.uid]);
      if (existingPat.length === 0) {
        await connection.query(`
          INSERT INTO citizens (uid, full_name, dob, gender, blood_group, phone, email, password_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [p.uid, p.name, p.dob, p.gender, p.blood, p.phone, p.email, patientPassHash]);

        // Insert initial prescription
        const [rxRes] = await connection.query(`
          INSERT INTO prescriptions (patient_uid, doctor_id, diagnosis, clinical_notes)
          VALUES (?, ?, ?, ?)
        `, [p.uid, docId1, p.diagnosis, p.notes]);
        const rxId = rxRes.insertId;

        // Add 2-3 appropriate medicines
        const [meds] = await connection.query(`
          SELECT medicine_id, brand_name FROM medicines LIMIT 10;
        `);
        if (meds.length >= 3) {
          await connection.query(`
            INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration)
            VALUES 
              (?, ?, '1+0+1 after meal', '7 days'),
              (?, ?, '1+0+0 before meal', '14 days'),
              (?, ?, '0+0+1 at night', '30 days')
          `, [rxId, meds[0].medicine_id, rxId, meds[1].medicine_id, rxId, meds[2].medicine_id]);
        }

        // Add sample diagnostic report
        await connection.query(`
          INSERT INTO diagnostic_reports (patient_uid, test_name, report_file_url)
          VALUES (?, ?, ?)
        `, [
          p.uid,
          `Routine Clinical Investigation - ${p.blood} Group Profile`,
          '/uploads/sample-cbc-report.pdf'
        ]);
      }
    }

    console.log(`=======================================================`);
    console.log(`[xMED DB Init] DATABASE INITIALIZATION & SUITE COMPLETED!`);
    console.log(`Available Test Doctors (Password: Doctor@123):`);
    console.log(`  1. Dr. Tanvir Ahmed (Cardiology):       doctor@xmed.gov.bd`);
    console.log(`  2. Dr. Sabrina Hossain (Medicine/Diab): dr.sabrina@xmed.gov.bd`);
    console.log(`  3. Dr. Kazi Arifur Rahman (Neurology):  dr.kazi@xmed.gov.bd`);
    console.log(`  4. Dr. Farhana Sultana (Pediatrics):    dr.farhana@xmed.gov.bd`);
    console.log(`Available Test Citizens (Password: Patient@123):`);
    console.log(`  1. Md. Rahim Chowdhury (O+):            BD-2026-8841  | patient@xmed.gov.bd`);
    console.log(`  2. Nusrat Jahan (A+):                   BD-2026-A102  | nusrat@xmed.gov.bd`);
    console.log(`  3. Hasan Ali (B+):                      BD-2026-B509  | hasan@xmed.gov.bd`);
    console.log(`  4. Ayesha Siddiqua (AB-):               BD-2026-C881  | ayesha@xmed.gov.bd`);
    console.log(`=======================================================`);

  } catch (error) {
    console.error(`[xMED DB Init] Database initialization failed:`, error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
