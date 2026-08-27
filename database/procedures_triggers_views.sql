-- =============================================================
-- xMED Enterprise National Healthcare & EHR Portal
-- FILE: database/procedures_triggers_views.sql
-- PURPOSE: Definitions for Automated Triggers, ACID Stored Procedures,
--          Relational Views, and MySQL Scheduled Events
-- Target DBMS: MySQL 8.0+ / MariaDB 10.4+
-- Academic DBMS Lab Project Evaluation Standard
-- =============================================================

USE `xmed_db`;

-- =============================================================
-- 1. AUTOMATED DATABASE TRIGGERS
-- =============================================================

-- Trigger 1: Increments medicine usage counter upon insertion into prescription_items
DROP TRIGGER IF EXISTS `trg_update_medicine_usage`;
DELIMITER //
CREATE TRIGGER `trg_update_medicine_usage`
AFTER INSERT ON `prescription_items`
FOR EACH ROW
BEGIN
  UPDATE `medicines` 
  SET `total_prescribed_count` = `total_prescribed_count` + 1 
  WHERE `medicine_id` = NEW.`medicine_id`;
END//
DELIMITER ;

-- Trigger 2: Automatically captures an immutable audit record when a prescription is issued
DROP TRIGGER IF EXISTS `trg_after_prescription_insert`;
DELIMITER //
CREATE TRIGGER `trg_after_prescription_insert`
AFTER INSERT ON `prescriptions`
FOR EACH ROW
BEGIN
  INSERT INTO `prescription_audit_logs` (
    `prescription_id`, `action_type`, `performed_by_doctor_id`, `old_data`, `new_data`
  ) VALUES (
    NEW.`prescription_id`, 'INSERT', NEW.`doctor_id`, NULL,
    JSON_OBJECT(
      'prescription_id', NEW.`prescription_id`,
      'patient_uid', NEW.`patient_uid`,
      'doctor_id', NEW.`doctor_id`,
      'diagnosis', NEW.`diagnosis`,
      'clinical_notes', NEW.`clinical_notes`,
      'created_at', NEW.`created_at`
    )
  );
END//
DELIMITER ;

-- Trigger 3: Automatically captures before-and-after audit states when prescription is updated
DROP TRIGGER IF EXISTS `trg_after_prescription_update`;
DELIMITER //
CREATE TRIGGER `trg_after_prescription_update`
AFTER UPDATE ON `prescriptions`
FOR EACH ROW
BEGIN
  INSERT INTO `prescription_audit_logs` (
    `prescription_id`, `action_type`, `performed_by_doctor_id`, `old_data`, `new_data`
  ) VALUES (
    NEW.`prescription_id`, 'UPDATE', NEW.`doctor_id`,
    JSON_OBJECT(
      'prescription_id', OLD.`prescription_id`,
      'patient_uid', OLD.`patient_uid`,
      'doctor_id', OLD.`doctor_id`,
      'diagnosis', OLD.`diagnosis`,
      'clinical_notes', OLD.`clinical_notes`
    ),
    JSON_OBJECT(
      'prescription_id', NEW.`prescription_id`,
      'patient_uid', NEW.`patient_uid`,
      'doctor_id', NEW.`doctor_id`,
      'diagnosis', NEW.`diagnosis`,
      'clinical_notes', NEW.`clinical_notes`
    )
  );
END//
DELIMITER ;

-- Trigger 4: Domain Check Constraint for Citizen Date of Birth (dob <= CURRENT_DATE)
DROP TRIGGER IF EXISTS `trg_chk_citizen_dob_insert`;
DELIMITER //
CREATE TRIGGER `trg_chk_citizen_dob_insert`
BEFORE INSERT ON `citizens`
FOR EACH ROW
BEGIN
  IF NEW.`dob` > CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Check constraint violation: dob cannot be in the future (dob <= CURRENT_DATE).';
  END IF;
END//
DELIMITER ;

DROP TRIGGER IF EXISTS `trg_chk_citizen_dob_update`;
DELIMITER //
CREATE TRIGGER `trg_chk_citizen_dob_update`
BEFORE UPDATE ON `citizens`
FOR EACH ROW
BEGIN
  IF NEW.`dob` > CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Check constraint violation: dob cannot be in the future (dob <= CURRENT_DATE).';
  END IF;
END//
DELIMITER ;

