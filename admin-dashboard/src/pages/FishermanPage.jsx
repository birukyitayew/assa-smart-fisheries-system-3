import { useState, useEffect } from 'react'
import api from '../services/api'
import FishersTable from '../components/tables/FishersTable'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function FishermanPage() {
  const [fishers, setFishers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get(`/admin/fishers?page=${page}&limit=20`).then((res) => {
      setFishers(res.data.fishers)
      setTotal(res.data.total)
    })
  }, [page])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Fishermen</h2>
        <p className="text-sm text-muted-foreground">
          {total} registered fishers — Lake Tana, Amhara Region
        </p>
      </div>

      <Card className="overflow-hidden">
        <FishersTable fishers={fishers} />
        {total > 20 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / 20)}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
