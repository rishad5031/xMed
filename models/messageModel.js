// =============================================================
// xMED - Universal Real-Time Cross-Role Messaging Model
// Citizen <-> Citizen, Doctor <-> Citizen, Doctor <-> Doctor
// =============================================================

const { query } = require('../config/db');

async function sendMessage({ sender_uid, receiver_uid, message_text }) {
  const sql = `
    INSERT INTO messages (sender_uid, receiver_uid, message_text, is_read)
    VALUES (?, ?, ?, FALSE);
  `;
  const result = await query(sql, [sender_uid, receiver_uid, message_text]);
  const [msg] = await query('SELECT * FROM messages WHERE message_id = ?;', [result.insertId]);
  return msg;
}

async function getMessageThread(uid1, uid2) {
  // Mark incoming messages as read
  await query(`
    UPDATE messages 
    SET is_read = TRUE 
    WHERE sender_uid = ? AND receiver_uid = ? AND is_read = FALSE;
  `, [uid2, uid1]);

  const sql = `
    SELECT 
      m.message_id,
      m.sender_uid,
      m.receiver_uid,
      m.message_text,
      m.is_read,
      m.created_at
    FROM messages m
    WHERE (m.sender_uid = ? AND m.receiver_uid = ?)
       OR (m.sender_uid = ? AND m.receiver_uid = ?)
    ORDER BY m.created_at ASC;
  `;
  return await query(sql, [uid1, uid2, uid2, uid1]);
}

async function getConversations(uid) {
  // Find all distinct counterpart UIDs
  const threadUidsSql = `
    SELECT DISTINCT 
      CASE WHEN sender_uid = ? THEN receiver_uid ELSE sender_uid END AS contact_uid
    FROM messages
    WHERE sender_uid = ? OR receiver_uid = ?;
  `;
  const threadRows = await query(threadUidsSql, [uid, uid, uid]);

  const conversations = [];

  for (const row of threadRows) {
    const contactUid = row.contact_uid;

    // Get latest message in this thread
    const [latest] = await query(`
      SELECT message_text, created_at, sender_uid, is_read
      FROM messages
      WHERE (sender_uid = ? AND receiver_uid = ?)
         OR (sender_uid = ? AND receiver_uid = ?)
      ORDER BY created_at DESC
      LIMIT 1;
    `, [uid, contactUid, contactUid, uid]);

    // Count unread messages sent by contact to current user
    const [unread] = await query(`
      SELECT COUNT(*) AS unread_count
      FROM messages
      WHERE sender_uid = ? AND receiver_uid = ? AND is_read = FALSE;
    `, [contactUid, uid]);

    // Lookup contact profile (check doctors first, then citizens)
    let contactName = contactUid;
    let contactRole = 'Citizen';
    let contactSubtitle = 'xMED Registered Patient';

    const [doc] = await query(`
      SELECT COALESCE(name, full_name) AS name, specialization, email 
      FROM doctors 
      WHERE uid = ?;
    `, [contactUid]);

    if (doc) {
      contactName = `Dr. ${doc.name.replace(/^Dr\.\s*/i, '')}`;
      contactRole = 'Doctor';
      contactSubtitle = doc.specialization || 'Consultant Physician';
    } else {
      const [cit] = await query(`
        SELECT COALESCE(name, full_name) AS name, blood_group, area 
        FROM citizens 
        WHERE uid = ?;
      `, [contactUid]);

      if (cit) {
        contactName = cit.name;
        contactRole = 'Citizen';
        contactSubtitle = `Blood Group: ${cit.blood_group || 'Unknown'} • ${cit.area || 'Dhaka'}`;
      }
    }

    conversations.push({
      contact_uid: contactUid,
      contact_name: contactName,
      contact_role: contactRole,
      contact_subtitle: contactSubtitle,
      last_message: latest ? latest.message_text : '',
      last_message_time: latest ? latest.created_at : null,
      unread_count: unread ? unread.unread_count : 0
    });
  }

  // Sort conversations by latest message timestamp descending
  conversations.sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));

  return conversations;
}

async function getAvailableContacts(currentUid) {
  // Return test doctors and patients so user can easily start a chat
  const doctors = await query(`
    SELECT 
      uid AS contact_uid,
      CONCAT('Dr. ', REPLACE(COALESCE(name, full_name), 'Dr. ', '')) AS contact_name,
      'Doctor' AS contact_role,
      specialization AS contact_subtitle
    FROM doctors
    WHERE uid != ?
    LIMIT 15;
  `, [currentUid]);

  const citizens = await query(`
    SELECT 
      uid AS contact_uid,
      COALESCE(name, full_name) AS contact_name,
      'Citizen' AS contact_role,
      CONCAT('Blood Group: ', blood_group, ' • ', area) AS contact_subtitle
    FROM citizens
    WHERE uid != ?
    LIMIT 15;
  `, [currentUid]);

  return [...doctors, ...citizens];
}

module.exports = {
  sendMessage,
  getMessageThread,
  getConversations,
  getAvailableContacts
};
