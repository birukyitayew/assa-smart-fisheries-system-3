import { useState, useCallback, useEffect } from 'react'
import { Fish } from 'lucide-react'
import api from '../services/api'
import ListingCard from '../components/ListingCard'
import FilterSidebar from '../components/FilterSidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Browse() {
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedSpecies, setSelectedSpecies] = useState('All Fish')
  const [priceRange, setPriceRange] = useState([0, 300])
  const [search, setSearch] = useState('')

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ available_only: 'true', limit: 50 })
      if (selectedSpecies !== 'All Fish') params.set('species', selectedSpecies)
      const res = await api.get(`/marketplace/listings?${params}`)
      setListings(res.data.listings)
      setTotal(res.data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedSpecies])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const filtered = listings.filter((l) => {
    if (l.price_per_kg < priceRange[0] || l.price_per_kg > priceRange[1]) return false
    if (
      search &&
      !l.species.toLowerCase().includes(search.toLowerCase()) &&
      !l.fisher_name.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  function clearFilters() {
    setSelectedSpecies('All Fish')
    setSearch('')
    setPriceRange([0, 300])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Browse All Listings</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} listings available</p>
      </div>

      <div className="flex gap-2 max-w-lg">
        <Input
          type="text"
          placeholder="Search fish, species, seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        {search && (
          <Button variant="outline" onClick={() => setSearch('')}>
            Clear
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        <FilterSidebar
          selectedSpecies={selectedSpecies}
          onSpeciesChange={setSelectedSpecies}
          priceRange={priceRange}
          onPriceChange={setPriceRange}
          onClear={clearFilters}
        />

        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-foreground mb-4">
            {selectedSpecies === 'All Fish' ? 'All Listings' : selectedSpecies}
            <span className="text-muted-foreground font-normal text-sm ml-2">
              ({filtered.length} available)
            </span>
          </h2>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Fish className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" aria-hidden />
                <p className="text-muted-foreground">No listings match your filters.</p>
                <Button variant="link" className="mt-3" onClick={clearFilters}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
