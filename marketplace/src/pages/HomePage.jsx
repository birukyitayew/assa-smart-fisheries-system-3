import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import ListingCard from '../components/ListingCard';
import FilterSidebar from '../components/FilterSidebar';
import MarketSidebar from '../components/MarketSidebar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Fish, Search, SlidersHorizontal } from 'lucide-react';
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
    <div className="space-y-8 max-w-7xl mx-auto px-1 sm:px-3 pb-8">
      {/* Premium Hero Spotlight Card */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 p-8 sm:p-10 shadow-lg transition-all duration-500 hover:shadow-primary/5">
        {/* Glowing Spotlights */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-success/5 blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <Badge
            variant="outline"
            className="border-success/35 bg-success/5 text-success/90 hover:bg-success/10 rounded-full px-3 py-1 text-xs transition-all duration-300"
          >
            <span className="w-2 h-2 bg-success rounded-full mr-2 inline-block animate-pulse" />
            ASSA Verified Sustainable Fisheries
          </Badge>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text">
            Fresh. Legal. Verified.
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-lg leading-relaxed">
            Direct access to sustainable, government-certified catches from Lake Tana. Transparent
            pricing, secure verification.
          </p>

          {/* Symmetrical Search Input */}
          <div className="pt-2">
            <div className="flex items-center gap-3 bg-background/60 backdrop-blur-md border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 rounded-2xl px-4 py-3 max-w-lg shadow-inner transition-all duration-300">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder="Search fish species, fishers, references..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-sm placeholder:text-muted-foreground/75 text-foreground"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trust Badges Bar */}
      <div className="flex flex-wrap gap-2 pt-1">
        {[
          '🌿 Sustainably Sourced',
          '🛡️ Legally Certified',
          '🤝 Fair Trade Pricing',
          '🔒 Secure Payments',
          '🚀 Same Day Logistics',
        ].map((badgeText) => (
          <Badge
            key={badgeText}
            variant="outline"
            className="bg-card/45 backdrop-blur-sm border-border/80 hover:bg-accent/40 text-[11px] font-medium px-3 py-1 rounded-full transition-all duration-300"
          >
            {badgeText}
          </Badge>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Categories Sidebar */}
        <FilterSidebar
          selectedSpecies={selectedSpecies}
          onSpeciesChange={setSelectedSpecies}
          priceRange={priceRange}
          onPriceChange={setPriceRange}
          onClear={clearFilters}
        />

        {/* Dynamic Products Grid */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="h-4.5 w-4.5 text-primary" />
              {selectedSpecies === 'All Fish' ? 'Featured Catch Listings' : selectedSpecies}
              <Badge variant="secondary" className="font-mono text-xs rounded-full">
                {filtered.length} available
              </Badge>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <Card className="border-dashed border-border/60 bg-card/30 backdrop-blur-sm rounded-2xl">
              <CardContent className="py-20 text-center">
                <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-border/40">
                  <Fish className="h-8 w-8 text-muted-foreground/50 animate-pulse" />
                </div>
                <h3 className="font-bold text-foreground text-base">
                  No listings match your filter
                </h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1 leading-relaxed">
                  Try clearing your filters or checking back later. New legally verified catches are
                  listed daily!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>

        {/* Right Info Sidebar */}
        <MarketSidebar stats={stats} activity={activity} />
      </div>
    </div>
  );
}
