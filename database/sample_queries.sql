-- =============================================================
-- xMED Enterprise National Healthcare & EHR Portal
-- FILE: database/sample_queries.sql
-- PURPOSE: Fully Commented Sample Queries for Academic DBMS Lab Evaluation
-- Syllabus Checklist Mapping:
--   1. DML Operations (CRUD: INSERT, SELECT, UPDATE, DELETE)
--   2. Aggregations with GROUP BY & HAVING
--   3. Joins (INNER JOIN and LEFT OUTER JOIN)
--   4. Correlated / Nested Subqueries
--   5. ACID Multi-Step Transactions (BEGIN / COMMIT / ROLLBACK)
--   6. Performance Analysis (EXPLAIN Query Plans)
-- Target DBMS: MySQL 8.0+ / MariaDB 10.4+
-- =============================================================

USE `xmed_db`;

-- =============================================================
-- SECTION 1: DML OPERATIONS (CRUD WORKFLOW)
-- =============================================================

-- 1.1 CREATE (INSERT) - Register a new citizen
INSERT INTO `citizens` (`uid`, `full_name`, `dob`, `gender`, `blood_group`, `phone`, `email`, `password_hash`)
VALUES ('BD-2026-X999', 'Tareq Mahmud', '1992-06-15', 'Male', 'B+', '01511999888', 'tareq@xmed.gov.bd', '$2a$10$e8T0Jeq4cQ29Ym629G2YjOQf9nL6o0uUo7b8h0z9w4p1s0e3r5t7y');

-- 1.2 READ (SELECT) - Retrieve longitudinal history for a citizen
SELECT `prescription_id`, `diagnosis`, `clinical_notes`, `created_at`
FROM `prescriptions`
WHERE `patient_uid` = 'BD-2026-8841'
ORDER BY `created_at` DESC;

-- 1.3 UPDATE - Modify patient contact coordinates
UPDATE `citizens`
SET `phone` = '01899990000', `email` = 'rahim.updated@xmed.gov.bd'
WHERE `uid` = 'BD-2026-8841';

-- 1.4 DELETE - Remove obsolete diagnostic report draft
DELETE FROM `diagnostic_reports`
WHERE `report_id` = 9999 AND `patient_uid` = 'BD-2026-8841';


-- =============================================================
-- SECTION 2: AGGREGATION WITH GROUP BY & HAVING
-- =============================================================

-- Query: Identify all frequent patients whose consultation count exceeds the hospital-wide average
-- Evaluates: COUNT(), AVG(), GROUP BY, HAVING, and Scalar Subquery
SELECT 
  c.`uid` AS `patient_uid`,
  c.`full_name`,
  c.`blood_group`,
  c.`phone`,
  COUNT(p.`prescription_id`) AS `total_consultations`
FROM `citizens` c
JOIN `prescriptions` p ON c.`uid` = p.`patient_uid`
GROUP BY c.`uid`, c.`full_name`, c.`blood_group`, c.`phone`
HAVING COUNT(p.`prescription_id`) > (
  -- Subquery computes the hospital-wide mean consultations per patient:
  SELECT AVG(`patient_visits`) 
  FROM (
    SELECT COUNT(`prescription_id`) AS `patient_visits`
    FROM `prescriptions`
    GROUP BY `patient_uid`
  ) AS `hospital_benchmark`
)
ORDER BY `total_consultations` DESC;


-- =============================================================
-- SECTION 3: MULTI-TABLE JOINS (INNER JOIN & LEFT JOIN)
-- =============================================================

-- 3.1 Multi-Table INNER JOIN:
-- Retrieves complete clinical consultations combining prescriptions, citizen records, and doctor credentials
SELECT 
  p.`prescription_id`,
  p.`created_at` AS `prescription_date`,
  p.`diagnosis`,
  p.`clinical_notes`,
  c.`uid` AS `patient_uid`,
  c.`full_name` AS `patient_name`,
  c.`blood_group`,
  d.`doctor_id`,
  d.`full_name` AS `attending_doctor`,
  d.`specialization`,
  d.`license_no` AS `bmdc_license`
