import { useEffect, useRef } from 'react';

/**
 * Polls a callback function at a given interval.
 * @param {Function} callback - async function to call
 * @param {number} interval - milliseconds between calls (default 10000)
 * @param {boolean} enabled - whether polling is active
 */
export function usePolling(callback, interval = 10000, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    // Call immediately on mount
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval, enabled]);
}
