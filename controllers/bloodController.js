// =============================================================
// xMED - Blood Donation & Request Controller
// RESTful Endpoints for Blood Exchange Hub
// =============================================================

const bloodModel = require('../models/bloodModel');

async function createPost(req, res) {
  try {
    const author_uid = req.user ? req.user.uid : req.body.author_uid;

    if (!author_uid) {
      return res.status(400).json({ success: false, message: 'Author citizen UID is required.' });
    }

    const {
      post_type,
      blood_group,
      hemoglobin_level,
      units_needed,
      area,
      city,
      hospital_name,
      urgency,
      contact_phone,
      notes
    } = req.body;

    if (!post_type || !['DONATE', 'REQUEST'].includes(post_type.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid post type. Must be DONATE or REQUEST.' });
    }

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!blood_group || !validBloodGroups.includes(blood_group.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid blood group.' });
    }

    if (!area || !contact_phone) {
      return res.status(400).json({ success: false, message: 'Area and contact phone number are required.' });
    }

    const newPost = await bloodModel.createBloodPost({
      author_uid,
      post_type: post_type.toUpperCase(),
      blood_group: blood_group.toUpperCase(),
      hemoglobin_level: hemoglobin_level ? parseFloat(hemoglobin_level) : null,
      units_needed: units_needed ? parseInt(units_needed, 10) : 1,
      area,
      city: city || 'Dhaka',
      hospital_name,
      urgency: urgency ? urgency.toUpperCase() : 'NORMAL',
      contact_phone,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Blood post published successfully to the national exchange.',
      data: newPost
    });
  } catch (err) {
    console.error('[BloodController] Error creating post:', err.message);
    res.status(500).json({ success: false, message: 'Server error creating blood post.' });
  }
}

async function getPosts(req, res) {
  try {
    const { type, blood_group, min_hb, area, city, urgency, status, limit, offset } = req.query;

    const posts = await bloodModel.getBloodPosts({
      type,
      blood_group,
      min_hb,
      area,
      city,
      urgency,
      status,
      limit,
      offset
    });

    res.json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (err) {
    console.error('[BloodController] Error fetching posts:', err.message);
    res.status(500).json({ success: false, message: 'Server error fetching blood posts.' });
  }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['OPEN', 'FULFILLED', 'CLOSED'].includes(status.toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be OPEN, FULFILLED, or CLOSED.' });
    }

    const updated = await bloodModel.updateBloodPostStatus(id, status.toUpperCase());
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Blood post not found.' });
    }

    res.json({
      success: true,
      message: `Blood post status updated to ${status.toUpperCase()}.`,
      data: updated
    });
  } catch (err) {
    console.error('[BloodController] Error updating status:', err.message);
    res.status(500).json({ success: false, message: 'Server error updating blood post status.' });
  }
}

async function getStats(req, res) {
  try {
    const stats = await bloodModel.getBloodStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    console.error('[BloodController] Error fetching stats:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving blood stats.' });
  }
}

module.exports = {
  createPost,
  getPosts,
  updateStatus,
  getStats
};
