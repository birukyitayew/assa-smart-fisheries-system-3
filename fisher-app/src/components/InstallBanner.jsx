import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { onInstallAvailabilityChange, promptInstall } from '../lib/pwa';

const DISMISS_KEY = 'assa-fisher-install-dismissed';

export default function InstallBanner() {
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  useEffect(() => onInstallAvailabilityChange(setCanInstall), []);

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sessionStorage may be unavailable */
    }
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === 'dismissed') handleDismiss();
  };

  return (
    <div className="flex items-center gap-2 bg-primary/10 text-foreground border-b border-primary/20 px-3 py-2">
      <Download className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight">Install ASSA Fisher</p>
        <p className="text-[10px] text-muted-foreground leading-tight">
          Add to your home screen for faster access and offline use.
        </p>
      </div>
      <Button size="sm" className="h-7 px-2 text-xs" onClick={handleInstall}>
        Install
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
