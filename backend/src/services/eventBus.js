/**
 * In-process event bus for SSE fan-out.
 *
 * NOTE ON ARCHITECTURE (Option B - Single Instance Force):
 * This is an in-process, memory-based event bus that is optimized for single-server setups.
 * It is completely stateless and cost-free, but requires that the application is run on a
 * single instance (not horizontally scaled across multiple app servers).
 * If scaling becomes necessary in the future, migrate this to a Redis Pub/Sub backend.
 */

const listeners = new Set();

function subscribe(handler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

function emit(eventType, payload = {}) {
  const event = {
    type: eventType,
    payload,
    timestamp: new Date().toISOString(),
  };
  listeners.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      console.error('[eventBus] listener error:', err);
    }
  });
  return event;
}

module.exports = { subscribe, emit };
