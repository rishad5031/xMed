// =============================================================
// xMED - Automated Test Suite: Global Session & Auth State Probe
// Verifies GET /api/auth/me, POST /api/auth/logout, and Token Recognition
// =============================================================

const request = require('supertest');
const app = require('../server');

describe('xMED Global Session & Auth State Test Suite', () => {

  test('GET /api/auth/me - Unauthenticated visitor should receive 200 OK with authenticated: false', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.user).toBeNull();
  });

  test('GET /api/auth/me - Invalid Bearer token should safely return 200 OK with authenticated: false', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_bogus_jwt_token_12345');
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.user).toBeNull();
  });

  test('GET /api/auth/me - Authenticated citizen should receive active profile', async () => {
    // 1. Log in as patient
    const loginRes = await request(app)
      .post('/api/auth/login-citizen')
      .send({
        identifier: 'BD-2000-0001',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    const token = loginRes.body.token;
    expect(token).toBeDefined();

    // 2. Query /api/auth/me with Bearer token
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.authenticated).toBe(true);
    expect(meRes.body.user).toBeDefined();
    expect(meRes.body.user.uid).toBe('BD-2000-0001');
    expect(meRes.body.user.role).toBe('patient');
  });

  test('GET /api/auth/me - Authenticated doctor should be recognized via Cookie', async () => {
    // 1. Log in as doctor
    const loginRes = await request(app)
      .post('/api/auth/login-doctor')
      .send({
        identifier: 'dr.tanvir@xmed.gov.bd',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    const token = loginRes.body.token;
    expect(token).toBeDefined();

    // 2. Query /api/auth/me with Cookie
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `xmed_token=${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.authenticated).toBe(true);
    expect(meRes.body.user).toBeDefined();
    expect(meRes.body.user.role).toBe('doctor');
    expect(meRes.body.user.hospital_name).toBeDefined();
  });

  test('POST /api/auth/logout - Should clear session cookie and return status', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.authenticated).toBe(false);

    // Verify Set-Cookie header clears xmed_token
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const match = cookies.some(c => c.includes('xmed_token=;'));
      expect(match).toBe(true);
    }
  });

});
