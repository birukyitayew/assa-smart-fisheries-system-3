import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import ListingCard from '../components/ListingCard';
import FilterSidebar from '../components/FilterSidebar';
import MarketSidebar from '../components/MarketSidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fish } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState('All Fish');
  const [priceRange, setPriceRange] = useState([0, 300]);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ available_only: 'true', limit: 30 });
      if (selectedSpecies !== 'All Fish') params.set('species', selectedSpecies);
      const [listRes, statsRes, actRes] = await Promise.all([
        api.get(`/marketplace/listings?${params}`),
        api.get('/marketplace/stats'),
        api.get('/marketplace/activity'),
      ]);
      setListings(listRes.data.listings);
      setStats(statsRes.data);
      setActivity(actRes.data.activity);
    } catch (err) {
      console.error(err);
    }
  }, [selectedSpecies]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const filtered = listings.filter((l) => {
    if (l.price_per_kg < priceRange[0] || l.price_per_kg > priceRange[1]) return false;
    if (
      search &&
      !l.species.toLowerCase().includes(search.toLowerCase()) &&
      !l.fisher_name.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  function clearFilters() {
    setSelectedSpecies('All Fish');
    setSearch('');
    setPriceRange([0, 300]);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <Badge variant="outline" className="mb-4 border-success/40 text-success">
          <span className="w-2 h-2 bg-success rounded-full mr-2 inline-block" />
          All fish are legally caught and ASSA verified
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Fresh. Legal. Verified.
        </h1>
        <p className="text-muted-foreground mt-2 max-w-xl">
          Buy quality fish, support sustainable fishing in Lake Tana.
        </p>
        <div className="mt-5 flex gap-2 max-w-lg">
          <Input
            type="text"
            placeholder="Search fish, species, seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['Verified Legal Catch', 'Fresh & Quality', 'Fair Price', 'Secure', 'Fast Delivery'].map(
          (b) => (
            <Badge key={b} variant="outline">
              {b}
            </Badge>
          ),
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-foreground">
              {selectedSpecies === 'All Fish' ? 'Featured Listings' : selectedSpecies}
              <span className="text-muted-foreground font-normal text-sm ml-2">
                ({filtered.length} available)
              </span>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Fish className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" aria-hidden />
                <p className="text-muted-foreground">No listings available right now.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check back soon — new catches are approved daily.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>

        <MarketSidebar stats={stats} activity={activity} />
      </div>
    </div>
  );
}
