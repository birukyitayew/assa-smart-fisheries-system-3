import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SPECIES_CATEGORIES = [
  'All Fish',
  'Tilapia',
  'Nile Perch',
  'Catfish',
  'Barbus (Ganfo)',
  'Carp',
];

export default function FilterSidebar({
  selectedSpecies,
  onSpeciesChange,
  priceRange,
  onPriceChange,
  onClear,
}) {
  const hasFilters = selectedSpecies !== 'All Fish' || priceRange[1] < 300;

  return (
    <aside className="w-56 flex-shrink-0 space-y-5 hidden lg:block">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {SPECIES_CATEGORIES.map((s) => (
            <Button
              key={s}
              variant={selectedSpecies === s ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => onSpeciesChange(s)}
            >
              {s}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Price Range (ETB/kg)</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="range"
            min="0"
            max="300"
            value={priceRange[1]}
            onChange={(e) => onPriceChange([0, Number(e.target.value)])}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>ETB 0</span>
            <span>ETB {priceRange[1]}</span>
          </div>
        </CardContent>
      </Card>

      {hasFilters && (
        <Button variant="link" size="sm" className="w-full" onClick={onClear}>
          Clear all filters
        </Button>
      )}
    </aside>
  );
}