FROM `prescriptions` p
INNER JOIN `citizens` c ON p.`patient_uid` = c.`uid`
INNER JOIN `doctors` d ON p.`doctor_id` = d.`doctor_id`
ORDER BY p.`created_at` DESC
LIMIT 20;

-- 3.2 LEFT OUTER JOIN:
-- Audits diagnostic report coverage across all registered citizens,
-- successfully returning citizens who have ZERO uploaded laboratory reports
SELECT 
  c.`uid` AS `patient_uid`,
  c.`full_name` AS `patient_name`,
  c.`gender`,
  c.`blood_group`,
  r.`report_id`,
  IFNULL(r.`test_name`, 'NO REPORT UPLOADED') AS `test_status`,
  r.`uploaded_at`
FROM `citizens` c
LEFT JOIN `diagnostic_reports` r ON c.`uid` = r.`patient_uid`
ORDER BY c.`uid` ASC, r.`uploaded_at` DESC;


-- =============================================================
-- SECTION 4: CORRELATED & NESTED SUBQUERIES
-- =============================================================

-- 4.1 Nested Subquery:
-- Identifies high-usage medications prescribed more frequently than the overall drug catalog average
SELECT 
  m.`medicine_id`,
  m.`brand_name`,
  m.`generic_name`,
  m.`category`,
  m.`origin`,
  COUNT(pi.`item_id`) AS `prescription_frequency`
FROM `medicines` m
JOIN `prescription_items` pi ON m.`medicine_id` = pi.`medicine_id`
GROUP BY m.`medicine_id`, m.`brand_name`, m.`generic_name`, m.`category`, m.`origin`
HAVING COUNT(pi.`item_id`) > (
  -- Nested subquery calculating average prescriptions per drug:
  SELECT AVG(`drug_prescriptions`)
  FROM (
    SELECT COUNT(`item_id`) AS `drug_prescriptions`
    FROM `prescription_items`
    GROUP BY `medicine_id`
  ) AS `catalog_average`
)
ORDER BY `prescription_frequency` DESC;

-- 4.2 Correlated Subquery:
-- For each doctor, finds the prescription count and indicates if the doctor is above their department's activity
SELECT 
  d.`doctor_id`,
  d.`full_name`,
  d.`specialization`,
  (
    SELECT COUNT(*) 
    FROM `prescriptions` p 
    WHERE p.`doctor_id` = d.`doctor_id`
  ) AS `total_doctor_prescriptions`
FROM `doctors` d
WHERE (
  SELECT COUNT(*) 
  FROM `prescriptions` p 
  WHERE p.`doctor_id` = d.`doctor_id`
) > 0;


-- =============================================================
-- SECTION 5: ACID MULTI-STEP TRANSACTION WORKFLOW
-- =============================================================

-- Scenario: Doctor issues a new prescription with multiple line medications.
-- Both parent prescription and child items MUST succeed together or rollback completely.

START TRANSACTION;

-- Step 1: Insert Master Prescription
INSERT INTO `prescriptions` (`patient_uid`, `doctor_id`, `diagnosis`, `clinical_notes`)
VALUES ('BD-2026-8841', 1, 'Acute Tonsillitis with Secondary Pyrexia', 'Warm fluid intake, complete 5-day antibiotic regimen.');

-- Save the generated auto-increment primary key:
SET @new_prescription_id = LAST_INSERT_ID();

-- Step 2: Insert Multiple Child Prescription Items
INSERT INTO `prescription_items` (`prescription_id`, `medicine_id`, `dosage_instruction`, `duration`)
VALUES 
(@new_prescription_id, 611, '1 tablet every 8 hours after food', '5 days'),
(@new_prescription_id, 612, '1 tablet once daily before breakfast', '14 days'),
(@new_prescription_id, 615, '10ml thrice daily as needed', '3 days');

-- Step 3: Commit the entire transaction atomically
COMMIT;

-- Note: If any error, foreign key violation, or constraint failure occurs:
-- ROLLBACK;


