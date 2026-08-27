const { query } = require('../config/db');

async function getHospitals({ area, city, specialization } = {}) {
  let sql = `
    SELECT 
      h.hospital_id,
      h.name AS hospital_name,
      h.area,
      h.city,
      h.address,
      h.contact_number,
      d.doctor_id,
      d.uid AS doctor_uid,
      COALESCE(d.name, d.full_name) AS doctor_name,
      d.email AS doctor_email,
      d.phone AS doctor_phone,
      COALESCE(d.license_number, d.license_no) AS license_number,
      d.specialization,
      d.consultation_fee,
      d.working_days,
      d.shift_start,
      d.shift_end,
      d.max_daily_slots,
      d.biography
    FROM hospitals h
    LEFT JOIN doctors d ON h.hospital_id = d.hospital_id
    WHERE 1=1
  `;
  const params = [];

  if (area && area.trim()) {
    sql += ' AND LOWER(h.area) = LOWER(?)';
    params.push(area.trim());
  }

  if (city && city.trim()) {
    sql += ' AND LOWER(h.city) = LOWER(?)';
    params.push(city.trim());
  }

  if (specialization && specialization.trim()) {
    sql += ' AND LOWER(d.specialization) LIKE LOWER(?)';
    params.push(`%${specialization.trim()}%`);
  }

  sql += ' ORDER BY h.hospital_id ASC, d.doctor_id ASC';

  const rows = await query(sql, params);

  // Group doctors under each hospital
  const hospitalMap = new Map();

  for (const row of rows) {
    if (!hospitalMap.has(row.hospital_id)) {
      hospitalMap.set(row.hospital_id, {
        hospital_id: row.hospital_id,
        name: row.hospital_name,
        area: row.area,
        city: row.city,
        address: row.address,
        contact_number: row.contact_number,
        doctors: []
      });
    }

    if (row.doctor_id) {
      hospitalMap.get(row.hospital_id).doctors.push({
        doctor_id: row.doctor_id,
        uid: row.doctor_uid,
        name: row.doctor_name,
        email: row.doctor_email,
        phone: row.doctor_phone,
        license_number: row.license_number,
        specialization: row.specialization,
        consultation_fee: row.consultation_fee,
        working_days: row.working_days,
        shift_start: row.shift_start,
        shift_end: row.shift_end,
        max_daily_slots: row.max_daily_slots,
        biography: row.biography
      });
    }
  }

  return Array.from(hospitalMap.values());
}

async function getHospitalById(hospital_id) {
  const idNum = parseInt(hospital_id, 10);
  const sql = `
    SELECT 
      h.hospital_id,
      h.name AS hospital_name,
      h.area,
      h.city,
      h.address,
      h.contact_number,
      d.doctor_id,
      d.uid AS doctor_uid,
      COALESCE(d.name, d.full_name) AS doctor_name,
      d.email AS doctor_email,
      d.phone AS doctor_phone,
      COALESCE(d.license_number, d.license_no) AS license_number,
      d.specialization,
      d.consultation_fee,
      d.working_days,
      d.shift_start,
      d.shift_end,
      d.max_daily_slots,
      d.biography
    FROM hospitals h
    LEFT JOIN doctors d ON h.hospital_id = d.hospital_id
    WHERE h.hospital_id = ?
    ORDER BY d.doctor_id ASC
  `;
  const rows = await query(sql, [idNum]);
  if (!rows || rows.length === 0) return null;

  const hospital = {
    hospital_id: rows[0].hospital_id,
    name: rows[0].hospital_name,
    area: rows[0].area,
    city: rows[0].city,
    address: rows[0].address,
    contact_number: rows[0].contact_number,
    doctors: []
  };

  for (const row of rows) {
    if (row.doctor_id) {
      hospital.doctors.push({
        doctor_id: row.doctor_id,
        uid: row.doctor_uid,
        name: row.doctor_name,
        email: row.doctor_email,
        phone: row.doctor_phone,
        license_number: row.license_number,
        specialization: row.specialization,
        consultation_fee: row.consultation_fee,
        working_days: row.working_days,
        shift_start: row.shift_start,
        shift_end: row.shift_end,
        max_daily_slots: row.max_daily_slots,
        biography: row.biography
      });
    }
  }

  return hospital;
}

module.exports = {
  getHospitals,
  getHospitalById
};
