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
              <input
                type="checkbox"
                className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer accent-primary"
                checked={
                  catches.length > 0 &&
                  catches
                    .filter((c) => c.status === 'PENDING')
                    .every((c) => selectedIds.includes(c.id))
                }
                onChange={(e) => {
                  const pendingCatches = catches.filter((c) => c.status === 'PENDING');
                  if (e.target.checked) {
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
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer accent-primary"
                    checked={selectedIds.includes(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      if (e.target.checked) {
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
                    <button
                      onClick={(e) => handleApprove(c.id, e)}
                      className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 font-semibold rounded transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => handleReject(c.id, e)}
                      className="px-2 py-1 text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 font-semibold rounded transition-colors"
                    >
                      Reject
                    </button>
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
