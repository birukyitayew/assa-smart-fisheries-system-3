/**
 * Notification Service
 * Creates in-app notifications for fishers and buyers.
 */

function notifyFisher(db, userId, type, title, message) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES (?, ?, ?, ?, 0)
  `).run(userId, type, title, message);
}

function notifyBuyer(db, userId, type, title, message) {
  db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES (?, ?, ?, ?, 0)
  `).run(userId, type, title, message);
}

module.exports = { notifyFisher, notifyBuyer };