-- =============================================================
-- SECTION 6: QUERY OPTIMIZATION & EXPLAIN EXECUTION PLANS
-- =============================================================

-- 6.1 EXPLAIN on Indexed Patient Prescription Lookup
-- Uses Composite B-Tree Index: idx_presc_patient_created
-- Expected execution: type: 'ref', key: 'idx_presc_patient_created', rows: 1..N (Zero Table Scan)
EXPLAIN SELECT * 
FROM `prescriptions` 
WHERE `patient_uid` = 'BD-2026-8841' 
ORDER BY `created_at` DESC;

-- 6.2 EXPLAIN on Composite Prescription Items Lookup
-- Uses Composite B-Tree Index: idx_items_lookup
EXPLAIN SELECT * 
FROM `prescription_items` 
WHERE `prescription_id` = 1 AND `medicine_id` = 611;

-- 6.3 EXPLAIN on Full-Text Search on Medicines Catalog
-- Uses Inverted Full-Text Index: idx_ft_medicines
EXPLAIN SELECT `medicine_id`, `brand_name`, `generic_name` 
FROM `medicines` 
WHERE MATCH(`brand_name`, `generic_name`) AGAINST('Paracetamol' IN NATURAL LANGUAGE MODE);


-- =============================================================
-- SECTION 7: PATIENT SELF-REPORTED MEDICATIONS & UNIFIED TIMELINE
-- =============================================================

-- 7.1 Insert Self-Reported / Emergency Medication Entry
INSERT INTO `patient_self_medications` (
  `patient_uid`, 
  `medicine_name`, 
  `reason_or_emergency`, 
  `dosage_taken`, 
  `date_taken`
) VALUES (
  'BD-2000-0001', 
  'Napa Extra 500mg/65mg (Paracetamol + Caffeine)', 
  'Sudden onset high fever of 102.4°F late at night with severe throbbing body ache.', 
  '1 tablet with water', 
  '2026-08-27'
);

-- 7.2 Query Self-Reported Medications for a Specific Citizen
SELECT 
  sm.`log_id`,
  sm.`patient_uid`,
  c.`full_name` AS `patient_name`,
  c.`blood_group`,
  sm.`medicine_name`,
  sm.`dosage_taken`,
  sm.`reason_or_emergency`,
  sm.`date_taken`,
  sm.`created_at`
FROM `patient_self_medications` sm
JOIN `citizens` c ON sm.`patient_uid` = c.`uid`
WHERE sm.`patient_uid` = 'BD-2000-0001'
ORDER BY sm.`date_taken` DESC, sm.`created_at` DESC;

-- 7.3 Advanced DBMS: Unified Chronological Medical Timeline (UNION ALL Query)
-- Combines official clinical prescriptions with self-reported OTC medications
SELECT 
  'OFFICIAL_CONSULTATION' AS `record_type`,
  p.`prescription_id` AS `reference_id`,
  p.`patient_uid`,
  p.`created_at` AS `event_date`,
  p.`diagnosis` AS `headline`,
  d.`full_name` AS `actor_name`,
  d.`specialization` AS `actor_detail`,
  p.`clinical_notes` AS `details`
FROM `prescriptions` p
JOIN `doctors` d ON p.`doctor_id` = d.`doctor_id`
WHERE p.`patient_uid` = 'BD-2000-0001'

UNION ALL

SELECT 
  'SELF_MEDICATION_OTC' AS `record_type`,
  sm.`log_id` AS `reference_id`,
  sm.`patient_uid`,
  sm.`date_taken` AS `event_date`,
  sm.`medicine_name` AS `headline`,
  'Self-Reported by Citizen' AS `actor_name`,
  CONCAT('Dosage: ', COALESCE(sm.`dosage_taken`, 'As needed')) AS `actor_detail`,
  sm.`reason_or_emergency` AS `details`
FROM `patient_self_medications` sm
WHERE sm.`patient_uid` = 'BD-2000-0001'

ORDER BY `event_date` DESC;

