import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Layers, Circle, RefreshCw } from 'lucide-react';

const SPECIES_CATEGORIES = [
  { name: 'All Fish', icon: Layers },
  { name: 'Tilapia', icon: Circle, color: 'text-teal-500' },
  { name: 'Nile Perch', icon: Circle, color: 'text-emerald-500' },
  { name: 'Catfish', icon: Circle, color: 'text-amber-500' },
  { name: 'Barbus (Ganfo)', icon: Circle, color: 'text-violet-500' },
  { name: 'Carp', icon: Circle, color: 'text-blue-500' },
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
    <aside className="w-64 flex-shrink-0 space-y-6 hidden lg:block">
      {/* Categories Panel */}
      <Card className="border border-border/75 bg-card/75 backdrop-blur-sm rounded-2xl shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
            Fish Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-3 pb-4">
          {SPECIES_CATEGORIES.map((s) => {
            const Icon = s.icon;
            const isSelected = selectedSpecies === s.name;
            return (
              <Button
                key={s.name}
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start text-xs font-medium rounded-xl h-10 px-3.5 transition-all duration-300',
                  isSelected
                    ? 'bg-primary/10 border-l-3 border-primary text-primary hover:bg-primary/15 hover:text-primary font-semibold'
                    : 'text-foreground/80 hover:bg-accent/50 hover:text-foreground border-l-3 border-transparent',
                )}
                onClick={() => onSpeciesChange(s.name)}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5 mr-2.5 shrink-0',
                    isSelected ? 'text-primary' : s.color || 'text-muted-foreground/60',
                  )}
                />
                <span>{s.name}</span>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Price Slider Panel */}
      <Card className="border border-border/75 bg-card/75 backdrop-blur-sm rounded-2xl shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/85">
            Max Price (ETB/kg)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div className="relative pt-1">
            <input
              type="range"
              min="0"
              max="300"
              value={priceRange[1]}
              onChange={(e) => onPriceChange([0, Number(e.target.value)])}
              className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none transition-all duration-300"
            />
          </div>

          <div className="flex items-center justify-between text-xs bg-accent/40 border border-border/45 rounded-xl px-3 py-2.5 font-mono">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase font-sans font-semibold">
                Min
              </span>
              <span className="text-foreground/75 font-semibold">ETB 0</span>
            </div>
            <div className="h-6 w-px bg-border/60" />
            <div className="flex flex-col text-right">
              <span className="text-[9px] text-muted-foreground uppercase font-sans font-semibold">
                Max Limit
              </span>
              <span className="text-primary font-bold">ETB {priceRange[1]}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symmetrical Action Button */}
      {hasFilters && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs font-medium rounded-xl h-10 border-primary/20 hover:border-primary/45 hover:bg-primary/5 text-primary flex items-center justify-center gap-1.5 transition-all duration-300"
          onClick={onClear}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Clear All Filters</span>
        </Button>
      )}
    </aside>
  );
}
