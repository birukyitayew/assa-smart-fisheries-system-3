import { useState, useCallback } from 'react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const VIOLATION_TYPES = [
  'ZONE_VIOLATION',
  'LICENSE_EXPIRED',
  'UNREPORTED_CATCH',
  'GEAR_VIOLATION',
  'QUOTA_EVASION',
  'OTHER',
];

export default function ViolationsPage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [violations, setViolations] = useState([]);
  const [suspicious, setSuspicious] = useState([]);
  const [fishers, setFishers] = useState([]);
  const [reviewViolation, setReviewViolation] = useState(null);
  const [customFine, setCustomFine] = useState('');
  const [form, setForm] = useState({
    fisher_id: '',
    type: 'ZONE_VIOLATION',
    severity: 'MEDIUM',
    description: '',
    fine_amount: '',
  });

  function humanizeViolationType(type) {
    if (!type) return '—';
    return type
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  const fetchAll = useCallback(async () => {
    try {
      const base = isAdmin ? '/admin' : '/inspector';
      const [vRes, sRes] = await Promise.all([
        api.get(`${base}/violations`),
        api.get(`${base}/suspicious-fishers`),
      ]);
      setViolations(vRes.data.violations);
      setSuspicious(sRes.data.fishers);
      const fRes = await api.get(isAdmin ? '/admin/fishers?limit=50' : '/inspector/fishers');
      setFishers(fRes.data.fishers);
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  usePolling(fetchAll, 15000);

  async function submitViolation() {
    try {
      await api.post('/inspector/violations', {
        fisher_id: Number(form.fisher_id),
        type: form.type,
        severity: form.severity,
        description: form.description,
        fine_amount: form.fine_amount ? Number(form.fine_amount) : undefined,
      });
      toast.success('Violation recorded');
      setForm({
        fisher_id: '',
        type: 'ZONE_VIOLATION',
        severity: 'MEDIUM',
        description: '',
        fine_amount: '',
      });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create violation');
    }
  }

  async function updateFine(id, fine_amount, status) {
    try {
      await api.put(`/admin/violations/${id}`, { fine_amount, fine_status: 'PENDING', status });
      toast.success('Violation updated');
      setReviewViolation(null);
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  }

  const severityColor = {
    LOW: 'outline',
    MEDIUM: 'secondary',
    HIGH: 'default',
    CRITICAL: 'destructive',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            Violations & Fines
          </h2>
          <p className="text-sm text-muted-foreground">
            Enforcement records and compliance actions
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Report violation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New violation report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fisher</Label>
                <Select
                  value={form.fisher_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, fisher_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fisher" />
                  </SelectTrigger>
                  <SelectContent>
                    {fishers.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name} (score {f.compliance_score ?? 100})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIOLATION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {humanizeViolationType(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select
                    value={form.severity}
                    onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fine amount (ETB, optional)</Label>
                <Input
                  type="number"
                  value={form.fine_amount}
                  onChange={(e) => setForm((f) => ({ ...f, fine_amount: e.target.value }))}
                />
              </div>
              <Button onClick={submitViolation} className="w-full">
                Submit report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {suspicious.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base text-warning">Suspicious fishers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {suspicious.slice(0, 8).map((f) => (
              <Badge key={f.fisher_id} variant="outline">
                {f.name} · score {f.compliance_score}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 pt-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Fisher</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fine</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {violations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.reference_id}</TableCell>
                    <TableCell>{v.fisher_name}</TableCell>
                    <TableCell className="text-xs">{humanizeViolationType(v.type)}</TableCell>
                    <TableCell>
                      <Badge variant={severityColor[v.severity]}>{v.severity}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{v.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {v.fine_amount ? `ETB ${v.fine_amount}` : '—'}
                      {v.fine_status && (
                        <span className="text-xs text-muted-foreground block">{v.fine_status}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(v.created_at).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {v.status === 'OPEN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReviewViolation(v);
                              setCustomFine(v.fine_amount || 500);
                            }}
                          >
                            Review
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Premium Fine Dialog */}
      <Dialog
        open={!!reviewViolation}
        onOpenChange={(open) => {
          if (!open) setReviewViolation(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review Violation & Issue Fine</DialogTitle>
          </DialogHeader>
          {reviewViolation && (
            <div className="space-y-4 pt-2">
              <div className="space-y-3 bg-muted/30 p-3 rounded-lg border text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference ID:</span>
                  <span className="font-mono font-medium">{reviewViolation.reference_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fisher Name:</span>
                  <span className="font-semibold">{reviewViolation.fisher_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Violation Type:</span>
                  <span className="font-medium text-warning">
                    {humanizeViolationType(reviewViolation.type)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Severity:</span>
                  <span>
                    <Badge variant={severityColor[reviewViolation.severity]}>
                      {reviewViolation.severity}
                    </Badge>
                  </span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-muted-foreground block text-xs mb-1">Description:</span>
                  <p className="text-xs leading-relaxed italic">
                    {reviewViolation.description || 'No description provided.'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fine-amount">Verify Fine Amount (ETB)</Label>
                <Input
                  id="fine-amount"
                  type="number"
                  min="0"
                  value={customFine}
                  onChange={(e) => setCustomFine(e.target.value)}
                  className="text-base font-semibold"
                />
                <p className="text-[11px] text-muted-foreground">
                  The default fine for {reviewViolation.severity} severity is 500 ETB. You can
                  adjust this value to fit regulatory scales.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReviewViolation(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                  onClick={async () => {
                    const amount = Number(customFine);
                    if (isNaN(amount) || amount < 0) {
                      toast.error('Please enter a valid fine amount');
                      return;
                    }
                    await updateFine(reviewViolation.id, amount, 'UNDER_REVIEW');
                  }}
                >
                  Confirm & Issue Fine
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
