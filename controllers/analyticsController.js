const { query, getConnection } = require('../config/db');

// =============================================================
// ACADEMIC DBMS LAB EVALUATION CONTROLLER
// Direct execution of raw parameterized SQL queries (No ORMs)
// =============================================================

/**
 * Requirement 2: Aggregation with GROUP BY and HAVING
 * Endpoint: GET /api/analytics/frequent-patients
 * Description: Finds all patients who have received more than the average
 * consultation frequency across the entire hospital system.
 */
async function getFrequentPatients(req, res) {
  try {
    const sql = `
      SELECT 
        c.uid AS patient_uid,
        c.full_name,
        c.dob,
        c.blood_group,
        c.phone,
        COUNT(p.prescription_id) AS total_visits,
        COUNT(p.prescription_id) AS consultation_count
      FROM citizens c
      JOIN prescriptions p ON c.uid = p.patient_uid
      GROUP BY c.uid, c.full_name, c.dob, c.blood_group, c.phone
      HAVING COUNT(p.prescription_id) > (
        SELECT AVG(patient_presc_count) FROM (
          SELECT COUNT(prescription_id) AS patient_presc_count 
          FROM prescriptions 
          GROUP BY patient_uid
        ) AS hospital_avg_table
      )
      ORDER BY consultation_count DESC;
    `;

    const results = await query(sql);
    return res.json({
      success: true,
      dbms_technique: 'Aggregation with GROUP BY and HAVING comparing against AVG() nested subquery',
      count: results.length,
      frequent_patients: results
    });
  } catch (error) {
    console.error('[AnalyticsController] getFrequentPatients error:', error);
    return res.status(500).json({ success: false, message: 'Database error in frequent-patients aggregation.' });
  }
}

/**
 * Requirement 4: Correlated / Nested Subquery
 * Endpoint: GET /api/analytics/high-usage-medicines
 * Description: Finds medicines prescribed more frequently than the overall average
 * drug prescription count using a nested subquery.
 */
async function getHighUsageMedicines(req, res) {
  try {
    const sql = `
      SELECT 
        m.medicine_id,
        m.brand_name,
        m.generic_name,
        m.dosage_form,
        m.category,
        m.origin,
        COUNT(pi.item_id) AS times_prescribed
      FROM medicines m
      JOIN prescription_items pi ON m.medicine_id = pi.medicine_id
      GROUP BY m.medicine_id, m.brand_name, m.generic_name, m.dosage_form, m.category, m.origin
      HAVING COUNT(pi.item_id) > (
        SELECT AVG(drug_usage) FROM (
          SELECT COUNT(item_id) AS drug_usage 
          FROM prescription_items 
          GROUP BY medicine_id
        ) AS drug_avg_subquery
      )
      ORDER BY times_prescribed DESC;
    `;

    const results = await query(sql);
    return res.json({
      success: true,
      dbms_technique: 'Nested Subquery with GROUP BY and HAVING filter',
      count: results.length,
      high_usage_medicines: results
    });
  } catch (error) {
    console.error('[AnalyticsController] getHighUsageMedicines error:', error);
    return res.status(500).json({ success: false, message: 'Database error in high-usage-medicines subquery.' });
  }
}

/**
 * Requirement 3A: Multi-Table INNER JOIN
 * Endpoint: GET /api/analytics/prescriptions-joined
 * Description: Retrieves medical records joining prescriptions, citizens, and doctors.
 */
async function getPrescriptionsInnerJoin(req, res) {
  try {
    const sql = `
      SELECT 
        p.prescription_id,
        p.created_at AS prescription_date,
        p.diagnosis,
        p.clinical_notes,
        c.uid AS patient_uid,
        c.full_name AS patient_name,
        c.blood_group,
        d.doctor_id,
        d.full_name AS doctor_name,
        d.specialization AS doctor_specialization,
        d.license_no AS doctor_license
      FROM prescriptions p
      INNER JOIN citizens c ON p.patient_uid = c.uid
      INNER JOIN doctors d ON p.doctor_id = d.doctor_id
      ORDER BY p.created_at DESC
      LIMIT 25;
    `;

    const results = await query(sql);
    return res.json({
      success: true,
      dbms_technique: 'Multi-Table INNER JOIN (prescriptions ⋈ citizens ⋈ doctors)',
      count: results.length,
      prescriptions: results
    });
  } catch (error) {
    console.error('[AnalyticsController] getPrescriptionsInnerJoin error:', error);
    return res.status(500).json({ success: false, message: 'Database error in INNER JOIN execution.' });
  }
}

/**
 * Requirement 3B: Outer LEFT JOIN
 * Endpoint: GET /api/analytics/citizens-reports-left-join
 * Description: Lists all citizens joined with diagnostic reports, including citizens
 * who have zero uploaded reports.
 */
