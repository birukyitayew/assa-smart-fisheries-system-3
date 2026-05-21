import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Fish,
  Users,
  Ruler,
  Map,
  Bell,
  BarChart3,
  LogOut,
  Activity,
  MapPin,
  Ship,
  Brain,
  TrendingUp,
  Shield,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AppLogo from '../brand/AppLogo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const adminNav = [
  { to: '/', label: 'Command Overview', icon: LayoutDashboard, end: true },
  { to: '/live', label: 'Live Operations', icon: Activity },
  { to: '/map', label: 'Lake Map', icon: MapPin },
  { to: '/fleet', label: 'Fleet', icon: Ship },
  { to: '/intelligence', label: 'Intelligence', icon: Brain },
  { to: '/market', label: 'Market Monitor', icon: TrendingUp },
  { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { to: '/violations', label: 'Violations', icon: AlertTriangle },
  { to: '/audit', label: 'Audit Log', icon: Shield },
  { to: '/catches', label: 'Daily Catches', icon: Fish },
  { to: '/fishermen', label: 'Fishermen', icon: Users },
  { to: '/quotas', label: 'Quotas & Rules', icon: Ruler },
  { to: '/zones', label: 'Fishing Zones', icon: Map },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

const inspectorNav = [
  { to: '/', label: 'My Assignments', icon: ClipboardCheck, end: true },
  { to: '/violations', label: 'Violations', icon: AlertTriangle },
  { to: '/map', label: 'Patrol Map', icon: MapPin },
  { to: '/fishermen', label: 'Verify Fishers', icon: Users },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const isInspector = user?.role === 'inspector'
  const navItems = isInspector ? inspectorNav : adminNav

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col flex-shrink-0 border-r border-sidebar-border">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <AppLogo size="sm" subtitle="Ministry of Fisheries" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors border-l-2 border-transparent',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium border-l-primary'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground mb-1">{user?.role?.toUpperCase()}</div>
        <div className="text-sm font-medium truncate">{user?.name}</div>
        <Button variant="ghost" size="sm" onClick={logout} className="mt-3 w-full justify-start gap-2 px-0">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
