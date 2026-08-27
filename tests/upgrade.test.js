// =============================================================
// xMED - Automated Test Suite: Major System Upgrade
// Blood Exchange, Cross-Role Messaging, Public Booking, Blogs
// =============================================================

const request = require('supertest');
const app = require('../server');
const { query } = require('../config/db');

describe('xMED Major System Upgrade Test Suite', () => {

  let createdPostId = null;

  // -------------------------------------------------------------
  // 1. Blood Donation & Request Exchange Hub
  // -------------------------------------------------------------
  describe('Blood Exchange Hub APIs', () => {
    test('GET /api/blood/posts - Should retrieve seeded blood exchange posts', async () => {
      const res = await request(app).get('/api/blood/posts');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(15);

      const sample = res.body.data[0];
      expect(sample).toHaveProperty('post_id');
      expect(sample).toHaveProperty('author_uid');
      expect(sample).toHaveProperty('post_type');
      expect(sample).toHaveProperty('blood_group');
      expect(sample).toHaveProperty('area');
      expect(sample).toHaveProperty('contact_phone');
    });

    test('GET /api/blood/posts - Should correctly filter by post_type and blood_group', async () => {
      const res = await request(app).get('/api/blood/posts?type=REQUEST&blood_group=O+');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(p => {
        expect(p.post_type).toBe('REQUEST');
        expect(p.blood_group).toBe('O+');
      });
    });

    test('GET /api/blood/stats - Should return real-time metrics for blood hub', async () => {
      const res = await request(app).get('/api/blood/stats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total_posts');
      expect(res.body.data).toHaveProperty('active_donors');
      expect(res.body.data).toHaveProperty('pending_requests');
      expect(res.body.data).toHaveProperty('critical_emergencies');
    });

    test('POST /api/blood/posts - Should create a new blood request', async () => {
      const newPost = {
        author_uid: 'BD-2000-0001',
        post_type: 'REQUEST',
        blood_group: 'AB-',
        units_needed: 2,
        area: 'Dhanmondi',
        city: 'Dhaka',
        hospital_name: 'Dhanmondi Care Hospital',
        urgency: 'CRITICAL_EMERGENCY',
        contact_phone: '+8801711223344',
        notes: 'Urgent emergency surgery blood needed immediately'
      };

      const res = await request(app)
        .post('/api/blood/posts')
        .send(newPost);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.blood_group).toBe('AB-');
      expect(res.body.data.urgency).toBe('CRITICAL_EMERGENCY');
      createdPostId = res.body.data.post_id;
    });

    test('PATCH /api/blood/posts/:id/status - Should mark blood post as FULFILLED', async () => {
      expect(createdPostId).not.toBeNull();
      const res = await request(app)
        .patch(`/api/blood/posts/${createdPostId}/status`)
        .send({ status: 'FULFILLED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('FULFILLED');
    });
  });

  // -------------------------------------------------------------
  // 2. Universal Real-Time Cross-Role Messaging System
  // -------------------------------------------------------------
  describe('Universal Messaging Hub APIs', () => {
    test('GET /api/messages/conversations - Should return conversation threads for citizen', async () => {
      const res = await request(app).get('/api/messages/conversations?uid=BD-2000-0001');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const conv = res.body.data[0];
      expect(conv).toHaveProperty('contact_uid');
      expect(conv).toHaveProperty('contact_name');
      expect(conv).toHaveProperty('contact_role');
      expect(conv).toHaveProperty('last_message');
    });

    test('GET /api/messages/thread/:targetUid - Should return chronological message thread', async () => {
      const res = await request(app).get('/api/messages/thread/DOC-1001?uid=BD-2000-0001');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const msg = res.body.data[0];
      expect(msg).toHaveProperty('sender_uid');
      expect(msg).toHaveProperty('receiver_uid');
      expect(msg).toHaveProperty('message_text');
    });

    test('POST /api/messages/send - Should deliver a direct message between citizen and doctor', async () => {
      const res = await request(app)
        .post('/api/messages/send')
        .send({
          sender_uid: 'BD-2000-0001',
          receiver_uid: 'DOC-1001',
          message_text: 'Doctor, my fever is subsiding today. Should I continue the antibiotics?'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message_text).toContain('antibiotics');
    });

    test('GET /api/messages/contacts - Should return list of available doctor & citizen contacts', async () => {
      const res = await request(app).get('/api/messages/contacts?uid=BD-2000-0001');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    });
  });

  // -------------------------------------------------------------
  // 3. Hospital & Doctor Discovery
  // -------------------------------------------------------------
  describe('Hospital Doctors Discovery APIs', () => {
    test('GET /api/hospitals - Should return list of hospitals with area filter', async () => {
      const res = await request(app).get('/api/hospitals?area=Dhanmondi');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].area).toBe('Dhanmondi');
    });

    test('GET /api/hospitals/1/doctors - Should return list of doctors assigned to Hospital 1', async () => {
      const res = await request(app).get('/api/hospitals/1/doctors');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(3);

      const doc = res.body.data[0];
      expect(doc).toHaveProperty('doctor_id');
      expect(doc).toHaveProperty('name');
      expect(doc).toHaveProperty('specialization');
      expect(doc).toHaveProperty('consultation_fee');
      expect(doc).toHaveProperty('shift_start');
    });
  });

  // -------------------------------------------------------------
  // 4. Express Public Outpatient Appointment Booking & Doctor Triage
  // -------------------------------------------------------------
  describe('Appointment Booking & Doctor Triage Queue APIs', () => {
    let testAptId = null;

    test('POST /api/appointments/request - Should book an express appointment without requiring auth token', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/appointments/request')
        .send({
          hospital_id: 1,
          doctor_id: 1,
          requested_date: today,
          patient_uid: 'BD-2000-0005',
          patient_phone: '01711-223344',
          is_emergency: false,
          emergency_reason: 'Express consultation booking'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('appointment_id');
      expect(res.body.data).toHaveProperty('serial_no');
      expect(res.body.data.serial_no).toBeGreaterThanOrEqual(1);
      testAptId = res.body.data.appointment_id;
    });

    test('POST /api/appointments/request - Should queue priority level 2 for emergencies', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(app)
        .post('/api/appointments/request')
        .send({
          hospital_id: 2,
          doctor_id: 4,
          requested_date: today,
          patient_uid: 'BD-2000-0010',
          is_emergency: true,
          emergency_reason: 'Acute respiratory distress and cyanosis'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priority_level).toBe(2);
      expect(res.body.message).toContain('Emergency');
    });

    test('GET /api/doctor/appointments/queue - Should return doctor queue sorted by priority_level DESC', async () => {
      const res = await request(app).get('/api/doctor/appointments/queue?doctor_id=1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Verify sorting: each item has priority_level >= next item (or equal)
      for (let i = 0; i < res.body.data.length - 1; i++) {
        expect(res.body.data[i].priority_level).toBeGreaterThanOrEqual(res.body.data[i + 1].priority_level);
      }
    });

    test('POST /api/doctor/appointments/:id/decide - Should accept or elevate appointment decision', async () => {
      expect(testAptId).not.toBeNull();
      const res = await request(app)
        .post(`/api/doctor/appointments/${testAptId}/decide`)
        .send({
          action: 'EMERGENCY_PRIORITY',
          notes: 'Doctor triage elevated patient to Emergency Priority 3.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.priority_level).toBe(3);
      expect(res.body.data.status).toBe('ACCEPTED');
    });
  });

  // -------------------------------------------------------------
  // 5. Clinical Knowledge Feed & Community Health Blogs
  // -------------------------------------------------------------
  describe('Clinical Knowledge Feed APIs', () => {
    test('GET /api/blogs - Should return doctor-authored clinical articles', async () => {
      const res = await request(app).get('/api/blogs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(10);

      const blog = res.body.blogs[0];
      expect(blog).toHaveProperty('blog_id');
      expect(blog).toHaveProperty('title');
      expect(blog).toHaveProperty('category');
      expect(blog).toHaveProperty('author_name');
      expect(blog).toHaveProperty('read_time');
    });

    test('GET /api/blogs/:id - Should retrieve specific blog article by ID', async () => {
      const res = await request(app).get('/api/blogs/1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.blog).toHaveProperty('title');
      expect(res.body.blog).toHaveProperty('content');
    });

    test('GET /api/blogs - Should filter articles by search query', async () => {
      const res = await request(app).get('/api/blogs?search=dengue');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.blogs.length).toBeGreaterThanOrEqual(1);
    });

    test('GET /api/blogs - Should filter articles by tag query', async () => {
      const res = await request(app).get('/api/blogs?tag=cardiology');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.blogs)).toBe(true);
    });
  });

});
