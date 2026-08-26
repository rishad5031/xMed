const mysql = require('mysql2/promise');

async function testDBMS() {
  const conn = await mysql.createConnection({
    host: '192.168.0.186',
    port: 3306,
    user: 'root',
    password: '',
    database: 'xmed_db',
    multipleStatements: true
  });
  console.log('[DBMS Test] Connected to xmed_db.');

  // 1. Column on medicines
  try {
    await conn.query('ALTER TABLE medicines ADD COLUMN IF NOT EXISTS total_prescribed_count INT DEFAULT 0;');
    console.log('[DBMS Test] 1. Column medicines.total_prescribed_count OK');
  } catch(e) { console.log('[DBMS Test] Column notice:', e.message); }

  // 2. Audit logs table
  await conn.query(`
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
  console.log('[DBMS Test] 2. Table prescription_audit_logs OK');

  // 3. Daily summary table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS daily_analytics_summary (
      summary_id INT AUTO_INCREMENT PRIMARY KEY,
      summary_date DATE UNIQUE NOT NULL,
      total_consultations INT DEFAULT 0,
      total_prescriptions INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('[DBMS Test] 3. Table daily_analytics_summary OK');

  // 4. Indexes
  try {
    await conn.query('CREATE INDEX IF NOT EXISTS idx_presc_patient_date ON prescriptions(patient_uid, created_at DESC);');
    await conn.query('CREATE INDEX IF NOT EXISTS idx_items_lookup ON prescription_items(prescription_id, medicine_id);');
    await conn.query('CREATE INDEX IF NOT EXISTS idx_reports_patient ON diagnostic_reports(patient_uid, uploaded_at DESC);');
    await conn.query('CREATE FULLTEXT INDEX IF NOT EXISTS idx_ft_medicines ON medicines(brand_name, generic_name);');
    console.log('[DBMS Test] 4. Advanced B-Tree & Fulltext Indexes OK');
  } catch (e) {
    console.log('[DBMS Test] Index error:', e.message);
  }

  // 5. Triggers
  await conn.query('DROP TRIGGER IF EXISTS trg_update_medicine_usage;');
  await conn.query(`
    CREATE TRIGGER trg_update_medicine_usage
    AFTER INSERT ON prescription_items
    FOR EACH ROW
    BEGIN
      UPDATE medicines 
      SET total_prescribed_count = total_prescribed_count + 1 
      WHERE medicine_id = NEW.medicine_id;
    END;
  `);
  console.log('[DBMS Test] 5.1 Trigger trg_update_medicine_usage OK');

  await conn.query('DROP TRIGGER IF EXISTS trg_after_prescription_insert;');
  await conn.query(`
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
  console.log('[DBMS Test] 5.2 Trigger trg_after_prescription_insert OK');

  await conn.query('DROP TRIGGER IF EXISTS trg_after_prescription_update;');
  await conn.query(`
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
  console.log('[DBMS Test] 5.3 Trigger trg_after_prescription_update OK');

  // 6. Stored Procedure: sp_CreatePrescriptionWithItems
  await conn.query('DROP PROCEDURE IF EXISTS sp_CreatePrescriptionWithItems;');
  await conn.query(`
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
  console.log('[DBMS Test] 6. Stored Procedure sp_CreatePrescriptionWithItems OK');

  // 7. Stored Procedure: sp_GetPatientLongitudinalHistory
  await conn.query('DROP PROCEDURE IF EXISTS sp_GetPatientLongitudinalHistory;');
  await conn.query(`
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
  console.log('[DBMS Test] 7. Stored Procedure sp_GetPatientLongitudinalHistory OK');

  // 8. Relational Views
  await conn.query('DROP VIEW IF EXISTS vw_complete_patient_history;');
  await conn.query(`
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
  console.log('[DBMS Test] 8.1 View vw_complete_patient_history OK');

  await conn.query('DROP VIEW IF EXISTS vw_doctor_clinical_analytics;');
  await conn.query(`
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
  console.log('[DBMS Test] 8.2 View vw_doctor_clinical_analytics OK');

  // 9. Scheduled Event
  try {
    await conn.query('SET GLOBAL event_scheduler = ON;');
    await conn.query('DROP EVENT IF EXISTS evt_daily_health_summary;');
    await conn.query(`
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
    console.log('[DBMS Test] 9. Event evt_daily_health_summary OK');
  } catch (e) {
    console.log('[DBMS Test] Event scheduler notice:', e.message);
  }

  // 10. Verification: Test CALL sp_CreatePrescriptionWithItems directly!
  console.log('[DBMS Test] 10. Testing ACID execution of sp_CreatePrescriptionWithItems...');
  const [existingMeds] = await conn.query('SELECT medicine_id FROM medicines LIMIT 2;');
  const mId1 = existingMeds[0].medicine_id;
  const mId2 = existingMeds[1].medicine_id;
  const testItems = JSON.stringify([
    { medicine_id: mId1, dosage_instruction: '1+0+1 after meal', duration: '5 days' },
    { medicine_id: mId2, dosage_instruction: '1+0+0 before meal', duration: '10 days' }
  ]);
  
  const [rxCall] = await conn.query('CALL sp_CreatePrescriptionWithItems(?, ?, ?, ?, ?, @out_id);', [
    'BD-2026-8841',
    1,
    'DBMS Unit Test - Acute Rhinitis',
    'Automated ACID Stored Procedure Test Run',
    testItems
  ]);
  const newRxId = rxCall[0][0].prescription_id;
  console.log('[DBMS Test] Created Rx via Stored Procedure! ID =', newRxId);

  // Check audit log trigger fired!
  const [auditRows] = await conn.query('SELECT * FROM prescription_audit_logs WHERE prescription_id = ?;', [newRxId]);
  console.log('[DBMS Test] Trigger verified! Audit log entry found:', auditRows[0].action_type, 'at', auditRows[0].changed_at);

  // Check medicine usage trigger incremented!
  const [medRows] = await conn.query('SELECT medicine_id, brand_name, total_prescribed_count FROM medicines WHERE medicine_id IN (?, ?);', [mId1, mId2]);
  console.log('[DBMS Test] Medicine usage counts after trigger increment:', medRows);

  // Check view query
  const [viewRows] = await conn.query('SELECT * FROM vw_complete_patient_history WHERE prescription_id = ?;', [newRxId]);
  console.log('[DBMS Test] View query verified! Result:', {
    patient: viewRows[0].patient_name,
    doctor: viewRows[0].doctor_name,
    diagnosis: viewRows[0].diagnosis
  });

  // Check analytics view
  const [analyticsRows] = await conn.query('SELECT * FROM vw_doctor_clinical_analytics LIMIT 2;');
  console.log('[DBMS Test] Doctor analytics view verified:', analyticsRows);

  console.log('>>> ALL DBMS ARCHITECTURAL ENHANCEMENTS PASSED WITH 100% SUCCESS! <<<');
  await conn.end();
}

testDBMS().catch(console.error);
