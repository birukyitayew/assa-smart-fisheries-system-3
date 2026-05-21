export default function ActivityFeed({ activity }) {
  return (
    <div className="space-y-3">
      {activity.slice(0, 5).map((a, i) => (
        <div key={i} className="text-xs">
          <div className="font-medium text-foreground">
            {a.buyer_name} ordered {Number(a.quantity_kg).toLocaleString()} kg
          </div>
          <div className="text-muted-foreground">
            {a.species} · ETB {Math.round(a.total_price).toLocaleString()}
          </div>
          <div className="text-muted-foreground/70">
            {new Date(a.ordered_at).toLocaleString('en-ET', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      ))}
      {activity.length === 0 && <p className="text-xs text-muted-foreground">No recent activity</p>}
    </div>
  )
}
