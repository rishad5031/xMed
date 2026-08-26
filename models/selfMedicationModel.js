const { query } = require('../config/db');

// =============================================================
// Patient Self-Medications & Emergency OTC Logging Model
// =============================================================

async function createSelfMedication({ patient_uid, medicine_name, reason_or_emergency, dosage_taken, date_taken }) {
  const sql = `
    INSERT INTO patient_self_medications 
      (patient_uid, medicine_name, reason_or_emergency, dosage_taken, date_taken)
    VALUES (?, ?, ?, ?, ?);
  `;
  const result = await query(sql, [
    patient_uid,
    medicine_name.trim(),
    reason_or_emergency.trim(),
    dosage_taken ? dosage_taken.trim() : null,
    date_taken
  ]);

  return {
    log_id: result.insertId,
    patient_uid,
    medicine_name,
    reason_or_emergency,
    dosage_taken,
    date_taken,
    created_at: new Date()
  };
}

async function getSelfMedicationsByPatientUid(patient_uid) {
  const sql = `
    SELECT 
      log_id,
      patient_uid,
      medicine_name,
      reason_or_emergency,
      dosage_taken,
      date_taken,
      created_at
    FROM patient_self_medications
    WHERE patient_uid = ?
    ORDER BY date_taken DESC, created_at DESC;
  `;
  return await query(sql, [patient_uid]);
}

module.exports = {
  createSelfMedication,
  getSelfMedicationsByPatientUid
};
