const { validationResult } = require('express-validator');
const { prisma } = require('../database/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const eventBus = require('../services/eventBus');
const { auditFromReq } = require('../services/audit.service');
const geoService = require('../services/geo.service');
const fleetService = require('../services/fleet.service');
const complianceService = require('../services/compliance.service');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { uploadBufferToCloudinary } = require('../middleware/upload.middleware');

async function getZones(req, res) {
  const zones = await prisma.fishingZone.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  const mappedZones = zones.map((z) => ({
    id: z.id,
    region_id: z.regionId,
    name: z.name,
    type: z.type,
    description: z.description,
    gps_lat: z.gpsLat,
    gps_lng: z.gpsLng,
    geo_polygon: z.geoPolygon,
  }));

  res.json({ zones: mappedZones });
}

async function getProfile(req, res) {
  const fisher = await prisma.fisher.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      zone: {
        select: {
          name: true,
          type: true,
        },
      },
      boats: {
        take: 1,
        select: {
          boatName: true,
          registrationNumber: true,
          capacityKg: true,
        },
      },
    },
  });

  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });

  const profile = {
    id: fisher.id,
    user_id: fisher.userId,
    license_number: fisher.licenseNumber,
    license_status: fisher.licenseStatus,
    license_expiry: fisher.licenseExpiry,
    zone_id: fisher.zoneId,
    profile_photo_url: fisher.profilePhotoUrl,
    created_at: fisher.createdAt,
    name: fisher.user?.name,
    email: fisher.user?.email,
    phone: fisher.user?.phone,
    zone_name: fisher.zone?.name,
    zone_type: fisher.zone?.type,
    boat_name: fisher.boats?.[0]?.boatName,
    registration_number: fisher.boats?.[0]?.registrationNumber,
    capacity_kg: fisher.boats?.[0]?.capacityKg,
  };

  const today = new Date().toISOString().split('T')[0];
  const fishingTripsToday = await fleetService.countTripsToday(profile.id);

  const catchesTodayList = await prisma.catchSubmission.findMany({
    where: {
      fisherId: profile.id,
      fishingDate: new Date(`${today}T00:00:00.000Z`),
    },
    select: {
      status: true,
      quantityKg: true,
    },
  });

  const catches_today = catchesTodayList.length;
  const verified_kg = catchesTodayList
    .filter((c) => c.status === 'VERIFIED')
    .reduce((sum, c) => sum + c.quantityKg, 0);
  const total_kg = catchesTodayList.reduce((sum, c) => sum + c.quantityKg, 0);

  const todaySummary = {
    catches_today,
    verified_kg,
    total_kg,
    fishing_trips_today: fishingTripsToday,
    trips_today: fishingTripsToday,
  };

  const activeTrip = await fleetService.getActiveTripForFisher(profile.id);
  const compliance = await complianceService.getCompliance(profile.id);

  const openViolationsRaw = await prisma.violation.findMany({
    where: {
      fisherId: profile.id,
      status: { in: ['OPEN', 'UNDER_REVIEW'] },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  });

  const openViolations = openViolationsRaw.map((v) => ({
    reference_id: v.referenceId,
    type: v.type,
    severity: v.severity,
    description: v.description,
    status: v.status,
    fine_amount: v.fineAmount,
    created_at: v.createdAt,
  }));

  res.json({ profile, todaySummary, compliance, openViolations, activeTrip: activeTrip || null });
}

async function startTrip(req, res) {
  const fisher = await prisma.fisher.findUnique({
    where: { userId: req.user.id },
  });
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });
  if (fisher.licenseStatus !== 'VALID') {
    return res.status(403).json({ error: 'Valid license required to start a trip' });
  }

  const result = await fleetService.startTrip(fisher.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json({ trip: result.trip, boat: result.boat });
}

async function endTrip(req, res) {
  const fisher = await prisma.fisher.findUnique({
    where: { userId: req.user.id },
  });
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });

  const result = await fleetService.endTrip(fisher.id);
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json({ trip: result.trip });
}

async function getActiveTrip(req, res) {
  const fisher = await prisma.fisher.findUnique({
    where: { userId: req.user.id },
  });
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });

  const trip = await fleetService.getActiveTripForFisher(fisher.id);
  res.json({ trip: trip || null });
}

