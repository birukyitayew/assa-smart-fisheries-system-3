import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SEVERITY_VARIANT = {
  CRITICAL: 'destructive',
  WARNING: 'secondary',
  INFO: 'outline',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [unread, setUnread] = useState(0);

  const fetchAlerts = async () => {
    const res = await api.get('/admin/alerts');
    setAlerts(res.data.alerts);
    setUnread(res.data.unreadCount);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  async function markRead(id) {
    await api.put(`/admin/alerts/${id}/read`);
    fetchAlerts();
  }

  async function markAllRead() {
    await api.put('/admin/alerts/read-all');
    fetchAlerts();
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Alerts & Notifications</h2>
          <p className="text-sm text-muted-foreground">
            {unread} unread alert{unread !== 1 ? 's' : ''}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {alerts.map((a) => (
          <Card
            key={a.id}
            className={cn(
              'border-l-4',
              a.severity === 'CRITICAL' && 'border-l-destructive',
              a.severity === 'WARNING' && 'border-l-orange-500',
              a.severity === 'INFO' && 'border-l-primary',
              a.is_read && 'opacity-60',
            )}
          >
            <CardContent className="pt-6 flex items-start justify-between">
              <div>
                <div className="font-semibold text-foreground flex items-center gap-2">
                  {a.title}
                  {!a.is_read && <span className="w-2 h-2 bg-primary rounded-full" />}
                  <Badge
                    variant={SEVERITY_VARIANT[a.severity] || 'outline'}
                    className="text-[10px]"
                  >
                    {a.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(a.created_at).toLocaleString('en-ET', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
              {!a.is_read && (
                <Button variant="ghost" size="sm" onClick={() => markRead(a.id)}>
                  Mark read
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {alerts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No alerts</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
