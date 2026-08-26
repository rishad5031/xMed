const request = require('supertest');
const app = require('../server');
const { getPool, query } = require('../config/db');

describe('Backend Endpoint & Security Validation Suite', () => {
  let doctorToken = '';
  let citizenToken = '';

  afterAll(async () => {
    const pool = getPool();
    await pool.end();
  });

  // 1. Authentication Tests
  describe('Authentication Endpoints', () => {
    test('Citizen Login: Valid credentials should return HTTP 200 and JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login-citizen')
        .send({ identifier: 'BD-2000-0001', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.uid).toBe('BD-2000-0001');
      citizenToken = res.body.token;
    });

    test('Citizen Login: Invalid password should return HTTP 401', async () => {
      const res = await request(app)
        .post('/api/auth/login-citizen')
        .send({ identifier: 'BD-2000-0001', password: 'WrongPassword!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('Doctor Login: Valid credentials should return HTTP 200 and JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login-doctor')
        .send({ identifier: 'dr.tanvir@xmed.gov.bd', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('doctor');
      doctorToken = res.body.token;
    });

    test('Doctor Login: Invalid identifier should return HTTP 401', async () => {
      const res = await request(app)
        .post('/api/auth/login-doctor')
        .send({ identifier: 'nonexistent.doctor@xmed.gov.bd', password: 'Password123!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // 2. Advanced Analytics Endpoints
  describe('DBMS Analytics Endpoints', () => {
    test('GET /api/analytics/frequent-patients: Assert HTTP 200 and verify payload structure', async () => {
      const res = await request(app).get('/api/analytics/frequent-patients');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.frequent_patients)).toBe(true);
      expect(res.body.frequent_patients.length).toBeGreaterThan(0);

      const firstPatient = res.body.frequent_patients[0];
      expect(firstPatient).toHaveProperty('patient_uid');
      expect(firstPatient).toHaveProperty('total_visits');
    });

    test('GET /api/analytics/high-usage-medicines: Assert HTTP 200 and verify nested subquery output', async () => {
      const res = await request(app).get('/api/analytics/high-usage-medicines');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.high_usage_medicines)).toBe(true);
      expect(res.body.high_usage_medicines.length).toBeGreaterThan(0);

      const firstMed = res.body.high_usage_medicines[0];
      expect(firstMed).toHaveProperty('medicine_id');
      expect(firstMed).toHaveProperty('brand_name');
      expect(firstMed).toHaveProperty('times_prescribed');
    });
  });

  // 3. ACID Multi-Table Transaction Test
  describe('E-Prescription ACID Atomic Creation', () => {
    test('POST /api/prescriptions: Submit prescription and verify atomic insertion across tables', async () => {
      expect(doctorToken).toBeTruthy();

      const prescriptionPayload = {
        patient_uid: 'BD-2000-0001',
        diagnosis: 'Acute Rhinitis & Throat Irritation',
        clinical_notes: 'Warm water gargle, avoid cold air exposure.',
        items: [
          { medicine_id: 611, dosage_instruction: '1 tablet thrice daily', duration: '5 days' },
          { medicine_id: 613, dosage_instruction: '2 tablets chewed after meals', duration: '7 days' }
        ]
      };

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(prescriptionPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.prescription).toBeDefined();
      expect(res.body.prescription.prescription_id).toBeDefined();
      expect(res.body.prescription.items.length).toBe(2);

      const newRxId = res.body.prescription.prescription_id;

      // Verify prescription row exists in DB
      const [rxRow] = await query('SELECT * FROM prescriptions WHERE prescription_id = ?', [newRxId]);
      expect(rxRow).toBeDefined();
      expect(rxRow.patient_uid).toBe('BD-2000-0001');

      // Verify items exist in prescription_items
      const items = await query('SELECT * FROM prescription_items WHERE prescription_id = ?', [newRxId]);
      expect(items.length).toBe(2);

      // Cleanup test prescription (cascades to items)
      await query('DELETE FROM prescriptions WHERE prescription_id = ?', [newRxId]);
    });
  });

  // 4. Rate Limiting Security Test
  describe('API Security & Rate Limiting', () => {
    test('Rate Limiting: Dispatch rapid requests to /api/auth/login and assert HTTP 429', async () => {
      let rateLimited = null;

      // Dispatch rapid sequential requests to breach limit
      for (let i = 0; i < 25; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ identifier: `rate_test_${i}@xmed.gov.bd`, password: 'test' });

        if (res.status === 429) {
          rateLimited = res;
          break;
        }
      }

      expect(rateLimited).not.toBeNull();
      expect(rateLimited.status).toBe(429);
      expect(rateLimited.body.message).toMatch(/Too many authentication attempts/i);
    });
  });
});
