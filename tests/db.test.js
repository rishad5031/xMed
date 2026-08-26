const { getPool, query } = require('../config/db');

describe('Database & Schema Integrity Suite', () => {
  afterAll(async () => {
    const pool = getPool();
    await pool.end();
  });

  test('MySQL Connection Pool Readiness', async () => {
    const rows = await query('SELECT 1 + 1 AS result;');
    expect(rows).toBeDefined();
    expect(rows[0].result).toBe(2);
  });

  test('Verify Table Row Counts (100 Citizens, 20 Doctors, 500+ Prescriptions)', async () => {
    const [citizens] = await query('SELECT COUNT(*) AS count FROM citizens WHERE uid LIKE "BD-2000-%";');
    expect(citizens.count).toBe(100);

    const [doctors] = await query('SELECT COUNT(*) AS count FROM doctors WHERE license_no LIKE "BMDC-100%";');
    expect(doctors.count).toBe(20);

    const [prescriptions] = await query('SELECT COUNT(*) AS count FROM prescriptions;');
    expect(prescriptions.count).toBeGreaterThanOrEqual(500);

    const [selfMeds] = await query('SELECT COUNT(*) AS count FROM patient_self_medications;');
    expect(selfMeds.count).toBeGreaterThan(0);
  });

  test('Domain CHECK Constraint / Trigger Violation (Future DOB Assertion)', async () => {
    const futureDate = '2099-12-31';
    let errorThrown = null;

    try {
      await query(`
        INSERT INTO citizens (uid, full_name, dob, gender, blood_group, phone, email, password_hash)
        VALUES ('BD-TEST-FAIL', 'Future Citizen', ?, 'Male', 'O+', '01700000000', 'future@test.com', 'hash');
      `, [futureDate]);
    } catch (err) {
      errorThrown = err;
    }

    expect(errorThrown).not.toBeNull();
    // Verify cleanup just in case
    await query('DELETE FROM citizens WHERE uid = "BD-TEST-FAIL";');
  });

  test('Trigger Execution (trg_update_medicine_usage increments total_prescribed_count)', async () => {
    // 1. Select sample medicine and patient/doctor
    const [medBefore] = await query('SELECT medicine_id, total_prescribed_count FROM medicines LIMIT 1;');
    const initialCount = medBefore.total_prescribed_count || 0;

    const [citizen] = await query('SELECT uid FROM citizens LIMIT 1;');
    const [doctor] = await query('SELECT doctor_id FROM doctors LIMIT 1;');

    // 2. Insert test prescription
    const rxRes = await query(`
      INSERT INTO prescriptions (patient_uid, doctor_id, diagnosis, clinical_notes)
      VALUES (?, ?, 'Jest Trigger Test', 'Temporary');
    `, [citizen.uid, doctor.doctor_id]);
    const prescriptionId = rxRes.insertId;

    // 3. Insert prescription item (Fires AFTER INSERT trigger)
    const itemRes = await query(`
      INSERT INTO prescription_items (prescription_id, medicine_id, dosage_instruction, duration)
      VALUES (?, ?, '1 tablet daily', '3 days');
    `, [prescriptionId, medBefore.medicine_id]);

    // 4. Assert total_prescribed_count incremented by 1
    const [medAfter] = await query('SELECT total_prescribed_count FROM medicines WHERE medicine_id = ?;', [medBefore.medicine_id]);
    expect(medAfter.total_prescribed_count).toBe(initialCount + 1);

    // 5. Cleanup test prescription (cascades items)
    await query('DELETE FROM prescriptions WHERE prescription_id = ?;', [prescriptionId]);
    // Reset counter to original
    await query('UPDATE medicines SET total_prescribed_count = ? WHERE medicine_id = ?;', [initialCount, medBefore.medicine_id]);
  });
});