async function getCitizensReportsLeftJoin(req, res) {
  try {
    const sql = `
      SELECT 
        c.uid AS patient_uid,
        c.full_name AS patient_name,
        c.gender,
        c.blood_group,
        c.phone,
        r.report_id,
        r.test_name,
        r.report_file_url,
        r.uploaded_at
      FROM citizens c
      LEFT JOIN diagnostic_reports r ON c.uid = r.patient_uid
      ORDER BY c.uid ASC, r.uploaded_at DESC;
    `;

    const results = await query(sql);
    return res.json({
      success: true,
      dbms_technique: 'LEFT OUTER JOIN (citizens ⟕ diagnostic_reports)',
      count: results.length,
      records: results
    });
  } catch (error) {
    console.error('[AnalyticsController] getCitizensReportsLeftJoin error:', error);
    return res.status(500).json({ success: false, message: 'Database error in LEFT JOIN execution.' });
  }
}

/**
 * Requirement 5: Reusable Database View
 * Endpoint: GET /api/analytics/complete-patient-history/:uid
 * Description: Queries the virtual view vw_complete_patient_history.
 */
async function getPatientHistoryFromView(req, res) {
  try {
    const { uid } = req.params;
    const sql = `
      SELECT * 
      FROM vw_complete_patient_history 
      WHERE patient_uid = ? 
      ORDER BY prescription_date DESC;
    `;

    const results = await query(sql, [uid]);
    return res.json({
      success: true,
      dbms_technique: 'Database Virtual VIEW query on vw_complete_patient_history',
      patient_uid: uid,
      count: results.length,
      history: results
    });
  } catch (error) {
    console.error('[AnalyticsController] getPatientHistoryFromView error:', error);
    return res.status(500).json({ success: false, message: 'Database error querying virtual view.' });
  }
}

/**
 * Requirement 1: DML UPDATE Operation
 * Endpoint: PUT /api/patient/profile
 * Description: Updates citizen contact information using raw parameterized SQL.
 */
async function updatePatientProfile(req, res) {
  try {
    const uid = req.user.uid;
    const { phone, email } = req.body;

    if (!phone || !email) {
      return res.status(400).json({ success: false, message: 'Phone and email are required for update.' });
    }

    const sql = `
      UPDATE citizens 
      SET phone = ?, email = ? 
      WHERE uid = ?;
    `;

    await query(sql, [phone.trim(), email.trim(), uid]);

    return res.json({
      success: true,
      message: 'Citizen profile updated successfully via raw parameterized SQL UPDATE.',
      updated_uid: uid
    });
  } catch (error) {
    console.error('[AnalyticsController] updatePatientProfile error:', error);
    return res.status(500).json({ success: false, message: 'Database update failed: ' + error.message });
  }
}

/**
 * Unified Patient Longitudinal History
 * Endpoint: GET /api/patients/:uid/history
 * Joins prescriptions, prescription_items, and patient_self_medications into a single chronological array.
 */
async function getPatientUnifiedHistory(req, res) {
  try {
    const { uid } = req.params;

    // 1. Fetch prescriptions with doctor details
    const rxSql = `
      SELECT 
        p.prescription_id,
        p.created_at AS event_date,
        'OFFICIAL_CONSULTATION' AS record_type,
        p.diagnosis,
        p.clinical_notes,
        d.full_name AS doctor_name,
        d.specialization AS doctor_specialization,
        d.license_no AS doctor_license
      FROM prescriptions p
      JOIN doctors d ON p.doctor_id = d.doctor_id
      WHERE p.patient_uid = ?
      ORDER BY p.created_at DESC;
    `;
    const prescriptions = await query(rxSql, [uid]);

    // 2. Fetch items for each prescription
    for (const rx of prescriptions) {
      const itemsSql = `
        SELECT 
          pi.item_id,
          pi.dosage_instruction,
          pi.duration,
          m.brand_name,
          m.generic_name,
          m.dosage_form,
          m.strength,
          m.category
        FROM prescription_items pi
        JOIN medicines m ON pi.medicine_id = m.medicine_id
        WHERE pi.prescription_id = ?
        ORDER BY pi.item_id ASC;
      `;
      rx.items = await query(itemsSql, [rx.prescription_id]);
    }

    // 3. Fetch self-reported / emergency medications
    const selfSql = `
      SELECT 
        log_id,
        date_taken AS event_date,
        'SELF_MEDICATION_OTC' AS record_type,
        medicine_name,
        dosage_taken,
        reason_or_emergency,
        created_at
      FROM patient_self_medications
      WHERE patient_uid = ?
      ORDER BY date_taken DESC, created_at DESC;
    `;
    const selfMeds = await query(selfSql, [uid]);

    // 4. Combine into a single unified chronological array
    const unifiedHistory = [
      ...prescriptions.map(p => ({
        type: 'prescription',
        date: p.event_date,
        ...p
      })),
      ...selfMeds.map(sm => ({
        type: 'self_medication',
        date: sm.event_date,
        ...sm
      }))
    ];

    unifiedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      patient_uid: uid,
      total_records: unifiedHistory.length,
      consultations_count: prescriptions.length,
      self_medications_count: selfMeds.length,
      history: unifiedHistory
    });
  } catch (error) {
    console.error('[AnalyticsController] getPatientUnifiedHistory error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve unified patient history.' });
  }
}

module.exports = {
  getFrequentPatients,
  getHighUsageMedicines,
  getPrescriptionsInnerJoin,
  getCitizensReportsLeftJoin,
  getPatientHistoryFromView,
  updatePatientProfile,
  getPatientUnifiedHistory
};
