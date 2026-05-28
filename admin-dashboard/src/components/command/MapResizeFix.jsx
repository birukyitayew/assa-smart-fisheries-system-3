import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/** Leaflet often renders a blank map on mobile until size is recalculated. */
export default function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const fix = () => {
      map.invalidateSize({ animate: false });
    };

    fix();
    const t1 = window.setTimeout(fix, 100);
    const t2 = window.setTimeout(fix, 500);

    window.addEventListener('resize', fix);

    const parent = map.getContainer()?.parentElement;
    let observer;
    if (parent && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(fix);
      observer.observe(parent);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', fix);
      observer?.disconnect();
    };
  }, [map]);

  return null;
}
