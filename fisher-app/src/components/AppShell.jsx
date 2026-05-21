import { Outlet, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Home, Plus, Fish, Bell, Map, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppLogo from './brand/AppLogo'
import api from '../services/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/submit', icon: Plus, label: 'Submit' },
  { to: '/catches', icon: Fish, label: 'Catches' },
  { to: '/notifications', icon: Bell, label: 'Alerts', badge: true },
  { to: '/zones', icon: Map, label: 'Zones' },
]

export default function AppShell() {
  const { user, logout } = useAuth()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications')
        setUnread(res.data.unreadCount || 0)
      } catch {
        /* ignore */
      }
    }
    fetchNotifs()
    const id = setInterval(fetchNotifs, 10000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-[430px] mx-auto">
      <header className="bg-card text-foreground px-4 py-3 flex items-center justify-between flex-shrink-0 border-b border-border shadow-sm">
        <AppLogo size="sm" subtitle="Fisher Portal" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{user?.name}</span>
          <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border flex shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center py-2 text-xs transition-colors relative',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <span className="relative">
              <item.icon className="h-5 w-5" />
              {item.badge && unread > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-2 h-3.5 min-w-3.5 px-0 text-[9px]"
                >
                  {unread > 9 ? '9+' : unread}
                </Badge>
              )}
            </span>
            <span className="mt-0.5">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
