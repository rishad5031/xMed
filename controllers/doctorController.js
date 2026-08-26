const citizenModel = require('../models/citizenModel');
const prescriptionModel = require('../models/prescriptionModel');
const reportModel = require('../models/reportModel');
const doctorModel = require('../models/doctorModel');

// Search patient by UID and return complete medical dossier
async function searchPatientByUid(req, res) {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ success: false, message: 'Patient UID is required.' });
    }

    const cleanUid = uid.trim().toUpperCase();
    const patient = await citizenModel.findByUid(cleanUid);

    if (!patient) {
      return res.status(404).json({ success: false, message: `No citizen found with UID "${cleanUid}".` });
    }

    let age = null;
    if (patient.dob) {
      const birthDate = new Date(patient.dob);
      age = new Date().getFullYear() - birthDate.getFullYear();
    }

    const prescriptions = await prescriptionModel.getPrescriptionsByPatientUid(cleanUid, 50, 0);
    const reports = await reportModel.getReportsByPatientUid(cleanUid);

    return res.json({
      success: true,
      patient: {
        uid: patient.uid,
        full_name: patient.full_name,
        dob: patient.dob,
        age,
        gender: patient.gender,
        blood_group: patient.blood_group,
        phone: patient.phone,
        email: patient.email,
        created_at: patient.created_at
      },
      prescriptions,
      reports
    });
  } catch (error) {
    console.error('[DoctorController] searchPatientByUid:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving patient profile.' });
  }
}

// Get doctor analytics for Chart.js
async function getDoctorAnalytics(req, res) {
  try {
    const doctorId = req.user.id;
    const analytics = await doctorModel.getDoctorAnalytics(doctorId);
    return res.json({ success: true, analytics });
  } catch (error) {
    console.error('[DoctorController] getDoctorAnalytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch doctor analytics.' });
  }
}

module.exports = {
  searchPatientByUid,
  getDoctorAnalytics
};
