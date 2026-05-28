import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const NotificationContext = createContext(null);

const PRIORITY = { critical: 3, active: 2, unread: 1, none: 0 };
const MAX_CRITICAL_ITEMS = 2;
const DEBOUNCE_MS = 300;

function resolveStatus(status) {
  return PRIORITY[status] !== undefined ? status : 'none';
}

export function NotificationProvider({ children }) {
  const [statusMap, setStatusMap] = useState({});
  const pendingRef = useRef({});
  const timerRef = useRef(null);

  const flush = useCallback(() => {
    setStatusMap((prev) => {
      const next = { ...prev, ...pendingRef.current };
      pendingRef.current = {};
      return next;
    });
  }, []);

  const setStatus = useCallback(
    (path, status) => {
      const resolved = resolveStatus(status);
      pendingRef.current[path] = resolved;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  const setBulk = useCallback(
    (map) => {
      Object.entries(map).forEach(([path, status]) => {
        pendingRef.current[path] = resolveStatus(status);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    },
    [flush],
  );

  const getStatus = useCallback(
    (path) => {
      const raw = statusMap[path] || 'none';
      if (raw !== 'critical') return raw;

      const criticalPaths = Object.entries(statusMap)
        .filter(([, s]) => s === 'critical')
        .map(([p]) => p);

      if (criticalPaths.length <= MAX_CRITICAL_ITEMS) return 'critical';

      const allowed = criticalPaths.slice(0, MAX_CRITICAL_ITEMS);
      return allowed.includes(path) ? 'critical' : 'active';
    },
    [statusMap],
  );

  const value = useMemo(
    () => ({ statusMap, setStatus, setBulk, getStatus }),
    [statusMap, setStatus, setBulk, getStatus],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
