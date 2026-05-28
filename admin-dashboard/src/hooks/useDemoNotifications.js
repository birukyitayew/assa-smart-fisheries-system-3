import { useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

const DEMO_STATUSES = {
  '/alerts': 'critical',
  '/intelligence': 'critical',
  '/live': 'active',
  '/map': 'active',
  '/fleet': 'active',
  '/reports': 'unread',
  '/catches': 'unread',
  '/market': 'unread',
};

export default function useDemoNotifications() {
  const { setBulk } = useNotifications();

  useEffect(() => {
    setBulk(DEMO_STATUSES);
  }, [setBulk]);
}
