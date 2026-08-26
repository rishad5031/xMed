const { query } = require('../config/db');
const crypto = require('crypto');

// Generate unique citizen UID format: BD-YYYY-XXXX
async function generateUniqueUid() {
  const currentYear = new Date().getFullYear();
  let unique = false;
  let uid = '';

  while (!unique) {
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    uid = `BD-${currentYear}-${randomHex}`;
    const existing = await findByUid(uid);
    if (!existing) {
      unique = true;
    }
  }
  return uid;
}

async function findByEmail(email) {
  const sql = 'SELECT * FROM citizens WHERE email = ? LIMIT 1';
  const rows = await query(sql, [email]);
  return rows[0] || null;
}

async function findByPhone(phone) {
  const sql = 'SELECT * FROM citizens WHERE phone = ? LIMIT 1';
  const rows = await query(sql, [phone]);
  return rows[0] || null;
}

async function findByUid(uid) {
  const sql = 'SELECT * FROM citizens WHERE uid = ? LIMIT 1';
  const rows = await query(sql, [uid]);
  return rows[0] || null;
}

async function createCitizen({ full_name, dob, gender, blood_group, phone, email, password_hash }) {
  const uid = await generateUniqueUid();
  const sql = `
    INSERT INTO citizens (uid, full_name, dob, gender, blood_group, phone, email, password_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await query(sql, [uid, full_name, dob, gender, blood_group, phone, email, password_hash]);
  return await findByUid(uid);
}

module.exports = {
  generateUniqueUid,
  findByEmail,
  findByPhone,
  findByUid,
  createCitizen
};
