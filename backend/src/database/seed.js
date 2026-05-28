/**
 * ASSA — Seed Script
 * Populates the database with realistic demo data for Lake Tana, Ethiopia.
 * Run: npm run seed
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, '../..', process.env.DB_PATH)
  : path.join(__dirname, 'assa.db');
const fs = require('fs');

// ── Wipe and recreate DB ──────────────────────────────────────────────────────
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new Database(DB_PATH);
db.pragma('journal_mode = DELETE');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

console.log('✅ Schema created');

// ── Helpers ───────────────────────────────────────────────────────────────────
const hash = (pw) => bcrypt.hashSync(pw, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const dateOnly = (iso) => iso.split('T')[0];

let catchCounter = 1;
function catchRef(dateStr) {
  const id = String(catchCounter++).padStart(4, '0');
  return `CATCH-${dateStr}-${id}`;
}

let orderCounter = 1;
function orderRef(dateStr) {
  const id = String(orderCounter++).padStart(4, '0');
  return `ORD-${dateStr}-${id}`;
}

// ── 1. FISHING ZONES ─────────────────────────────────────────────────────────
const insertZone = db.prepare(`
  INSERT INTO fishing_zones (name, type, description, gps_lat, gps_lng)
  VALUES (@name, @type, @description, @gps_lat, @gps_lng)
`);

const zones = [
  {
    name: 'Lake Tana – North Zone (Gorgora)',
    type: 'ALLOWED',
    description: 'Primary fishing zone near Gorgora. High tilapia density.',
    gps_lat: 12.2167,
    gps_lng: 37.2833,
  },
  {
    name: 'Lake Tana – East Zone (Woreta)',
    type: 'ALLOWED',
    description: 'Active fisher community east of the lake. Good catfish grounds.',
    gps_lat: 11.9167,
    gps_lng: 37.7,
  },
  {
    name: 'Lake Tana – South Zone (Bahir Dar)',
    type: 'ALLOWED',
    description: 'High-volume zone near Bahir Dar city. Mixed species.',
    gps_lat: 11.5742,
    gps_lng: 37.3614,
  },
  {
    name: 'Lake Tana – West Zone (Mecha)',
    type: 'RESTRICTED',
    description: 'Seasonal restrictions apply. Spawning season limits in effect.',
    gps_lat: 11.8,
    gps_lng: 37.05,
  },
  {
    name: 'Zege Peninsula Waters',
    type: 'RESTRICTED',
    description: 'Ecotourism overlap zone. Limited fishing permits issued.',
    gps_lat: 11.6833,
    gps_lng: 37.3167,
  },
  {
    name: 'Lake Tana – Core Protected Area',
    type: 'PROHIBITED',
    description: 'Breeding grounds. Strict no-fishing zone enforced year-round.',
    gps_lat: 11.95,
    gps_lng: 37.4,
  },
];

function zonePolygon(lat, lng, d = 0.06) {
  return JSON.stringify([
    [lat - d, lng - d],
    [lat + d, lng - d],
    [lat + d, lng + d],
    [lat - d, lng + d],
  ]);
}

const updateZonePoly = db.prepare('UPDATE fishing_zones SET geo_polygon = ? WHERE id = ?');

const zoneIds = {};
zones.forEach((z) => {
  const info = insertZone.run(z);
  zoneIds[z.name] = info.lastInsertRowid;
  if (
    [
      'Lake Tana – North Zone (Gorgora)',
      'Lake Tana – South Zone (Bahir Dar)',
      'Lake Tana – Core Protected Area',
    ].includes(z.name)
  ) {
    updateZonePoly.run(zonePolygon(z.gps_lat, z.gps_lng), info.lastInsertRowid);
  }
});
console.log('✅ Fishing zones seeded');

// ── 2. USERS ──────────────────────────────────────────────────────────────────
const insertUser = db.prepare(`
  INSERT INTO users (name, email, password_hash, role, phone)
  VALUES (@name, @email, @password_hash, @role, @phone)
`);

const adminUsers = [
  {
    name: 'Dawit Bekele',
    email: 'dawit@fisheries.gov.et',
    role: 'superadmin',
    phone: '+251911234567',
  },
  { name: 'Tigist Haile', email: 'tigist@fisheries.gov.et', role: 'admin', phone: '+251922345678' },
  { name: 'Yonas Tadesse', email: 'yonas@fisheries.gov.et', role: 'admin', phone: '+251933456789' },
  { name: 'Mekdes Alemu', email: 'mekdes@fisheries.gov.et', role: 'admin', phone: '+251944567890' },
  {
    name: 'Biruk Getachew',
    email: 'biruk@fisheries.gov.et',
    role: 'admin',
    phone: '+251955678901',
  },
];

const fisherData = [
  {
    name: 'Tesfaye Alemu',
    email: 'tesfaye@fisher.et',
    phone: '+251911111001',
    license: 'FSH-2024-00125',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – North Zone (Gorgora)',
    boat: 'Blue Star',
    reg: 'BT-2024-001',
    cap: 200,
  },
  {
    name: 'Abebe Girma',
    email: 'abebe@fisher.et',
    phone: '+251911111002',
    license: 'FSH-2024-00126',
    status: 'VALID',
    expiry: '2026-11-30',
    zone: 'Lake Tana – East Zone (Woreta)',
    boat: 'Morning Light',
    reg: 'BT-2024-002',
    cap: 150,
  },
  {
    name: 'Mulugeta Worku',
    email: 'mulugeta@fisher.et',
    phone: '+251911111003',
    license: 'FSH-2024-00127',
    status: 'VALID',
    expiry: '2026-10-31',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    boat: 'Lake Queen',
    reg: 'BT-2024-003',
    cap: 300,
  },
  {
    name: 'Hailu Desta',
    email: 'hailu@fisher.et',
    phone: '+251911111004',
    license: 'FSH-2023-00089',
    status: 'EXPIRED',
    expiry: '2025-12-31',
    zone: 'Lake Tana – North Zone (Gorgora)',
    boat: 'Silver Fish',
    reg: 'BT-2023-004',
    cap: 100,
  },
  {
    name: 'Kebede Molla',
    email: 'kebede@fisher.et',
    phone: '+251911111005',
    license: 'FSH-2024-00130',
    status: 'VALID',
    expiry: '2026-09-30',
    zone: 'Lake Tana – West Zone (Mecha)',
    boat: 'Tana Pride',
    reg: 'BT-2024-005',
    cap: 250,
  },
  {
    name: 'Girma Tadesse',
    email: 'girma@fisher.et',
    phone: '+251911111006',
    license: 'FSH-2024-00131',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – East Zone (Woreta)',
    boat: 'Dawn Catcher',
    reg: 'BT-2024-006',
    cap: 180,
  },
  {
    name: 'Worku Bekele',
    email: 'worku@fisher.et',
    phone: '+251911111007',
    license: 'FSH-2024-00132',
    status: 'SUSPENDED',
    expiry: '2026-08-31',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    boat: 'River Star',
    reg: 'BT-2024-007',
    cap: 120,
  },
  {
    name: 'Amare Yilma',
    email: 'amare@fisher.et',
    phone: '+251911111008',
    license: 'FSH-2024-00133',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – North Zone (Gorgora)',
    boat: 'Blue Nile',
    reg: 'BT-2024-008',
    cap: 200,
  },
  {
    name: 'Teshome Haile',
    email: 'teshome@fisher.et',
    phone: '+251911111009',
    license: 'FSH-2024-00134',
    status: 'VALID',
    expiry: '2026-11-30',
    zone: 'Lake Tana – East Zone (Woreta)',
    boat: 'Sunrise',
    reg: 'BT-2024-009',
    cap: 160,
  },
  {
    name: 'Demeke Assefa',
    email: 'demeke@fisher.et',
    phone: '+251911111010',
    license: 'FSH-2024-00135',
    status: 'VALID',
    expiry: '2026-10-31',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    boat: 'Tana Wave',
    reg: 'BT-2024-010',
    cap: 220,
  },
  {
    name: 'Sisay Negash',
    email: 'sisay@fisher.et',
    phone: '+251911111011',
    license: 'FSH-2024-00136',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – West Zone (Mecha)',
    boat: 'Green Catch',
    reg: 'BT-2024-011',
    cap: 140,
  },
  {
    name: 'Fekadu Lemma',
    email: 'fekadu@fisher.et',
    phone: '+251911111012',
    license: 'FSH-2024-00137',
    status: 'VALID',
    expiry: '2026-09-30',
    zone: 'Lake Tana – North Zone (Gorgora)',
    boat: 'Lake Breeze',
    reg: 'BT-2024-012',
    cap: 190,
  },
  {
    name: 'Getachew Mesfin',
    email: 'getachew@fisher.et',
    phone: '+251911111013',
    license: 'FSH-2024-00138',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – East Zone (Woreta)',
    boat: 'Tana Star',
    reg: 'BT-2024-013',
    cap: 170,
  },
  {
    name: 'Berhane Tekle',
    email: 'berhane@fisher.et',
    phone: '+251911111014',
    license: 'FSH-2024-00139',
    status: 'VALID',
    expiry: '2026-11-30',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    boat: 'Morning Catch',
    reg: 'BT-2024-014',
    cap: 210,
  },
  {
    name: 'Yitbarek Alemu',
    email: 'yitbarek@fisher.et',
    phone: '+251911111015',
    license: 'FSH-2024-00140',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – North Zone (Gorgora)',
    boat: 'Deep Blue',
    reg: 'BT-2024-015',
    cap: 230,
  },
  {
    name: 'Mekonnen Hailu',
    email: 'mekonnen@fisher.et',
    phone: '+251911111016',
    license: 'FSH-2024-00141',
    status: 'VALID',
    expiry: '2026-10-31',
    zone: 'Lake Tana – West Zone (Mecha)',
    boat: 'Tana Fisher',
    reg: 'BT-2024-016',
    cap: 160,
  },
  {
    name: 'Tadesse Woldemariam',
    email: 'tadesse@fisher.et',
    phone: '+251911111017',
    license: 'FSH-2024-00142',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – East Zone (Woreta)',
    boat: 'Lake Eagle',
    reg: 'BT-2024-017',
    cap: 200,
  },
  {
    name: 'Zewdu Kebede',
    email: 'zewdu@fisher.et',
    phone: '+251911111018',
    license: 'FSH-2024-00143',
    status: 'VALID',
    expiry: '2026-11-30',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    boat: 'Tana Breeze',
    reg: 'BT-2024-018',
    cap: 180,
  },
  {
    name: 'Alemu Gebre',
    email: 'alemu@fisher.et',
    phone: '+251911111019',
    license: 'FSH-2024-00144',
    status: 'VALID',
    expiry: '2026-12-31',
    zone: 'Lake Tana – North Zone (Gorgora)',
    boat: 'North Star',
    reg: 'BT-2024-019',
    cap: 150,
  },
  {
    name: 'Negash Wolde',
    email: 'negash@fisher.et',
    phone: '+251911111020',
    license: 'FSH-2024-00145',
    status: 'VALID',
    expiry: '2026-10-31',
    zone: 'Lake Tana – East Zone (Woreta)',
    boat: 'East Wind',
    reg: 'BT-2024-020',
    cap: 175,
  },
];

const buyerData = [
  { name: 'Mesfin Hailu', email: 'mesfin@buyer.et', phone: '+251922221001', location: 'Bahir Dar' },
  {
    name: 'Selamawit Girma',
    email: 'selam@buyer.et',
    phone: '+251922221002',
    location: 'Bahir Dar',
  },
  { name: 'Henok Tesfaye', email: 'henok@buyer.et', phone: '+251922221003', location: 'Gondar' },
  { name: 'Rahel Bekele', email: 'rahel@buyer.et', phone: '+251922221004', location: 'Bahir Dar' },
  { name: 'Dawit Molla', email: 'dawitmolla@buyer.et', phone: '+251922221005', location: 'Woreta' },
];

// Insert admin users
const adminIds = {};
adminUsers.forEach((u) => {
  const r = insertUser.run({ ...u, password_hash: hash('admin123') });
  adminIds[u.email] = r.lastInsertRowid;
});

// Insert fishers
const insertFisher = db.prepare(`
  INSERT INTO fishers (user_id, license_number, license_status, license_expiry, zone_id)
  VALUES (@user_id, @license_number, @license_status, @license_expiry, @zone_id)
`);
const insertBoat = db.prepare(`
  INSERT INTO boats (fisher_id, boat_name, registration_number, capacity_kg)
  VALUES (@fisher_id, @boat_name, @registration_number, @capacity_kg)
`);

const fisherIds = {};
const fisherUserIds = {};
const boatIds = [];
fisherData.forEach((f) => {
  const ur = insertUser.run({
    name: f.name,
    email: f.email,
    password_hash: hash('fisher123'),
    role: 'fisher',
    phone: f.phone,
  });
  const userId = ur.lastInsertRowid;
  const fr = insertFisher.run({
    user_id: userId,
    license_number: f.license,
    license_status: f.status,
    license_expiry: f.expiry,
    zone_id: zoneIds[f.zone],
  });
  const fisherId = fr.lastInsertRowid;
  const br = insertBoat.run({
    fisher_id: fisherId,
    boat_name: f.boat,
    registration_number: f.reg,
    capacity_kg: f.cap,
  });
  boatIds.push(br.lastInsertRowid);
  fisherIds[f.email] = fisherId;
  fisherUserIds[f.email] = userId;
});

// Insert buyers
const insertBuyer = db.prepare(
  `INSERT INTO buyers (user_id, location) VALUES (@user_id, @location)`,
);
const buyerIds = {};
buyerData.forEach((b) => {
  const ur = insertUser.run({
    name: b.name,
    email: b.email,
    password_hash: hash('buyer123'),
    role: 'buyer',
    phone: b.phone,
  });
  insertBuyer.run({ user_id: ur.lastInsertRowid, location: b.location });
  buyerIds[b.email] = ur.lastInsertRowid;
});

console.log('✅ Users, fishers, boats, buyers seeded');

// ── 3. SPECIES QUOTAS ─────────────────────────────────────────────────────────
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

const insertQuota = db.prepare(`
  INSERT INTO species_quotas (species, monthly_limit_kg, current_month_kg, month, year)
  VALUES (@species, @monthly_limit_kg, @current_month_kg, @month, @year)
`);

const quotas = [
  { species: 'Tilapia', monthly_limit_kg: 5000, current_month_kg: 3750 },
  { species: 'Catfish', monthly_limit_kg: 2000, current_month_kg: 1400 },
  { species: 'Nile Perch', monthly_limit_kg: 2000, current_month_kg: 1200 },
  { species: 'Carp', monthly_limit_kg: 1500, current_month_kg: 900 },
  { species: 'Barbus (Ganfo)', monthly_limit_kg: 1000, current_month_kg: 650 },
];

quotas.forEach((q) => insertQuota.run({ ...q, month: currentMonth, year: currentYear }));
console.log('✅ Species quotas seeded');

// ── 4. CATCH SUBMISSIONS ──────────────────────────────────────────────────────
const insertCatch = db.prepare(`
  INSERT INTO catch_submissions
    (reference_id, fisher_id, species, quantity_kg, number_of_fish, fishing_gear,
     fishing_date, fishing_time, zone_id, gps_lat, gps_lng, photo_urls,
     zone_flag, status, rejection_reason, reviewed_by, reviewed_at, submitted_at)
  VALUES
    (@reference_id, @fisher_id, @species, @quantity_kg, @number_of_fish, @fishing_gear,
     @fishing_date, @fishing_time, @zone_id, @gps_lat, @gps_lng, @photo_urls,
     @zone_flag, @status, @rejection_reason, @reviewed_by, @reviewed_at, @submitted_at)
`);

const prices = { Tilapia: 140, Catfish: 130, 'Nile Perch': 200, Carp: 95, 'Barbus (Ganfo)': 110 };

const adminUserId = adminIds['dawit@fisheries.gov.et'];

// Historical verified catches (last 7 days)
const historicalCatches = [
  // Day 7 ago
  {
    email: 'tesfaye@fisher.et',
    species: 'Tilapia',
    qty: 30,
    fish: 15,
    gear: 'Gill Net',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 7,
    time: '06:30',
    status: 'VERIFIED',
  },
  {
    email: 'abebe@fisher.et',
    species: 'Catfish',
    qty: 20,
    fish: 8,
    gear: 'Hook & Line',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 7,
    time: '07:00',
    status: 'VERIFIED',
  },
  {
    email: 'mulugeta@fisher.et',
    species: 'Nile Perch',
    qty: 25,
    fish: 5,
    gear: 'Seine Net',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    daysBack: 7,
    time: '05:45',
    status: 'VERIFIED',
  },
  // Day 6 ago
  {
    email: 'amare@fisher.et',
    species: 'Tilapia',
    qty: 35,
    fish: 18,
    gear: 'Gill Net',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 6,
    time: '06:15',
    status: 'VERIFIED',
  },
  {
    email: 'teshome@fisher.et',
    species: 'Carp',
    qty: 18,
    fish: 10,
    gear: 'Cast Net',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 6,
    time: '07:30',
    status: 'VERIFIED',
  },
  {
    email: 'demeke@fisher.et',
    species: 'Catfish',
    qty: 22,
    fish: 9,
    gear: 'Trap',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    daysBack: 6,
    time: '06:00',
    status: 'VERIFIED',
  },
  // Day 5 ago
  {
    email: 'sisay@fisher.et',
    species: 'Barbus (Ganfo)',
    qty: 15,
    fish: 20,
    gear: 'Cast Net',
    zone: 'Lake Tana – West Zone (Mecha)',
    daysBack: 5,
    time: '06:45',
    status: 'VERIFIED',
    flag: 'RESTRICTED_ZONE',
  },
  {
    email: 'fekadu@fisher.et',
    species: 'Tilapia',
    qty: 28,
    fish: 14,
    gear: 'Gill Net',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 5,
    time: '05:30',
    status: 'VERIFIED',
  },
  {
    email: 'getachew@fisher.et',
    species: 'Nile Perch',
    qty: 20,
    fish: 4,
    gear: 'Hook & Line',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 5,
    time: '07:15',
    status: 'VERIFIED',
  },
  // Day 4 ago
  {
    email: 'berhane@fisher.et',
    species: 'Tilapia',
    qty: 40,
    fish: 20,
    gear: 'Seine Net',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    daysBack: 4,
    time: '06:00',
    status: 'VERIFIED',
  },
  {
    email: 'yitbarek@fisher.et',
    species: 'Catfish',
    qty: 25,
    fish: 10,
    gear: 'Gill Net',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 4,
    time: '06:30',
    status: 'VERIFIED',
  },
  {
    email: 'mekonnen@fisher.et',
    species: 'Carp',
    qty: 20,
    fish: 12,
    gear: 'Cast Net',
    zone: 'Lake Tana – West Zone (Mecha)',
    daysBack: 4,
    time: '07:00',
    status: 'VERIFIED',
    flag: 'RESTRICTED_ZONE',
  },
  // Day 3 ago
  {
    email: 'tadesse@fisher.et',
    species: 'Tilapia',
    qty: 32,
    fish: 16,
    gear: 'Gill Net',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 3,
    time: '05:45',
    status: 'VERIFIED',
  },
  {
    email: 'zewdu@fisher.et',
    species: 'Nile Perch',
    qty: 18,
    fish: 3,
    gear: 'Hook & Line',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    daysBack: 3,
    time: '06:15',
    status: 'VERIFIED',
  },
  {
    email: 'alemu@fisher.et',
    species: 'Barbus (Ganfo)',
    qty: 12,
    fish: 16,
    gear: 'Cast Net',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 3,
    time: '07:00',
    status: 'VERIFIED',
  },
  // Day 2 ago — mix of verified and rejected
  {
    email: 'negash@fisher.et',
    species: 'Tilapia',
    qty: 45,
    fish: 22,
    gear: 'Seine Net',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 2,
    time: '06:00',
    status: 'VERIFIED',
  },
  {
    email: 'tesfaye@fisher.et',
    species: 'Catfish',
    qty: 15,
    fish: 6,
    gear: 'Trap',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 2,
    time: '07:30',
    status: 'VERIFIED',
  },
  {
    email: 'kebede@fisher.et',
    species: 'Tilapia',
    qty: 60,
    fish: 30,
    gear: 'Gill Net',
    zone: 'Lake Tana – Core Protected Area',
    daysBack: 2,
    time: '05:00',
    status: 'REJECTED',
    flag: 'PROHIBITED_ZONE',
    reason:
      'Catch submitted from a prohibited zone (Core Protected Area). Fishing is strictly prohibited in this area.',
  },
  {
    email: 'girma@fisher.et',
    species: 'Nile Perch',
    qty: 22,
    fish: 4,
    gear: 'Hook & Line',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 2,
    time: '06:45',
    status: 'VERIFIED',
  },
  // Yesterday
  {
    email: 'abebe@fisher.et',
    species: 'Tilapia',
    qty: 28,
    fish: 14,
    gear: 'Gill Net',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 1,
    time: '06:00',
    status: 'VERIFIED',
  },
  {
    email: 'mulugeta@fisher.et',
    species: 'Carp',
    qty: 16,
    fish: 9,
    gear: 'Cast Net',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    daysBack: 1,
    time: '07:15',
    status: 'VERIFIED',
  },
  {
    email: 'amare@fisher.et',
    species: 'Catfish',
    qty: 20,
    fish: 8,
    gear: 'Trap',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 1,
    time: '05:30',
    status: 'VERIFIED',
  },
  {
    email: 'demeke@fisher.et',
    species: 'Barbus (Ganfo)',
    qty: 10,
    fish: 14,
    gear: 'Cast Net',
    zone: 'Lake Tana – South Zone (Bahir Dar)',
    daysBack: 1,
    time: '06:30',
    status: 'REJECTED',
    reason:
      'Quantity reported (10 kg) is inconsistent with the number of fish reported (14). Please resubmit with accurate data.',
  },
  // Today — pending (for demo)
  {
    email: 'tesfaye@fisher.et',
    species: 'Tilapia',
    qty: 25,
    fish: 12,
    gear: 'Gill Net',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 0,
    time: '06:30',
    status: 'PENDING',
  },
  {
    email: 'teshome@fisher.et',
    species: 'Nile Perch',
    qty: 18,
    fish: 3,
    gear: 'Hook & Line',
    zone: 'Lake Tana – East Zone (Woreta)',
    daysBack: 0,
    time: '07:00',
    status: 'PENDING',
  },
  {
    email: 'fekadu@fisher.et',
    species: 'Catfish',
    qty: 22,
    fish: 9,
    gear: 'Trap',
    zone: 'Lake Tana – North Zone (Gorgora)',
    daysBack: 0,
    time: '05:45',
    status: 'PENDING',
  },
];

const catchIdMap = {}; // email+species+daysBack -> catch id (for listing creation)

historicalCatches.forEach((c) => {
  const submittedDate = new Date(Date.now() - c.daysBack * 86400000);
  const dateStr = submittedDate.toISOString().split('T')[0].replace(/-/g, '-');
  const refId = catchRef(dateStr);
  const zone = zones.find((z) => z.name === c.zone);
  const fisherId = fisherIds[c.email];
  const reviewedAt =
    c.status !== 'PENDING' ? new Date(submittedDate.getTime() + 3600000).toISOString() : null;

  const r = insertCatch.run({
    reference_id: refId,
    fisher_id: fisherId,
    species: c.species,
    quantity_kg: c.qty,
    number_of_fish: c.fish,
    fishing_gear: c.gear,
    fishing_date: dateStr,
    fishing_time: c.time,
    zone_id: zoneIds[c.zone],
    gps_lat: zone ? zone.gps_lat : null,
    gps_lng: zone ? zone.gps_lng : null,
    photo_urls: JSON.stringify([
      `/uploads/fish_${c.species.toLowerCase().replace(/\s/g, '_')}_1.jpg`,
    ]),
    zone_flag: c.flag || null,
    status: c.status,
    rejection_reason: c.reason || null,
    reviewed_by: c.status !== 'PENDING' ? adminUserId : null,
    reviewed_at: reviewedAt,
    submitted_at: submittedDate.toISOString(),
  });

  catchIdMap[`${c.email}-${c.species}-${c.daysBack}`] = {
    id: r.lastInsertRowid,
    qty: c.qty,
    species: c.species,
    fisherId,
  };
});

console.log('✅ Catch submissions seeded');

// ── 5. MARKETPLACE LISTINGS ───────────────────────────────────────────────────
const insertListing = db.prepare(`
  INSERT INTO marketplace_listings
    (catch_id, fisher_id, species, quantity_available_kg, price_per_kg, status, listed_at, description)
  VALUES
    (@catch_id, @fisher_id, @species, @quantity_available_kg, @price_per_kg, @status, @listed_at, @description)
`);

const descriptions = {
  Tilapia: 'Fresh Lake Tana Tilapia, caught this morning. Firm flesh, ideal for grilling or stew.',
  Catfish: 'Wild-caught catfish from Lake Tana. Great for traditional Ethiopian fish dishes.',
  'Nile Perch': 'Premium Nile Perch, high commercial value. Perfect for restaurants and hotels.',
  Carp: 'Fresh carp from Lake Tana. Suitable for smoking or frying.',
  'Barbus (Ganfo)': 'Endemic Lake Tana Ganfo. Rare and prized for its delicate flavor.',
};

const listingIds = [];
Object.entries(catchIdMap).forEach(([, val]) => {
  // Only create listings for VERIFIED catches
  const catchRow = db.prepare('SELECT status FROM catch_submissions WHERE id = ?').get(val.id);
  if (catchRow && catchRow.status === 'VERIFIED') {
    const remainingQty = val.qty * (0.5 + Math.random() * 0.5); // 50–100% remaining
    const r = insertListing.run({
      catch_id: val.id,
      fisher_id: val.fisherId,
      species: val.species,
      quantity_available_kg: Math.round(remainingQty * 10) / 10,
      price_per_kg: prices[val.species] || 120,
      status: 'ACTIVE',
      listed_at: new Date().toISOString(),
      description: descriptions[val.species] || 'Fresh fish from Lake Tana.',
    });
    listingIds.push({ id: r.lastInsertRowid, qty: remainingQty, species: val.species });
  }
});

console.log(`✅ Marketplace listings seeded (${listingIds.length} listings)`);

// ── 6. ORDERS ─────────────────────────────────────────────────────────────────
const insertOrder = db.prepare(`
  INSERT INTO orders
    (reference_id, listing_id, buyer_id, quantity_kg, price_per_kg, total_price, status, ordered_at)
  VALUES
    (@reference_id, @listing_id, @buyer_id, @quantity_kg, @price_per_kg, @total_price, @status, @ordered_at)
`);
const updateListingQty = db.prepare(`
  UPDATE marketplace_listings SET quantity_available_kg = quantity_available_kg - ? WHERE id = ?
`);

const buyerUserIds = Object.values(buyerIds);
const orderSamples = [
  { listingIdx: 0, buyerIdx: 0, qty: 10, daysBack: 5 },
  { listingIdx: 1, buyerIdx: 1, qty: 8, daysBack: 5 },
  { listingIdx: 2, buyerIdx: 2, qty: 5, daysBack: 4 },
  { listingIdx: 3, buyerIdx: 0, qty: 12, daysBack: 4 },
  { listingIdx: 4, buyerIdx: 3, qty: 6, daysBack: 3 },
  { listingIdx: 5, buyerIdx: 1, qty: 9, daysBack: 3 },
  { listingIdx: 6, buyerIdx: 4, qty: 4, daysBack: 2 },
  { listingIdx: 7, buyerIdx: 0, qty: 15, daysBack: 2 },
  { listingIdx: 8, buyerIdx: 2, qty: 7, daysBack: 1 },
  { listingIdx: 9, buyerIdx: 3, qty: 10, daysBack: 1 },
  { listingIdx: 10, buyerIdx: 1, qty: 5, daysBack: 1 },
  { listingIdx: 11, buyerIdx: 4, qty: 8, daysBack: 0 },
  { listingIdx: 12, buyerIdx: 0, qty: 6, daysBack: 0 },
  { listingIdx: 13, buyerIdx: 2, qty: 3, daysBack: 0 },
  { listingIdx: 14, buyerIdx: 3, qty: 11, daysBack: 0 },
];

orderSamples.forEach((o) => {
  if (o.listingIdx >= listingIds.length) return;
  const listing = listingIds[o.listingIdx];
  const pricePerKg = prices[listing.species] || 120;
  const orderedAt = new Date(Date.now() - o.daysBack * 86400000).toISOString();
  const dateStr = orderedAt.split('T')[0].replace(/-/g, '-');
  const safeQty = Math.min(o.qty, listing.qty * 0.4);
  if (safeQty <= 0) return;

  insertOrder.run({
    reference_id: orderRef(dateStr),
    listing_id: listing.id,
    buyer_id: buyerUserIds[o.buyerIdx % buyerUserIds.length],
    quantity_kg: safeQty,
    price_per_kg: pricePerKg,
    total_price: safeQty * pricePerKg,
    status: 'CONFIRMED',
    ordered_at: orderedAt,
  });
  updateListingQty.run(safeQty, listing.id);
});

console.log('✅ Orders seeded');

// ── 7. ALERTS ─────────────────────────────────────────────────────────────────
const insertAlert = db.prepare(`
  INSERT INTO alerts (type, title, message, severity, is_read, related_entity_type, related_entity_id, created_at)
  VALUES (@type, @title, @message, @severity, @is_read, @related_entity_type, @related_entity_id, @created_at)
`);

const alerts = [
  {
    type: 'QUOTA_WARNING',
    title: 'Tilapia Quota at 75%',
    message: 'Monthly Tilapia quota has reached 75% (3,750 / 5,000 kg). Monitor closely.',
    severity: 'WARNING',
    is_read: 0,
    related_entity_type: 'quota',
    related_entity_id: 1,
    created_at: daysAgo(1),
  },
  {
    type: 'ZONE_VIOLATION',
    title: 'Prohibited Zone Catch Detected',
    message:
      'Fisher Kebede Molla submitted a catch from the Core Protected Area (Prohibited Zone). Catch has been rejected.',
    severity: 'CRITICAL',
    is_read: 0,
    related_entity_type: 'catch',
    related_entity_id: 18,
    created_at: daysAgo(2),
  },
  {
    type: 'ZONE_RESTRICTION',
    title: 'Restricted Zone Activity',
    message:
      'Fisher Sisay Negash submitted a catch from Lake Tana – West Zone (Mecha), a restricted zone. Review required.',
    severity: 'WARNING',
    is_read: 1,
    related_entity_type: 'catch',
    related_entity_id: 7,
    created_at: daysAgo(5),
  },
  {
    type: 'ZONE_RESTRICTION',
    title: 'Restricted Zone Activity',
    message:
      'Fisher Mekonnen Hailu submitted a catch from Lake Tana – West Zone (Mecha), a restricted zone. Review required.',
    severity: 'WARNING',
    is_read: 1,
    related_entity_type: 'catch',
    related_entity_id: 12,
    created_at: daysAgo(4),
  },
  {
    type: 'QUOTA_WARNING',
    title: 'Catfish Quota at 70%',
    message:
      'Monthly Catfish quota has reached 70% (1,400 / 2,000 kg). Approaching warning threshold.',
    severity: 'INFO',
    is_read: 1,
    related_entity_type: 'quota',
    related_entity_id: 2,
    created_at: daysAgo(3),
  },
];

alerts.forEach((a) => insertAlert.run(a));
console.log('✅ Alerts seeded');

// ── 8. NOTIFICATIONS ──────────────────────────────────────────────────────────
const insertNotif = db.prepare(`
  INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
  VALUES (@user_id, @type, @title, @message, @is_read, @created_at)
`);

// Notifications for Tesfaye (demo fisher)
const tesfayeUserId = fisherUserIds['tesfaye@fisher.et'];
insertNotif.run({
  user_id: tesfayeUserId,
  type: 'CATCH_APPROVED',
  title: 'Catch Approved',
  message:
    'Your catch CATCH-' +
    dateOnly(daysAgo(7)).replace(/-/g, '-') +
    '-0001 has been approved and is now listed in the marketplace.',
  is_read: 1,
  created_at: daysAgo(7),
});
insertNotif.run({
  user_id: tesfayeUserId,
  type: 'CATCH_APPROVED',
  title: 'Catch Approved',
  message: 'Your catch has been approved and is now listed in the marketplace.',
  is_read: 1,
  created_at: daysAgo(2),
});

// Notification for Kebede (rejected)
const kebedeUserId = fisherUserIds['kebede@fisher.et'];
insertNotif.run({
  user_id: kebedeUserId,
  type: 'CATCH_REJECTED',
  title: 'Catch Not Approved',
  message:
    'Your catch was not approved. Reason: Catch submitted from a prohibited zone (Core Protected Area). Fishing is strictly prohibited in this area.',
  is_read: 0,
  created_at: daysAgo(2),
});

console.log('✅ Notifications seeded');

// ── 9. BOAT TRIPS & POSITIONS (Phase 3 fleet) ─────────────────────────────────
const insertTrip = db.prepare(`
  INSERT INTO boat_trips (boat_id, fisher_id, started_at, ended_at, status)
  VALUES (@boat_id, @fisher_id, @started_at, @ended_at, @status)
`);

const tesfayeFisherId = fisherIds['tesfaye@fisher.et'];
const tesfayeBoatId = boatIds[0];
const activeTripId = insertTrip.run({
  boat_id: tesfayeBoatId,
  fisher_id: tesfayeFisherId,
  started_at: daysAgo(0),
  ended_at: null,
  status: 'ACTIVE',
}).lastInsertRowid;

// Completed trip yesterday for route history demo
const abebeBoatId = boatIds[1];
insertTrip.run({
  boat_id: abebeBoatId,
  fisher_id: fisherIds['abebe@fisher.et'],
  started_at: daysAgo(1),
  ended_at: daysAgo(1),
  status: 'COMPLETED',
});

const insertPosition = db.prepare(`
  INSERT INTO boat_positions (boat_id, trip_id, lat, lng, status, recorded_at)
  VALUES (@boat_id, @trip_id, @lat, @lng, @status, @recorded_at)
`);

const fleetStatuses = [
  'FISHING',
  'FISHING',
  'RETURNING',
  'DOCKED',
  'FISHING',
  'OFFLINE',
  'DOCKED',
  'FISHING',
];
const fleetCoords = [
  { lat: 12.21, lng: 37.28 },
  { lat: 11.92, lng: 37.7 },
  { lat: 11.58, lng: 37.36 },
  { lat: 11.8, lng: 37.05 },
  { lat: 11.68, lng: 37.32 },
  { lat: 12.05, lng: 37.45 },
  { lat: 11.57, lng: 37.38 },
  { lat: 11.95, lng: 37.55 },
];

boatIds.slice(0, 8).forEach((boatId, i) => {
  const c = fleetCoords[i % fleetCoords.length];
  const tripId = boatId === tesfayeBoatId ? activeTripId : null;
  insertPosition.run({
    boat_id: boatId,
    trip_id: tripId,
    lat: c.lat + (Math.random() - 0.5) * 0.02,
    lng: c.lng + (Math.random() - 0.5) * 0.02,
    status: fleetStatuses[i % fleetStatuses.length],
    recorded_at: new Date().toISOString(),
  });
  // Route history points for active trip
  if (tripId) {
    for (let h = 4; h >= 0; h--) {
      insertPosition.run({
        boat_id: boatId,
        trip_id: tripId,
        lat: c.lat + (4 - h) * 0.004,
        lng: c.lng + (4 - h) * 0.003,
        status: 'FISHING',
        recorded_at: new Date(Date.now() - h * 3600000).toISOString(),
      });
    }
  }
});
console.log('✅ Boat trips and positions seeded');

// ── 9b. PRICE HISTORY ─────────────────────────────────────────────────────────
const insertPrice = db.prepare(`
  INSERT INTO price_history (species, zone_id, price_per_kg, recorded_at, source)
  VALUES (@species, @zone_id, @price_per_kg, @recorded_at, @source)
`);

const speciesPrices = {
  Tilapia: 140,
  Catfish: 130,
  'Nile Perch': 200,
  Carp: 95,
  'Barbus (Ganfo)': 110,
};
Object.entries(speciesPrices).forEach(([species, base]) => {
  for (let d = 0; d < 7; d++) {
    insertPrice.run({
      species,
      zone_id: null,
      price_per_kg: base + (Math.random() - 0.5) * 15,
      recorded_at: daysAgo(d),
      source: d % 2 === 0 ? 'listing' : 'order',
    });
  }
});
console.log('✅ Price history seeded');

// ── 9c. MARKET SNAPSHOTS ──────────────────────────────────────────────────────
const insertSnapshot = db.prepare(`
  INSERT OR REPLACE INTO market_snapshots
    (snapshot_date, species, total_listed_kg, total_sold_kg, avg_price, order_count)
  VALUES (@snapshot_date, @species, @total_listed_kg, @total_sold_kg, @avg_price, @order_count)
`);

for (let d = 0; d < 14; d++) {
  const snapDate = dateOnly(daysAgo(d));
  Object.entries(speciesPrices).forEach(([species, base]) => {
    insertSnapshot.run({
      snapshot_date: snapDate,
      species,
      total_listed_kg: 80 + Math.random() * 120,
      total_sold_kg: 20 + Math.random() * 60,
      avg_price: base + (Math.random() - 0.5) * 10,
      order_count: Math.floor(1 + Math.random() * 8),
    });
  });
}
console.log('✅ Market snapshots seeded');

// ── 9d. ZONE SEASON RULES ─────────────────────────────────────────────────────
db.prepare(
  `
  INSERT INTO zone_season_rules (zone_id, species, season_start, season_end, rule_type, max_kg, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`,
).run(
  zoneIds['Lake Tana – West Zone (Mecha)'],
  'Tilapia',
  '03-01',
  '06-30',
  'LIMIT',
  500,
  'Spawning season reduced catch limit',
);
db.prepare(
  `
  INSERT INTO zone_season_rules (zone_id, species, season_start, season_end, rule_type, max_kg, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`,
).run(
  zoneIds['Zege Peninsula Waters'],
  'Nile Perch',
  '01-01',
  '12-31',
  'CLOSED',
  null,
  'Ecotourism protection — no commercial Nile Perch',
);
db.prepare(
  `
  INSERT INTO zone_season_rules (zone_id, species, season_start, season_end, rule_type, max_kg, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`,
).run(
  zoneIds['Lake Tana – North Zone (Gorgora)'],
  'Catfish',
  '07-01',
  '12-31',
  'OPEN',
  null,
  'Peak season open fishing',
);
console.log('✅ Zone season rules seeded');

// ── 10. AUDIT LOG ─────────────────────────────────────────────────────────────
const insertAudit = db.prepare(`
  INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, payload_json, ip, created_at)
  VALUES (@actor_user_id, @action, @entity_type, @entity_id, @payload_json, @ip, @created_at)
`);

const adminId = adminIds['dawit@fisheries.gov.et'];
const auditSamples = [
  {
    action: 'catch.approved',
    entity_type: 'catch',
    entity_id: 1,
    payload: { reference_id: 'CATCH-demo-0001' },
    daysBack: 7,
  },
  {
    action: 'catch.approved',
    entity_type: 'catch',
    entity_id: 2,
    payload: { reference_id: 'CATCH-demo-0002' },
    daysBack: 6,
  },
  {
    action: 'catch.rejected',
    entity_type: 'catch',
    entity_id: 18,
    payload: { reason: 'Prohibited zone' },
    daysBack: 2,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { order_reference: 'ORD-demo-0001', species: 'Tilapia' },
    daysBack: 5,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { order_reference: 'ORD-demo-0002', species: 'Catfish' },
    daysBack: 4,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { order_reference: 'ORD-demo-0003', species: 'Nile Perch' },
    daysBack: 3,
  },
  {
    action: 'catch.submitted',
    entity_type: 'catch',
    entity_id: 20,
    payload: { species: 'Tilapia', quantity_kg: 22 },
    daysBack: 1,
  },
  {
    action: 'quota.updated',
    entity_type: 'quota',
    entity_id: 1,
    payload: { monthly_limit_kg: 5000 },
    daysBack: 10,
  },
  {
    action: 'catch.approved',
    entity_type: 'catch',
    entity_id: 5,
    payload: { reference_id: 'CATCH-demo-0005' },
    daysBack: 3,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { order_reference: 'ORD-demo-0010', species: 'Tilapia' },
    daysBack: 0,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { order_reference: 'ORD-demo-0011', species: 'Carp' },
    daysBack: 0,
  },
  {
    action: 'catch.submitted',
    entity_type: 'catch',
    entity_id: 21,
    payload: { species: 'Catfish', quantity_kg: 15 },
    daysBack: 0,
  },
  {
    action: 'catch.approved',
    entity_type: 'catch',
    entity_id: 10,
    payload: { reference_id: 'CATCH-demo-0010' },
    daysBack: 2,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { order_reference: 'ORD-demo-0008' },
    daysBack: 1,
  },
  {
    action: 'catch.rejected',
    entity_type: 'catch',
    entity_id: 15,
    payload: { reason: 'Incomplete documentation' },
    daysBack: 4,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { species: 'Barbus (Ganfo)' },
    daysBack: 2,
  },
  {
    action: 'catch.submitted',
    entity_type: 'catch',
    entity_id: 22,
    payload: { species: 'Tilapia' },
    daysBack: 0,
  },
  { action: 'catch.approved', entity_type: 'catch', entity_id: 8, payload: {}, daysBack: 5 },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { total_price: 1450 },
    daysBack: 1,
  },
  {
    action: 'quota.updated',
    entity_type: 'quota',
    entity_id: 2,
    payload: { monthly_limit_kg: 2000 },
    daysBack: 8,
  },
  {
    action: 'catch.submitted',
    entity_type: 'catch',
    entity_id: 23,
    payload: { zone_flag: 'RESTRICTED_ZONE' },
    daysBack: 0,
  },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { buyer: 'Mesfin Hailu' },
    daysBack: 0,
  },
  { action: 'catch.approved', entity_type: 'catch', entity_id: 12, payload: {}, daysBack: 1 },
  {
    action: 'order.placed',
    entity_type: 'order',
    entity_id: null,
    payload: { quantity_kg: 10 },
    daysBack: 0,
  },
  {
    action: 'catch.submitted',
    entity_type: 'catch',
    entity_id: 24,
    payload: { fisher: 'Abebe Girma' },
    daysBack: 0,
  },
];

auditSamples.forEach((a) => {
  insertAudit.run({
    actor_user_id: adminId,
    action: a.action,
    entity_type: a.entity_type,
    entity_id: a.entity_id,
    payload_json: JSON.stringify(a.payload),
    ip: '127.0.0.1',
    created_at: daysAgo(a.daysBack),
  });
});
console.log('✅ Audit log seeded');

// ── 11. DOMAIN EVENTS (SSE replay buffer) ─────────────────────────────────────
const insertEvent = db.prepare(`
  INSERT INTO domain_events (event_type, payload_json, created_at) VALUES (@event_type, @payload_json, @created_at)
`);

const domainEventSamples = [
  {
    event_type: 'catch.submitted',
    payload: { reference_id: 'CATCH-seed-0020', species: 'Tilapia' },
    daysBack: 0,
  },
  { event_type: 'order.placed', payload: { species: 'Tilapia', total_price: 1400 }, daysBack: 0 },
  {
    event_type: 'listing.created',
    payload: { species: 'Catfish', price_per_kg: 130 },
    daysBack: 1,
  },
  { event_type: 'catch.approved', payload: { reference_id: 'CATCH-seed-0010' }, daysBack: 2 },
  { event_type: 'quota.warning', payload: { species: 'Tilapia', usage_pct: 75 }, daysBack: 1 },
  { event_type: 'order.placed', payload: { species: 'Nile Perch' }, daysBack: 1 },
  { event_type: 'catch.rejected', payload: { reason: 'Prohibited zone' }, daysBack: 2 },
  { event_type: 'order.placed', payload: { buyer_name: 'Mesfin Hailu' }, daysBack: 0 },
];

domainEventSamples.forEach((e) => {
  insertEvent.run({
    event_type: e.event_type,
    payload_json: JSON.stringify(e.payload),
    created_at: daysAgo(e.daysBack),
  });
});
console.log('✅ Domain events seeded');

// ── 12. INSPECTORS (Phase 2) ──────────────────────────────────────────────────
const insertInspector = db.prepare(`
  INSERT INTO users (name, email, password_hash, role, phone)
  VALUES (@name, @email, @password_hash, 'inspector', @phone)
`);

const inspectorUsers = [
  { name: 'Solomon Tesema', email: 'solomon@fisheries.gov.et', phone: '+251966111001' },
  { name: 'Hanna Mekonnen', email: 'hanna@fisheries.gov.et', phone: '+251966111002' },
  { name: 'Bereket Alemayehu', email: 'bereket@fisheries.gov.et', phone: '+251966111003' },
];

const inspectorIds = {};
inspectorUsers.forEach((u) => {
  const r = insertInspector.run({ ...u, password_hash: hash('inspector123') });
  inspectorIds[u.email] = r.lastInsertRowid;
});
console.log('✅ Inspectors seeded');

// ── 13. VIOLATIONS & COMPLIANCE ───────────────────────────────────────────────
const kebedeFisherId = fisherIds['kebede@fisher.et'];
const workuFisherId = fisherIds['worku@fisher.et'];
const hailuFisherId = fisherIds['hailu@fisher.et'];

db.prepare(
  `
  INSERT INTO violations
    (reference_id, fisher_id, zone_id, type, severity, description, status, fine_amount, fine_status, reported_by_user_id, created_at)
  VALUES
    ('VIO-20250521-0001', ?, ?, 'ZONE_VIOLATION', 'CRITICAL',
     'Catch submitted from Core Protected Area. Fishing strictly prohibited.', 'RESOLVED', 2500, 'PENDING',
     ?, ?)
`,
).run(
  kebedeFisherId,
  zoneIds['Lake Tana – Core Protected Area'],
  inspectorIds['solomon@fisheries.gov.et'],
  daysAgo(2),
);

db.prepare(
  `
  INSERT INTO violations
    (reference_id, fisher_id, type, severity, description, status, reported_by_user_id, created_at)
  VALUES
    ('VIO-20250521-0002', ?, 'LICENSE_EXPIRED', 'HIGH', 'Fishing with expired license FSH-2023-00089.', 'OPEN', ?, ?)
`,
).run(hailuFisherId, inspectorIds['hanna@fisheries.gov.et'], daysAgo(5));

db.prepare(
  `
  INSERT INTO violations
    (reference_id, fisher_id, type, severity, description, status, fine_amount, fine_status, reported_by_user_id, created_at)
  VALUES
    ('VIO-20250521-0003', ?, 'QUOTA_EVASION', 'MEDIUM', 'Under-reported catch quantity vs market listing.', 'UNDER_REVIEW', 800, 'PENDING', ?, ?)
`,
).run(workuFisherId, adminIds['dawit@fisheries.gov.et'], daysAgo(1));

const complianceService = require('../services/compliance.service');
[kebedeFisherId, workuFisherId, hailuFisherId].forEach((fid) =>
  complianceService.recalculateCompliance(db, fid),
);
fisherData.forEach((f) => {
  const fid = fisherIds[f.email];
  if (fid) complianceService.recalculateCompliance(db, fid);
});
console.log('✅ Violations and compliance scores seeded');

// ── 14. INSPECTIONS ───────────────────────────────────────────────────────────
const insertInspection = db.prepare(`
  INSERT INTO inspections
    (reference_id, inspector_id, fisher_id, zone_id, title, instructions, status, scheduled_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertInspection.run(
  'INS-20250521-0001',
  inspectorIds['solomon@fisheries.gov.et'],
  kebedeFisherId,
  zoneIds['Lake Tana – West Zone (Mecha)'],
  'Quota spot check — West Zone',
  'Verify catch logs match landing records.',
  'ASSIGNED',
  new Date(Date.now() + 7200000).toISOString(),
  new Date().toISOString(),
);
insertInspection.run(
  'INS-20250521-0002',
  inspectorIds['hanna@fisheries.gov.et'],
  hailuFisherId,
  zoneIds['Lake Tana – North Zone (Gorgora)'],
  'License renewal verification',
  'Confirm documents and boat registration.',
  'IN_PROGRESS',
  new Date().toISOString(),
  daysAgo(0),
);
insertInspection.run(
  'INS-20250521-0003',
  inspectorIds['bereket@fisheries.gov.et'],
  null,
  zoneIds['Zege Peninsula Waters'],
  'Patrol — Zege Peninsula',
  'Monitor restricted zone boundaries.',
  'ASSIGNED',
  new Date(Date.now() + 86400000).toISOString(),
  new Date().toISOString(),
);
console.log('✅ Inspections seeded');

// ── Done ──────────────────────────────────────────────────────────────────────
db.close();
console.log('\n🎉 ASSA database seeded successfully!');
console.log('─────────────────────────────────────');
console.log('Demo credentials:');
console.log('  Admin:  dawit@fisheries.gov.et  / admin123');
console.log('  Fisher: tesfaye@fisher.et       / fisher123');
console.log('  Buyer:  mesfin@buyer.et         / buyer123');
console.log('  Inspector: solomon@fisheries.gov.et / inspector123');
console.log('─────────────────────────────────────');
