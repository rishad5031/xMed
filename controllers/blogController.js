const blogModel = require('../models/blogModel');

async function getBlogs(req, res) {
  try {
    const { search, category } = req.query;
    const blogs = await blogModel.getAllBlogs({ search, category });
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

async function createBlog(req, res) {
  try {
    const author_id = req.user ? req.user.doctor_id || req.user.id : req.body.author_id;
    const { title, category, content, tags } = req.body;

    if (!title || !category || !content) {
      return res.status(400).json({ success: false, message: 'Title, category, and content are required.' });
    }

    const newBlog = await blogModel.createHealthBlog({
      author_id: author_id || 1,
      title: title.trim(),
      category: category.trim(),
      content: content.trim(),
      tags: tags || ''
    });

    return res.status(201).json({
      success: true,
      message: 'Clinical article published successfully to the national feed.',
      data: newBlog
    });
  } catch (error) {
    console.error('[BlogController] createBlog error:', error);
    return res.status(500).json({ success: false, message: 'Failed to publish clinical article.' });
  }
}

module.exports = {
  getBlogs,
  getBlogById,
  createBlog
};