-- Trigger 5: Allergy Conflict Safety Check (Pre-Insert Trigger on prescription_items)
DROP TRIGGER IF EXISTS `trg_check_allergy_before_prescribe`;
DELIMITER //
CREATE TRIGGER `trg_check_allergy_before_prescribe`
BEFORE INSERT ON `prescription_items`
FOR EACH ROW
BEGIN
  DECLARE v_patient_uid VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
  DECLARE v_conflict_count INT DEFAULT 0;

  -- Look up patient_uid from parent prescription
  SELECT `patient_uid` INTO v_patient_uid
  FROM `prescriptions`
  WHERE `prescription_id` = NEW.`prescription_id`
  LIMIT 1;

  IF v_patient_uid IS NOT NULL THEN
    -- Check if patient has recorded SEVERE allergy to this medicine
    SELECT COUNT(*) INTO v_conflict_count
    FROM `patient_allergies` pa
    JOIN `medicine_allergens` ma ON pa.`allergen_id` = ma.`allergen_id`
    WHERE pa.`patient_uid` = v_patient_uid COLLATE utf8mb4_general_ci
      AND ma.`medicine_id` = NEW.`medicine_id`
      AND pa.`severity` = 'SEVERE';

    IF v_conflict_count > 0 THEN
      SIGNAL SQLSTATE '45000' 
      SET MESSAGE_TEXT = 'PATIENT ALLERGY CONFLICT: Prescription aborted for patient safety.';
    END IF;
  END IF;
END//
DELIMITER ;

-- Trigger 6: System Audit Logging for Citizens Update
DROP TRIGGER IF EXISTS `trg_audit_citizens_update`;
DELIMITER //
CREATE TRIGGER `trg_audit_citizens_update`
AFTER UPDATE ON `citizens`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (
    `table_name`, `action_type`, `record_id`, `performed_by`, `old_data`, `new_data`
  ) VALUES (
    'citizens', 'UPDATE', NEW.`uid`, 'SYSTEM',
    JSON_OBJECT('name', OLD.`name`, 'phone', OLD.`phone`, 'email', OLD.`email`, 'area', OLD.`area`),
    JSON_OBJECT('name', NEW.`name`, 'phone', NEW.`phone`, 'email', NEW.`email`, 'area', NEW.`area`)
  );
END//
DELIMITER ;

-- Trigger 7: System Audit Logging for Citizens Delete
DROP TRIGGER IF EXISTS `trg_audit_citizens_delete`;
DELIMITER //
CREATE TRIGGER `trg_audit_citizens_delete`
AFTER DELETE ON `citizens`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (
    `table_name`, `action_type`, `record_id`, `performed_by`, `old_data`, `new_data`
  ) VALUES (
    'citizens', 'DELETE', OLD.`uid`, 'SYSTEM',
    JSON_OBJECT('name', OLD.`name`, 'phone', OLD.`phone`, 'email', OLD.`email`),
    NULL
  );
END//
DELIMITER ;

-- Trigger 8: System Audit Logging for Prescriptions Update
DROP TRIGGER IF EXISTS `trg_audit_prescriptions_update`;
DELIMITER //
CREATE TRIGGER `trg_audit_prescriptions_update`
AFTER UPDATE ON `prescriptions`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (
    `table_name`, `action_type`, `record_id`, `performed_by`, `old_data`, `new_data`
  ) VALUES (
    'prescriptions', 'UPDATE', CAST(NEW.`prescription_id` AS CHAR), CAST(NEW.`doctor_id` AS CHAR),
    JSON_OBJECT('diagnosis', OLD.`diagnosis`, 'clinical_notes', OLD.`clinical_notes`),
    JSON_OBJECT('diagnosis', NEW.`diagnosis`, 'clinical_notes', NEW.`clinical_notes`)
  );
END//
DELIMITER ;

-- Trigger 9: System Audit Logging for Prescriptions Delete
DROP TRIGGER IF EXISTS `trg_audit_prescriptions_delete`;
DELIMITER //
CREATE TRIGGER `trg_audit_prescriptions_delete`
AFTER DELETE ON `prescriptions`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (
    `table_name`, `action_type`, `record_id`, `performed_by`, `old_data`, `new_data`
  ) VALUES (
    'prescriptions', 'DELETE', CAST(OLD.`prescription_id` AS CHAR), CAST(OLD.`doctor_id` AS CHAR),
    JSON_OBJECT('patient_uid', OLD.`patient_uid`, 'diagnosis', OLD.`diagnosis`),
    NULL
  );
END//
DELIMITER ;

