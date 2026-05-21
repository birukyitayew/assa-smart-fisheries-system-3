/**
 * ASSA — Prisma seed (PostgreSQL). Run: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const complianceService = require('../src/services/compliance.service');

const prisma = new PrismaClient();
const hash = (pw) => bcrypt.hashSync(pw, 10);
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const dateOnly = (d) => (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];

let catchCounter = 1;
function catchRef(dateStr) {
  return `CATCH-${dateStr}-${String(catchCounter++).padStart(4, '0')}`;
}
let orderCounter = 1;
function orderRef(dateStr) {
  return `ORD-${dateStr}-${String(orderCounter++).padStart(4, '0')}`;
}

function zonePolygon(lat, lng, d = 0.06) {
  return JSON.stringify([
    [lat - d, lng - d], [lat + d, lng - d], [lat + d, lng + d], [lat - d, lng + d],
  ]);
}

async function clearAll() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      violations, inspections, fisher_compliance, refresh_tokens,
      domain_events, audit_log, notifications, alerts,
      orders, marketplace_listings, catch_submissions,
      boat_positions, boat_trips, boats, fishers, buyers,
      zone_season_rules, market_snapshots, price_history,
      species_quotas, fishing_zones, regions, users
    RESTART IDENTITY CASCADE
  `);
}

async function main() {
  await clearAll();

  const regionRows = await Promise.all([
    prisma.region.create({
      data: {
        name: 'Lake Tana',
        code: 'TANA',
        description: 'Lake Tana — Amhara Region',
        centerLat: 11.75,
        centerLng: 37.35,
      },
    }),
    prisma.region.create({
      data: {
        name: 'Lake Ziway',
        code: 'ZIWAY',
        description: 'Lake Ziway — Oromia Region',
        centerLat: 7.8333,
        centerLng: 38.7167,
      },
    }),
    prisma.region.create({
      data: {
        name: 'Lake Hawassa',
        code: 'HAWASSA',
        description: 'Lake Hawassa — Sidama Region',
        centerLat: 7.05,
        centerLng: 38.4667,
      },
    }),
  ]);
  const regionIds = Object.fromEntries(regionRows.map((r) => [r.code, r.id]));
  console.log('✅ Regions seeded (Tana, Ziway, Hawassa)');

  const zones = [
    { name: 'Lake Tana – North Zone (Gorgora)', type: 'ALLOWED', description: 'Primary fishing zone near Gorgora.', gpsLat: 12.2167, gpsLng: 37.2833 },
    { name: 'Lake Tana – East Zone (Woreta)', type: 'ALLOWED', description: 'Active fisher community east of the lake.', gpsLat: 11.9167, gpsLng: 37.7 },
    { name: 'Lake Tana – South Zone (Bahir Dar)', type: 'ALLOWED', description: 'High-volume zone near Bahir Dar city.', gpsLat: 11.5742, gpsLng: 37.3614 },
    { name: 'Lake Tana – West Zone (Mecha)', type: 'RESTRICTED', description: 'Seasonal restrictions apply.', gpsLat: 11.8, gpsLng: 37.05 },
    { name: 'Zege Peninsula Waters', type: 'RESTRICTED', description: 'Ecotourism overlap zone.', gpsLat: 11.6833, gpsLng: 37.3167 },
    { name: 'Lake Tana – Core Protected Area', type: 'PROHIBITED', description: 'Breeding grounds — no fishing.', gpsLat: 11.95, gpsLng: 37.4 },
  ];
  const zoneIds = {};
  for (const z of zones) {
    const polyNames = ['Lake Tana – North Zone (Gorgora)', 'Lake Tana – South Zone (Bahir Dar)', 'Lake Tana – Core Protected Area'];
    const row = await prisma.fishingZone.create({
      data: {
        ...z,
        regionId: regionIds.TANA,
        geoPolygon: polyNames.includes(z.name) ? zonePolygon(z.gpsLat, z.gpsLng) : null,
      },
    });
    zoneIds[z.name] = row.id;
  }
  console.log('✅ Fishing zones seeded (Lake Tana)');

  const ziwayZones = [
    { name: 'Lake Ziway – North Shore', type: 'ALLOWED', description: 'Primary Ziway fishing area.', gpsLat: 7.88, gpsLng: 38.7 },
    { name: 'Lake Ziway – South Basin', type: 'ALLOWED', description: 'Active south basin.', gpsLat: 7.78, gpsLng: 38.73 },
    { name: 'Lake Ziway – Bird Island Buffer', type: 'RESTRICTED', description: 'Seasonal restrictions near bird habitat.', gpsLat: 7.85, gpsLng: 38.68 },
  ];
  const hawassaZones = [
    { name: 'Lake Hawassa – Resort Bay', type: 'ALLOWED', description: 'Main Hawassa fishing zone.', gpsLat: 7.06, gpsLng: 38.47 },
    { name: 'Lake Hawassa – East Shore', type: 'ALLOWED', description: 'East shore community zone.', gpsLat: 7.04, gpsLng: 38.5 },
    { name: 'Lake Hawassa – Protected Wetland', type: 'RESTRICTED', description: 'Reduced catch limits.', gpsLat: 7.08, gpsLng: 38.44 },
  ];
  for (const z of ziwayZones) {
    const row = await prisma.fishingZone.create({ data: { ...z, regionId: regionIds.ZIWAY } });
    zoneIds[z.name] = row.id;
  }
  for (const z of hawassaZones) {
    const row = await prisma.fishingZone.create({ data: { ...z, regionId: regionIds.HAWASSA } });
    zoneIds[z.name] = row.id;
  }
  console.log('✅ Ziway and Hawassa zones seeded');

  const adminUsers = [
    { name: 'Dawit Bekele', email: 'dawit@fisheries.gov.et', role: 'superadmin', phone: '+251911234567' },
    { name: 'Tigist Haile', email: 'tigist@fisheries.gov.et', role: 'admin', phone: '+251922345678' },
    { name: 'Yonas Tadesse', email: 'yonas@fisheries.gov.et', role: 'admin', phone: '+251933456789' },
    { name: 'Mekdes Alemu', email: 'mekdes@fisheries.gov.et', role: 'admin', phone: '+251944567890' },
    { name: 'Biruk Getachew', email: 'biruk@fisheries.gov.et', role: 'admin', phone: '+251955678901' },
  ];
  const adminIds = {};
  for (const u of adminUsers) {
    const row = await prisma.user.create({
      data: { ...u, passwordHash: hash('admin123') },
    });
    adminIds[u.email] = row.id;
  }

  const regionalAdmin = await prisma.user.create({
    data: {
      name: 'Aster Zewdu',
      email: 'regional@ziway.gov.et',
      role: 'regional_admin',
      phone: '+251977000001',
      regionId: regionIds.ZIWAY,
      passwordHash: hash('admin123'),
    },
  });
  adminIds['regional@ziway.gov.et'] = regionalAdmin.id;

  const fisherData = [
    { name: 'Tesfaye Alemu', email: 'tesfaye@fisher.et', phone: '+251911111001', license: 'FSH-2024-00125', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – North Zone (Gorgora)', boat: 'Blue Star', reg: 'BT-2024-001', cap: 200 },
    { name: 'Abebe Girma', email: 'abebe@fisher.et', phone: '+251911111002', license: 'FSH-2024-00126', status: 'VALID', expiry: '2026-11-30', zone: 'Lake Tana – East Zone (Woreta)', boat: 'Morning Light', reg: 'BT-2024-002', cap: 150 },
    { name: 'Mulugeta Worku', email: 'mulugeta@fisher.et', phone: '+251911111003', license: 'FSH-2024-00127', status: 'VALID', expiry: '2026-10-31', zone: 'Lake Tana – South Zone (Bahir Dar)', boat: 'Lake Queen', reg: 'BT-2024-003', cap: 300 },
    { name: 'Hailu Desta', email: 'hailu@fisher.et', phone: '+251911111004', license: 'FSH-2023-00089', status: 'EXPIRED', expiry: '2025-12-31', zone: 'Lake Tana – North Zone (Gorgora)', boat: 'Silver Fish', reg: 'BT-2023-004', cap: 100 },
    { name: 'Kebede Molla', email: 'kebede@fisher.et', phone: '+251911111005', license: 'FSH-2024-00130', status: 'VALID', expiry: '2026-09-30', zone: 'Lake Tana – West Zone (Mecha)', boat: 'Tana Pride', reg: 'BT-2024-005', cap: 250 },
    { name: 'Girma Tadesse', email: 'girma@fisher.et', phone: '+251911111006', license: 'FSH-2024-00131', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – East Zone (Woreta)', boat: 'Dawn Catcher', reg: 'BT-2024-006', cap: 180 },
    { name: 'Worku Bekele', email: 'worku@fisher.et', phone: '+251911111007', license: 'FSH-2024-00132', status: 'SUSPENDED', expiry: '2026-08-31', zone: 'Lake Tana – South Zone (Bahir Dar)', boat: 'River Star', reg: 'BT-2024-007', cap: 120 },
    { name: 'Amare Yilma', email: 'amare@fisher.et', phone: '+251911111008', license: 'FSH-2024-00133', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – North Zone (Gorgora)', boat: 'Blue Nile', reg: 'BT-2024-008', cap: 200 },
    { name: 'Teshome Haile', email: 'teshome@fisher.et', phone: '+251911111009', license: 'FSH-2024-00134', status: 'VALID', expiry: '2026-11-30', zone: 'Lake Tana – East Zone (Woreta)', boat: 'Sunrise', reg: 'BT-2024-009', cap: 160 },
    { name: 'Demeke Assefa', email: 'demeke@fisher.et', phone: '+251911111010', license: 'FSH-2024-00135', status: 'VALID', expiry: '2026-10-31', zone: 'Lake Tana – South Zone (Bahir Dar)', boat: 'Tana Wave', reg: 'BT-2024-010', cap: 220 },
    { name: 'Sisay Negash', email: 'sisay@fisher.et', phone: '+251911111011', license: 'FSH-2024-00136', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – West Zone (Mecha)', boat: 'Green Catch', reg: 'BT-2024-011', cap: 140 },
    { name: 'Fekadu Lemma', email: 'fekadu@fisher.et', phone: '+251911111012', license: 'FSH-2024-00137', status: 'VALID', expiry: '2026-09-30', zone: 'Lake Tana – North Zone (Gorgora)', boat: 'Lake Breeze', reg: 'BT-2024-012', cap: 190 },
    { name: 'Getachew Mesfin', email: 'getachew@fisher.et', phone: '+251911111013', license: 'FSH-2024-00138', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – East Zone (Woreta)', boat: 'Tana Star', reg: 'BT-2024-013', cap: 170 },
    { name: 'Berhane Tekle', email: 'berhane@fisher.et', phone: '+251911111014', license: 'FSH-2024-00139', status: 'VALID', expiry: '2026-11-30', zone: 'Lake Tana – South Zone (Bahir Dar)', boat: 'Morning Catch', reg: 'BT-2024-014', cap: 210 },
    { name: 'Yitbarek Alemu', email: 'yitbarek@fisher.et', phone: '+251911111015', license: 'FSH-2024-00140', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – North Zone (Gorgora)', boat: 'Deep Blue', reg: 'BT-2024-015', cap: 230 },
    { name: 'Mekonnen Hailu', email: 'mekonnen@fisher.et', phone: '+251911111016', license: 'FSH-2024-00141', status: 'VALID', expiry: '2026-10-31', zone: 'Lake Tana – West Zone (Mecha)', boat: 'Tana Fisher', reg: 'BT-2024-016', cap: 160 },
    { name: 'Tadesse Woldemariam', email: 'tadesse@fisher.et', phone: '+251911111017', license: 'FSH-2024-00142', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – East Zone (Woreta)', boat: 'Lake Eagle', reg: 'BT-2024-017', cap: 200 },
    { name: 'Zewdu Kebede', email: 'zewdu@fisher.et', phone: '+251911111018', license: 'FSH-2024-00143', status: 'VALID', expiry: '2026-11-30', zone: 'Lake Tana – South Zone (Bahir Dar)', boat: 'Tana Breeze', reg: 'BT-2024-018', cap: 180 },
    { name: 'Alemu Gebre', email: 'alemu@fisher.et', phone: '+251911111019', license: 'FSH-2024-00144', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Tana – North Zone (Gorgora)', boat: 'North Star', reg: 'BT-2024-019', cap: 150 },
    { name: 'Negash Wolde', email: 'negash@fisher.et', phone: '+251911111020', license: 'FSH-2024-00145', status: 'VALID', expiry: '2026-10-31', zone: 'Lake Tana – East Zone (Woreta)', boat: 'East Wind', reg: 'BT-2024-020', cap: 175 },
  ];

  const fisherIds = {};
  const fisherUserIds = {};
  const boatIds = [];
  for (const f of fisherData) {
    const user = await prisma.user.create({
      data: { name: f.name, email: f.email, passwordHash: hash('fisher123'), role: 'fisher', phone: f.phone },
    });
    const fisher = await prisma.fisher.create({
      data: {
        userId: user.id,
        licenseNumber: f.license,
        licenseStatus: f.status,
        licenseExpiry: new Date(f.expiry),
        zoneId: zoneIds[f.zone],
      },
    });
    const boat = await prisma.boat.create({
      data: { fisherId: fisher.id, boatName: f.boat, registrationNumber: f.reg, capacityKg: f.cap },
    });
    fisherIds[f.email] = fisher.id;
    fisherUserIds[f.email] = user.id;
    boatIds.push(boat.id);
  }

  const otherLakeFishers = [
    { name: 'Chala Bekele', email: 'chala@ziway.fisher.et', phone: '+251911200001', license: 'FSH-ZWY-2024-001', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Ziway – North Shore', boat: 'Ziway Star', reg: 'ZW-2024-001', cap: 180, region: 'ZIWAY' },
    { name: 'Desta Lemma', email: 'desta@ziway.fisher.et', phone: '+251911200002', license: 'FSH-ZWY-2024-002', status: 'VALID', expiry: '2026-11-30', zone: 'Lake Ziway – South Basin', boat: 'Oromia Dawn', reg: 'ZW-2024-002', cap: 160, region: 'ZIWAY' },
    { name: 'Hirut Tadesse', email: 'hirut@hawassa.fisher.et', phone: '+251911300001', license: 'FSH-HAW-2024-001', status: 'VALID', expiry: '2026-12-31', zone: 'Lake Hawassa – Resort Bay', boat: 'Hawassa Pearl', reg: 'HW-2024-001', cap: 200, region: 'HAWASSA' },
    { name: 'Samuel Girma', email: 'samuel@hawassa.fisher.et', phone: '+251911300002', license: 'FSH-HAW-2024-002', status: 'VALID', expiry: '2026-10-31', zone: 'Lake Hawassa – East Shore', boat: 'Sidama Catch', reg: 'HW-2024-002', cap: 170, region: 'HAWASSA' },
  ];
  for (const f of otherLakeFishers) {
    const user = await prisma.user.create({
      data: { name: f.name, email: f.email, passwordHash: hash('fisher123'), role: 'fisher', phone: f.phone },
    });
    const fisher = await prisma.fisher.create({
      data: {
        userId: user.id,
        licenseNumber: f.license,
        licenseStatus: f.status,
        licenseExpiry: new Date(f.expiry),
        zoneId: zoneIds[f.zone],
      },
    });
    const boat = await prisma.boat.create({
      data: { fisherId: fisher.id, boatName: f.boat, registrationNumber: f.reg, capacityKg: f.cap },
    });
    fisherIds[f.email] = fisher.id;
    fisherUserIds[f.email] = user.id;
    boatIds.push(boat.id);
  }

  const buyerData = [
    { name: 'Mesfin Hailu', email: 'mesfin@buyer.et', phone: '+251922221001', location: 'Bahir Dar' },
    { name: 'Selamawit Girma', email: 'selam@buyer.et', phone: '+251922221002', location: 'Bahir Dar' },
    { name: 'Henok Tesfaye', email: 'henok@buyer.et', phone: '+251922221003', location: 'Gondar' },
    { name: 'Rahel Bekele', email: 'rahel@buyer.et', phone: '+251922221004', location: 'Bahir Dar' },
    { name: 'Dawit Molla', email: 'dawitmolla@buyer.et', phone: '+251922221005', location: 'Woreta' },
  ];
  const buyerIds = {};
  for (const b of buyerData) {
    const user = await prisma.user.create({
      data: { name: b.name, email: b.email, passwordHash: hash('buyer123'), role: 'buyer', phone: b.phone },
    });
    await prisma.buyer.create({ data: { userId: user.id, location: b.location } });
    buyerIds[b.email] = user.id;
  }
  console.log('✅ Users, fishers, boats, buyers seeded');

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const quotas = [
    { species: 'Tilapia', monthlyLimitKg: 5000, currentMonthKg: 3750 },
    { species: 'Catfish', monthlyLimitKg: 2000, currentMonthKg: 1400 },
    { species: 'Nile Perch', monthlyLimitKg: 2000, currentMonthKg: 1200 },
    { species: 'Carp', monthlyLimitKg: 1500, currentMonthKg: 900 },
    { species: 'Barbus (Ganfo)', monthlyLimitKg: 1000, currentMonthKg: 650 },
  ];
  for (const q of quotas) {
    await prisma.speciesQuota.create({ data: { ...q, month: currentMonth, year: currentYear } });
  }
  console.log('✅ Species quotas seeded');

  const prices = { Tilapia: 140, Catfish: 130, 'Nile Perch': 200, Carp: 95, 'Barbus (Ganfo)': 110 };
  const adminUserId = adminIds['dawit@fisheries.gov.et'];
  const historicalCatches = [
    { email: 'tesfaye@fisher.et', species: 'Tilapia', qty: 30, fish: 15, gear: 'Gill Net', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 7, time: '06:30', status: 'VERIFIED' },
    { email: 'abebe@fisher.et', species: 'Catfish', qty: 20, fish: 8, gear: 'Hook & Line', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 7, time: '07:00', status: 'VERIFIED' },
    { email: 'mulugeta@fisher.et', species: 'Nile Perch', qty: 25, fish: 5, gear: 'Seine Net', zone: 'Lake Tana – South Zone (Bahir Dar)', daysBack: 7, time: '05:45', status: 'VERIFIED' },
    { email: 'amare@fisher.et', species: 'Tilapia', qty: 35, fish: 18, gear: 'Gill Net', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 6, time: '06:15', status: 'VERIFIED' },
    { email: 'teshome@fisher.et', species: 'Carp', qty: 18, fish: 10, gear: 'Cast Net', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 6, time: '07:30', status: 'VERIFIED' },
    { email: 'demeke@fisher.et', species: 'Catfish', qty: 22, fish: 9, gear: 'Trap', zone: 'Lake Tana – South Zone (Bahir Dar)', daysBack: 6, time: '06:00', status: 'VERIFIED' },
    { email: 'sisay@fisher.et', species: 'Barbus (Ganfo)', qty: 15, fish: 20, gear: 'Cast Net', zone: 'Lake Tana – West Zone (Mecha)', daysBack: 5, time: '06:45', status: 'VERIFIED', flag: 'RESTRICTED_ZONE' },
    { email: 'fekadu@fisher.et', species: 'Tilapia', qty: 28, fish: 14, gear: 'Gill Net', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 5, time: '05:30', status: 'VERIFIED' },
    { email: 'getachew@fisher.et', species: 'Nile Perch', qty: 20, fish: 4, gear: 'Hook & Line', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 5, time: '07:15', status: 'VERIFIED' },
    { email: 'berhane@fisher.et', species: 'Tilapia', qty: 40, fish: 20, gear: 'Seine Net', zone: 'Lake Tana – South Zone (Bahir Dar)', daysBack: 4, time: '06:00', status: 'VERIFIED' },
    { email: 'yitbarek@fisher.et', species: 'Catfish', qty: 25, fish: 10, gear: 'Gill Net', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 4, time: '06:30', status: 'VERIFIED' },
    { email: 'mekonnen@fisher.et', species: 'Carp', qty: 20, fish: 12, gear: 'Cast Net', zone: 'Lake Tana – West Zone (Mecha)', daysBack: 4, time: '07:00', status: 'VERIFIED', flag: 'RESTRICTED_ZONE' },
    { email: 'tadesse@fisher.et', species: 'Tilapia', qty: 32, fish: 16, gear: 'Gill Net', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 3, time: '05:45', status: 'VERIFIED' },
    { email: 'zewdu@fisher.et', species: 'Nile Perch', qty: 18, fish: 3, gear: 'Hook & Line', zone: 'Lake Tana – South Zone (Bahir Dar)', daysBack: 3, time: '06:15', status: 'VERIFIED' },
    { email: 'alemu@fisher.et', species: 'Barbus (Ganfo)', qty: 12, fish: 16, gear: 'Cast Net', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 3, time: '07:00', status: 'VERIFIED' },
    { email: 'negash@fisher.et', species: 'Tilapia', qty: 45, fish: 22, gear: 'Seine Net', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 2, time: '06:00', status: 'VERIFIED' },
    { email: 'tesfaye@fisher.et', species: 'Catfish', qty: 15, fish: 6, gear: 'Trap', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 2, time: '07:30', status: 'VERIFIED' },
    { email: 'kebede@fisher.et', species: 'Tilapia', qty: 60, fish: 30, gear: 'Gill Net', zone: 'Lake Tana – Core Protected Area', daysBack: 2, time: '05:00', status: 'REJECTED', flag: 'PROHIBITED_ZONE', reason: 'Catch submitted from a prohibited zone (Core Protected Area).' },
    { email: 'girma@fisher.et', species: 'Nile Perch', qty: 22, fish: 4, gear: 'Hook & Line', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 2, time: '06:45', status: 'VERIFIED' },
    { email: 'abebe@fisher.et', species: 'Tilapia', qty: 28, fish: 14, gear: 'Gill Net', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 1, time: '06:00', status: 'VERIFIED' },
    { email: 'mulugeta@fisher.et', species: 'Carp', qty: 16, fish: 9, gear: 'Cast Net', zone: 'Lake Tana – South Zone (Bahir Dar)', daysBack: 1, time: '07:15', status: 'VERIFIED' },
    { email: 'amare@fisher.et', species: 'Catfish', qty: 20, fish: 8, gear: 'Trap', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 1, time: '05:30', status: 'VERIFIED' },
    { email: 'demeke@fisher.et', species: 'Barbus (Ganfo)', qty: 10, fish: 14, gear: 'Cast Net', zone: 'Lake Tana – South Zone (Bahir Dar)', daysBack: 1, time: '06:30', status: 'REJECTED', reason: 'Quantity inconsistent with number of fish reported.' },
    { email: 'tesfaye@fisher.et', species: 'Tilapia', qty: 25, fish: 12, gear: 'Gill Net', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 0, time: '06:30', status: 'PENDING' },
    { email: 'teshome@fisher.et', species: 'Nile Perch', qty: 18, fish: 3, gear: 'Hook & Line', zone: 'Lake Tana – East Zone (Woreta)', daysBack: 0, time: '07:00', status: 'PENDING' },
    { email: 'fekadu@fisher.et', species: 'Catfish', qty: 22, fish: 9, gear: 'Trap', zone: 'Lake Tana – North Zone (Gorgora)', daysBack: 0, time: '05:45', status: 'PENDING' },
    { email: 'chala@ziway.fisher.et', species: 'Tilapia', qty: 20, fish: 10, gear: 'Gill Net', zone: 'Lake Ziway – North Shore', daysBack: 1, time: '06:00', status: 'VERIFIED' },
    { email: 'desta@ziway.fisher.et', species: 'Catfish', qty: 15, fish: 6, gear: 'Trap', zone: 'Lake Ziway – South Basin', daysBack: 0, time: '07:00', status: 'PENDING' },
    { email: 'hirut@hawassa.fisher.et', species: 'Tilapia', qty: 18, fish: 9, gear: 'Gill Net', zone: 'Lake Hawassa – Resort Bay', daysBack: 1, time: '06:30', status: 'VERIFIED' },
    { email: 'samuel@hawassa.fisher.et', species: 'Nile Perch', qty: 12, fish: 2, gear: 'Hook & Line', zone: 'Lake Hawassa – East Shore', daysBack: 0, time: '05:50', status: 'PENDING' },
  ];

  const catchIdMap = {};
  for (const c of historicalCatches) {
    const submittedDate = daysAgo(c.daysBack);
    const dateStr = dateOnly(submittedDate);
    const refId = catchRef(dateStr);
    const zone = zones.find((z) => z.name === c.zone);
    const row = await prisma.catchSubmission.create({
      data: {
        referenceId: refId,
        fisherId: fisherIds[c.email],
        species: c.species,
        quantityKg: c.qty,
        numberOfFish: c.fish,
        fishingGear: c.gear,
        fishingDate: new Date(dateStr),
        fishingTime: c.time,
        zoneId: zoneIds[c.zone],
        gpsLat: zone?.gpsLat ?? null,
        gpsLng: zone?.gpsLng ?? null,
        photoUrls: JSON.stringify([`/uploads/fish_${c.species.toLowerCase().replace(/\s/g, '_')}_1.jpg`]),
        zoneFlag: c.flag || null,
        status: c.status,
        rejectionReason: c.reason || null,
        reviewedBy: c.status !== 'PENDING' ? adminUserId : null,
        reviewedAt: c.status !== 'PENDING' ? new Date(submittedDate.getTime() + 3600000) : null,
        submittedAt: submittedDate,
      },
    });
    catchIdMap[`${c.email}-${c.species}-${c.daysBack}`] = { id: row.id, qty: c.qty, species: c.species, fisherId: fisherIds[c.email], status: c.status };
  }
  console.log('✅ Catch submissions seeded');

  const descriptions = {
    Tilapia: 'Fresh Lake Tana Tilapia, government-verified.',
    Catfish: 'Wild-caught catfish from Lake Tana.',
    'Nile Perch': 'Premium Nile Perch for restaurants.',
    Carp: 'Fresh carp from Lake Tana.',
    'Barbus (Ganfo)': 'Endemic Lake Tana Ganfo.',
  };
  const listingIds = [];
  for (const val of Object.values(catchIdMap)) {
    if (val.status !== 'VERIFIED') continue;
    const remainingQty = Math.round(val.qty * (0.5 + Math.random() * 0.5) * 10) / 10;
    const listing = await prisma.marketplaceListing.create({
      data: {
        catchId: val.id,
        fisherId: val.fisherId,
        species: val.species,
        quantityAvailableKg: remainingQty,
        pricePerKg: prices[val.species] || 120,
        status: 'ACTIVE',
        description: descriptions[val.species] || 'Fresh fish from Lake Tana.',
      },
    });
    listingIds.push({ id: listing.id, qty: remainingQty, species: val.species });
  }
  console.log(`✅ Marketplace listings seeded (${listingIds.length})`);

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
  ];
  for (const o of orderSamples) {
    if (o.listingIdx >= listingIds.length) continue;
    const listing = listingIds[o.listingIdx];
    const pricePerKg = prices[listing.species] || 120;
    const orderedAt = daysAgo(o.daysBack);
    const safeQty = Math.min(o.qty, listing.qty * 0.4);
    if (safeQty <= 0) continue;
    await prisma.order.create({
      data: {
        referenceId: orderRef(dateOnly(orderedAt)),
        listingId: listing.id,
        buyerId: buyerUserIds[o.buyerIdx % buyerUserIds.length],
        quantityKg: safeQty,
        pricePerKg,
        totalPrice: safeQty * pricePerKg,
        status: 'CONFIRMED',
        orderedAt,
      },
    });
    await prisma.marketplaceListing.update({
      where: { id: listing.id },
      data: { quantityAvailableKg: { decrement: safeQty } },
    });
  }
  console.log('✅ Orders seeded');

  await prisma.alert.createMany({
    data: [
      { type: 'QUOTA_WARNING', title: 'Tilapia Quota at 75%', message: 'Monthly Tilapia quota has reached 75%.', severity: 'WARNING', isRead: false, relatedEntityType: 'quota', relatedEntityId: 1, createdAt: daysAgo(1) },
      { type: 'ZONE_VIOLATION', title: 'Prohibited Zone Catch Detected', message: 'Fisher Kebede Molla — prohibited zone catch rejected.', severity: 'CRITICAL', isRead: false, relatedEntityType: 'catch', relatedEntityId: 18, createdAt: daysAgo(2) },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: fisherUserIds['tesfaye@fisher.et'], type: 'CATCH_APPROVED', title: 'Catch Approved', message: 'Your catch has been approved and listed.', isRead: true, createdAt: daysAgo(7) },
      { userId: fisherUserIds['kebede@fisher.et'], type: 'CATCH_REJECTED', title: 'Catch Not Approved', message: 'Prohibited zone catch rejected.', isRead: false, createdAt: daysAgo(2) },
    ],
  });

  const tesfayeFisherId = fisherIds['tesfaye@fisher.et'];
  const tesfayeBoatId = boatIds[0];
  const activeTrip = await prisma.boatTrip.create({
    data: { boatId: tesfayeBoatId, fisherId: tesfayeFisherId, startedAt: daysAgo(0), status: 'ACTIVE' },
  });
  await prisma.boatTrip.create({
    data: { boatId: boatIds[1], fisherId: fisherIds['abebe@fisher.et'], startedAt: daysAgo(1), endedAt: daysAgo(1), status: 'COMPLETED' },
  });

  const fleetStatuses = ['FISHING', 'FISHING', 'RETURNING', 'DOCKED', 'FISHING', 'OFFLINE', 'DOCKED', 'FISHING'];
  const fleetCoords = [
    { lat: 12.21, lng: 37.28 }, { lat: 11.92, lng: 37.7 }, { lat: 11.58, lng: 37.36 },
    { lat: 11.8, lng: 37.05 }, { lat: 11.68, lng: 37.32 }, { lat: 12.05, lng: 37.45 },
    { lat: 11.57, lng: 37.38 }, { lat: 11.95, lng: 37.55 },
  ];
  for (let i = 0; i < Math.min(8, boatIds.length); i++) {
    const c = fleetCoords[i];
    const tripId = boatIds[i] === tesfayeBoatId ? activeTrip.id : null;
    await prisma.boatPosition.create({
      data: {
        boatId: boatIds[i],
        tripId,
        lat: c.lat + (Math.random() - 0.5) * 0.02,
        lng: c.lng + (Math.random() - 0.5) * 0.02,
        status: fleetStatuses[i],
      },
    });
    if (tripId) {
      for (let h = 4; h >= 0; h--) {
        await prisma.boatPosition.create({
          data: {
            boatId: boatIds[i],
            tripId,
            lat: c.lat + (4 - h) * 0.004,
            lng: c.lng + (4 - h) * 0.003,
            status: 'FISHING',
            recordedAt: new Date(Date.now() - h * 3600000),
          },
        });
      }
    }
  }
  console.log('✅ Boat trips and positions seeded');

  const speciesPrices = { Tilapia: 140, Catfish: 130, 'Nile Perch': 200, Carp: 95, 'Barbus (Ganfo)': 110 };
  for (const [species, base] of Object.entries(speciesPrices)) {
    for (let d = 0; d < 7; d++) {
      await prisma.priceHistory.create({
        data: { species, pricePerKg: base + (Math.random() - 0.5) * 15, recordedAt: daysAgo(d), source: d % 2 === 0 ? 'listing' : 'order' },
      });
    }
  }
  for (let d = 0; d < 14; d++) {
    const snapDate = new Date(dateOnly(daysAgo(d)));
    for (const [species, base] of Object.entries(speciesPrices)) {
      await prisma.marketSnapshot.upsert({
        where: { snapshotDate_species: { snapshotDate: snapDate, species } },
        create: {
          snapshotDate: snapDate,
          species,
          totalListedKg: 80 + Math.random() * 120,
          totalSoldKg: 20 + Math.random() * 60,
          avgPrice: base + (Math.random() - 0.5) * 10,
          orderCount: Math.floor(1 + Math.random() * 8),
        },
        update: {},
      });
    }
  }
  console.log('✅ Price history and market snapshots seeded');

  await prisma.zoneSeasonRule.createMany({
    data: [
      { zoneId: zoneIds['Lake Tana – West Zone (Mecha)'], species: 'Tilapia', seasonStart: '03-01', seasonEnd: '06-30', ruleType: 'LIMIT', maxKg: 500, notes: 'Spawning season reduced catch limit' },
      { zoneId: zoneIds['Zege Peninsula Waters'], species: 'Nile Perch', seasonStart: '01-01', seasonEnd: '12-31', ruleType: 'CLOSED', notes: 'Ecotourism protection' },
      { zoneId: zoneIds['Lake Tana – North Zone (Gorgora)'], species: 'Catfish', seasonStart: '07-01', seasonEnd: '12-31', ruleType: 'OPEN', notes: 'Peak season open fishing' },
    ],
  });

  const inspectorUsers = [
    { name: 'Solomon Tesema', email: 'solomon@fisheries.gov.et', phone: '+251966111001' },
    { name: 'Hanna Mekonnen', email: 'hanna@fisheries.gov.et', phone: '+251966111002' },
    { name: 'Bereket Alemayehu', email: 'bereket@fisheries.gov.et', phone: '+251966111003' },
  ];
  const inspectorIds = {};
  for (const u of inspectorUsers) {
    const row = await prisma.user.create({
      data: { ...u, passwordHash: hash('inspector123'), role: 'inspector' },
    });
    inspectorIds[u.email] = row.id;
  }

  await prisma.violation.createMany({
    data: [
      { referenceId: 'VIO-20250521-0001', fisherId: fisherIds['kebede@fisher.et'], zoneId: zoneIds['Lake Tana – Core Protected Area'], type: 'ZONE_VIOLATION', severity: 'CRITICAL', description: 'Catch from Core Protected Area.', status: 'RESOLVED', fineAmount: 2500, fineStatus: 'PENDING', reportedByUserId: inspectorIds['solomon@fisheries.gov.et'], createdAt: daysAgo(2) },
      { referenceId: 'VIO-20250521-0002', fisherId: fisherIds['hailu@fisher.et'], type: 'LICENSE_EXPIRED', severity: 'HIGH', description: 'Fishing with expired license.', status: 'OPEN', reportedByUserId: inspectorIds['hanna@fisheries.gov.et'], createdAt: daysAgo(5) },
      { referenceId: 'VIO-20250521-0003', fisherId: fisherIds['worku@fisher.et'], type: 'QUOTA_EVASION', severity: 'MEDIUM', description: 'Under-reported catch quantity.', status: 'UNDER_REVIEW', fineAmount: 800, fineStatus: 'PENDING', reportedByUserId: adminUserId, createdAt: daysAgo(1) },
    ],
  });
  for (const f of fisherData) {
    await complianceService.recalculateCompliance(fisherIds[f.email]);
  }

  await prisma.inspection.createMany({
    data: [
      { referenceId: 'INS-20250521-0001', inspectorId: inspectorIds['solomon@fisheries.gov.et'], fisherId: fisherIds['kebede@fisher.et'], zoneId: zoneIds['Lake Tana – West Zone (Mecha)'], title: 'Quota spot check — West Zone', instructions: 'Verify catch logs.', status: 'ASSIGNED', scheduledAt: new Date(Date.now() + 7200000) },
      { referenceId: 'INS-20250521-0002', inspectorId: inspectorIds['hanna@fisheries.gov.et'], fisherId: fisherIds['hailu@fisher.et'], zoneId: zoneIds['Lake Tana – North Zone (Gorgora)'], title: 'License renewal verification', status: 'IN_PROGRESS', scheduledAt: new Date() },
    ],
  });

  await prisma.auditLog.create({
    data: { actorUserId: adminUserId, action: 'catch.approved', entityType: 'catch', entityId: 1, payloadJson: JSON.stringify({ reference_id: 'CATCH-demo-0001' }), ip: '127.0.0.1', createdAt: daysAgo(7) },
  });
  await prisma.domainEvent.create({
    data: { eventType: 'catch.submitted', payloadJson: JSON.stringify({ species: 'Tilapia' }), createdAt: daysAgo(0) },
  });

  console.log('\n🎉 ASSA database seeded successfully!');
  console.log('  Admin:          dawit@fisheries.gov.et / admin123');
  console.log('  Regional Admin: regional@ziway.gov.et / admin123 (Lake Ziway only)');
  console.log('  Fisher:         tesfaye@fisher.et / fisher123');
  console.log('  Ziway Fisher:   chala@ziway.fisher.et / fisher123');
  console.log('  Buyer:          mesfin@buyer.et / buyer123');
  console.log('  Inspector:      solomon@fisheries.gov.et / inspector123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