async function getCatches(req, res) {
  const fisher = await prisma.fisher.findUnique({
    where: { userId: req.user.id },
  });
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const catches = await prisma.catchSubmission.findMany({
    where: { fisherId: fisher.id },
    include: {
      zone: {
        select: {
          name: true,
          type: true,
        },
      },
      reviewer: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'desc',
    },
  });

  const mappedCatches = catches.map((cs) => ({
    id: cs.id,
    reference_id: cs.referenceId,
    fisher_id: cs.fisherId,
    species: cs.species,
    quantity_kg: cs.quantityKg,
    number_of_fish: cs.numberOfFish,
    fishing_gear: cs.fishingGear,
    fishing_date: cs.fishingDate,
    fishing_time: cs.fishingTime,
    zone_id: cs.zoneId,
    gps_lat: cs.gpsLat,
    gps_lng: cs.gpsLng,
    photo_urls: cs.photoUrls,
    zone_flag: cs.zoneFlag,
    status: cs.status,
    rejection_reason: cs.rejectionReason,
    reviewed_by: cs.reviewedBy,
    reviewed_at: cs.reviewedAt,
    submitted_at: cs.submittedAt,
    zone_name: cs.zone?.name,
    zone_type: cs.zone?.type,
    reviewed_by_name: cs.reviewer?.name,
  }));

  res.json({ catches: mappedCatches });
}

async function getCatch(req, res) {
  const fisher = await prisma.fisher.findUnique({
    where: { userId: req.user.id },
  });
  if (!fisher) return res.status(404).json({ error: 'Fisher not found' });

  const catchRow = await prisma.catchSubmission.findFirst({
    where: {
      id: Number(req.params.id),
      fisherId: fisher.id,
    },
    include: {
      zone: {
        select: {
          name: true,
          type: true,
        },
      },
    },
  });

  if (!catchRow) return res.status(404).json({ error: 'Catch not found' });

  const mappedCatch = {
    id: catchRow.id,
    reference_id: catchRow.referenceId,
    fisher_id: catchRow.fisherId,
    species: catchRow.species,
    quantity_kg: catchRow.quantityKg,
    number_of_fish: catchRow.numberOfFish,
    fishing_gear: catchRow.fishingGear,
    fishing_date: catchRow.fishingDate,
    fishing_time: catchRow.fishingTime,
    zone_id: catchRow.zoneId,
    gps_lat: catchRow.gpsLat,
    gps_lng: catchRow.gpsLng,
    photo_urls: catchRow.photoUrls,
    zone_flag: catchRow.zoneFlag,
    status: catchRow.status,
    rejection_reason: catchRow.rejectionReason,
    reviewed_by: catchRow.reviewedBy,
    reviewed_at: catchRow.reviewedAt,
    submitted_at: catchRow.submittedAt,
    zone_name: catchRow.zone?.name,
    zone_type: catchRow.zone?.type,
  };

  res.json({ catch: mappedCatch });
}

