const { query } = require('../config/db');

async function createAppointment({
  patient_uid,
  doctor_id,
  hospital_id,
  requested_date,
  is_emergency = false,
  emergency_reason = null,
  priority_level = 1
}) {
  // If flagged as emergency by patient, ensure priority_level is at least 2
  const effectivePriority = is_emergency && priority_level < 2 ? 2 : priority_level;

  const sql = `
    INSERT INTO appointments (
      patient_uid, doctor_id, hospital_id, requested_date, is_emergency, emergency_reason, priority_level
    )
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  const result = await query(sql, [
    patient_uid,
    doctor_id,
    hospital_id,
    requested_date,
    Boolean(is_emergency),
    emergency_reason,
    effectivePriority
  ]);

  return await getAppointmentById(result.insertId);
}

async function getAppointmentById(appointment_id) {
  const sql = `
    SELECT 
      a.appointment_id,
      a.patient_uid,
      c.name AS patient_name,
      c.phone AS patient_phone,
      c.blood_group AS patient_blood,
      a.doctor_id,
      d.name AS doctor_name,
      d.specialization AS doctor_specialization,
      d.phone AS doctor_phone,
      a.hospital_id,
      h.name AS hospital_name,
      h.area AS hospital_area,
      a.requested_date,
      a.scheduled_time,
      a.serial_no,
      a.status,
      a.is_emergency,
      a.emergency_reason,
      a.priority_level,
      a.applied_at
    FROM appointments a
    JOIN citizens c ON a.patient_uid = c.uid
    JOIN doctors d ON a.doctor_id = d.doctor_id
    JOIN hospitals h ON a.hospital_id = h.hospital_id
    WHERE a.appointment_id = ?
    LIMIT 1;
  `;
  const rows = await query(sql, [appointment_id]);
  return rows[0] || null;
}

async function getAppointments({ patient_uid, doctor_id, status, is_emergency, requested_date } = {}) {
  let sql = `
    SELECT 
      a.appointment_id,
      a.patient_uid,
      COALESCE(c.name, c.full_name) AS patient_name,
      c.phone AS patient_phone,
      c.blood_group AS patient_blood,
      a.doctor_id,
      COALESCE(d.name, d.full_name) AS doctor_name,
      d.specialization AS doctor_specialization,
      d.phone AS doctor_phone,
      a.hospital_id,
      h.name AS hospital_name,
      h.area AS hospital_area,
      a.requested_date,
      a.scheduled_time,
      a.serial_no,
      a.status,
      a.is_emergency,
      a.emergency_reason,
      a.priority_level,
      a.applied_at
    FROM appointments a
    JOIN citizens c ON a.patient_uid = c.uid
    JOIN doctors d ON a.doctor_id = d.doctor_id
    JOIN hospitals h ON a.hospital_id = h.hospital_id
    WHERE 1=1
  `;
  const params = [];

  if (patient_uid) {
    sql += ' AND a.patient_uid = ?';
    params.push(patient_uid);
  }
  if (doctor_id) {
    sql += ' AND a.doctor_id = ?';
    params.push(doctor_id);
  }
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  if (is_emergency !== undefined) {
    sql += ' AND a.is_emergency = ?';
    params.push(is_emergency ? 1 : 0);
  }
  if (requested_date) {
    sql += ' AND a.requested_date = ?';
    params.push(requested_date);
  }

  // Strict FCFS with Emergency Priority:
  // Priority 3 (Doctor-Approved Emergency) -> Priority 2 (Patient Emergency) -> Regular (applied_at / serial_no)
  sql += ' ORDER BY a.priority_level DESC, a.is_emergency DESC, a.requested_date ASC, a.serial_no ASC, a.applied_at ASC';

  return await query(sql, params);
}

async function updateAppointmentStatus(appointment_id, { status, scheduled_time, serial_no, priority_level }) {
  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (scheduled_time !== undefined) {
    updates.push('scheduled_time = ?');
    params.push(scheduled_time);
  }
  if (serial_no !== undefined) {
    updates.push('serial_no = ?');
    params.push(serial_no);
  }
  if (priority_level !== undefined) {
    updates.push('priority_level = ?');
    params.push(priority_level);
  }

  if (updates.length === 0) return null;

  params.push(appointment_id);
  const sql = `UPDATE appointments SET ${updates.join(', ')} WHERE appointment_id = ?`;
  await query(sql, params);

  return await getAppointmentById(appointment_id);
}

module.exports = {
  createAppointment,
  getAppointmentById,
  getAppointments,
  updateAppointmentStatus
};