-- Trigger 10: System Audit Logging for Appointments Update
DROP TRIGGER IF EXISTS `trg_audit_appointments_update`;
DELIMITER //
CREATE TRIGGER `trg_audit_appointments_update`
AFTER UPDATE ON `appointments`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (
    `table_name`, `action_type`, `record_id`, `performed_by`, `old_data`, `new_data`
  ) VALUES (
    'appointments', 'UPDATE', CAST(NEW.`appointment_id` AS CHAR), 'DOCTOR_OR_PATIENT',
    JSON_OBJECT('status', OLD.`status`, 'serial_no', OLD.`serial_no`, 'priority_level', OLD.`priority_level`),
    JSON_OBJECT('status', NEW.`status`, 'serial_no', NEW.`serial_no`, 'priority_level', NEW.`priority_level`)
  );
END//
DELIMITER ;

-- Trigger 11: System Audit Logging for Appointments Delete
DROP TRIGGER IF EXISTS `trg_audit_appointments_delete`;
DELIMITER //
CREATE TRIGGER `trg_audit_appointments_delete`
AFTER DELETE ON `appointments`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (
    `table_name`, `action_type`, `record_id`, `performed_by`, `old_data`, `new_data`
  ) VALUES (
    'appointments', 'DELETE', CAST(OLD.`appointment_id` AS CHAR), 'SYSTEM',
    JSON_OBJECT('patient_uid', OLD.`patient_uid`, 'status', OLD.`status`),
    NULL
  );
END//
DELIMITER ;

-- =============================================================
-- 2. STORED PROCEDURES (ACID TRANSACTIONS)
-- =============================================================

-- Stored Procedure 1: Atomically creates prescription and iterates over items JSON array
DROP PROCEDURE IF EXISTS `sp_CreatePrescriptionWithItems`;
DELIMITER //
CREATE PROCEDURE `sp_CreatePrescriptionWithItems`(
  IN `p_patient_uid` VARCHAR(20),
  IN `p_doctor_id` INT,
  IN `p_diagnosis` TEXT,
  IN `p_notes` TEXT,
  IN `p_items_json` LONGTEXT,
  OUT `p_prescription_id` INT
)
BEGIN
  DECLARE `v_rx_id` INT;
  DECLARE `i` INT DEFAULT 0;
  DECLARE `total_items` INT DEFAULT 0;
  DECLARE `v_med_id` INT;
  DECLARE `v_dosage` VARCHAR(100);
  DECLARE `v_duration` VARCHAR(50);

  -- Automatic rollback on SQLEXCEPTION
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  INSERT INTO `prescriptions` (`patient_uid`, `doctor_id`, `diagnosis`, `clinical_notes`)
  VALUES (`p_patient_uid`, `p_doctor_id`, `p_diagnosis`, `p_notes`);

  SET `v_rx_id` = LAST_INSERT_ID();
  SET `p_prescription_id` = `v_rx_id`;

  SET `total_items` = IFNULL(JSON_LENGTH(`p_items_json`), 0);

  WHILE `i` < `total_items` DO
    SET `v_med_id` = CAST(JSON_UNQUOTE(JSON_EXTRACT(`p_items_json`, CONCAT('$[', `i`, '].medicine_id'))) AS UNSIGNED);
    SET `v_dosage` = JSON_UNQUOTE(JSON_EXTRACT(`p_items_json`, CONCAT('$[', `i`, '].dosage_instruction')));
    SET `v_duration` = JSON_UNQUOTE(JSON_EXTRACT(`p_items_json`, CONCAT('$[', `i`, '].duration')));

    IF `v_med_id` IS NOT NULL AND `v_med_id` > 0 THEN
      INSERT INTO `prescription_items` (`prescription_id`, `medicine_id`, `dosage_instruction`, `duration`)
      VALUES (`v_rx_id`, `v_med_id`, IFNULL(`v_dosage`, 'As directed'), IFNULL(`v_duration`, '7 days'));
    END IF;

    SET `i` = `i` + 1;
  END WHILE;

  COMMIT;

  SELECT `v_rx_id` AS `prescription_id`;
END//
DELIMITER ;