async function submitCatch(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const fisher = await prisma.fisher.findUnique({
    where: { userId: req.user.id },
    include: { user: true },
  });
  if (!fisher) return res.status(404).json({ error: 'Fisher profile not found' });
  if (fisher.licenseStatus !== 'VALID') {
    return res.status(403).json({ error: 'Your license is not valid. You cannot submit catches.' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (req.body.fishing_date > today) {
    return res.status(400).json({ error: 'Fishing date cannot be in the future' });
  }

  const zone = await prisma.fishingZone.findUnique({
    where: { id: req.body.zone_id },
  });
  if (!zone) return res.status(400).json({ error: 'Invalid fishing zone' });

  const dateStr = req.body.fishing_date;
  const count = await prisma.catchSubmission.count({
    where: {
      fishingDate: new Date(`${dateStr}T00:00:00.000Z`),
    },
  });

  // Unique suffix to prevent concurrency race condition
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const seqNum = String(count + 1).padStart(4, '0');
  const referenceId = `CATCH-${dateStr}-${seqNum}-${randomSuffix}`;

  const gpsLat = req.body.gps_lat != null ? Number(req.body.gps_lat) : zone.gpsLat;
  const gpsLng = req.body.gps_lng != null ? Number(req.body.gps_lng) : zone.gpsLng;

  const zoneMapped = {
    id: zone.id,
    name: zone.name,
    type: zone.type,
    geo_polygon: zone.geoPolygon,
    gps_lat: zone.gpsLat,
    gps_lng: zone.gpsLng,
  };

  const geo = geoService.validateCatchLocation(zoneMapped, gpsLat, gpsLng);
  const zoneFlag = geo.zone_flag;
  const photoUrls = req.body.photo_urls || [];

  const created = await prisma.catchSubmission.create({
    data: {
      referenceId,
      fisherId: fisher.id,
      species: req.body.species,
      quantityKg: req.body.quantity_kg,
      numberOfFish: req.body.number_of_fish || null,
      fishingGear: req.body.fishing_gear,
      fishingDate: new Date(`${dateStr}T00:00:00.000Z`),
      fishingTime: req.body.fishing_time,
      zoneId: req.body.zone_id,
      gpsLat,
      gpsLng,
      photoUrls: JSON.stringify(photoUrls),
      zoneFlag,
      status: 'PENDING',
    },
  });

  if (geo.flags.includes('GPS_MISMATCH')) {
    await prisma.alert.create({
      data: {
        type: 'GPS_MISMATCH',
        title: 'GPS Location Mismatch',
        message: `Fisher ${fisher.user.name} catch GPS is far from selected zone ${zone.name} (distance ~${Math.round(geo.distance_km || 0)} km).`,
        severity: 'WARNING',
        relatedEntityType: 'catch',
        relatedEntityId: created.id,
      },
    });
  }

  if (zoneFlag === 'RESTRICTED_ZONE') {
    await prisma.alert.create({
      data: {
        type: 'ZONE_RESTRICTION',
        title: 'Restricted Zone Activity',
        message: `Fisher ${fisher.user.name} submitted a catch from ${zone.name}, a restricted zone. Review required.`,
        severity: 'WARNING',
        relatedEntityType: 'catch',
        relatedEntityId: created.id,
      },
    });
  }
  if (zoneFlag === 'PROHIBITED_ZONE') {
    await prisma.alert.create({
      data: {
        type: 'ZONE_VIOLATION',
        title: 'Prohibited Zone Catch Detected',
        message: `Fisher ${fisher.user.name} submitted a catch from ${zone.name} (Prohibited Zone). Immediate review required.`,
        severity: 'CRITICAL',
        relatedEntityType: 'catch',
        relatedEntityId: created.id,
      },
    });
  }

  auditFromReq(req, 'catch.submitted', 'catch', created.id, {
    reference_id: referenceId,
    species: req.body.species,
    quantity_kg: req.body.quantity_kg,
    fisher_id: fisher.id,
  });

  eventBus.emit('catch.submitted', {
    id: created.id,
    reference_id: referenceId,
    fisher_id: fisher.id,
    fisher_name: fisher.user.name,
    species: req.body.species,
    quantity_kg: req.body.quantity_kg,
    zone_name: zone.name,
    zone_flag: zoneFlag,
    status: 'PENDING',
  });

  res.status(201).json({
    success: true,
    id: created.id,
    reference_id: referenceId,
    status: 'PENDING',
    submitted_at: created.submittedAt.toISOString(),
    zone_flag: zoneFlag,
  });
}

async function getNotifications(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });

  const mappedNotifications = notifications.map((n) => ({
    id: n.id,
    user_id: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    is_read: n.isRead,
    created_at: n.createdAt,
  }));

  res.json({ notifications: mappedNotifications, unreadCount });
}

async function markNotificationRead(req, res) {
  await prisma.notification.updateMany({
    where: { id: Number(req.params.id), userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true });
}

async function markAllNotificationsRead(req, res) {
  await prisma.notification.updateMany({
    where: { userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true });
}

async function uploadCatchPhoto(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo file provided' });
  }

  try {
    let url;
    if (process.env.CLOUDINARY_URL) {
      url = await uploadBufferToCloudinary(req.file.buffer);
    } else {
      const uploadsDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filename = `catch-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${path.extname(req.file.originalname) || '.jpg'}`;
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, req.file.buffer);
      url = `/uploads/${filename}`;
    }

    res.json({ url });
  } catch (error) {
    req.log?.error(error, 'Error uploading photo');
    res.status(500).json({ error: 'Failed to upload photo' });
  }
}

module.exports = {
  getZones: asyncHandler(getZones),
  getProfile: asyncHandler(getProfile),
  getCatches: asyncHandler(getCatches),
  getCatch: asyncHandler(getCatch),
  submitCatch: asyncHandler(submitCatch),
  getNotifications: asyncHandler(getNotifications),
  markNotificationRead: asyncHandler(markNotificationRead),
  markAllNotificationsRead: asyncHandler(markAllNotificationsRead),
  startTrip: asyncHandler(startTrip),
  endTrip: asyncHandler(endTrip),
  getActiveTrip: asyncHandler(getActiveTrip),
  uploadCatchPhoto: asyncHandler(uploadCatchPhoto),
};
