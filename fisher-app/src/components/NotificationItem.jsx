import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotificationItem({ notification, onMarkRead }) {
  return (
    <Card className={cn(!notification.is_read && 'border-primary/30')}>
      <CardContent className="pt-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground flex items-center gap-2">
            {notification.title}
            {!notification.is_read && <span className="w-2 h-2 bg-primary rounded-full" />}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {new Date(notification.created_at).toLocaleString('en-ET', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        {!notification.is_read && (
          <Button variant="ghost" size="sm" onClick={() => onMarkRead(notification.id)}>
            Read
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
