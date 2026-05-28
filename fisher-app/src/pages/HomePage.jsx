import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle';
import ThemeToggle from '../components/ThemeToggle';
import { Plus, Fish, Bell, Map, Store, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import LicenseCard from '../components/LicenseCard';
import TodaySummary from '../components/TodaySummary';
import TripCard from '../components/TripCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MARKETPLACE_URL = import.meta.env.VITE_MARKETPLACE_URL || 'http://localhost:3003';

export default function HomePage() {
  const [showLicenseWarning, setShowLicenseWarning] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  const loadProfile = () => {
    setProfileLoading(true);
    setProfileError(false);
    api
      .get('/fisher/profile')
      .then((res) => setProfile(res.data))
      .catch(() => setProfileError(true))
      .finally(() => setProfileLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const today = new Date().toLocaleDateString('en-ET', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const canSubmit = profile?.profile?.license_status === 'VALID';

  const actions = [
    {
      to: '/submit',
      icon: Plus,
      label: t('home.submitCatch'),
      primary: true,
      disabled: !canSubmit,
    },
    { to: '/catches', icon: Fish, label: 'My Catches' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/zones', icon: Map, label: 'Fishing Zones' },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2 flex justify-between items-start">
        <div>
          <p className="text-muted-foreground text-sm">{today}</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            Welcome, {user?.name?.split(' ')[0]}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </div>

      {profileLoading && !profile && (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-muted animate-pulse" />
          <div className="h-16 rounded-xl bg-muted animate-pulse" />
        </div>
      )}

      {profileError && !profile && (
        <Card className="border-destructive/30">
          <CardContent className="pt-6 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="font-semibold text-foreground">Could not load your profile</p>
              <p className="text-xs text-muted-foreground mt-1">
                Check your connection and try again.
              </p>
            </div>
            <Button size="sm" onClick={loadProfile}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {profile && <LicenseCard profile={profile.profile} compliance={profile.compliance} />}

      {profile?.openViolations?.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Open violations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.openViolations.map((v) => (
              <div
                key={v.reference_id}
                className="text-sm border-b border-border/50 pb-2 last:border-0"
              >
                <span className="font-mono text-xs text-muted-foreground">{v.reference_id}</span>
                <p className="mt-0.5">{v.description}</p>
                <p className="text-xs text-muted-foreground">
                  {v.type} · {v.severity}
                  {v.fine_amount ? ` · Fine ETB ${v.fine_amount}` : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {profile && (
        <TripCard
          profile={profile.profile}
          activeTrip={profile.activeTrip}
          onTripChange={loadProfile}
        />
      )}

      {profile?.todaySummary && <TodaySummary summary={profile.todaySummary} />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action) => (
              <Link
                key={action.to}
                to={action.disabled ? '#' : action.to}
                aria-disabled={action.disabled}
                onClick={(e) => {
                  if (action.disabled) {
                    e.preventDefault();
                    if (action.primary) setShowLicenseWarning(true);
                  }
                }}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-colors border',
                  action.primary &&
                    canSubmit &&
                    'bg-primary text-primary-foreground border-primary',
                  action.primary &&
                    !canSubmit &&
                    'opacity-50 cursor-not-allowed bg-muted/50 border-border',
                  !action.primary && 'bg-muted/50 hover:bg-muted border-border',
                )}
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm font-semibold">{action.label}</span>
              </Link>
            ))}
          </div>
          {showLicenseWarning && (
            <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <strong>License required</strong> — Your fishing license is not active. Contact the
                Fisheries Office to renew before submitting catches.
                <button
                  className="block mt-1 text-xs underline opacity-70"
                  onClick={() => setShowLicenseWarning(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {profile?.profile?.zone_name && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <div className="text-xs text-primary font-medium">Assigned Zone</div>
              <div className="font-semibold text-foreground mt-0.5">
                {profile.profile.zone_name}
              </div>
            </div>
            <Button variant="link" size="sm" asChild>
              <Link to="/zones">View Map →</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="hover:bg-muted/30 transition-colors">
        <CardContent className="pt-6">
          <a
            href={MARKETPLACE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-foreground">ASSA Fish Market</div>
                <div className="text-xs text-muted-foreground">View your approved listings</div>
              </div>
            </div>
            <span className="text-muted-foreground">→</span>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
