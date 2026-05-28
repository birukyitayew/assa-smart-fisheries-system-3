import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../LanguageToggle';
import ThemeToggle from '../ThemeToggle';
import SidebarNotification from './SidebarNotification';
import { useNotifications } from '../../context/NotificationContext';
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
  ClipboardCheck,
  AlertTriangle,
  UserPlus,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AppLogo from '../brand/AppLogo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const adminNav = [
  { to: '/', labelKey: 'nav.commandOverview', icon: LayoutDashboard, end: true },
  { to: '/live', labelKey: 'nav.liveOps', icon: Activity },
  { to: '/map', labelKey: 'nav.lakeMap', icon: MapPin },
  { to: '/fleet', labelKey: 'nav.fleet', icon: Ship },
  { to: '/intelligence', labelKey: 'nav.intelligence', icon: Brain },
  { to: '/security', label: 'Security SOC', icon: ShieldAlert },
  { to: '/market', labelKey: 'nav.market', icon: TrendingUp },
  { to: '/catches', labelKey: 'nav.catches', icon: Fish },
  { to: '/fishermen', labelKey: 'nav.fishers', icon: Users },
  { to: '/users/create', label: 'Onboard User', icon: UserPlus },
  { to: '/quotas', labelKey: 'nav.quotas', icon: Ruler },
  { to: '/zones', labelKey: 'nav.zones', icon: Map },
  { to: '/alerts', labelKey: 'nav.alerts', icon: Bell },
  { to: '/reports', labelKey: 'nav.reports', icon: BarChart3 },
];

export const inspectorNav = [
  { to: '/', label: 'My Assignments', icon: ClipboardCheck, end: true },
  { to: '/violations', label: 'Violations', icon: AlertTriangle },
  { to: '/map', label: 'Patrol Map', icon: MapPin },
  { to: '/fishermen', label: 'Verify Fishers', icon: Users },
];

export default function SidebarNav({ onNavigate, showFooter = true, className }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { getStatus } = useNotifications();
  const isInspector = user?.role === 'inspector';
  const navItems = isInspector ? inspectorNav : adminNav;

  return (
    <div
      className={cn('flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground', className)}
    >
      <div className="px-5 py-5 border-b border-sidebar-border shrink-0">
        <AppLogo size="sm" subtitle="Ministry of Fisheries" />
      </div>

      <nav className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.labelKey ? t(item.labelKey) : item.label}</span>
            <SidebarNotification status={getStatus(item.to)} />
          </NavLink>
        ))}
      </nav>

      {showFooter && (
        <div className="px-4 py-4 border-t border-sidebar-border space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <div className="text-xs text-muted-foreground mb-1">{user?.role?.toUpperCase()}</div>
          <div className="text-sm font-medium truncate">{user?.name}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onNavigate?.();
              logout();
            }}
            className="mt-1 w-full justify-start gap-2 px-0"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </Button>
        </div>
      )}
    </div>
  );
}
