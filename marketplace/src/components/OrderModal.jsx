import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function OrderModal({ listing, quantity, onConfirm, onCancel, loading, open }) {
  const { t } = useTranslation();
  const totalPrice = (quantity * listing.price_per_kg).toFixed(0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('order.confirm')}</DialogTitle>
          <DialogDescription>{t('order.reviewOrder')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('order.species')}</span>
            <span className="font-medium">{listing.species}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('order.quantity')}</span>
            <span className="font-medium">{quantity} kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('order.pricePerKg')}</span>
            <span>ETB {listing.price_per_kg}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 mt-2">
            <span className="font-semibold">{t('order.total')}</span>
            <span className="font-bold text-primary text-lg">
              ETB {Number(totalPrice).toLocaleString()}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            {t('order.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? t('order.placing') : t('order.confirmOrder')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
