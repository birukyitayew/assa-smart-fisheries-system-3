import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PriceSparkline from './PriceSparkline';

const FISH_COLORS = {
  Tilapia: { bg: 'linear-gradient(135deg, #0e7490, #155e75)', emoji: '🐟' },
  Catfish: { bg: 'linear-gradient(135deg, #92400e, #78350f)', emoji: '🐠' },
  'Nile Perch': { bg: 'linear-gradient(135deg, #065f46, #064e3b)', emoji: '🐡' },
  Carp: { bg: 'linear-gradient(135deg, #1e40af, #1e3a8a)', emoji: '🐟' },
  'Barbus (Ganfo)': { bg: 'linear-gradient(135deg, #6d28d9, #5b21b6)', emoji: '🐠' },
  default: { bg: 'linear-gradient(135deg, #334155, #1e293b)', emoji: '🐟' },
};

function formatKg(value) {
  return Number(value).toLocaleString('en-ET', { maximumFractionDigits: 1 });
}

function ListingBadge({ listing, t }) {
  if (listing.status === 'SOLD_OUT') return <Badge variant="secondary">{t('listing.soldOut')}</Badge>;
  if (listing.shortage_flags?.includes('quota')) {
    return <Badge variant="destructive">{t('listing.shortage')}</Badge>;
  }
  if (listing.shortage_flags?.includes('low_stock') || listing.quantity_available_kg < 10) {
    return <Badge variant="outline">{t('listing.limited')}</Badge>;
  }
  return <Badge>{t('listing.fresh')}</Badge>;
}

export default function ListingCard({ listing }) {
  const { t } = useTranslation();
  const fish = FISH_COLORS[listing.species] || FISH_COLORS.default;

  return (
    <Link to={`/listing/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all h-full">
        <div
          className="h-40 relative overflow-hidden flex items-center justify-center"
          style={{ background: fish.bg }}
        >
          <div className="text-6xl opacity-35 select-none transition-transform duration-500 hover:scale-110">
            {fish.emoji}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <ListingBadge listing={listing} t={t} />
          </div>
          <div className="absolute bottom-3 left-3">
            <Badge variant="secondary" className="bg-background/90">
              {t('listing.verified')}
            </Badge>
          </div>
        </div>

        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-foreground">{listing.species}</h3>
            <Badge
              variant="outline"
              className="text-[10px] shrink-0 border-success/40 text-success"
            >
              {t('listing.verified')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{listing.zone_name}</p>
          <div className="flex items-end justify-between mt-3 gap-2">
            <div>
              <span className="text-xl font-bold text-primary">ETB {listing.price_per_kg}</span>
              <span className="text-xs text-muted-foreground">/{t('listing.perKg')}</span>
              <PriceSparkline data={listing.price_trend} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {t('listing.kgLeft', { amount: formatKg(listing.quantity_available_kg) })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <span>{listing.fisher_name}</span>
            <span className="ml-auto font-mono">{listing.catch_reference}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
