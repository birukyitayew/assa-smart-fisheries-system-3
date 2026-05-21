/**
 * SSE client registry and broadcast for admin command center.
 */

const eventBus = require('./eventBus');
const { getDb } = require('../database/db');

const clients = new Set();
const marketClients = new Set();
const MARKET_EVENTS = new Set(['listing.created', 'order.placed']);
const MAX_REPLAY = 50;

function persistEvent(eventType, payload) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO domain_events (event_type, payload_json) VALUES (?, ?)
    `).run(eventType, JSON.stringify(payload));

    const count = db.prepare('SELECT COUNT(*) as cnt FROM domain_events').get().cnt;
    if (count > MAX_REPLAY * 2) {
      db.prepare(`
        DELETE FROM domain_events WHERE id NOT IN (
          SELECT id FROM domain_events ORDER BY id DESC LIMIT ?
        )
      `).run(MAX_REPLAY);
    }
  } catch {
    // DB may not be ready during startup
  }
}

function anonymizeForMarket(eventType, payload) {
  if (eventType === 'order.placed') {
    return {
      ...payload,
      buyer_name: payload.buyer_name ? payload.buyer_name.split(' ')[0] + ' B.' : 'Buyer',
    };
  }
  return payload;
}

function broadcast(eventType, payload) {
  persistEvent(eventType, payload);
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

  // Replay recent events
  try {
    const db = getDb();
    const recent = db.prepare(`
      SELECT event_type, payload_json, created_at FROM domain_events
      ORDER BY id DESC LIMIT ?
    `).all(MAX_REPLAY);
    recent.reverse().forEach((row) => {
      const payload = JSON.parse(row.payload_json || '{}');
      const data = JSON.stringify({
        type: row.event_type,
        payload,
        timestamp: row.created_at,
        replay: true,
      });
      res.write(`event: ${row.event_type}\ndata: ${data}\n\n`);
    });
  } catch {
    // ignore
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

  try {
    const db = getDb();
    const recent = db.prepare(`
      SELECT event_type, payload_json, created_at FROM domain_events
      WHERE event_type IN ('listing.created', 'order.placed')
      ORDER BY id DESC LIMIT 20
    `).all();
    recent.reverse().forEach((row) => {
      const payload = anonymizeForMarket(row.event_type, JSON.parse(row.payload_json || '{}'));
      const data = JSON.stringify({
        type: row.event_type,
        payload,
        timestamp: row.created_at,
        replay: true,
      });
      res.write(`event: ${row.event_type}\ndata: ${data}\n\n`);
    });
  } catch {
    // ignore
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
