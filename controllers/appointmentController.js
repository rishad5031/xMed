const appointmentModel = require('../models/appointmentModel');

async function createAppointment(req, res) {
  try {
    const { doctor_id, hospital_id, requested_date, is_emergency, emergency_reason } = req.body;
    const patient_uid = req.user.role === 'patient' ? req.user.uid : req.body.patient_uid;

    if (!patient_uid || !doctor_id || !hospital_id || !requested_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required appointment fields: patient_uid, doctor_id, hospital_id, and requested_date are mandatory.'
      });
    }

    const appointment = await appointmentModel.createAppointment({
      patient_uid,
      doctor_id,
      hospital_id,
      requested_date,
      is_emergency,
      emergency_reason,
      priority_level: is_emergency ? 2 : 1
    });

    res.status(201).json({
      success: true,
      message: is_emergency 
        ? 'Emergency appointment request submitted with elevated Priority Level 2.' 
        : 'Appointment request submitted successfully in FCFS queue.',
      data: appointment
    });
  } catch (err) {
    console.error('[AppointmentController] Error creating appointment:', err.message);
    res.status(500).json({ success: false, message: 'Server error booking appointment.' });
  }
}

async function getAppointments(req, res) {
  try {
    const filter = { ...req.query };

    // Role-based restrictions
    if (req.user && req.user.role === 'patient') {
      filter.patient_uid = req.user.uid;
    } else if (req.user && req.user.role === 'doctor') {
      filter.doctor_id = req.user.doctor_id;
    }

    const data = await appointmentModel.getAppointments(filter);
    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    console.error('[AppointmentController] Error fetching appointments:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving appointments.' });
  }
}

async function getAppointmentById(req, res) {
  try {
    const { id } = req.params;
    const data = await appointmentModel.getAppointmentById(id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Appointment record not found.' });
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('[AppointmentController] Error fetching appointment:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving appointment.' });
  }
}

async function updateAppointmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, scheduled_time, serial_no, priority_level } = req.body;

    const updated = await appointmentModel.updateAppointmentStatus(id, {
      status,
      scheduled_time,
      serial_no,
      priority_level
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Appointment not found or no changes made.' });
    }

    res.json({
      success: true,
      message: `Appointment status updated to ${updated.status}.`,
      data: updated
    });
  } catch (err) {
    console.error('[AppointmentController] Error updating appointment:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating appointment status.' });
  }
}

module.exports = {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus
};
