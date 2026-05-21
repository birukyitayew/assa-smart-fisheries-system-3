/**
 * SSE client registry and broadcast for admin command center.
 */

const eventBus = require('./eventBus');
const { prisma } = require('../database/prisma');

const clients = new Set();
const marketClients = new Set();
const MARKET_EVENTS = new Set(['listing.created', 'order.placed']);
const MAX_REPLAY = 50;

async function persistEvent(eventType, payload) {
  try {
    await prisma.domainEvent.create({
      data: {
        eventType,
        payloadJson: JSON.stringify(payload),
      },
    });

    const countRows = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM domain_events`;
    const count = Number(countRows[0]?.cnt ?? 0);
    if (count > MAX_REPLAY * 2) {
      await prisma.$executeRaw`
        DELETE FROM domain_events WHERE id NOT IN (
          SELECT id FROM domain_events ORDER BY id DESC LIMIT ${MAX_REPLAY}
        )
      `;
    }
  } catch {
    // DB may not be ready during startup
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

function broadcast(eventType, payload) {
  void persistEvent(eventType, payload);
  const data = JSON.stringify({ type: eventType, payload, timestamp: new Date().toISOString() });
  const message = `event: ${eventType}\ndata: ${data}\n\n`;
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
    });
    const marketMessage = `event: ${eventType}\ndata: ${marketData}\n\n`;
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
  broadcast(event.type, event.payload);
});

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
    });
    res.write(`event: ${row.eventType}\ndata: ${data}\n\n`);
  });
}

function addClient(res) {
  const client = { res, connectedAt: Date.now() };
  clients.add(client);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  replayRecentEvents(res, MAX_REPLAY).catch(() => {});

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

function addMarketClient(res) {
  const client = { res, connectedAt: Date.now() };
  marketClients.add(client);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  replayRecentEvents(res, 20, ['listing.created', 'order.placed']).catch(() => {});

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
