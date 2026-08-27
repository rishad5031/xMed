// =============================================================
// xMED - Blood Donation & Request Hub Model (3NF MySQL)
// Life-Saving Voluntary Exchange Network
// =============================================================

const { query } = require('../config/db');

async function createBloodPost(postData) {
  const {
    author_uid,
    post_type,
    blood_group,
    hemoglobin_level = null,
    units_needed = 1,
    area,
    city = 'Dhaka',
    hospital_name = null,
    urgency = 'NORMAL',
    contact_phone,
    notes = null
  } = postData;

  const sql = `
    INSERT INTO blood_posts (
      author_uid, post_type, blood_group, hemoglobin_level,
      units_needed, area, city, hospital_name, urgency,
      contact_phone, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?);
  `;

  const result = await query(sql, [
    author_uid,
    post_type,
    blood_group,
    hemoglobin_level || null,
    units_needed || 1,
    area,
    city,
    hospital_name || null,
    urgency || 'NORMAL',
    contact_phone,
    notes || null
  ]);

  return await getBloodPostById(result.insertId);
}

async function getBloodPostById(postId) {
  const sql = `
    SELECT 
      bp.*,
      COALESCE(c.name, c.full_name) AS author_name,
      c.blood_group AS citizen_blood_group,
      c.gender AS author_gender
    FROM blood_posts bp
    JOIN citizens c ON bp.author_uid = c.uid
    WHERE bp.post_id = ?;
  `;
  const rows = await query(sql, [postId]);
  return rows[0] || null;
}

async function getBloodPosts(filters = {}) {
  let sql = `
    SELECT 
      bp.*,
      COALESCE(c.name, c.full_name) AS author_name,
      c.blood_group AS citizen_blood_group,
      c.gender AS author_gender
    FROM blood_posts bp
    JOIN citizens c ON bp.author_uid = c.uid
    WHERE 1=1
  `;
  const params = [];

  if (filters.type && filters.type.trim()) {
    sql += ' AND bp.post_type = ?';
    params.push(filters.type.trim().toUpperCase());
  }

  if (filters.blood_group && filters.blood_group.trim()) {
    sql += ' AND bp.blood_group = ?';
    params.push(filters.blood_group.trim().toUpperCase());
  }

  if (filters.urgency && filters.urgency.trim()) {
    sql += ' AND bp.urgency = ?';
    params.push(filters.urgency.trim().toUpperCase());
  }

  if (filters.min_hb && !isNaN(filters.min_hb)) {
    sql += ' AND bp.hemoglobin_level >= ?';
    params.push(parseFloat(filters.min_hb));
  }

  if (filters.area && filters.area.trim()) {
    sql += ' AND LOWER(bp.area) LIKE LOWER(?)';
    params.push(`%${filters.area.trim()}%`);
  }

  if (filters.city && filters.city.trim()) {
    sql += ' AND LOWER(bp.city) LIKE LOWER(?)';
    params.push(`%${filters.city.trim()}%`);
  }

  if (filters.status && filters.status.trim()) {
    sql += ' AND bp.status = ?';
    params.push(filters.status.trim().toUpperCase());
  }

  // Priority ordering: Critical emergency first, then urgent, then chronological
  sql += `
    ORDER BY 
      CASE bp.urgency 
        WHEN 'CRITICAL_EMERGENCY' THEN 1 
        WHEN 'URGENT' THEN 2 
        ELSE 3 
      END ASC,
      bp.created_at DESC
  `;

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(filters.limit, 10));
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(parseInt(filters.offset, 10));
    }
  }

  return await query(sql, params);
}

async function updateBloodPostStatus(postId, newStatus) {
  const sql = `
    UPDATE blood_posts 
    SET status = ? 
    WHERE post_id = ?;
  `;
  await query(sql, [newStatus, postId]);
  return await getBloodPostById(postId);
}

async function getBloodStats() {
  const sql = `
    SELECT 
      COUNT(*) AS total_posts,
      SUM(CASE WHEN post_type = 'DONATE' AND status = 'OPEN' THEN 1 ELSE 0 END) AS active_donors,
      SUM(CASE WHEN post_type = 'REQUEST' AND status = 'OPEN' THEN 1 ELSE 0 END) AS pending_requests,
      SUM(CASE WHEN post_type = 'REQUEST' AND urgency = 'CRITICAL_EMERGENCY' AND status = 'OPEN' THEN 1 ELSE 0 END) AS critical_emergencies,
      SUM(CASE WHEN status = 'FULFILLED' THEN 1 ELSE 0 END) AS fulfilled_donations
    FROM blood_posts;
  `;
  const [stats] = await query(sql);
  return stats;
}

module.exports = {
  createBloodPost,
  getBloodPostById,
  getBloodPosts,
  updateBloodPostStatus,
  getBloodStats
};
