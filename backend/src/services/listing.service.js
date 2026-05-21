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
  Tilapia:        'Fresh Lake Tana Tilapia, government-verified. Firm flesh, ideal for grilling or stew.',
  Catfish:        'Wild-caught catfish from Lake Tana. Great for traditional Ethiopian fish dishes.',
  'Nile Perch':   'Premium Nile Perch, high commercial value. Perfect for restaurants and hotels.',
  Carp:           'Fresh carp from Lake Tana. Suitable for smoking or frying.',
  'Barbus (Ganfo)':'Endemic Lake Tana Ganfo. Rare and prized for its delicate flavor.',
};

const eventBus = require('./eventBus');
const priceHistoryService = require('./price-history.service');

function createListing(db, catchRow) {
  const pricePerKg = PRICES[catchRow.species] || 120;
  const description = DESCRIPTIONS[catchRow.species] || 'Fresh fish from Lake Tana, government-verified.';

  const result = db.prepare(`
    INSERT INTO marketplace_listings
      (catch_id, fisher_id, species, quantity_available_kg, price_per_kg, status, listed_at, description)
    VALUES (?, ?, ?, ?, ?, 'ACTIVE', datetime('now'), ?)
  `).run(
    catchRow.id,
    catchRow.fisher_id,
    catchRow.species,
    catchRow.quantity_kg,
    pricePerKg,
    description
  );

  const listingId = result.lastInsertRowid;

  priceHistoryService.recordPrice(db, {
    species: catchRow.species,
    zoneId: catchRow.zone_id,
    pricePerKg,
    source: 'listing',
  });

  eventBus.emit('listing.created', {
    listing_id: listingId,
    catch_id: catchRow.id,
    fisher_id: catchRow.fisher_id,
    species: catchRow.species,
    quantity_kg: catchRow.quantity_kg,
    price_per_kg: pricePerKg,
  });
  return { id: listingId };
}

module.exports = { createListing };
