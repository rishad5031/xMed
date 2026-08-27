-- =============================================================
-- xMED Enterprise National Healthcare & EHR Portal
-- FILE: database/schema.sql
-- PURPOSE: All DDL Commands (Database, Tables, Constraints, Indexes)
-- Target DBMS: MySQL 8.0+ / MariaDB 10.4+
-- Academic DBMS Lab Project Evaluation Standard (3NF Normalized)
-- =============================================================

CREATE DATABASE IF NOT EXISTS `xmed_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `xmed_db`;

-- -------------------------------------------------------------
-- 1. HOSPITALS DIRECTORY & CLINICAL CENTERS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hospitals` (
  `hospital_id` INT AUTO_INCREMENT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `area` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `address` TEXT NOT NULL,
  `contact_number` VARCHAR(20),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_hospitals` PRIMARY KEY (`hospital_id`),
  KEY `idx_hospital_area` (`area`),
  KEY `idx_hospital_city` (`city`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 2. CERTIFIED DOCTORS & PHYSICIANS (ENHANCED SCHEMA)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctors` (
  `doctor_id` INT AUTO_INCREMENT NOT NULL,
  `uid` VARCHAR(20) UNIQUE NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `full_name` VARCHAR(100) NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `phone` VARCHAR(20) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `license_number` VARCHAR(50) UNIQUE NOT NULL,
  `license_no` VARCHAR(50) NULL,
  `specialization` VARCHAR(100) NOT NULL,
  `hospital_id` INT NULL,
  `consultation_fee` DECIMAL(10,2) DEFAULT 500.00,
  `working_days` VARCHAR(100) DEFAULT 'Sat,Sun,Mon,Tue,Wed',
  `shift_start` TIME DEFAULT '09:00:00',
  `shift_end` TIME DEFAULT '17:00:00',
  `max_daily_slots` INT DEFAULT 20,
  `biography` TEXT,
  `verified` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_doctors` PRIMARY KEY (`doctor_id`),
  CONSTRAINT `fk_doc_hospital` FOREIGN KEY (`hospital_id`) 
    REFERENCES `hospitals`(`hospital_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_doctor_specialization` (`specialization`),
  KEY `idx_doctor_hospital` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 3. CITIZENS / PATIENTS VAULT (WITH LOCATION & DEMOGRAPHICS)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `citizens` (
  `uid` VARCHAR(20) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `full_name` VARCHAR(100) NULL,
  `dob` DATE NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  `phone` VARCHAR(20) UNIQUE NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `area` VARCHAR(100) NOT NULL DEFAULT 'Dhanmondi',
  `city` VARCHAR(100) NOT NULL DEFAULT 'Dhaka',
  `address` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_citizens` PRIMARY KEY (`uid`),
  CONSTRAINT `chk_citizen_dob` CHECK (`dob` >= '1900-01-01' AND `dob` <= CURRENT_DATE),
  KEY `idx_citizen_area` (`area`),
  KEY `idx_citizen_city` (`city`),
  KEY `idx_citizen_blood` (`blood_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 4. MEDICINES CATALOG
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `medicines` (
  `medicine_id` INT AUTO_INCREMENT NOT NULL,
  `brand_name` VARCHAR(100) NOT NULL,
  `generic_name` VARCHAR(100) NOT NULL,
  `dosage_form` VARCHAR(50) NOT NULL,
  `strength` VARCHAR(50) NOT NULL,
  `manufacturer` VARCHAR(150) DEFAULT 'Essential Drugs Co. Ltd. (EDCL)',
  `category` VARCHAR(50) DEFAULT 'General',
  `origin` VARCHAR(50) DEFAULT 'Global',
  `total_prescribed_count` INT DEFAULT 0,
  CONSTRAINT `pk_medicines` PRIMARY KEY (`medicine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 5. PRESCRIPTIONS MASTER TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `prescription_id` INT AUTO_INCREMENT NOT NULL,
  `patient_uid` VARCHAR(20) NOT NULL,
  `doctor_id` INT NOT NULL,
  `diagnosis` TEXT NOT NULL,
  `clinical_notes` TEXT,
  `prescription_date` DATE DEFAULT (CURRENT_DATE),
  `qr_code_token` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_prescriptions` PRIMARY KEY (`prescription_id`),
  CONSTRAINT `fk_prescriptions_patient` FOREIGN KEY (`patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_prescriptions_doctor` FOREIGN KEY (`doctor_id`) 
    REFERENCES `doctors`(`doctor_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 6. PRESCRIPTION ITEMS DETAIL (MEDICATIONS PER RX)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prescription_items` (
  `item_id` INT AUTO_INCREMENT NOT NULL,
  `prescription_id` INT NOT NULL,
  `medicine_id` INT NOT NULL,
  `dosage` VARCHAR(50) NULL,
  `frequency` VARCHAR(50) NULL,
  `duration` VARCHAR(50) NOT NULL,
  `instructions` TEXT NULL,
  `dosage_instruction` VARCHAR(100) NULL,
  CONSTRAINT `pk_prescription_items` PRIMARY KEY (`item_id`),
  CONSTRAINT `fk_items_prescription` FOREIGN KEY (`prescription_id`) 
    REFERENCES `prescriptions`(`prescription_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_items_medicine` FOREIGN KEY (`medicine_id`) 
    REFERENCES `medicines`(`medicine_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_item_duration` CHECK (`duration` != '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 7. APPOINTMENTS (PRIORITY & EMERGENCY FCFS TABLE)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
  `appointment_id` INT AUTO_INCREMENT NOT NULL,
  `patient_uid` VARCHAR(20) NOT NULL,
  `doctor_id` INT NOT NULL,
  `hospital_id` INT NOT NULL,
  `requested_date` DATE NOT NULL,
  `scheduled_time` TIME NULL,
  `serial_no` INT NULL,
  `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED') DEFAULT 'PENDING',
  `is_emergency` BOOLEAN DEFAULT FALSE,
  `emergency_reason` TEXT NULL,
  `priority_level` INT DEFAULT 1, -- 1: Regular FCFS, 2: Patient Emergency, 3: Doctor-Approved Emergency
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pk_appointments` PRIMARY KEY (`appointment_id`),
  CONSTRAINT `fk_apt_patient` FOREIGN KEY (`patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_apt_doctor` FOREIGN KEY (`doctor_id`) 
    REFERENCES `doctors`(`doctor_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_apt_hospital` FOREIGN KEY (`hospital_id`) 
    REFERENCES `hospitals`(`hospital_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY `idx_apt_patient` (`patient_uid`),
  KEY `idx_apt_doctor` (`doctor_id`),
  KEY `idx_apt_hospital` (`hospital_id`),
  KEY `idx_apt_date_status_pri` (`requested_date`, `status`, `priority_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 8. PATIENT SELF-REPORTED / EMERGENCY MEDICATIONS LOG
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `patient_self_medications` (
  `log_id` INT AUTO_INCREMENT NOT NULL,
  `patient_uid` VARCHAR(20) NOT NULL,
  `medicine_name` VARCHAR(150) NOT NULL,
  `reason_or_emergency` TEXT NOT NULL,
  `dosage_taken` VARCHAR(100),
  `date_taken` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_self_medications` PRIMARY KEY (`log_id`),
  CONSTRAINT `fk_self_med_patient` FOREIGN KEY (`patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 9. DIAGNOSTIC & LAB REPORTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `diagnostic_reports` (
  `report_id` INT AUTO_INCREMENT NOT NULL,
  `patient_uid` VARCHAR(20) NOT NULL,
  `test_name` VARCHAR(150) NOT NULL,
  `lab_name` VARCHAR(150) NULL DEFAULT 'Central Pathology Laboratory',
  `report_file_url` VARCHAR(255) NOT NULL,
  `extracted_summary` TEXT NULL,
  `report_date` DATE NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_diagnostic_reports` PRIMARY KEY (`report_id`),
  CONSTRAINT `fk_reports_patient` FOREIGN KEY (`patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 10. DOCTOR BLOGS & CLINICAL INSIGHTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blogs` (
  `blog_id` INT AUTO_INCREMENT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `author_name` VARCHAR(100) NOT NULL,
  `author_specialization` VARCHAR(150) NOT NULL,
  `author_license` VARCHAR(50) NOT NULL,
  `read_time` VARCHAR(20) NOT NULL,
  `summary` TEXT NOT NULL,
  `content` MEDIUMTEXT NOT NULL,
  `published_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_blogs` PRIMARY KEY (`blog_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 11. IMMUTABLE AUDIT TRAIL LOGS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prescription_audit_logs` (
  `log_id` INT AUTO_INCREMENT NOT NULL,
  `prescription_id` INT NOT NULL,
  `action_type` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `performed_by_doctor_id` INT,
  `old_data` JSON,
  `new_data` JSON,
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_audit_logs` PRIMARY KEY (`log_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 12. DAILY ANALYTICS AGGREGATES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_analytics_summary` (
  `summary_id` INT AUTO_INCREMENT NOT NULL,
  `summary_date` DATE NOT NULL,
  `total_consultations` INT DEFAULT 0,
  `total_prescriptions` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_daily_analytics` PRIMARY KEY (`summary_id`),
  CONSTRAINT `uq_summary_date` UNIQUE (`summary_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 13. ALLERGY SAFETY & DRUG CONTRAINDICATIONS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `allergens` (
  `allergen_id` INT AUTO_INCREMENT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_allergens` PRIMARY KEY (`allergen_id`),
  CONSTRAINT `uq_allergen_name` UNIQUE (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_allergies` (
  `patient_uid` VARCHAR(20) NOT NULL,
  `allergen_id` INT NOT NULL,
  `severity` ENUM('MILD', 'MODERATE', 'SEVERE') NOT NULL,
  `noted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_patient_allergies` PRIMARY KEY (`patient_uid`, `allergen_id`),
  CONSTRAINT `fk_pa_patient` FOREIGN KEY (`patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pa_allergen` FOREIGN KEY (`allergen_id`) 
    REFERENCES `allergens`(`allergen_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `medicine_allergens` (
  `medicine_id` INT NOT NULL,
  `allergen_id` INT NOT NULL,
  CONSTRAINT `pk_medicine_allergens` PRIMARY KEY (`medicine_id`, `allergen_id`),
  CONSTRAINT `fk_ma_medicine` FOREIGN KEY (`medicine_id`) 
    REFERENCES `medicines`(`medicine_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ma_allergen` FOREIGN KEY (`allergen_id`) 
    REFERENCES `allergens`(`allergen_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 14. ENTERPRISE SYSTEM AUDIT LOGS (IMMUTABLE AUDIT TRAIL)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_audit_logs` (
  `log_id` BIGINT AUTO_INCREMENT NOT NULL,
  `table_name` VARCHAR(50) NOT NULL,
  `action_type` ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
  `record_id` VARCHAR(50) NOT NULL,
  `performed_by` VARCHAR(50) DEFAULT 'SYSTEM',
  `old_data` JSON NULL,
  `new_data` JSON NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_system_audit_logs` PRIMARY KEY (`log_id`),
  KEY `idx_audit_table_record` (`table_name`, `record_id`),
  KEY `idx_audit_timestamp` (`timestamp` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 15. HOSPITAL DEPARTMENTS & WARD BED MANAGEMENT
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `departments` (
  `department_id` INT AUTO_INCREMENT NOT NULL,
  `hospital_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_departments` PRIMARY KEY (`department_id`),
  CONSTRAINT `fk_dept_hospital` FOREIGN KEY (`hospital_id`) 
    REFERENCES `hospitals`(`hospital_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY `idx_dept_hospital` (`hospital_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `hospital_beds` (
  `bed_id` INT AUTO_INCREMENT NOT NULL,
  `department_id` INT NOT NULL,
  `bed_number` VARCHAR(20) NOT NULL,
  `status` ENUM('AVAILABLE', 'OCCUPIED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
  `current_patient_uid` VARCHAR(20) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `pk_hospital_beds` PRIMARY KEY (`bed_id`),
  CONSTRAINT `fk_bed_dept` FOREIGN KEY (`department_id`) 
    REFERENCES `departments`(`department_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bed_patient` FOREIGN KEY (`current_patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_bed_dept_status` (`department_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 16. BLOOD DONATION & REQUEST HUB (LIFE-SAVING DONOR EXCHANGE)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blood_posts` (
  `post_id` INT AUTO_INCREMENT NOT NULL,
  `author_uid` VARCHAR(20) NOT NULL,
  `post_type` ENUM('DONATE', 'REQUEST') NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  `hemoglobin_level` DECIMAL(4,1) NULL,
  `units_needed` INT DEFAULT 1,
  `area` VARCHAR(100) NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `hospital_name` VARCHAR(150) NULL,
  `urgency` ENUM('NORMAL', 'URGENT', 'CRITICAL_EMERGENCY') DEFAULT 'NORMAL',
  `contact_phone` VARCHAR(20) NOT NULL,
  `status` ENUM('OPEN', 'FULFILLED', 'CLOSED') DEFAULT 'OPEN',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_blood_posts` PRIMARY KEY (`post_id`),
  CONSTRAINT `fk_blood_author` FOREIGN KEY (`author_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY `idx_blood_filter` (`blood_group`, `area`, `status`, `post_type`),
  KEY `idx_blood_urgency` (`urgency`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 17. UNIVERSAL REAL-TIME MESSAGING SYSTEM (CROSS-ROLE COMMS)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `messages` (
  `message_id` BIGINT AUTO_INCREMENT NOT NULL,
  `sender_uid` VARCHAR(20) NOT NULL,
  `receiver_uid` VARCHAR(20) NOT NULL,
  `message_text` TEXT NOT NULL,
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_messages` PRIMARY KEY (`message_id`),
  KEY `idx_msg_thread` (`sender_uid`, `receiver_uid`, `created_at`),
  KEY `idx_msg_receiver` (`receiver_uid`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- 18. COMMUNITY HEALTH BLOGS / CLINICAL KNOWLEDGE FEED
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `health_blogs` (
  `blog_id` INT AUTO_INCREMENT NOT NULL,
  `author_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `tags` VARCHAR(200) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_health_blogs` PRIMARY KEY (`blog_id`),
  CONSTRAINT `fk_blog_doctor` FOREIGN KEY (`author_id`) 
    REFERENCES `doctors`(`doctor_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  KEY `idx_blog_category` (`category`),
  KEY `idx_blog_created` (`created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =============================================================
-- 19. EXPLICIT PERFORMANCE INDEXES (OPTIMIZATION)
-- =============================================================

-- Composite B-Tree Index for chronological patient prescriptions:
CREATE INDEX IF NOT EXISTS `idx_presc_patient_created` 
ON `prescriptions`(`patient_uid`, `created_at` DESC);

-- Composite B-Tree Index for prescription medication lookups:
CREATE INDEX IF NOT EXISTS `idx_items_lookup` 
ON `prescription_items`(`prescription_id`, `medicine_id`);

-- B-Tree Index for patient diagnostic reports:
CREATE INDEX IF NOT EXISTS `idx_reports_patient` 
ON `diagnostic_reports`(`patient_uid`, `uploaded_at` DESC);

-- Full-Text Index on medicines for high-speed natural language search:
CREATE FULLTEXT INDEX IF NOT EXISTS `idx_ft_medicines` 
ON `medicines`(`brand_name`, `generic_name`);

-- =============================================================
-- 20. TRIGGERS & CONSTRAINTS (ALLERGY SAFETY & AUDITING)
-- =============================================================

DELIMITER $$

-- Trigger 1: Pre-Insert Allergy Safety Guard on prescription_items
DROP TRIGGER IF EXISTS `trg_check_allergy_before_prescribe`$$
CREATE TRIGGER `trg_check_allergy_before_prescribe`
BEFORE INSERT ON `prescription_items`
FOR EACH ROW
BEGIN
  DECLARE v_patient_uid VARCHAR(20);
  DECLARE v_severe_count INT DEFAULT 0;

  SELECT patient_uid INTO v_patient_uid
  FROM prescriptions
  WHERE prescription_id = NEW.prescription_id
  LIMIT 1;

  IF v_patient_uid IS NOT NULL THEN
    SELECT COUNT(*) INTO v_severe_count
    FROM patient_allergies pa
    JOIN medicine_allergens ma ON pa.allergen_id = ma.allergen_id
    WHERE pa.patient_uid = v_patient_uid
      AND ma.medicine_id = NEW.medicine_id
      AND pa.severity = 'SEVERE';

    IF v_severe_count > 0 THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'ALLERGY CONFLICT: Medicine contains allergen patient is severely allergic to.';
    END IF;
  END IF;
END$$

-- Trigger 2: Audit Citizens Updates
DROP TRIGGER IF EXISTS `trg_audit_citizens_update`$$
CREATE TRIGGER `trg_audit_citizens_update`
AFTER UPDATE ON `citizens`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (table_name, action_type, record_id, performed_by, old_data, new_data)
  VALUES (
    'citizens',
    'UPDATE',
    NEW.uid,
    'SYSTEM',
    JSON_OBJECT('name', OLD.name, 'phone', OLD.phone, 'email', OLD.email, 'area', OLD.area, 'city', OLD.city),
    JSON_OBJECT('name', NEW.name, 'phone', NEW.phone, 'email', NEW.email, 'area', NEW.area, 'city', NEW.city)
  );
END$$

-- Trigger 3: Audit Citizens Deletions
DROP TRIGGER IF EXISTS `trg_audit_citizens_delete`$$
CREATE TRIGGER `trg_audit_citizens_delete`
AFTER DELETE ON `citizens`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (table_name, action_type, record_id, performed_by, old_data, new_data)
  VALUES (
    'citizens',
    'DELETE',
    OLD.uid,
    'SYSTEM',
    JSON_OBJECT('name', OLD.name, 'phone', OLD.phone, 'email', OLD.email, 'area', OLD.area, 'city', OLD.city),
    NULL
  );
END$$

-- Trigger 4: Audit Prescriptions Updates
DROP TRIGGER IF EXISTS `trg_audit_prescriptions_update`$$
CREATE TRIGGER `trg_audit_prescriptions_update`
AFTER UPDATE ON `prescriptions`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (table_name, action_type, record_id, performed_by, old_data, new_data)
  VALUES (
    'prescriptions',
    'UPDATE',
    CAST(NEW.prescription_id AS CHAR),
    'DOCTOR',
    JSON_OBJECT('patient_uid', OLD.patient_uid, 'doctor_id', OLD.doctor_id, 'diagnosis', OLD.diagnosis),
    JSON_OBJECT('patient_uid', NEW.patient_uid, 'doctor_id', NEW.doctor_id, 'diagnosis', NEW.diagnosis)
  );
END$$

-- Trigger 5: Audit Prescriptions Deletions
DROP TRIGGER IF EXISTS `trg_audit_prescriptions_delete`$$
CREATE TRIGGER `trg_audit_prescriptions_delete`
AFTER DELETE ON `prescriptions`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (table_name, action_type, record_id, performed_by, old_data, new_data)
  VALUES (
    'prescriptions',
    'DELETE',
    CAST(OLD.prescription_id AS CHAR),
    'DOCTOR',
    JSON_OBJECT('patient_uid', OLD.patient_uid, 'doctor_id', OLD.doctor_id, 'diagnosis', OLD.diagnosis),
    NULL
  );
END$$

-- Trigger 6: Audit Appointments Updates
DROP TRIGGER IF EXISTS `trg_audit_appointments_update`$$
CREATE TRIGGER `trg_audit_appointments_update`
AFTER UPDATE ON `appointments`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (table_name, action_type, record_id, performed_by, old_data, new_data)
  VALUES (
    'appointments',
    'UPDATE',
    CAST(NEW.appointment_id AS CHAR),
    'SYSTEM',
    JSON_OBJECT('status', OLD.status, 'priority_level', OLD.priority_level, 'serial_no', OLD.serial_no),
    JSON_OBJECT('status', NEW.status, 'priority_level', NEW.priority_level, 'serial_no', NEW.serial_no)
  );
END$$

-- Trigger 7: Audit Appointments Deletions
DROP TRIGGER IF EXISTS `trg_audit_appointments_delete`$$
CREATE TRIGGER `trg_audit_appointments_delete`
AFTER DELETE ON `appointments`
FOR EACH ROW
BEGIN
  INSERT INTO `system_audit_logs` (table_name, action_type, record_id, performed_by, old_data, new_data)
  VALUES (
    'appointments',
    'DELETE',
    CAST(OLD.appointment_id AS CHAR),
    'SYSTEM',
    JSON_OBJECT('status', OLD.status, 'priority_level', OLD.priority_level, 'serial_no', OLD.serial_no),
    NULL
  );
END$$

-- =============================================================
-- 21. STORED PROCEDURES (ATOMIC BOOKING & CONCURRENCY CONTROL)
-- =============================================================

DROP PROCEDURE IF EXISTS `sp_book_appointment`$$
CREATE PROCEDURE `sp_book_appointment`(
  IN p_patient_uid VARCHAR(20),
  IN p_doctor_id INT,
  IN p_hospital_id INT,
  IN p_date DATE,
  IN p_is_emergency BOOLEAN,
  IN p_reason TEXT,
  OUT p_appointment_id INT,
  OUT p_serial_no INT,
  OUT p_priority_level INT
)
BEGIN
  DECLARE v_doc_exists INT DEFAULT 0;
  DECLARE v_next_serial INT DEFAULT 1;
  DECLARE v_priority INT DEFAULT 1;
  DECLARE v_scheduled_time TIME DEFAULT NULL;
  DECLARE v_shift_start TIME DEFAULT '09:00:00';
  DECLARE v_max_daily_slots INT DEFAULT 20;
  DECLARE v_current_booked INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- Concurrency Row-Locking on Doctor Record
  SELECT doctor_id, shift_start, max_daily_slots
  INTO v_doc_exists, v_shift_start, v_max_daily_slots
  FROM doctors
  WHERE doctor_id = p_doctor_id
  FOR UPDATE;

  IF v_doc_exists IS NULL OR v_doc_exists = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid doctor_id specified for appointment.';
  END IF;

  IF p_is_emergency THEN
    SET v_priority = 2;
  ELSE
    SET v_priority = 1;
  END IF;

  -- Count currently booked appointments for this doctor on requested date
  SELECT COUNT(*) INTO v_current_booked
  FROM appointments
  WHERE doctor_id = p_doctor_id 
    AND requested_date = p_date
    AND status IN ('PENDING', 'ACCEPTED');

  IF NOT p_is_emergency AND v_current_booked >= IFNULL(v_max_daily_slots, 20) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Doctor daily capacity reached for the requested date.';
  END IF;

  -- Compute next sequential serial number
  SELECT IFNULL(MAX(serial_no), 0) + 1 INTO v_next_serial
  FROM appointments
  WHERE doctor_id = p_doctor_id AND requested_date = p_date;

  -- Estimate scheduled appointment time based on slot queue (15 mins/slot)
  SET v_scheduled_time = ADDTIME(IFNULL(v_shift_start, '09:00:00'), SEC_TO_TIME((v_next_serial - 1) * 15 * 60));

  INSERT INTO appointments (
    patient_uid, doctor_id, hospital_id, requested_date, scheduled_time,
    serial_no, status, is_emergency, emergency_reason, priority_level
  ) VALUES (
    p_patient_uid, p_doctor_id, p_hospital_id, p_date, v_scheduled_time,
    v_next_serial, 'PENDING', p_is_emergency, p_reason, v_priority
  );

  SET p_appointment_id = LAST_INSERT_ID();
  SET p_serial_no = v_next_serial;
  SET p_priority_level = v_priority;

  COMMIT;

  SELECT 
    a.appointment_id,
    a.patient_uid,
    c.name AS patient_name,
    a.doctor_id,
    d.name AS doctor_name,
    d.specialization,
    a.hospital_id,
    h.name AS hospital_name,
    h.area AS hospital_area,
    a.requested_date,
    a.scheduled_time,
    a.serial_no,
    a.status,
    a.is_emergency,
    a.emergency_reason,
    a.priority_level,
    a.applied_at
  FROM appointments a
  JOIN citizens c ON a.patient_uid = c.uid
  JOIN doctors d ON a.doctor_id = d.doctor_id
  JOIN hospitals h ON a.hospital_id = h.hospital_id
  WHERE a.appointment_id = p_appointment_id;
END$$

DELIMITER ;

