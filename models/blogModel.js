const { query } = require('../config/db');

async function getAllBlogs({ search, category, tag } = {}) {
  // Query health_blogs first with doctor details
  let sql = `
    SELECT 
      hb.blog_id,
      hb.title,
      hb.category,
      hb.content,
      hb.tags,
      hb.created_at AS published_at,
      CONCAT('Dr. ', REPLACE(COALESCE(d.name, d.full_name), 'Dr. ', '')) AS author_name,
      d.specialization AS author_specialization,
      COALESCE(d.license_number, d.license_no) AS author_license,
      CONCAT(GREATEST(1, ROUND(CHAR_LENGTH(hb.content) / 800)), ' min read') AS read_time,
      LEFT(hb.content, 220) AS summary
    FROM health_blogs hb
    JOIN doctors d ON hb.author_id = d.doctor_id
    WHERE 1=1
  `;
  const params = [];

  if (category && category !== 'All') {
    sql += ' AND LOWER(hb.category) LIKE LOWER(?)';
    params.push(`%${category.trim()}%`);
  }

  if (tag && tag.trim()) {
    sql += ' AND LOWER(hb.tags) LIKE LOWER(?)';
    params.push(`%${tag.trim()}%`);
  }

  if (search && search.trim()) {
    sql += ' AND (LOWER(hb.title) LIKE LOWER(?) OR LOWER(hb.content) LIKE LOWER(?) OR LOWER(hb.tags) LIKE LOWER(?))';
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  sql += ' ORDER BY hb.created_at DESC;';

  const healthBlogs = await query(sql, params);

  // If no health_blogs exist, fallback to legacy blogs table
  if (healthBlogs.length === 0 && !search && (!category || category === 'All')) {
    return await query(`
      SELECT 
        blog_id, title, category, content, '' as tags, author_name, 
        author_specialization, author_license, read_time, summary, published_at
      FROM blogs 
      ORDER BY published_at DESC;
    `);
  }

  return healthBlogs;
}

async function getBlogById(id) {
  const sql = `
    SELECT 
      hb.blog_id,
      hb.title,
      hb.category,
      hb.content,
      hb.tags,
      hb.created_at AS published_at,
      CONCAT('Dr. ', REPLACE(COALESCE(d.name, d.full_name), 'Dr. ', '')) AS author_name,
      d.specialization AS author_specialization,
      COALESCE(d.license_number, d.license_no) AS author_license,
      CONCAT(GREATEST(1, ROUND(CHAR_LENGTH(hb.content) / 800)), ' min read') AS read_time
    FROM health_blogs hb
    JOIN doctors d ON hb.author_id = d.doctor_id
    WHERE hb.blog_id = ?
    LIMIT 1;
  `;
  const rows = await query(sql, [id]);
  if (rows.length > 0) return rows[0];

  // Fallback check in blogs
  const fallback = await query('SELECT * FROM blogs WHERE blog_id = ? LIMIT 1;', [id]);
  return fallback[0] || null;
}

async function createHealthBlog({ author_id, title, category, content, tags }) {
  const sql = `
    INSERT INTO health_blogs (author_id, title, category, content, tags)
    VALUES (?, ?, ?, ?, ?);
  `;
  const res = await query(sql, [author_id, title, category, content, tags || '']);
  return await getBlogById(res.insertId);
}

module.exports = {
  getAllBlogs,
  getBlogById,
  createHealthBlog
};
