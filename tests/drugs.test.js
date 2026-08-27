// =============================================================
// xMED - Automated Test Suite: Bangladesh Government Free Drugs
// Directorate General of Health Services (DGHS) & EDCL Formulary
// =============================================================

const request = require('supertest');
const app = require('../server');

describe('Bangladesh Government Free & Emergency Essential Drugs API', () => {

  describe('GET /api/drugs/emergency', () => {
    test('Should return HTTP 200 with list of officially verified emergency drugs', async () => {
      const res = await request(app).get('/api/drugs/emergency');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(10);

      // Verify that every returned drug is strictly marked as emergency
      res.body.data.forEach(drug => {
        expect(drug.is_emergency).toBe(true);
        expect(drug).toHaveProperty('id');
        expect(drug).toHaveProperty('brand_name');
        expect(drug).toHaveProperty('generic_name');
        expect(drug).toHaveProperty('emergency_indication');
        expect(drug.emergency_indication).toBeTruthy();
        expect(drug.price).toMatch(/৳0\.00|Free/);
      });
    });
  });

  describe('GET /api/drugs/government-essential', () => {
    test('Should return the full catalog of 60+ free government essential medicines', async () => {
      const res = await request(app).get('/api/drugs/government-essential');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(50);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories).toContain('All');
      expect(res.body.categories).toContain('Emergency & Critical Care');
      expect(res.body.categories).toContain('Antibiotic');
    });

    test('Should correctly filter by search term', async () => {
      const res = await request(app).get('/api/drugs/government-essential?search=adrenaline');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      const found = res.body.data.some(d => d.generic_name.toLowerCase().includes('adrenaline') || d.brand_name.toLowerCase().includes('adrenaline'));
      expect(found).toBe(true);
    });

    test('Should filter by therapeutic category', async () => {
      const res = await request(app).get('/api/drugs/government-essential?category=Antibiotic');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      res.body.data.forEach(d => {
        expect(d.category.toLowerCase()).toContain('antibiotic');
      });
    });
  });

  describe('GET /api/drugs/government-essential/:id', () => {
    test('Should return details for a specific government essential drug ID', async () => {
      const res = await request(app).get('/api/drugs/government-essential/BD-EDCL-EM-01');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('BD-EDCL-EM-01');
      expect(res.body.data.brand_name).toContain('Adrenaline');
      expect(res.body.data.facility_tier).toBeTruthy();
    });

    test('Should return 404 for a non-existent drug ID', async () => {
      const res = await request(app).get('/api/drugs/government-essential/INVALID-ID-999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

});
