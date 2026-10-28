const { query, getConnection } = require('../config/db');

/**
 * Controller: getFrequentPatients
 * HTTP Method: GET
 * Route: /api/analytics/frequent-patients
 * Access: Public / Clinical Analytics
 * 
 * Line-by-Line Breakdown:
 * 1. Defines asynchronous route handler accepting standard Express (req, res) objects.
 * 2. Wraps execution in try-catch to intercept database connectivity or syntax errors.
 * 3. Constructs raw SQL query combining GROUP BY, COUNT() aggregation, and a nested AVG() subquery.
 * 4. FROM citizens c JOIN prescriptions p ON c.uid = p.patient_uid matches citizen records with their prescriptions.
 * 5. GROUP BY collapses multiple prescription rows per citizen down to unique patient entity tuples.
 * 6. HAVING clause filters grouped rows after aggregation, retaining only those whose consultation
 *    count is strictly greater than the scalar average returned by the inner subquery.
 * 7. Inner subquery computes the overall mean consultations per patient across the entire hospital system.
 * 8. ORDER BY consultation_count DESC sorts the most frequent hospital visitors to the top.
 * 9. Awaits pool query execution and returns structured JSON payload with academic DBMS metadata.
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
 * Controller: getHighUsageMedicines
 * HTTP Method: GET
 * Route: /api/analytics/high-usage-medicines
 * Access: Public / Clinical Analytics
 * 
 * Line-by-Line Breakdown:
 * 1. Defines asynchronous route handler for pharmaceutical drug usage analytics.
 * 2. Constructs SQL query joining the catalog table 'medicines' with 'prescription_items'.
 * 3. Aggregates with COUNT(pi.item_id) to calculate total prescription instances per medicine.
 * 4. Applies HAVING filter using a nested subquery that derives the benchmark average:
 *    (SELECT AVG(drug_usage) FROM (SELECT COUNT(item_id) AS drug_usage FROM prescription_items GROUP BY medicine_id) AS sub)
 * 5. Orders output descending so high-demand pharmaceuticals appear first.
 * 6. Returns JSON dataset with metadata for academic laboratory reporting.
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
 * Controller: getPrescriptionsInnerJoin
 * HTTP Method: GET
 * Route: /api/analytics/prescriptions-joined
 * Access: Public / Clinical Analytics
 * 
 * Line-by-Line Breakdown:
 * 1. Defines asynchronous route handler for multi-table relational join inspection.
 * 2. Selects diagnostic observations, patient identity, and doctor credentials across 3 tables.
 * 3. INNER JOIN citizens ensures only prescriptions with valid registered patients are returned.
 * 4. INNER JOIN doctors ensures only prescriptions authored by verified clinicians are returned.
 * 5. Orders chronologically descending by creation timestamp and caps result set with LIMIT 25.
 * 6. Returns structured JSON containing combined relational attributes.
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
 * Controller: getCitizensReportsLeftJoin
 * HTTP Method: GET
 * Route: /api/analytics/citizens-reports-left-join
 * Access: Public / Clinical Analytics
 * 
 * Line-by-Line Breakdown:
 * 1. Defines asynchronous route handler for LEFT OUTER JOIN inspection.
 * 2. Selects master citizen demographic fields alongside diagnostic test results.
 * 3. LEFT JOIN diagnostic_reports guarantees every citizen is returned at least once;
 *    citizens without reports receive NULL in report_id, test_name, and report_file_url.
 * 4. Orders by citizen UID ascending and report upload timestamp descending.
 * 5. Returns complete relational dataset showing both matching and non-matching rows.
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
 * Controller: getPatientHistoryFromView
 * HTTP Method: GET
 * Route: /api/analytics/complete-patient-history/:uid
 * Access: Authenticated / Clinical Analytics
 * 
 * Line-by-Line Breakdown:
 * 1. Extracts target patient citizen UID from Express route parameter req.params.
 * 2. Constructs SQL SELECT directly from the database view 'vw_complete_patient_history'.
 * 3. Parameterizes target patient UID using '?' placeholder to strictly prevent SQL injection.
 * 4. Orders patient consultation history in reverse chronological sequence (newest first).
 * 5. Returns parsed history tuples retrieved seamlessly through the database abstraction view.
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
 * Controller: updatePatientProfile
 * HTTP Method: PUT
 * Route: /api/patient/profile
 * Access: Authenticated Citizen (req.user)
 * 
 * Line-by-Line Breakdown:
 * 1. Obtains authenticated citizen UID from verified JWT payload (req.user.uid).
 * 2. Extracts updated phone number and email address from incoming JSON request body.
 * 3. Validates that both required contact fields are present before issuing database write.
 * 4. Constructs raw SQL UPDATE query targeting the 'citizens' relational table.
 * 5. Parameterizes [phone.trim(), email.trim(), uid] in prepared statement to thwart SQL injection.
 * 6. Executes DML operation on database connection pool.
 * 7. Returns HTTP 200 confirmation acknowledging successful profile modification.
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
 * Controller: getPatientUnifiedHistory
 * HTTP Method: GET
 * Route: /api/patients/:uid/history
 * Access: Authenticated Doctor / Patient
 * 
 * Line-by-Line Breakdown:
 * 1. Extracts patient UID parameter from request URL.
 * 2. Step 1: Queries official doctor prescriptions joined with doctor metadata for the patient.
 * 3. Step 2: Iterates through each prescription to query child 'prescription_items' joined with 'medicines' catalog.
 * 4. Step 3: Queries self-reported over-the-counter (OTC) medications logged by the citizen.
 * 5. Step 4: Normalizes and merges both clinical consultation and self-medication records into a single unified array.
 * 6. Sorts combined health timeline in descending chronological order (newest health event first).
 * 7. Returns consolidated medical history JSON with summary statistics.
 */
async function getPatientUnifiedHistory(req, res) {
  try {

    const { uid } = req.params;

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
