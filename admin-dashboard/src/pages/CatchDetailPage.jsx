import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function CatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/catches/${id}`)
      .then((res) => setData(res.data))
      .catch(() => navigate('/catches'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  async function handleApprove() {
    setActionLoading(true);
    try {
      await api.put(`/admin/catches/${id}/approve`);
      setMessage({
        type: 'success',
        text: 'Catch approved. Marketplace listing created and fisher notified.',
      });
      const res = await api.get(`/admin/catches/${id}`);
      setData(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Approval failed' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/catches/${id}/reject`, { reason: rejectReason });
      setMessage({ type: 'success', text: 'Catch rejected. Fisher has been notified.' });
      setShowRejectForm(false);
      const res = await api.get(`/admin/catches/${id}`);
      setData(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Rejection failed' });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const { catch: c, quota } = data;
  const isPending = c.status === 'PENDING';
  const quotaPct = quota
    ? Math.round((quota.current_month_kg / quota.monthly_limit_kg) * 100)
    : null;

  return (
    <div className="max-w-3xl space-y-5">
      <Link to="/catches" className="text-muted-foreground hover:text-foreground text-sm">
        ← Back to Catches
      </Link>

      {message && (
        <div
          className={cn(
            'p-4 rounded-lg text-sm font-medium border',
            message.type === 'success'
              ? 'bg-success-muted text-success border-success'
              : 'bg-destructive/10 text-destructive border-destructive/20',
          )}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardContent className="pt-6 flex items-start justify-between">
          <div>
            <div className="font-mono text-sm text-muted-foreground">{c.reference_id}</div>
            <h2 className="text-xl font-bold text-foreground mt-1">
              {c.species} — {c.quantity_kg} kg
            </h2>
            <div className="text-sm text-muted-foreground mt-1">
              Submitted{' '}
              {new Date(c.submitted_at).toLocaleString('en-ET', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          </div>
          <StatusBadge status={c.status} className="text-sm px-3 py-1" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fisher Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Name</div>
              <div className="font-medium">{c.fisher_name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">License Number</div>
              <div className="font-mono font-medium">{c.license_number}</div>
            </div>
            <div>
              <div className="text-muted-foreground">License Status</div>
              <StatusBadge status={c.license_status} />
            </div>
            <div>
              <div className="text-muted-foreground">Boat</div>
              <div className="font-medium">{c.boat_name || '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Phone</div>
              <div>{c.fisher_phone || '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">License Expiry</div>
              <div>{c.license_expiry}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Species</div>
              <div className="font-medium">{c.species}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Quantity</div>
              <div className="font-medium">{c.quantity_kg} kg</div>
            </div>
            <div>
              <div className="text-muted-foreground">Number of Fish</div>
              <div>{c.number_of_fish || '—'}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Fishing Gear</div>
              <div>{c.fishing_gear}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Date</div>
              <div>{c.fishing_date}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Time</div>
              <div>{c.fishing_time}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Location & Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Fishing Zone</div>
              <div className="font-medium">{c.zone_name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Zone Type</div>
              <div
                className={cn(
                  'font-semibold',
                  c.zone_type === 'ALLOWED' && 'text-success',
                  c.zone_type === 'RESTRICTED' && 'text-warning',
                  c.zone_type === 'PROHIBITED' && 'text-destructive',
                )}
              >
                {c.zone_type}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">GPS Coordinates</div>
              <div className="font-mono text-xs">
                {c.gps_lat?.toFixed(4)}° N, {c.gps_lng?.toFixed(4)}° E
              </div>
            </div>
          </div>

          {c.zone_flag === 'RESTRICTED_ZONE' && (
            <div className="mt-3 p-3 bg-warning-muted border border-warning rounded-lg text-sm text-warning">
              This catch was submitted from a restricted zone. Review carefully.
            </div>
          )}
          {c.zone_flag === 'PROHIBITED_ZONE' && (
            <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              This catch was submitted from a prohibited zone. Fishing is strictly prohibited.
            </div>
          )}
        </CardContent>
      </Card>

      {quota && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quota Status — {c.species}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {Math.round(quota.current_month_kg).toLocaleString()} /{' '}
                {quota.monthly_limit_kg.toLocaleString()} kg this month
              </span>
              <span
                className={cn(
                  'font-semibold',
                  quotaPct >= 90 && 'text-destructive',
                  quotaPct >= 75 && quotaPct < 90 && 'text-warning',
                  quotaPct < 75 && 'text-muted-foreground',
                )}
              >
                {quotaPct}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  quotaPct >= 90 ? 'bg-destructive' : quotaPct >= 75 ? 'bg-warning' : 'bg-primary',
                )}
                style={{ width: `${Math.min(quotaPct, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {c.status === 'REJECTED' && c.rejection_reason && (
        <Card className="border-l-4 border-l-destructive">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{c.rejection_reason}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Reviewed by {c.reviewed_by_name} on{' '}
              {new Date(c.reviewed_at).toLocaleString('en-ET', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </CardContent>
        </Card>
      )}

      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Decision</CardTitle>
          </CardHeader>
          <CardContent>
            {!showRejectForm ? (
              <div className="flex gap-3">
                <Button variant="destructive" onClick={() => setShowRejectForm(true)}>
                  Reject
                </Button>
                <Button onClick={handleApprove} disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Approve Catch'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>
                  Rejection Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this catch is being rejected..."
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || actionLoading}
                  >
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
