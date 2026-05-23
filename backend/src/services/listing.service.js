/**
 * Listing Service
 * Auto-creates a marketplace listing when a catch is approved.
 */

const PRICES = {
  Tilapia: 140,
  Catfish: 130,
  'Nile Perch': 200,
  Carp: 95,
  'Barbus (Ganfo)': 110,
};

const DESCRIPTIONS = {
  Tilapia: 'Fresh Lake Tana Tilapia, government-verified. Firm flesh, ideal for grilling or stew.',
  Catfish: 'Wild-caught catfish from Lake Tana. Great for traditional Ethiopian fish dishes.',
  'Nile Perch': 'Premium Nile Perch, high commercial value. Perfect for restaurants and hotels.',
  Carp: 'Fresh carp from Lake Tana. Suitable for smoking or frying.',
  'Barbus (Ganfo)': 'Endemic Lake Tana Ganfo. Rare and prized for its delicate flavor.',
};

const eventBus = require('./eventBus');
const priceHistoryService = require('./price-history.service');
const { prisma } = require('../database/prisma');

async function createListing(catchRow, tx = prisma) {
  const pricePerKg = PRICES[catchRow.species] || 120;
  const description =
    DESCRIPTIONS[catchRow.species] || 'Fresh fish from Lake Tana, government-verified.';

  const listing = await tx.marketplaceListing.create({
    data: {
      catchId: catchRow.id,
      fisherId: catchRow.fisher_id ?? catchRow.fisherId,
      species: catchRow.species,
      quantityAvailableKg: catchRow.quantity_kg ?? catchRow.quantityKg,
      pricePerKg,
      status: 'ACTIVE',
      description,
    },
  });

  await priceHistoryService.recordPrice({
    species: catchRow.species,
    zoneId: catchRow.zone_id ?? catchRow.zoneId,
    pricePerKg,
    source: 'listing',
  }, tx);

  eventBus.emit('listing.created', {
    listing_id: listing.id,
    catch_id: catchRow.id,
    fisher_id: catchRow.fisher_id ?? catchRow.fisherId,
    species: catchRow.species,
    quantity_kg: catchRow.quantity_kg ?? catchRow.quantityKg,
    price_per_kg: pricePerKg,
  });

  return { id: listing.id };
}

module.exports = { createListing };
