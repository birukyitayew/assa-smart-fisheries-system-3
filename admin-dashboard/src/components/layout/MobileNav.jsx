import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import SidebarNav from './SidebarNav'

export default function MobileNav({ open, onOpenChange }) {
  const { t } = useTranslation()

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="hidden max-lg:inline-flex shrink-0"
        aria-label={t('nav.menu')}
        data-mobile-nav-trigger
        onClick={() => onOpenChange(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-[min(100vw,18rem)] max-w-full p-0 gap-0 border-sidebar-border bg-sidebar"
        >
          <SheetTitle className="sr-only">{t('nav.menu')}</SheetTitle>
          <SidebarNav
            className="h-full"
            onNavigate={() => onOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
