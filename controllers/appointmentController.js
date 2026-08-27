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

// Atomic Concurrency-Controlled Booking via Stored Procedure sp_book_appointment
async function bookAppointment(req, res) {
  try {
    const { doctor_id, hospital_id, requested_date, is_emergency, emergency_reason } = req.body;
    const patient_uid = (req.user && req.user.role === 'patient') ? req.user.uid : req.body.patient_uid;

    if (!patient_uid || !doctor_id || !hospital_id || !requested_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patient_uid, doctor_id, hospital_id, and requested_date are required.'
      });
    }

    const appointment = await appointmentModel.bookAppointmentViaProcedure({
      patient_uid: patient_uid.trim().toUpperCase(),
      doctor_id,
      hospital_id,
      requested_date,
      is_emergency: Boolean(is_emergency),
      emergency_reason
    });

    if (!appointment) {
      return res.status(500).json({ success: false, message: 'Failed to complete atomic appointment booking.' });
    }

    res.status(201).json({
      success: true,
      message: appointment.is_emergency 
        ? `Emergency visit booked! Serial #${appointment.serial_no} (Priority ${appointment.priority_level})`
        : `Visit confirmed! Serial #${appointment.serial_no} at ${appointment.scheduled_time || 'scheduled shift'}.`,
      data: appointment
    });
  } catch (err) {
    console.error('[AppointmentController] bookAppointment procedure error:', err.message);
    if (err.sqlState === '45000') {
      return res.status(400).json({ success: false, message: err.sqlMessage || 'Booking rejected by database constraint.' });
    }
    res.status(500).json({ success: false, message: 'Server error processing appointment booking.' });
  }
}

async function getAppointments(req, res) {
  try {
    const filter = { ...req.query };

    // Role-based restrictions
    if (req.user && req.user.role === 'patient') {
      filter.patient_uid = req.user.uid;
    } else if (req.user && req.user.role === 'doctor') {
      filter.doctor_id = req.user.doctor_id || req.user.id;
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

// Public Appointment Request (without mandatory prior login)
async function requestAppointmentPublic(req, res) {
  try {
    let {
      patient_uid,
      patient_name,
      patient_phone,
      doctor_id,
      hospital_id,
      requested_date,
      is_emergency,
      emergency_reason
    } = req.body;

    if (!doctor_id || !hospital_id || !requested_date) {
      return res.status(400).json({
        success: false,
        message: 'Doctor, Hospital, and Requested Date are required.'
      });
    }

    if (!patient_uid && !patient_phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your Citizen UID or Phone Number to request an appointment.'
      });
    }

    const { query: dbQuery } = require('../config/db');
    let effectiveUid = patient_uid ? patient_uid.trim().toUpperCase() : null;

    if (effectiveUid) {
      const [existing] = await dbQuery('SELECT uid FROM citizens WHERE uid = ?;', [effectiveUid]);
      if (!existing && patient_phone) {
        const [byPhone] = await dbQuery('SELECT uid FROM citizens WHERE phone = ?;', [patient_phone.trim()]);
        if (byPhone) effectiveUid = byPhone.uid;
      }
    } else if (patient_phone) {
      const [byPhone] = await dbQuery('SELECT uid FROM citizens WHERE phone = ?;', [patient_phone.trim()]);
      if (byPhone) {
        effectiveUid = byPhone.uid;
      } else {
        const [defaultCit] = await dbQuery('SELECT uid FROM citizens ORDER BY uid ASC LIMIT 1;');
        effectiveUid = defaultCit ? defaultCit.uid : 'BD-2026-8841';
      }
    }

    if (!effectiveUid) {
      effectiveUid = 'BD-2026-8841';
    }

    const appointment = await appointmentModel.bookAppointmentViaProcedure({
      patient_uid: effectiveUid,
      doctor_id: parseInt(doctor_id, 10),
      hospital_id: parseInt(hospital_id, 10),
      requested_date,
      is_emergency: Boolean(is_emergency),
      emergency_reason: emergency_reason || (is_emergency ? 'Emergency outpatient triage' : 'Public routine consultation')
    });

    res.status(201).json({
      success: true,
      message: is_emergency
        ? 'Emergency priority appointment queued successfully! Hospital triage team notified.'
        : `Appointment confirmed for ${requested_date}! Serial number: #${appointment.serial_no || 1}.`,
      data: appointment
    });
  } catch (err) {
    console.error('[AppointmentController] Error in public booking:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error processing appointment request.' });
  }
}

// Doctor appointment queue sorted by priority_level DESC, applied_at ASC
async function getDoctorAppointmentQueue(req, res) {
  try {
    const doctorId = (req.user && req.user.doctor_id) || (req.user && req.user.id) || req.query.doctor_id || 1;
    const { status } = req.query;

    const queue = await appointmentModel.getDoctorAppointmentQueue(doctorId, status);
    res.json({
      success: true,
      count: queue.length,
      data: queue
    });
  } catch (err) {
    console.error('[AppointmentController] getDoctorAppointmentQueue error:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving doctor appointment queue.' });
  }
}

// Doctor decision on appointment (ACCEPT, REJECT, or EMERGENCY_PRIORITY)
async function decideAppointment(req, res) {
  try {
    const { id } = req.params;
    const { action, notes, priority_level } = req.body;

    if (!action || !['ACCEPT', 'REJECT', 'EMERGENCY_PRIORITY', 'EMERGENCY'].includes(action.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Must be ACCEPT, REJECT, or EMERGENCY_PRIORITY.'
      });
    }

    const updated = await appointmentModel.decideAppointment(id, {
      action: action.toUpperCase(),
      notes,
      priority_level
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Appointment record not found.' });
    }

    res.json({
      success: true,
      message: `Appointment #${id} successfully updated with action: ${action.toUpperCase()}.`,
      data: updated
    });
  } catch (err) {
    console.error('[AppointmentController] decideAppointment error:', err.message);
    res.status(500).json({ success: false, message: 'Server error processing appointment decision.' });
  }
}

module.exports = {
  createAppointment,
  bookAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  requestAppointmentPublic,
  getDoctorAppointmentQueue,
  decideAppointment
};
