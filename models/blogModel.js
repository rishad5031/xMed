const { query } = require('../config/db');

async function getAllBlogs() {
  const sql = `
    SELECT 
      blog_id, title, category, author_name, author_specialization, 
      author_license, read_time, summary, published_at
    FROM blogs 
    ORDER BY published_at DESC
  `;
  return await query(sql);
}

async function getBlogById(id) {
  const sql = 'SELECT * FROM blogs WHERE blog_id = ? LIMIT 1';
  const rows = await query(sql, [id]);
  return rows[0] || null;
}

module.exports = {
  getAllBlogs,
  getBlogById
};
