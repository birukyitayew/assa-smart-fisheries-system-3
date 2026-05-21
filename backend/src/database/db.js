const Database = require('better-sqlite3');
const path = require('path');
const { runMigrations } = require('./migrate');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, '../..', process.env.DB_PATH)
  : path.join(__dirname, 'assa.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
  }
  return db;
}

module.exports = { getDb };
