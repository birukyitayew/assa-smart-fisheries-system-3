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

export default function InspectionsPage() {
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [inspections, setInspections] = useState([]);
  const [inspectors, setInspectors] = useState([]);
  const [fishers, setFishers] = useState([]);
  const [form, setForm] = useState({
    inspector_id: '',
    fisher_id: '',
    title: '',
    instructions: '',
    scheduled_at: '',
  });

  const fetchAll = useCallback(async () => {
    try {
      const endpoint = isAdmin ? '/admin/inspections' : '/inspector/assignments';
      const res = await api.get(endpoint);
      setInspections(isAdmin ? res.data.inspections : res.data.assignments);
      if (isAdmin) {
        const [insp, fish] = await Promise.all([
          api.get('/admin/inspectors'),
          api.get('/admin/fishers?limit=50'),
        ]);
        setInspectors(insp.data.inspectors);
        setFishers(fish.data.fishers);
      }
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  usePolling(fetchAll, 15000);

  async function assignInspection() {
    try {
      await api.post('/admin/inspections', {
        ...form,
        fisher_id: form.fisher_id ? Number(form.fisher_id) : null,
        inspector_id: Number(form.inspector_id),
        scheduled_at: form.scheduled_at || new Date().toISOString(),
      });
      toast.success('Inspection assigned');
      setForm({ inspector_id: '', fisher_id: '', title: '', instructions: '', scheduled_at: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to assign');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Inspections Hub</h2>
          <p className="text-sm text-muted-foreground">
            Assign field inspections and track enforcement outcomes
          </p>
        </div>
        {isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>Assign inspection</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New inspection assignment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Inspector</Label>
                  <Select
                    value={form.inspector_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, inspector_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select inspector" />
                    </SelectTrigger>
                    <SelectContent>
                      {inspectors.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.name} ({i.active_assignments} active)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fisher (optional)</Label>
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
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instructions</Label>
                  <Textarea
                    value={form.instructions}
                    onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
                  />
                </div>
                <Button onClick={assignInspection} className="w-full">
                  Assign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All inspections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Title</TableHead>
                {isAdmin && <TableHead>Inspector</TableHead>}
                <TableHead>Fisher</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Scheduled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-mono text-xs">{i.reference_id}</TableCell>
                  <TableCell className="font-medium">{i.title}</TableCell>
                  {isAdmin && <TableCell>{i.inspector_name}</TableCell>}
                  <TableCell>{i.fisher_name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{i.status}</Badge>
                  </TableCell>
                  <TableCell>{i.outcome || '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {i.scheduled_at ? new Date(i.scheduled_at).toLocaleString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
