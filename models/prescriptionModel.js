const { query } = require('../config/db');

// Create prescription and items in a single ACID transaction via Stored Procedure
async function createPrescriptionWithItems({ patient_uid, doctor_id, diagnosis, clinical_notes, items }) {
  const itemsJson = JSON.stringify(items || []);
  
  // Execute stored procedure with ACID transaction & SQLEXCEPTION rollback handler
  const callResults = await query(
    'CALL sp_CreatePrescriptionWithItems(?, ?, ?, ?, ?, @out_prescription_id);',
    [patient_uid, doctor_id, diagnosis, clinical_notes || '', itemsJson]
  );

  // The stored procedure returns the newly created prescription_id in its result set
  const firstSet = Array.isArray(callResults) ? callResults[0] : null;
  const returnedRow = Array.isArray(firstSet) ? firstSet[0] : firstSet;
  const prescription_id = returnedRow ? returnedRow.prescription_id : null;

  if (!prescription_id) {
    throw new Error('Stored procedure sp_CreatePrescriptionWithItems did not return a valid prescription ID.');
  }

  return await getPrescriptionById(prescription_id);
}

// Fetch complete prescription with doctor, patient, and items details
async function getPrescriptionById(prescription_id) {
  const rxSql = `
    SELECT 
      p.prescription_id,
      p.patient_uid,
      p.doctor_id,
      p.diagnosis,
      p.clinical_notes,
      p.created_at,
      c.full_name AS patient_name,
      c.dob AS patient_dob,
      c.gender AS patient_gender,
      c.blood_group AS patient_blood_group,
      c.phone AS patient_phone,
      d.full_name AS doctor_name,
      d.license_no AS doctor_license,
      d.specialization AS doctor_specialization,
      d.phone AS doctor_phone,
      d.email AS doctor_email
    FROM prescriptions p
    JOIN citizens c ON p.patient_uid = c.uid
    JOIN doctors d ON p.doctor_id = d.doctor_id
    WHERE p.prescription_id = ?
    LIMIT 1
  `;
  const rxRows = await query(rxSql, [prescription_id]);
  if (!rxRows || rxRows.length === 0) {
    return null;
  }

  const prescription = rxRows[0];

  // Fetch prescription items
  const itemsSql = `
    SELECT 
      pi.item_id,
      pi.dosage_instruction,
      pi.duration,
      m.medicine_id,
      m.brand_name,
      m.generic_name,
      m.dosage_form,
      m.strength,
      m.category
    FROM prescription_items pi
    JOIN medicines m ON pi.medicine_id = m.medicine_id
    WHERE pi.prescription_id = ?
    ORDER BY pi.item_id ASC
  `;
  const items = await query(itemsSql, [prescription_id]);
  prescription.items = items;

  return prescription;
}

// Fetch full prescription timeline for a patient with pagination
async function getPrescriptionsByPatientUid(patient_uid, limit = 20, offset = 0) {
  const rxSql = `
    SELECT 
      p.prescription_id,
      p.patient_uid,
      p.doctor_id,
      p.diagnosis,
      p.clinical_notes,
      p.created_at,
      d.full_name AS doctor_name,
      d.license_no AS doctor_license,
      d.specialization AS doctor_specialization
    FROM prescriptions p
    JOIN doctors d ON p.doctor_id = d.doctor_id
    WHERE p.patient_uid = ?
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const prescriptions = await query(rxSql, [patient_uid, parseInt(limit, 10), parseInt(offset, 10)]);

  // Attach items to each prescription
  for (const rx of prescriptions) {
    const itemsSql = `
      SELECT 
        pi.item_id,
        pi.dosage_instruction,
        pi.duration,
        m.brand_name,
        m.generic_name,
        m.dosage_form,
        m.strength,
        m.category
      FROM prescription_items pi
      JOIN medicines m ON pi.medicine_id = m.medicine_id
      WHERE pi.prescription_id = ?
      ORDER BY pi.item_id ASC
    `;
    rx.items = await query(itemsSql, [rx.prescription_id]);
  }

  return prescriptions;
}

// Query immutable audit log table
async function getPrescriptionAuditLogs(prescription_id) {
  const sql = `
    SELECT log_id, prescription_id, action_type, performed_by_doctor_id, old_data, new_data, changed_at
    FROM prescription_audit_logs
    WHERE prescription_id = ?
    ORDER BY changed_at ASC
  `;
  return await query(sql, [prescription_id]);
}

// Query optimized analytical view for doctor metrics
async function getDoctorClinicalAnalytics(doctor_id) {
  const sql = `
    SELECT *
    FROM vw_doctor_clinical_analytics
    WHERE doctor_id = ?
    LIMIT 1
  `;
  const rows = await query(sql, [doctor_id]);
  return rows[0] || null;
}

// Query relational view vw_complete_patient_history
async function getCompletePatientHistory(patient_uid) {
  const sql = `
    SELECT *
    FROM vw_complete_patient_history
    WHERE patient_uid = ?
    ORDER BY prescription_date DESC
  `;
  return await query(sql, [patient_uid]);
}

// Public verification helper
async function verifyPrescriptionPublic(prescription_id) {
  const rxSql = `
    SELECT 
      p.prescription_id,
      p.patient_uid,
      p.created_at,
      c.full_name AS patient_name,
      d.full_name AS doctor_name,
      d.license_no AS doctor_license,
      d.specialization AS doctor_specialization,
      (SELECT COUNT(*) FROM prescription_items WHERE prescription_id = p.prescription_id) AS item_count
    FROM prescriptions p
    JOIN citizens c ON p.patient_uid = c.uid
    JOIN doctors d ON p.doctor_id = d.doctor_id
    WHERE p.prescription_id = ?
    LIMIT 1
  `;
  const rows = await query(rxSql, [prescription_id]);
  if (!rows || rows.length === 0) return null;

  const data = rows[0];
  return {
    valid: true,
    prescription_id: data.prescription_id,
    patient_uid: data.patient_uid,
    patient_name: data.patient_name,
    doctor_name: data.doctor_name,
    doctor_license: data.doctor_license,
    doctor_specialization: data.doctor_specialization,
    issued_at: data.created_at,
    item_count: data.item_count,
    verification_hash: `SHA256:XMED-GOV-BD-${data.prescription_id}-${data.patient_uid}-${data.doctor_license}`
  };
}

module.exports = {
  createPrescriptionWithItems,
  getPrescriptionById,
  getPrescriptionsByPatientUid,
  getPrescriptionAuditLogs,
  getDoctorClinicalAnalytics,
  getCompletePatientHistory,
  verifyPrescriptionPublic
};
