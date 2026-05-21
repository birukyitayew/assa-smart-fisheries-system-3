import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import StatusBadge from '../StatusBadge'

function zoneFlagBadge(flag) {
  if (!flag) return null
  if (flag === 'PROHIBITED_ZONE')
    return (
      <Badge variant="destructive" className="ml-1 text-[10px]">
        Prohibited
      </Badge>
    )
  return (
    <Badge variant="secondary" className="ml-1 text-[10px]">
      Restricted
    </Badge>
  )
}

export default function CatchesTable({ catches, onRowClick }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Reference</TableHead>
          <TableHead>Fisher</TableHead>
          <TableHead>Species</TableHead>
          <TableHead>Qty (kg)</TableHead>
          <TableHead>Zone</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {catches.map((c) => (
          <TableRow
            key={c.id}
            className={onRowClick ? 'cursor-pointer' : ''}
            onClick={() => onRowClick && onRowClick(c)}
          >
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
            <TableCell>
              <Link to={`/catches/${c.id}`} className="text-primary hover:underline text-xs font-medium">
                Review →
              </Link>
            </TableCell>
          </TableRow>
        ))}
        {catches.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
              No catches found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
