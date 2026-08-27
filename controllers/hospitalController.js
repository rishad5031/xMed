const hospitalModel = require('../models/hospitalModel');

async function getHospitals(req, res) {
  try {
    const { area, city, specialization } = req.query;
    const data = await hospitalModel.getHospitals({ area, city, specialization });
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    console.error('[HospitalController] Error fetching hospitals:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving hospitals.' });
  }
}

async function getHospitalById(req, res) {
  try {
    const { id } = req.params;
    const hospital = await hospitalModel.getHospitalById(id);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found.' });
    }
    res.json({ success: true, data: hospital });
  } catch (err) {
    console.error('[HospitalController] Error fetching hospital:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving hospital details.' });
  }
}

async function getHospitalDoctors(req, res) {
  try {
    const { id } = req.params;
    const doctors = await hospitalModel.getDoctorsByHospitalId(id);
    res.json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (err) {
    console.error('[HospitalController] Error fetching hospital doctors:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving doctors for hospital.' });
  }
}

module.exports = {
  getHospitals,
  getHospitalById,
  getHospitalDoctors
};
