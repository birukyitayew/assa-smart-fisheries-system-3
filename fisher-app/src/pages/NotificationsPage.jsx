import { useState, useCallback } from 'react'
import api from '../services/api'
import { usePolling } from '../hooks/usePolling'
import NotificationItem from '../components/NotificationItem'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)

  const fetchNotifs = useCallback(async () => {
    try {
      const res = await api.get('/notifications')
      setNotifications(res.data.notifications)
      setUnread(res.data.unreadCount)
    } catch {
      /* ignore */
    }
  }, [])

  usePolling(fetchNotifs, 10000)

  async function markRead(id) {
    await api.put(`/notifications/${id}/read`)
    fetchNotifs()
  }

  async function markAllRead() {
    await api.put('/notifications/read-all')
    fetchNotifs()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Notifications</h2>
          <p className="text-sm text-muted-foreground">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-muted-foreground">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </div>
  )
}
