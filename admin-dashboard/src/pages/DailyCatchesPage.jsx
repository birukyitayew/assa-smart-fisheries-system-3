import { useState, useCallback } from 'react'
import api from '../services/api'
import { useRegion } from '../context/RegionContext'
import { usePolling } from '../hooks/usePolling'
import CatchesTable from '../components/tables/CatchesTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const TABS = ['ALL', 'PENDING', 'VERIFIED', 'REJECTED']

export default function DailyCatchesPage() {
  const { selectedRegionId } = useRegion()
  const [catches, setCatches] = useState([])
  const [total, setTotal] = useState(0)
  const [activeTab, setActiveTab] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])

  const fetchCatches = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page, limit: 20 })
      if (activeTab !== 'ALL') params.set('status', activeTab)
      if (search) params.set('search', search)
      if (date) params.set('date', date)
      const res = await api.get(`/admin/catches?${params}`)
      setCatches(res.data.catches)
      setTotal(res.data.total)
      setSelectedIds([]) // Reset selections when data changes
    } catch (err) {
      console.error(err)
    }
  }, [activeTab, search, date, page, selectedRegionId])

  usePolling(fetchCatches, 10000)

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return
    const confirmApprove = window.confirm(`Are you sure you want to approve ${selectedIds.length} selected catches?`)
    if (!confirmApprove) return
    try {
      await Promise.all(selectedIds.map(id => api.put(`/admin/catches/${id}/approve`)))
      setSelectedIds([])
      fetchCatches()
    } catch (err) {
      alert('Error approving some catches: ' + (err.response?.data?.error || err.message))
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Daily Catches</h2>
        <p className="text-sm text-muted-foreground">Review and process catch submissions</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1) }} className="w-full sm:w-auto overflow-x-auto">
              <TabsList className="w-full sm:w-auto">
                {TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="text-xs">
                    {tab.charAt(0) + tab.slice(1).toLowerCase()}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Input
              type="text"
              placeholder="Search fisher, species, reference..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full sm:flex-1 sm:min-w-[200px]"
            />

            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(1) }}
              className="w-full sm:w-auto"
            />

            {(search || date) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDate(''); setPage(1) }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between min-h-[50px]">
          <span className="text-sm text-muted-foreground">
            {total} result{total !== 1 ? 's' : ''}
          </span>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg border border-emerald-500/20">
              <span className="text-xs font-semibold">
                {selectedIds.length} selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkApprove}
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1 text-[11px] h-auto font-bold"
              >
                Approve Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
                className="text-muted-foreground hover:text-foreground text-[11px] px-1 py-1 h-auto"
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        <CatchesTable 
          catches={catches} 
          selectedIds={selectedIds} 
          onSelectChange={setSelectedIds} 
          onRefresh={fetchCatches}
        />

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
