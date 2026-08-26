const request = require('supertest');
const app = require('../server');
const { getPool } = require('../config/db');

describe('MR.MED AI Health Assistant Module Suite', () => {
  afterAll(async () => {
    const pool = getPool();
    await pool.end();
  });
  test('POST /api/ai/chat: Generates educational response without client-side API key headers', async () => {
    const payload = {
      message: 'What is hypertension?'
    };

    const res = await request(app)
      .post('/api/ai/chat')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.trim().length).toBeGreaterThan(20);

    // Verify response content covers blood pressure / hypertension guidance
    expect(res.body.reply.toLowerCase()).toMatch(/blood pressure|hypertension|mmhg/i);

    // Verify no secret API key is ever leaked in the response headers or body
    expect(res.headers['x-api-key']).toBeUndefined();
    expect(res.headers['gemini-api-key']).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(process.env.GEMINI_API_KEY || 'AIzaSy');
  }, 20000); // 20s timeout for external LLM call if necessary

  test('POST /api/ai/chat: Rejects empty message with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/ai/chat')
      .send({ message: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/ai/status: Returns operational status and model metadata', async () => {
    const res = await request(app).get('/api/ai/status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.active).toBe(true);
    expect(res.body.provider).toBeDefined();
  });
});