-- Stored Procedure 2: Retrieves longitudinal patient history with aggregated medications
DROP PROCEDURE IF EXISTS `sp_GetPatientLongitudinalHistory`;
DELIMITER //
CREATE PROCEDURE `sp_GetPatientLongitudinalHistory`(
  IN `p_patient_uid` VARCHAR(20),
  IN `p_limit` INT,
  IN `p_offset` INT
)
BEGIN
  -- Result Set 1: Citizen demographic overview & consultation totals
  SELECT 
    c.`uid`,
    c.`full_name`,
    c.`dob`,
    c.`gender`,
    c.`blood_group`,
    c.`phone`,
    c.`email`,
    COUNT(DISTINCT p.`prescription_id`) AS `total_visits`,
    COUNT(DISTINCT r.`report_id`) AS `total_lab_reports`
  FROM `citizens` c
  LEFT JOIN `prescriptions` p ON c.`uid` = p.`patient_uid`
  LEFT JOIN `diagnostic_reports` r ON c.`uid` = r.`patient_uid`
  WHERE c.`uid` = `p_patient_uid`
  GROUP BY c.`uid`;

  -- Result Set 2: Paginated prescriptions with formatted medications JSON
  SELECT 
    p.`prescription_id`,
    p.`patient_uid`,
    p.`diagnosis`,
    p.`clinical_notes`,
    p.`created_at`,
    d.`full_name` AS `doctor_name`,
    d.`specialization` AS `doctor_specialization`,
    d.`license_no` AS `doctor_license`,
    CONCAT('[', IFNULL(GROUP_CONCAT(
      JSON_OBJECT(
        'item_id', pi.`item_id`,
        'medicine_id', m.`medicine_id`,
        'brand_name', m.`brand_name`,
        'generic_name', m.`generic_name`,
        'dosage_instruction', pi.`dosage_instruction`,
        'duration', pi.`duration`
      )
    ), ''), ']') AS `items_json`
  FROM `prescriptions` p
  JOIN `doctors` d ON p.`doctor_id` = d.`doctor_id`
  LEFT JOIN `prescription_items` pi ON p.`prescription_id` = pi.`prescription_id`
  LEFT JOIN `medicines` m ON pi.`medicine_id` = m.`medicine_id`
  WHERE p.`patient_uid` = `p_patient_uid`
  GROUP BY p.`prescription_id`
  ORDER BY p.`created_at` DESC
  LIMIT `p_limit` OFFSET `p_offset`;
END//
DELIMITER ;

-- Stored Procedure 3: Atomic Appointment Booking with Concurrency Row-Locking (SELECT FOR UPDATE)
DROP PROCEDURE IF EXISTS `sp_book_appointment`;
DELIMITER //
CREATE PROCEDURE `sp_book_appointment`(
  IN `p_patient_uid` VARCHAR(20),
  IN `p_doctor_id` INT,
  IN `p_hospital_id` INT,
  IN `p_date` DATE,
  IN `p_is_emergency` BOOLEAN,
  IN `p_reason` TEXT,
  OUT `p_appointment_id` INT,
  OUT `p_serial_no` INT,
  OUT `p_priority_level` INT
)
BEGIN
  DECLARE v_doc_exists INT DEFAULT 0;
  DECLARE v_next_serial INT DEFAULT 1;
  DECLARE v_priority INT DEFAULT 1;
  DECLARE v_scheduled_time TIME DEFAULT NULL;
  DECLARE v_shift_start TIME DEFAULT '09:00:00';

  -- Automatic rollback on SQLEXCEPTION
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Row-level locking on doctor record for concurrency control
  SELECT `doctor_id`, `shift_start`
  INTO v_doc_exists, v_shift_start
  FROM `doctors`
  WHERE `doctor_id` = p_doctor_id
  FOR UPDATE;

  IF v_doc_exists IS NULL OR v_doc_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid doctor_id specified for appointment.';
  END IF;

  -- Determine priority level (1: Regular FCFS, 2: Patient Emergency, 3: Doctor Approved Emergency)
  IF p_is_emergency THEN
    SET v_priority = 2;
  ELSE
    SET v_priority = 1;
  END IF;

  -- Calculate next sequential serial number for this doctor on requested date
  SELECT IFNULL(MAX(`serial_no`), 0) + 1 INTO v_next_serial
  FROM `appointments`
  WHERE `doctor_id` = p_doctor_id AND `requested_date` = p_date;

  -- Calculate scheduled appointment time based on sequential queue (15 mins/slot)
  SET v_scheduled_time = ADDTIME(IFNULL(v_shift_start, '09:00:00'), SEC_TO_TIME((v_next_serial - 1) * 15 * 60));

  INSERT INTO `appointments` (
    `patient_uid`, `doctor_id`, `hospital_id`, `requested_date`, `scheduled_time`,
    `serial_no`, `status`, `is_emergency`, `emergency_reason`, `priority_level`
  ) VALUES (
    p_patient_uid, p_doctor_id, p_hospital_id, p_date, v_scheduled_time,
    v_next_serial, 'PENDING', p_is_emergency, p_reason, v_priority
  );

  SET p_appointment_id = LAST_INSERT_ID();
  SET p_serial_no = v_next_serial;
  SET p_priority_level = v_priority;

  COMMIT;

  -- Return newly generated appointment record
  SELECT 
    a.`appointment_id`,
    a.`patient_uid`,
    c.`name` AS `patient_name`,
    a.`doctor_id`,
    d.`name` AS `doctor_name`,
    d.`specialization`,
    a.`hospital_id`,
    h.`name` AS `hospital_name`,
    h.`area` AS `hospital_area`,
    a.`requested_date`,
    a.`scheduled_time`,
    a.`serial_no`,
    a.`status`,
    a.`is_emergency`,
    a.`emergency_reason`,
    a.`priority_level`,
    a.`applied_at`
  FROM `appointments` a
  JOIN `citizens` c ON a.`patient_uid` = c.`uid`
  JOIN `doctors` d ON a.`doctor_id` = d.`doctor_id`
  JOIN `hospitals` h ON a.`hospital_id` = h.`hospital_id`
  WHERE a.`appointment_id` = p_appointment_id;
