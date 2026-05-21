import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import StatusBadge from '../StatusBadge'

export default function FishersTable({ fishers }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>License</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Zone</TableHead>
          <TableHead>Boat</TableHead>
          <TableHead>Total Catches</TableHead>
          <TableHead>Compliance</TableHead>
          <TableHead>Verified</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fishers.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="font-medium">{f.name}</TableCell>
            <TableCell className="font-mono text-xs">{f.license_number}</TableCell>
            <TableCell>
              <StatusBadge status={f.license_status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{f.zone_name || '—'}</TableCell>
            <TableCell>{f.boat_name || '—'}</TableCell>
            <TableCell>{f.total_catches}</TableCell>
            <TableCell>
              <span
                className={
                  f.compliance_score < 50
                    ? 'text-destructive font-semibold'
                    : f.compliance_score < 70
                      ? 'text-warning'
                      : 'text-success'
                }
              >
                {f.compliance_score ?? 100}
              </span>
              {f.open_violations > 0 && (
                <span className="text-xs text-muted-foreground block">{f.open_violations} open</span>
              )}
            </TableCell>
            <TableCell className="text-success font-medium">{f.verified_catches}</TableCell>
          </TableRow>
        ))}
        {fishers.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
              No fishers found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
