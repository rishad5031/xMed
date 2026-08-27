// =============================================================
// xMED - Universal Real-Time Messaging Controller
// Cross-Role Communication Engine
// =============================================================

const messageModel = require('../models/messageModel');

async function getConversations(req, res) {
  try {
    const userUid = req.user ? req.user.uid : req.query.uid;
    if (!userUid) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const conversations = await messageModel.getConversations(userUid);
    res.json({
      success: true,
      count: conversations.length,
      data: conversations
    });
  } catch (err) {
    console.error('[MessageController] Error getting conversations:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving conversations.' });
  }
}

async function getThread(req, res) {
  try {
    const userUid = req.user ? req.user.uid : req.query.uid;
    const { targetUid } = req.params;

    if (!userUid) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!targetUid) {
      return res.status(400).json({ success: false, message: 'Target recipient UID required.' });
    }

    const thread = await messageModel.getMessageThread(userUid, targetUid);
    res.json({
      success: true,
      target_uid: targetUid,
      count: thread.length,
      data: thread
    });
  } catch (err) {
    console.error('[MessageController] Error getting thread:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving message thread.' });
  }
}

async function sendMessage(req, res) {
  try {
    const sender_uid = req.user ? req.user.uid : req.body.sender_uid;
    const { receiver_uid, message_text } = req.body;

    if (!sender_uid) {
      return res.status(401).json({ success: false, message: 'Sender authentication required.' });
    }

    if (!receiver_uid || !message_text || !message_text.trim()) {
      return res.status(400).json({ success: false, message: 'Receiver UID and non-empty message text required.' });
    }

    const message = await messageModel.sendMessage({
      sender_uid,
      receiver_uid: receiver_uid.trim(),
      message_text: message_text.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Message delivered successfully.',
      data: message
    });
  } catch (err) {
    console.error('[MessageController] Error sending message:', err.message);
    res.status(500).json({ success: false, message: 'Server error delivering message.' });
  }
}

async function getContacts(req, res) {
  try {
    const userUid = req.user ? req.user.uid : req.query.uid;
    const contacts = await messageModel.getAvailableContacts(userUid || '');
    res.json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (err) {
    console.error('[MessageController] Error getting contacts:', err.message);
    res.status(500).json({ success: false, message: 'Server error retrieving contact list.' });
  }
}

module.exports = {
  getConversations,
  getThread,
  sendMessage,
  getContacts
};
