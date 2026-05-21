import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageToggle from '../LanguageToggle'
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
  { to: '/', labelKey: 'nav.commandOverview', icon: LayoutDashboard, end: true },
  { to: '/live', labelKey: 'nav.liveOps', icon: Activity },
  { to: '/map', labelKey: 'nav.lakeMap', icon: MapPin },
  { to: '/fleet', labelKey: 'nav.fleet', icon: Ship },
  { to: '/intelligence', labelKey: 'nav.intelligence', icon: Brain },
  { to: '/market', labelKey: 'nav.market', icon: TrendingUp },
  { to: '/catches', labelKey: 'nav.catches', icon: Fish },
  { to: '/fishermen', labelKey: 'nav.fishers', icon: Users },
  { to: '/quotas', labelKey: 'nav.quotas', icon: Ruler },
  { to: '/zones', labelKey: 'nav.zones', icon: Map },
  { to: '/alerts', labelKey: 'nav.alerts', icon: Bell },
  { to: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
]

const inspectorNav = [
  { to: '/', label: 'My Assignments', icon: ClipboardCheck, end: true },
  { to: '/violations', label: 'Violations', icon: AlertTriangle },
  { to: '/map', label: 'Patrol Map', icon: MapPin },
  { to: '/fishermen', label: 'Verify Fishers', icon: Users },
]

export default function Sidebar() {
  const { t } = useTranslation()
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
            {item.labelKey ? t(item.labelKey) : item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border space-y-2">
        <LanguageToggle />
        <div className="text-xs text-muted-foreground mb-1">{user?.role?.toUpperCase()}</div>
        <div className="text-sm font-medium truncate">{user?.name}</div>
        <Button variant="ghost" size="sm" onClick={logout} className="mt-1 w-full justify-start gap-2 px-0">
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  )
}
