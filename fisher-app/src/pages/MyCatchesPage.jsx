import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Fish } from 'lucide-react';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import StatusBadge from '../components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function MyCatchesPage() {
  const { t } = useTranslation();
  const [catches, setCatches] = useState([]);
  const [selected, setSelected] = useState(null);

  const fetchCatches = useCallback(async () => {
    try {
      const res = await api.get('/fisher/catches');
      setCatches(res.data.catches);
    } catch {
      /* ignore */
    }
  }, []);

  usePolling(fetchCatches, 10000);

  if (selected) {
    return (
      <div className="p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
          {t('catches.back')}
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="font-mono text-xs text-muted-foreground">{selected.reference_id}</div>
            <h2 className="text-lg font-bold text-foreground mt-1">
              {selected.species} — {selected.quantity_kg} kg
            </h2>
            <div className="mt-2">
              <StatusBadge status={selected.status} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('catches.date')}</span>
              <span>{selected.fishing_date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('catches.time')}</span>
              <span>{selected.fishing_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('catches.gear')}</span>
              <span>{selected.fishing_gear}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('catches.zone')}</span>
              <span className="text-right max-w-[60%]">{selected.zone_name}</span>
            </div>
            {selected.number_of_fish && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('catches.numberOfFish')}</span>
                <span>{selected.number_of_fish}</span>
              </div>
            )}
          </CardContent>
        </Card>
        {selected.status === 'REJECTED' && selected.rejection_reason && (
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="pt-6">
              <div className="font-semibold text-destructive text-sm mb-1">{t('catches.rejectionReason')}</div>
              <p className="text-sm">{selected.rejection_reason}</p>
            </CardContent>
          </Card>
        )}
        {selected.status === 'VERIFIED' && (
          <Card className="border-success bg-success-muted">
            <CardContent className="pt-6 text-sm text-success">
              {t('catches.verifiedMessage')}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">{t('catches.title')}</h2>
        <p className="text-sm text-muted-foreground">
          {catches.length} submission{catches.length !== 1 ? 's' : ''}
        </p>
      </div>

      {catches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Fish className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" aria-hidden />
            <p className="text-muted-foreground">{t('catches.noCatches')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {catches.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setSelected(c)}
            >
              <CardContent className="pt-6 flex items-start justify-between">
                <div>
                  <div className="font-semibold text-foreground">{c.species}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {c.quantity_kg} kg · {c.fishing_date}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground mt-1">
                    {c.reference_id}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={c.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
