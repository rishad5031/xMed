-- =============================================================
-- xMED Enterprise National Healthcare & EHR Portal
-- FILE: database/schema.sql
-- PURPOSE: All DDL Commands (Database, Tables, Constraints, Indexes)
-- Target DBMS: MySQL 8.0+ / MariaDB 10.4+
-- Academic DBMS Lab Project Evaluation Standard
-- =============================================================

CREATE DATABASE IF NOT EXISTS `xmed_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `xmed_db`;

-- -------------------------------------------------------------
-- 1. CITIZENS / PATIENTS VAULT
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `citizens` (
  `uid` VARCHAR(20) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `dob` DATE NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
  `blood_group` ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  `phone` VARCHAR(15) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_citizens` PRIMARY KEY (`uid`),
  CONSTRAINT `uq_citizen_phone` UNIQUE (`phone`),
  CONSTRAINT `uq_citizen_email` UNIQUE (`email`),
  CONSTRAINT `chk_citizen_dob` CHECK (`dob` >= '1900-01-01')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. CERTIFIED DOCTORS & PHYSICIANS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `doctors` (
  `doctor_id` INT AUTO_INCREMENT NOT NULL,
  `license_no` VARCHAR(50) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `specialization` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(15) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `verified` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_doctors` PRIMARY KEY (`doctor_id`),
  CONSTRAINT `uq_doctor_license` UNIQUE (`license_no`),
  CONSTRAINT `uq_doctor_email` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 3. MEDICINES CATALOG
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `medicines` (
  `medicine_id` INT AUTO_INCREMENT NOT NULL,
  `brand_name` VARCHAR(100) NOT NULL,
  `generic_name` VARCHAR(100) NOT NULL,
  `dosage_form` VARCHAR(50) NOT NULL,
  `strength` VARCHAR(50) NOT NULL,
  `category` VARCHAR(50) DEFAULT 'General',
  `origin` VARCHAR(50) DEFAULT 'Global',
  `total_prescribed_count` INT DEFAULT 0,
  CONSTRAINT `pk_medicines` PRIMARY KEY (`medicine_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. PRESCRIPTIONS MASTER TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `prescription_id` INT AUTO_INCREMENT NOT NULL,
  `patient_uid` VARCHAR(20) NOT NULL,
  `doctor_id` INT NOT NULL,
  `diagnosis` TEXT NOT NULL,
  `clinical_notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_prescriptions` PRIMARY KEY (`prescription_id`),
  CONSTRAINT `fk_prescriptions_patient` FOREIGN KEY (`patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_prescriptions_doctor` FOREIGN KEY (`doctor_id`) 
    REFERENCES `doctors`(`doctor_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 5. PRESCRIPTION ITEMS DETAIL (MEDICATIONS PER RX)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `prescription_items` (
  `item_id` INT AUTO_INCREMENT NOT NULL,
  `prescription_id` INT NOT NULL,
  `medicine_id` INT NOT NULL,
  `dosage_instruction` VARCHAR(100) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
  CONSTRAINT `pk_prescription_items` PRIMARY KEY (`item_id`),
  CONSTRAINT `fk_items_prescription` FOREIGN KEY (`prescription_id`) 
    REFERENCES `prescriptions`(`prescription_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_items_medicine` FOREIGN KEY (`medicine_id`) 
    REFERENCES `medicines`(`medicine_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_item_duration` CHECK (`duration` != '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 6. DIAGNOSTIC & LAB REPORTS
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `diagnostic_reports` (
  `report_id` INT AUTO_INCREMENT NOT NULL,
  `patient_uid` VARCHAR(20) NOT NULL,
  `test_name` VARCHAR(150) NOT NULL,
  `report_file_url` VARCHAR(255) NOT NULL,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_diagnostic_reports` PRIMARY KEY (`report_id`),
  CONSTRAINT `fk_reports_patient` FOREIGN KEY (`patient_uid`) 
    REFERENCES `citizens`(`uid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 7. PATIENT SELF-REPORTED / EMERGENCY MEDICATIONS LOG
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 8. DOCTOR BLOGS & CLINICAL INSIGHTS
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 8. IMMUTABLE AUDIT TRAIL LOGS
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 9. DAILY ANALYTICS AGGREGATES
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_analytics_summary` (
  `summary_id` INT AUTO_INCREMENT NOT NULL,
  `summary_date` DATE NOT NULL,
  `total_consultations` INT DEFAULT 0,
  `total_prescriptions` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `pk_daily_analytics` PRIMARY KEY (`summary_id`),
  CONSTRAINT `uq_summary_date` UNIQUE (`summary_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================
-- 10. EXPLICIT PERFORMANCE INDEXES (OPTIMIZATION)
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
