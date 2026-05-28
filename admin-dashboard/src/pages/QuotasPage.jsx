import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const emptyRule = {
  zone_id: '',
  species: '',
  season_start: '',
  season_end: '',
  rule_type: 'LIMIT',
  max_kg: '',
  notes: '',
};

export default function QuotasPage() {
  const [quotas, setQuotas] = useState([]);
  const [rules, setRules] = useState([]);
  const [zones, setZones] = useState([]);
  const [editing, setEditing] = useState(null);
  const [newLimit, setNewLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    api.get('/admin/quotas').then((res) => setQuotas(res.data.quotas));
    api.get('/admin/season-rules').then((res) => setRules(res.data.rules || []));
    api.get('/admin/zones').then((res) => setZones(res.data.zones || []));
  };

  useEffect(() => {
    load();
  }, []);

  async function saveLimit(id) {
    if (!newLimit || newLimit <= 0) return;
    setSaving(true);
    try {
      await api.put(`/admin/quotas/${id}`, { monthly_limit_kg: Number(newLimit) });
      load();
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function saveRule() {
    if (!ruleForm.zone_id || !ruleForm.species || !ruleForm.season_start || !ruleForm.season_end)
      return;
    setSaving(true);
    try {
      await api.post('/admin/season-rules', {
        ...ruleForm,
        zone_id: Number(ruleForm.zone_id),
        max_kg: ruleForm.max_kg ? Number(ruleForm.max_kg) : null,
      });
      setRuleForm(emptyRule);
      setDialogOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRule(id) {
    await api.delete(`/admin/season-rules/${id}`);
    load();
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Quotas & Rules</h2>
        <p className="text-sm text-muted-foreground">
          Monthly catch limits and seasonal zone rules — Lake Tana, Amhara Region
        </p>
      </div>

      <div className="space-y-4">
        {quotas.map((q) => {
          const pct = Math.min(q.usage_pct, 100);
          const barColor = pct >= 90 ? 'bg-destructive' : pct >= 75 ? 'bg-warning' : 'bg-primary';
          const textColor =
            pct >= 90 ? 'text-destructive' : pct >= 75 ? 'text-warning' : 'text-muted-foreground';

          return (
            <Card key={q.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{q.species}</h3>
                    <p className="text-xs text-muted-foreground">
                      Monthly limit for{' '}
                      {new Date().toLocaleString('en-ET', { month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={cn('text-lg font-bold', textColor)}>{pct}%</span>
                </div>

                <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
                  <div
                    className={cn('h-full rounded-full transition-all', barColor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    <strong>{Math.round(q.current_month_kg).toLocaleString()} kg</strong> caught of{' '}
                    <strong>{q.monthly_limit_kg.toLocaleString()} kg</strong> limit
                  </span>
                </div>

                {editing === q.id ? (
                  <div className="mt-3 flex gap-2 items-center">
                    <Input
                      type="number"
                      value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      placeholder="New limit (kg)"
                      className="w-36"
                    />
                    <Button size="sm" onClick={() => saveLimit(q.id)} disabled={saving}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-3 px-0"
                    onClick={() => {
                      setEditing(q.id);
                      setNewLimit(q.monthly_limit_kg);
                    }}
                  >
                    Edit limit
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Seasonal rules</h3>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Add rule</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New seasonal rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Select
                  value={ruleForm.zone_id}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, zone_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((z) => (
                      <SelectItem key={z.id} value={String(z.id)}>
                        {z.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Species"
                  value={ruleForm.species}
                  onChange={(e) => setRuleForm((f) => ({ ...f, species: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={ruleForm.season_start}
                    onChange={(e) => setRuleForm((f) => ({ ...f, season_start: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={ruleForm.season_end}
                    onChange={(e) => setRuleForm((f) => ({ ...f, season_end: e.target.value }))}
                  />
                </div>
                <Select
                  value={ruleForm.rule_type}
                  onValueChange={(v) => setRuleForm((f) => ({ ...f, rule_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIMIT">LIMIT</SelectItem>
                    <SelectItem value="CLOSED">CLOSED</SelectItem>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Max kg (optional)"
                  value={ruleForm.max_kg}
                  onChange={(e) => setRuleForm((f) => ({ ...f, max_kg: e.target.value }))}
                />
                <Input
                  placeholder="Notes"
                  value={ruleForm.notes}
                  onChange={(e) => setRuleForm((f) => ({ ...f, notes: e.target.value }))}
                />
                <Button onClick={saveRule} disabled={saving} className="w-full">
                  Save rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {rules.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4 flex justify-between gap-4">
                <div>
                  <div className="font-medium text-sm">{r.zone_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.species} · {r.rule_type} · {r.season_start} → {r.season_end}
                    {r.max_kg ? ` · max ${r.max_kg} kg` : ''}
                  </div>
                  {r.notes && <p className="text-xs mt-1 text-muted-foreground">{r.notes}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteRule(r.id)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
