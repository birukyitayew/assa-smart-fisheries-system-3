import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import PriceSparkline from './PriceSparkline'

const FISH_IMAGES = {
  Tilapia: 'https://commons.wikimedia.org/wiki/Special:FilePath/Oreochromis_niloticus.jpg',
  Catfish: 'https://commons.wikimedia.org/wiki/Special:FilePath/Clarias_gariepinus.jpg',
  'Nile Perch': 'https://commons.wikimedia.org/wiki/Special:FilePath/Lates_niloticus.jpg',
  Carp: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cyprinus_carpio.jpg',
  'Barbus (Ganfo)': 'https://commons.wikimedia.org/wiki/Special:FilePath/Barbus_barbus.jpg',
}

function formatKg(value) {
  return Number(value).toLocaleString('en-ET', { maximumFractionDigits: 1 })
}

function ListingBadge({ listing }) {
  if (listing.status === 'SOLD_OUT') return <Badge variant="secondary">Sold Out</Badge>
  if (listing.shortage_flags?.includes('quota')) {
    return <Badge variant="destructive">Shortage</Badge>
  }
  if (listing.shortage_flags?.includes('low_stock') || listing.quantity_available_kg < 10) {
    return <Badge variant="outline">Limited</Badge>
  }
  return <Badge>Fresh</Badge>
}

export default function ListingCard({ listing }) {
  const { t } = useTranslation()
  const imageUrl = FISH_IMAGES[listing.species] || FISH_IMAGES.Tilapia

  return (
    <Link to={`/listing/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all h-full">
        <div className="h-40 bg-muted relative overflow-hidden">
          <img
            src={imageUrl}
            alt={`${listing.species} catch`}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <ListingBadge listing={listing} />
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
            <Badge variant="outline" className="text-[10px] shrink-0 border-success/40 text-success">
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
              {formatKg(listing.quantity_available_kg)} kg left
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <span>{listing.fisher_name}</span>
            <span className="ml-auto font-mono">{listing.catch_reference}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
