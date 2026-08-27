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
  CONSTRAINT `chk_citizen_dob` CHECK (`dob` >= '1900-01-01'),
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
  `dosage_instruction` VARCHAR(100) NOT NULL,
  `duration` VARCHAR(50) NOT NULL,
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
  `report_file_url` VARCHAR(255) NOT NULL,
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

-- =============================================================
-- 13. EXPLICIT PERFORMANCE INDEXES (OPTIMIZATION)
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