END//
DELIMITER ;

-- =============================================================
-- 3. REUSABLE RELATIONAL & ANALYTICAL VIEWS
-- =============================================================

-- View 1: Complete Patient History (Multi-Table JOIN Flattened View)
DROP VIEW IF EXISTS `vw_complete_patient_history`;
CREATE VIEW `vw_complete_patient_history` AS
SELECT 
  c.`uid` AS `patient_uid`,
  c.`full_name` AS `patient_name`,
  c.`dob` AS `patient_dob`,
  c.`gender` AS `patient_gender`,
  c.`blood_group` AS `patient_blood_group`,
  p.`prescription_id`,
  p.`created_at` AS `prescription_date`,
  p.`diagnosis`,
  p.`clinical_notes`,
  d.`doctor_id`,
  d.`full_name` AS `doctor_name`,
  d.`specialization` AS `doctor_specialization`,
  d.`license_no` AS `doctor_license`,
  CONCAT('[', IFNULL(GROUP_CONCAT(
    JSON_OBJECT(
      'medicine_id', m.`medicine_id`,
      'brand_name', m.`brand_name`,
      'generic_name', m.`generic_name`,
      'dosage_instruction', pi.`dosage_instruction`,
      'duration', pi.`duration`
    )
  ), ''), ']') AS `prescribed_medications`
FROM `citizens` c
JOIN `prescriptions` p ON c.`uid` = p.`patient_uid`
JOIN `doctors` d ON p.`doctor_id` = d.`doctor_id`
LEFT JOIN `prescription_items` pi ON p.`prescription_id` = pi.`prescription_id`
LEFT JOIN `medicines` m ON pi.`medicine_id` = m.`medicine_id`
GROUP BY p.`prescription_id`;

-- View 2: Doctor Clinical Performance & Consultation Volume
DROP VIEW IF EXISTS `vw_doctor_clinical_analytics`;
CREATE VIEW `vw_doctor_clinical_analytics` AS
SELECT 
  d.`doctor_id`,
  d.`full_name` AS `doctor_name`,
  d.`specialization`,
  COUNT(DISTINCT p.`prescription_id`) AS `total_consultations`,
  COUNT(DISTINCT p.`patient_uid`) AS `unique_patients_treated`,
  COUNT(pi.`item_id`) AS `total_medicines_prescribed`,
  MIN(p.`created_at`) AS `first_consultation`,
  MAX(p.`created_at`) AS `latest_consultation`
FROM `doctors` d
LEFT JOIN `prescriptions` p ON d.`doctor_id` = p.`doctor_id`
LEFT JOIN `prescription_items` pi ON p.`prescription_id` = pi.`prescription_id`
GROUP BY d.`doctor_id`;

-- =============================================================
-- 4. MYSQL EVENT SCHEDULER
-- =============================================================
SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS `evt_daily_health_summary`;
DELIMITER //
CREATE EVENT `evt_daily_health_summary`
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURRENT_DATE) + INTERVAL 1 DAY)
ON COMPLETION PRESERVE
ENABLE
DO
BEGIN
  INSERT INTO `daily_analytics_summary` (`summary_date`, `total_consultations`, `total_prescriptions`)
  VALUES (
    CURRENT_DATE - INTERVAL 1 DAY,
    (SELECT COUNT(*) FROM `prescriptions` WHERE DATE(`created_at`) = CURRENT_DATE - INTERVAL 1 DAY),
    (SELECT COUNT(*) FROM `prescriptions` WHERE DATE(`created_at`) = CURRENT_DATE - INTERVAL 1 DAY)
  )
  ON DUPLICATE KEY UPDATE
    `total_consultations` = VALUES(`total_consultations`),
    `total_prescriptions` = VALUES(`total_prescriptions`);
END//
DELIMITER ;
