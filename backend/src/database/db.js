/**
 * @deprecated Use ../database/prisma.js — PostgreSQL via Prisma only.
 */
const { prisma } = require('./prisma');

function getDb() {
  throw new Error(
    'SQLite getDb() is removed in Phase 4. Use prisma from ../database/prisma.js',
  );
}

module.exports = { getDb, prisma };
