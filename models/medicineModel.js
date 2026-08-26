const { query } = require('../config/db');

// In-Memory Cache for fast, zero-latency catalog lookups
let medicineCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

async function refreshCache() {
  try {
    const sql = `
      SELECT medicine_id, brand_name, generic_name, dosage_form, strength, category, origin 
      FROM medicines 
      ORDER BY brand_name ASC
    `;
    const rows = await query(sql);
    medicineCache = rows;
    lastCacheTime = Date.now();
    return medicineCache;
  } catch (err) {
    console.error('[MedicineModel] Error refreshing in-memory cache:', err.message);
    return medicineCache || [];
  }
}

async function getCachedMedicines() {
  if (!medicineCache || (Date.now() - lastCacheTime > CACHE_TTL_MS)) {
    await refreshCache();
  }
  return medicineCache || [];
}

async function searchMedicines(searchTerm, limit = 30) {
  const allMeds = await getCachedMedicines();

  if (!searchTerm || searchTerm.trim() === '') {
    return allMeds.slice(0, limit);
  }

  const clean = searchTerm.trim().toLowerCase();

  // In-Memory high-speed relevance match with origin and category
  const scored = [];
  for (const m of allMeds) {
    const brandLower = m.brand_name.toLowerCase();
    const genericLower = m.generic_name.toLowerCase();
    const categoryLower = (m.category || '').toLowerCase();
    const originLower = (m.origin || '').toLowerCase();
    const formLower = (m.dosage_form || '').toLowerCase();

    let relevance = 0;
    if (brandLower === clean) {
      relevance = 1;
    } else if (brandLower.startsWith(clean)) {
      relevance = 2;
    } else if (brandLower.includes(clean)) {
      relevance = 3;
    } else if (genericLower.startsWith(clean)) {
      relevance = 4;
    } else if (genericLower.includes(clean)) {
      relevance = 5;
    } else if (categoryLower.includes(clean) || originLower.includes(clean) || formLower.includes(clean)) {
      relevance = 6;
    }

    if (relevance > 0) {
      scored.push({ ...m, relevance });
    }
  }

  scored.sort((a, b) => a.relevance - b.relevance || a.brand_name.localeCompare(b.brand_name));
  return scored.slice(0, limit);
}

async function findById(medicine_id) {
  const allMeds = await getCachedMedicines();
  const idNum = parseInt(medicine_id, 10);
  const found = allMeds.find(m => m.medicine_id === idNum);
  if (found) return found;

  const sql = 'SELECT * FROM medicines WHERE medicine_id = ? LIMIT 1';
  const rows = await query(sql, [medicine_id]);
  return rows[0] || null;
}

// Pre-warm cache on module load
refreshCache().catch(() => {});

module.exports = {
  refreshCache,
  searchMedicines,
  findById
};
