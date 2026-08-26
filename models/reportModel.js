const { query } = require('../config/db');

async function createReport({ patient_uid, test_name, report_file_url }) {
  const sql = `
    INSERT INTO diagnostic_reports (patient_uid, test_name, report_file_url)
    VALUES (?, ?, ?)
  `;
  const result = await query(sql, [patient_uid, test_name, report_file_url]);
  return await findById(result.insertId);
}

async function findById(report_id) {
  const sql = 'SELECT * FROM diagnostic_reports WHERE report_id = ? LIMIT 1';
  const rows = await query(sql, [report_id]);
  return rows[0] || null;
}

async function getReportsByPatientUid(patient_uid) {
  const sql = `
    SELECT report_id, patient_uid, test_name, report_file_url, uploaded_at
    FROM diagnostic_reports
    WHERE patient_uid = ?
    ORDER BY uploaded_at DESC
  `;
  return await query(sql, [patient_uid]);
}

async function deleteReport(report_id, patient_uid) {
  const sql = 'DELETE FROM diagnostic_reports WHERE report_id = ? AND patient_uid = ?';
  const result = await query(sql, [report_id, patient_uid]);
  return result.affectedRows > 0;
}

module.exports = {
  createReport,
  findById,
  getReportsByPatientUid,
  deleteReport
};
