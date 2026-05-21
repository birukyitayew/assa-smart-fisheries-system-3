/**
 * In-process event bus for SSE fan-out (SQLite MVP; Redis in Phase 4).
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
