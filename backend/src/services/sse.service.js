/**
 * SSE client registry and broadcast for admin command center.
 *
 * NOTE ON ARCHITECTURE (Option B - Single Instance Force):
 * This service runs entirely in-memory and is designed for a single-instance Node.js deployment.
 * Horizontal scaling (multiple API instances) is not supported under this layout because SSE events
 * from one instance will not be received by clients connected to another.
 * To support horizontal scale-out in the future, migrate eventBus.js to Redis Pub/Sub.
 */

const eventBus = require('./eventBus');
const { prisma } = require('../database/prisma');

const clients = new Set();
const marketClients = new Set();
const MARKET_EVENTS = new Set(['listing.created', 'order.placed']);
const MAX_REPLAY = 50;

/**
 * Persist event to the database and return its auto-incremented ID.
 */
async function persistEvent(eventType, payload) {
  try {
    const created = await prisma.domainEvent.create({
      data: {
        eventType,
        payloadJson: JSON.stringify(payload),
      },
    });

    // Keep database size bounded by removing events older than the replay window
    const count = await prisma.domainEvent.count();
    if (count > MAX_REPLAY * 2) {
      const oldestToKeep = await prisma.domainEvent.findMany({
        orderBy: { id: 'desc' },
        take: MAX_REPLAY,
        select: { id: true },
      });
      if (oldestToKeep.length > 0) {
        const minIdToKeep = oldestToKeep[oldestToKeep.length - 1].id;
        await prisma.domainEvent.deleteMany({
          where: {
            id: { lt: minIdToKeep },
          },
        });
      }
    }
    return created.id;
  } catch (err) {
    // Database is unavailable or busy; fallback to a timestamp-based ID
    return Date.now();
  }
}

function anonymizeForMarket(eventType, payload) {
  if (eventType === 'order.placed') {
    return {
      ...payload,
      buyer_name: payload.buyer_name ? `${payload.buyer_name.split(' ')[0]} B.` : 'Buyer',
    };
  }
  return payload;
}

/**
 * Broadcaster that pushes events to all connected clients and appends SSE unique IDs.
 */
async function broadcast(eventType, payload) {
  const eventId = await persistEvent(eventType, payload);
  const data = JSON.stringify({
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
    id: eventId,
  });
  const message = `id: ${eventId}\nevent: ${eventType}\ndata: ${data}\n\n`;

  clients.forEach((client) => {
    try {
      client.res.write(message);
    } catch {
      clients.delete(client);
    }
  });

  if (MARKET_EVENTS.has(eventType)) {
    const marketPayload = anonymizeForMarket(eventType, payload);
    const marketData = JSON.stringify({
      type: eventType,
      payload: marketPayload,
      timestamp: new Date().toISOString(),
      id: eventId,
    });
    const marketMessage = `id: ${eventId}\nevent: ${eventType}\ndata: ${marketData}\n\n`;
    marketClients.forEach((client) => {
      try {
        client.res.write(marketMessage);
      } catch {
        marketClients.delete(client);
      }
    });
  }
}

eventBus.subscribe((event) => {
  void broadcast(event.type, event.payload);
});

/**
 * Replay the most recent N events.
 */
async function replayRecentEvents(res, limit, filterTypes = null) {
  const recent = await prisma.domainEvent.findMany({
    where: filterTypes ? { eventType: { in: filterTypes } } : undefined,
    orderBy: { id: 'desc' },
    take: limit,
  });

  recent.reverse().forEach((row) => {
    const rawPayload = JSON.parse(row.payloadJson || '{}');
    const payload = filterTypes ? anonymizeForMarket(row.eventType, rawPayload) : rawPayload;
    const data = JSON.stringify({
      type: row.eventType,
      payload,
      timestamp: row.createdAt,
      replay: true,
      id: row.id,
    });
    res.write(`id: ${row.id}\nevent: ${row.eventType}\ndata: ${data}\n\n`);
  });
}

/**
 * Replay missed events since Last-Event-ID for self-healing network drops.
 */
async function replayEventsSince(res, lastId, filterTypes = null) {
  const missed = await prisma.domainEvent.findMany({
    where: {
      id: { gt: lastId },
      eventType: filterTypes ? { in: filterTypes } : undefined,
    },
    orderBy: { id: 'asc' },
  });

  missed.forEach((row) => {
    const rawPayload = JSON.parse(row.payloadJson || '{}');
    const payload = filterTypes ? anonymizeForMarket(row.eventType, rawPayload) : rawPayload;
    const data = JSON.stringify({
      type: row.eventType,
      payload,
      timestamp: row.createdAt,
      replay: true,
      id: row.id,
    });
    res.write(`id: ${row.id}\nevent: ${row.eventType}\ndata: ${data}\n\n`);
  });
}

function addClient(req, res) {
  const client = { res, connectedAt: Date.now() };
  clients.add(client);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  // Check for Last-Event-ID header or query string
  const lastEventIdStr = req.headers['last-event-id'] || req.query.lastEventId;
  const lastEventId = lastEventIdStr ? Number(lastEventIdStr) : null;

  if (Number.isFinite(lastEventId) && lastEventId > 0) {
    replayEventsSince(res, lastEventId).catch(() => {});
  } else {
    replayRecentEvents(res, MAX_REPLAY).catch(() => {});
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(client);
    }
  }, 30000);

  res.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });

  return client;
}

function addMarketClient(req, res) {
  const client = { res, connectedAt: Date.now() };
  marketClients.add(client);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const lastEventIdStr = req.headers['last-event-id'] || req.query.lastEventId;
  const lastEventId = lastEventIdStr ? Number(lastEventIdStr) : null;

  const marketFilters = ['listing.created', 'order.placed'];

  if (Number.isFinite(lastEventId) && lastEventId > 0) {
    replayEventsSince(res, lastEventId, marketFilters).catch(() => {});
  } else {
    replayRecentEvents(res, 20, marketFilters).catch(() => {});
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      marketClients.delete(client);
    }
  }, 30000);

  res.on('close', () => {
    clearInterval(heartbeat);
    marketClients.delete(client);
  });

  return client;
}

function getClientCount() {
  return clients.size;
}

module.exports = { addClient, addMarketClient, broadcast, getClientCount };
