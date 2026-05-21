/**
 * Notification Service
 * Creates in-app notifications for fishers and buyers.
 */

const { prisma } = require('../database/prisma');

async function notifyFisher(userId, type, title, message) {
  await prisma.notification.create({
    data: { userId, type, title, message, isRead: false },
  });
}

async function notifyBuyer(userId, type, title, message) {
  await prisma.notification.create({
    data: { userId, type, title, message, isRead: false },
  });
}

module.exports = { notifyFisher, notifyBuyer };
