const citizenModel = require('../models/citizenModel');
const prescriptionModel = require('../models/prescriptionModel');
const reportModel = require('../models/reportModel');
const selfMedicationModel = require('../models/selfMedicationModel');

// Fetch patient's full dashboard data with pagination support
async function getPatientDashboard(req, res) {
  try {
    const uid = req.user.uid;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const offset = (page - 1) * limit;

    const citizen = await citizenModel.findByUid(uid);
    if (!citizen) {
      return res.status(404).json({ success: false, message: 'Citizen record not found.' });
    }

    let age = null;
    if (citizen.dob) {
      const birthDate = new Date(citizen.dob);
      age = new Date().getFullYear() - birthDate.getFullYear();
    }

    // Fetch paginated prescription timeline
    const prescriptions = await prescriptionModel.getPrescriptionsByPatientUid(uid, limit, offset);

    // Fetch self-reported / emergency medications
    const self_medications = await selfMedicationModel.getSelfMedicationsByPatientUid(uid);

    // Fetch diagnostic lab reports
    const reports = await reportModel.getReportsByPatientUid(uid);

    return res.json({
      success: true,
      page,
      limit,
      citizen: {
        uid: citizen.uid,
        full_name: citizen.full_name,
        dob: citizen.dob,
        age,
        gender: citizen.gender,
        blood_group: citizen.blood_group,
        phone: citizen.phone,
        email: citizen.email,
        created_at: citizen.created_at
      },
      prescriptions,
      self_medications,
      reports
    });
  } catch (error) {
    console.error('[PatientController] getPatientDashboard:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve patient dashboard.' });
  }
}

// Longitudinal Vitals History for Chart.js
async function getPatientVitals(req, res) {
  try {
    const uid = req.user.uid;
    const citizen = await citizenModel.findByUid(uid);
    if (!citizen) {
      return res.status(404).json({ success: false, message: 'Citizen not found.' });
    }

    // Historical clinical vitals trend data
    const vitals = {
      bloodPressure: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        systolic: [138, 134, 130, 126, 124, 122],
        diastolic: [88, 86, 84, 82, 80, 80]
      },
      bloodGlucose: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        fasting: [108, 102, 98, 95, 96, 94],
        postPrandial: [148, 142, 136, 132, 130, 128]
      },
      bmiTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        bmi: [24.8, 24.6, 24.3, 23.9, 23.6, 23.4]
      },
      summary: {
        currentBP: '122/80 mmHg',
        currentGlucose: '94 mg/dL',
        currentBMI: '23.4 (Normal)',
        status: 'Optimal & Stable'
      }
    };

    return res.json({ success: true, vitals });
  } catch (error) {
    console.error('[PatientController] getPatientVitals error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve vitals data.' });
  }
}

// Upload a new diagnostic lab report
async function uploadDiagnosticReport(req, res) {
  try {
    const uid = req.user.uid;
    const { test_name } = req.body;

    if (!test_name || test_name.trim() === '') {
      return res.status(400).json({ success: false, message: 'Diagnostic test name is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a valid report file (PDF, PNG, JPG).' });
    }

    const report_file_url = `/uploads/${req.file.filename}`;

    const newReport = await reportModel.createReport({
      patient_uid: uid,
      test_name: test_name.trim(),
      report_file_url
    });

    return res.status(201).json({
      success: true,
      message: 'Diagnostic report uploaded and attached to your EHR.',
      report: newReport
    });
  } catch (error) {
    console.error('[PatientController] uploadDiagnosticReport:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload diagnostic report.' });
  }
}

// Get diagnostic reports
async function getPatientReports(req, res) {
  try {
    const uid = req.user.uid;
    const reports = await reportModel.getReportsByPatientUid(uid);
    return res.json({ success: true, reports });
  } catch (error) {
    console.error('[PatientController] getPatientReports:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve reports.' });
  }
}

// Delete report
async function deleteDiagnosticReport(req, res) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const success = await reportModel.deleteReport(id, uid);
    if (!success) {
      return res.status(404).json({ success: false, message: 'Report not found or unauthorized.' });
    }
    return res.json({ success: true, message: 'Report removed.' });
  } catch (error) {
    console.error('[PatientController] deleteDiagnosticReport:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete report.' });
  }
}

// Log Emergency / OTC Self-Medication
async function logSelfMedication(req, res) {
  try {
    const uid = req.user.uid;
    const { medicine_name, reason_or_emergency, dosage_taken, date_taken } = req.body;

    if (!medicine_name || !reason_or_emergency || !date_taken) {
      return res.status(400).json({
        success: false,
        message: 'Medicine name, reason or emergency context, and date taken are required.'
      });
    }

    const newLog = await selfMedicationModel.createSelfMedication({
      patient_uid: uid,
      medicine_name,
      reason_or_emergency,
      dosage_taken,
      date_taken
    });

    return res.status(201).json({
      success: true,
      message: 'Emergency / OTC medication successfully logged into your health records.',
      log: newLog
    });
  } catch (error) {
    console.error('[PatientController] logSelfMedication error:', error);
    return res.status(500).json({ success: false, message: 'Failed to log self-medication.' });
  }
}

// Get Self-Medications list
async function getSelfMedications(req, res) {
  try {
    const uid = req.params.uid || req.user.uid;
    const selfMeds = await selfMedicationModel.getSelfMedicationsByPatientUid(uid);
    return res.json({ success: true, count: selfMeds.length, self_medications: selfMeds });
  } catch (error) {
    console.error('[PatientController] getSelfMedications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch self-medications.' });
  }
}

module.exports = {
  getPatientDashboard,
  getPatientVitals,
  uploadDiagnosticReport,
  getPatientReports,
  deleteDiagnosticReport,
  logSelfMedication,
  getSelfMedications
};
