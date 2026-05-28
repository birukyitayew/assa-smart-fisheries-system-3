import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ShieldCheck, Calendar, User, Scale } from 'lucide-react';
import PriceSparkline from './PriceSparkline';

const FISH_CANVAS = {
  Tilapia: {
    bg: 'linear-gradient(135deg, #0f766e, #115e59, #134e4a)',
    circle: 'bg-teal-400/20',
    glow: 'shadow-[0_0_40px_rgba(45,212,191,0.25)]',
    emoji: '🐟',
  },
  Catfish: {
    bg: 'linear-gradient(135deg, #b45309, #92400e, #78350f)',
    circle: 'bg-amber-400/20',
    glow: 'shadow-[0_0_40px_rgba(251,191,36,0.25)]',
    emoji: '🐠',
  },
  'Nile Perch': {
    bg: 'linear-gradient(135deg, #047857, #065f46, #064e3b)',
    circle: 'bg-emerald-400/20',
    glow: 'shadow-[0_0_40px_rgba(52,211,153,0.25)]',
    emoji: '🐡',
  },
  Carp: {
    bg: 'linear-gradient(135deg, #1d4ed8, #1e40af, #1e3a8a)',
    circle: 'bg-blue-400/20',
    glow: 'shadow-[0_0_40px_rgba(96,165,250,0.25)]',
    emoji: '🐟',
  },
  'Barbus (Ganfo)': {
    bg: 'linear-gradient(135deg, #7c3aed, #6d28d9, #5b21b6)',
    circle: 'bg-violet-400/20',
    glow: 'shadow-[0_0_40px_rgba(167,139,250,0.25)]',
    emoji: '🐠',
  },
  default: {
    bg: 'linear-gradient(135deg, #475569, #334155, #1e293b)',
    circle: 'bg-slate-400/20',
    glow: 'shadow-[0_0_40px_rgba(148,163,184,0.25)]',
    emoji: '🐟',
  },
};

function formatKg(value) {
  return Number(value).toLocaleString('en-ET', { maximumFractionDigits: 1 });
}

function ListingBadge({ listing }) {
  if (listing.status === 'SOLD_OUT') {
    return (
      <Badge className="bg-muted text-muted-foreground border-border uppercase text-[10px] tracking-wider rounded-full px-2 py-0.5">
        Sold Out
      </Badge>
    );
  }
  if (listing.shortage_flags?.includes('quota')) {
    return (
      <Badge className="bg-destructive/20 border-destructive/30 text-destructive-foreground uppercase text-[10px] tracking-wider rounded-full px-2 py-0.5 animate-pulse">
        Shortage
      </Badge>
    );
  }
  if (listing.shortage_flags?.includes('low_stock') || listing.quantity_available_kg < 10) {
    return (
      <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-500 uppercase text-[10px] tracking-wider rounded-full px-2 py-0.5">
        Limited Stock
      </Badge>
    );
  }
  return (
    <Badge className="bg-success/20 border-success/30 text-success-foreground uppercase text-[10px] tracking-wider rounded-full px-2 py-0.5">
      Fresh Catch
    </Badge>
  );
}

export default function ListingCard({ listing }) {
  const { t } = useTranslation();
  const fish = FISH_CANVAS[listing.species] || FISH_CANVAS.default;

  return (
    <Link to={`/listing/${listing.id}`} className="block h-full group">
      <Card className="overflow-hidden border border-border/80 hover:border-primary/25 bg-card/60 backdrop-blur-sm shadow-sm group-hover:shadow-md group-hover:-translate-y-1.5 transition-all duration-300 h-full flex flex-col">
        {/* Geometric Canvas Card Header */}
        <div
          className="h-44 relative overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:brightness-105"
          style={{ background: fish.bg }}
        >
          {/* Graphic Design Accents */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)]" />
          <div
            className={cn(
              'absolute h-36 w-36 rounded-full filter blur-xl opacity-35 transition-all duration-500 group-hover:scale-110',
              fish.circle,
              fish.glow,
            )}
          />

          <div className="text-6xl z-10 transition-transform duration-500 group-hover:scale-110 select-none">
            {fish.emoji}
          </div>

          {/* Glassmorphic Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 z-10">
            <ListingBadge listing={listing} />
          </div>
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-background/80 backdrop-blur-md border border-border/60 text-foreground/80 hover:bg-background/95 text-[10px] py-0.5 px-2 rounded-full flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-success" />
              <span>ASSA Certified</span>
            </Badge>
          </div>
        </div>

        {/* Card Content Body */}
        <CardContent className="p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-foreground text-base tracking-tight leading-none">
                {listing.species}
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] shrink-0 border-success/30 bg-success/5 text-success rounded-full py-0 px-2 font-semibold"
              >
                LEGAL CATCH
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Compass className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <span className="truncate">{listing.zone_name || 'Lake Tana waters'}</span>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-border/60 flex items-end justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/80 font-medium">
                Fair Market Price
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-primary tracking-tight">
                  ETB {listing.price_per_kg}
                </span>
                <span className="text-xs text-muted-foreground">/kg</span>
              </div>
              <PriceSparkline data={listing.price_trend} />
            </div>

            <div className="text-right space-y-1">
              <div className="inline-flex items-center gap-1 bg-accent/60 border border-border/55 rounded-full px-2 py-0.5 text-[10px] font-semibold text-foreground/80 shrink-0">
                <Scale className="h-2.5 w-2.5 text-primary" />
                <span>{formatKg(listing.quantity_available_kg)} kg left</span>
              </div>
            </div>
          </div>

          {/* Symmetrical Footer */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/55 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <div className="h-4.5 w-4.5 bg-muted/70 rounded-full flex items-center justify-center shrink-0">
                <User className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
              <span className="truncate text-[11px]">{listing.fisher_name}</span>
            </div>
            <span className="ml-auto font-mono text-[10px] bg-muted/40 hover:bg-muted/65 border border-border/35 text-muted-foreground px-1.5 py-0.5 rounded transition-all duration-300 select-all shrink-0">
              {listing.catch_reference}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Quick tiny component local override since Lucide doesn't have Compass natively in the file scope
function Compass({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
