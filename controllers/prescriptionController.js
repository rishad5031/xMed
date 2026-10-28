const medicineModel = require('../models/medicineModel');

const prescriptionModel = require('../models/prescriptionModel');

const citizenModel = require('../models/citizenModel');

const { getConnection } = require('../config/db');

/**
 * High-Speed Live Medicine Autocomplete Search
 * GET /api/medicines/search?q=paracetamol
 */
async function searchMedicines(req, res) {
  try {
    const q = req.query.q || '';
    const medicines = await medicineModel.searchMedicines(q, 25);
    return res.json({ success: true, count: medicines.length, medicines });
  } catch (error) {
    console.error('[PrescriptionController] searchMedicines:', error);
    return res.status(500).json({ success: false, message: 'Failed to search medicines.' });
  }
}

/**
 * Strict Multi-Step ACID Transaction for Prescription & Items Submission
 * POST /api/prescriptions
 * 
 * ACID Guarantees:
 * - Atomicity: Both prescription header and all prescription items are inserted together or rolled back completely.
 * - Consistency: Domain constraints and MySQL allergy triggers (SIGNAL SQLSTATE '45000') validate data integrity.
 * - Isolation: Uncommitted transactions remain unobservable to other doctor/patient sessions.
 * - Durability: Changes are persisted to disk upon connection.commit().
 */
async function createPrescription(req, res) {
  const connection = await getConnection();
  try {
    const doctor_id = req.user.doctor_id || req.user.id;
    const { patient_uid, diagnosis, clinical_notes, items } = req.body;

    if (!patient_uid || !diagnosis) {
      return res.status(400).json({ success: false, message: 'Patient UID and Clinical Diagnosis are required.' });
    }

    const patient = await citizenModel.findByUid(patient_uid.trim().toUpperCase());
    if (!patient) {
      return res.status(404).json({ success: false, message: `Patient with UID ${patient_uid} does not exist.` });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one medication item is required.' });
    }

    for (const it of items) {
      if (!it.medicine_id || !it.dosage_instruction || !it.duration) {
        return res.status(400).json({
          success: false,
          message: 'Each medication row must have a valid medicine selection, dosage instruction, and duration.'
        });
      }
    }

    await connection.beginTransaction();

    const [rxResult] = await connection.query(
      'INSERT INTO prescriptions (patient_uid, doctor_id, diagnosis, clinical_notes) VALUES (?, ?, ?, ?)',
      [patient.uid, doctor_id, diagnosis, clinical_notes || '']
    );
    const prescription_id = rxResult.insertId;

    for (const it of items) {
      await connection.query(
        'INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration) VALUES (?, ?, ?, ?)',
        [prescription_id, parseInt(it.medicine_id, 10), it.dosage_instruction, it.duration]
      );
    }

    await connection.commit();

    const prescription = await prescriptionModel.getPrescriptionById(prescription_id);

    return res.status(201).json({
      success: true,
      message: 'Prescription successfully issued and stored into National EHR via ACID Transaction.',
      prescription
    });
  } catch (error) {

    await connection.rollback();
    console.error('[PrescriptionController] createPrescription transaction rollback:', error.message);

    if (error.sqlState === '45000' || (error.sqlMessage && error.sqlMessage.includes('ALLERGY CONFLICT'))) {
      return res.status(400).json({
        success: false,
        conflict: true,
        message: 'Prescription blocked due to recorded patient allergy.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Database transaction failure: rolled back changes.',
      error: error.message
    });
  } finally {

    connection.release();
  }
}

async function getPrescriptionDetails(req, res) {
  try {
    const { id } = req.params;
    const prescription = await prescriptionModel.getPrescriptionById(id);

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription record not found.' });
    }

    if (req.user && req.user.role === 'patient' && req.user.uid !== prescription.patient_uid) {
      return res.status(403).json({ success: false, message: 'Access denied to this medical record.' });
    }

    return res.json({ success: true, prescription });
  } catch (error) {
    console.error('[PrescriptionController] getPrescriptionDetails:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve prescription.' });
  }
}

async function verifyPrescriptionPublic(req, res) {
  try {
    const { id } = req.params;
    const verification = await prescriptionModel.verifyPrescriptionPublic(id);

    if (!verification) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: `Prescription #Rx-${id} was not found in the official National EHR registry.`
      });
    }

    return res.json({
      success: true,
      valid: true,
      data: verification
    });
  } catch (error) {
    console.error('[PrescriptionController] verifyPrescriptionPublic error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify prescription.' });
  }
}

async function getPrescriptionAuditTrail(req, res) {
  try {
    const { id } = req.params;
    const auditLogs = await prescriptionModel.getPrescriptionAuditLogs(id);
    return res.json({ success: true, count: auditLogs.length, auditLogs });
  } catch (error) {
    console.error('[PrescriptionController] getPrescriptionAuditTrail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit trail.' });
  }
}

async function getDoctorAnalytics(req, res) {
  try {
    const doctor_id = req.user.id;
    const analytics = await prescriptionModel.getDoctorClinicalAnalytics(doctor_id);
    return res.json({ success: true, analytics });
  } catch (error) {
    console.error('[PrescriptionController] getDoctorAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve doctor analytics.' });
  }
}

async function getPatientCompleteHistory(req, res) {
  try {
    const { uid } = req.params;
    const history = await prescriptionModel.getCompletePatientHistory(uid);
    return res.json({ success: true, count: history.length, history });
  } catch (error) {
    console.error('[PrescriptionController] getPatientCompleteHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve patient complete history.' });
  }
}

module.exports = {
  searchMedicines,
  createPrescription,
  getPrescriptionDetails,
  verifyPrescriptionPublic,
  getPrescriptionAuditTrail,
  getDoctorAnalytics,
  getPatientCompleteHistory
};
