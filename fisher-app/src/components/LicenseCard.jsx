import { Card, CardContent } from '@/components/ui/card';
import StatusBadge from './StatusBadge';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

export default function LicenseCard({ profile, compliance }) {
  const isValid = profile?.license_status === 'VALID';

  // Check if license expires within 30 days
  const expiryDate = profile?.license_expiry ? new Date(profile.license_expiry) : null;
  const daysUntilExpiry = expiryDate
    ? Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const expiresoon =
    isValid && daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  const qrPayload = encodeURIComponent(
    JSON.stringify({
      license: profile?.license_number,
      name: profile?.name,
      expiry: profile?.license_expiry,
    }),
  );

  return (
    <Card className={cn(!isValid && 'border-destructive/30', expiresoon && 'border-amber-400/50')}>
      {expiresoon && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-400/30 rounded-t-xl text-amber-700 dark:text-amber-400 text-xs font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Your fishing license expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}.
          Please renew before it expires.
        </div>
      )}
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Digital Fisher ID
            </div>
            <div className="mt-2">
              <StatusBadge status={profile?.license_status} />
            </div>
            <div className="text-xs mt-2 text-muted-foreground font-mono">
              {profile?.license_number}
            </div>
            {compliance != null && (
              <div className="text-xs mt-2">
                Compliance score:{' '}
                <span
                  className={cn(
                    'font-semibold',
                    compliance.score < 50
                      ? 'text-destructive'
                      : compliance.score < 70
                        ? 'text-warning'
                        : 'text-success',
                  )}
                >
                  {compliance.score}/100
                </span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">Valid Until</div>
            <div
              className={cn(
                'font-semibold text-sm mt-0.5',
                expiresoon && 'text-amber-600 dark:text-amber-400',
              )}
            >
              {profile?.license_expiry}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">{profile?.boat_name}</div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${qrPayload}`}
              alt="License QR"
              className="mt-2 ml-auto rounded border border-border"
              width={80}
              height={80}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
