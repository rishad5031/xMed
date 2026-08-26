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
