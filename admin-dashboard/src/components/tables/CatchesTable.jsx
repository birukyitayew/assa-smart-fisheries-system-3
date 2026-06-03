import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import api from '../../services/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import StatusBadge from '../StatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

function zoneFlagBadge(flag) {
  if (!flag) return null;
  if (flag === 'PROHIBITED_ZONE')
    return (
      <Badge variant="destructive" className="ml-1 text-[10px]">
        Prohibited
      </Badge>
    );
  return (
    <Badge variant="secondary" className="ml-1 text-[10px]">
      Restricted
    </Badge>
  );
}

export default function CatchesTable({
  catches,
  onRowClick,
  selectedIds = [],
  onSelectChange,
  onRefresh,
}) {
  const handleApprove = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/admin/catches/${id}/approve`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve catch');
    }
  };

  const handleReject = async (id, e) => {
    e.stopPropagation();
    const reason = prompt('Please enter a rejection reason:');
    if (!reason || !reason.trim()) return;
    try {
      await api.put(`/admin/catches/${id}/reject`, { reason });
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject catch');
    }
  };

  const hasPending = catches.some((c) => c.status === 'PENDING');

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {onSelectChange && hasPending && (
            <TableHead className="w-12">
              <Checkbox
                checked={
                  catches.length > 0 &&
                  catches
                    .filter((c) => c.status === 'PENDING')
                    .every((c) => selectedIds.includes(c.id))
                }
                onCheckedChange={(checked) => {
                  const pendingCatches = catches.filter((c) => c.status === 'PENDING');
                  if (checked) {
                    const newSelected = [
                      ...new Set([...selectedIds, ...pendingCatches.map((c) => c.id)]),
                    ];
                    onSelectChange(newSelected);
                  } else {
                    const pendingIds = pendingCatches.map((c) => c.id);
                    onSelectChange(selectedIds.filter((id) => !pendingIds.includes(id)));
                  }
                }}
              />
            </TableHead>
          )}
          <TableHead>Reference</TableHead>
          <TableHead>Fisher</TableHead>
          <TableHead>Species</TableHead>
          <TableHead>Qty (kg)</TableHead>
          <TableHead>Zone</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {catches.map((c) => (
          <TableRow
            key={c.id}
            className={onRowClick ? 'cursor-pointer' : ''}
            onClick={() => onRowClick && onRowClick(c)}
          >
            {onSelectChange && hasPending && (
              <TableCell className="w-12">
                {c.status === 'PENDING' ? (
                  <Checkbox
                    checked={selectedIds.includes(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onSelectChange([...selectedIds, c.id]);
                      } else {
                        onSelectChange(selectedIds.filter((id) => id !== c.id));
                      }
                    }}
                  />
                ) : null}
              </TableCell>
            )}
            <TableCell className="font-mono text-xs">{c.reference_id}</TableCell>
            <TableCell className="font-medium">{c.fisher_name}</TableCell>
            <TableCell>{c.species}</TableCell>
            <TableCell>{c.quantity_kg}</TableCell>
            <TableCell className="text-xs max-w-[140px]">
              {c.zone_name}
              {zoneFlagBadge(c.zone_flag)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {new Date(c.submitted_at).toLocaleString('en-ET', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </TableCell>
            <TableCell>
              <StatusBadge status={c.status} />
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-2">
                {c.status === 'PENDING' && (
                  <>
                    <Button
                      size="sm"
                      onClick={(e) => handleApprove(c.id, e)}
                      className="h-7 px-2 text-xs bg-success/10 text-success hover:bg-success/20 font-semibold border-none rounded transition-colors shadow-none"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => handleReject(c.id, e)}
                      className="h-7 px-2 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold border-none rounded transition-colors shadow-none"
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Link
                  to={`/catches/${c.id}`}
                  className="text-primary hover:underline text-xs font-semibold px-2.5 py-1 bg-primary/10 rounded transition-colors"
                >
                  Review
                </Link>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {catches.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={hasPending ? 9 : 8}
              className="py-10 text-center text-muted-foreground"
            >
              No catches found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
