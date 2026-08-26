const blogModel = require('../models/blogModel');

async function getBlogs(req, res) {
  try {
    const blogs = await blogModel.getAllBlogs();
    return res.json({ success: true, count: blogs.length, blogs });
  } catch (error) {
    console.error('[BlogController] getBlogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve clinical blogs.' });
  }
}

async function getBlogById(req, res) {
  try {
    const { id } = req.params;
    const blog = await blogModel.getBlogById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Clinical article not found.' });
    }
    return res.json({ success: true, blog });
  } catch (error) {
    console.error('[BlogController] getBlogById error:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve clinical article.' });
  }
}

module.exports = {
  getBlogs,
  getBlogById
};
