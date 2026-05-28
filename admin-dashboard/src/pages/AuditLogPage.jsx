import { useState, useCallback } from 'react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchAudit = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity_type', entityFilter);
      const res = await api.get(`/admin/audit?${params}`);
      setEntries(res.data.entries);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }, [actionFilter, entityFilter]);

  usePolling(fetchAudit, 20000);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Audit Log
        </h2>
        <p className="text-sm text-muted-foreground">
          Government accountability trail — {total} records
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label htmlFor="action">Action</Label>
            <Input
              id="action"
              placeholder="e.g. catch.approved"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="entity">Entity type</Label>
            <Input
              id="entity"
              placeholder="e.g. catch, order"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{e.actor_name || 'System'}</div>
                    <div className="text-xs text-muted-foreground">{e.actor_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {e.entity_type}
                    {e.entity_id != null ? ` #${e.entity_id}` : ''}
                  </TableCell>
                  <TableCell className="text-xs max-w-[240px] truncate">
                    {JSON.stringify(e.payload)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.ip || '—'}</TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No audit entries match filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
