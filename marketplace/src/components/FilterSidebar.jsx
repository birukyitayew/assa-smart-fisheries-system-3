import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

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
  const { t } = useTranslation();
  const hasFilters = selectedSpecies !== 'All Fish' || priceRange[1] < 300;

  return (
    <aside className="w-56 flex-shrink-0 space-y-5 hidden lg:block">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t('filter.categories')}</CardTitle>
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
          <CardTitle className="text-sm">{t('filter.priceRange')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="price-slider" className="sr-only">
            {t('filter.priceRange')}
          </Label>
          <Slider
            id="price-slider"
            min={0}
            max={300}
            value={priceRange[1]}
            onValueChange={(val) => onPriceChange([0, val])}
            className="w-full"
            aria-label={t('filter.priceRange')}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>ETB 0</span>
            <span>ETB {priceRange[1]}</span>
          </div>
        </CardContent>
      </Card>

      {hasFilters && (
        <Button variant="link" size="sm" className="w-full" onClick={onClear}>
          {t('filter.clearAll')}
        </Button>
      )}
    </aside>
  );
}
