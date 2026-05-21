import { useState } from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AppLogo from './brand/AppLogo'
import { Button } from '@/components/ui/button'
import ThemeToggle from './ThemeToggle'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/browse', label: 'Marketplace' },
  { to: '/my-orders', label: 'My Orders', auth: true },
]

export default function MarketLayout() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  const visibleLinks = navLinks.filter((l) => !l.auth || user)

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="md:hidden shrink-0"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="min-w-0">
              <AppLogo size="sm" market subtitle="Verified Lake Tana listings" />
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            {visibleLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-primary transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  Hi, {user.name.split(' ')[0]}
                </span>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Sign out
                </Button>
              </div>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(100vw,18rem)] p-0 gap-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <nav className="flex flex-col p-4 gap-1">
            {visibleLinks.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <main className="max-w-7xl mx-auto px-4 py-4 sm:py-6 w-full min-w-0">
        <Outlet />
      </main>

      <footer className="bg-card border-t border-border mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>ASSA Fish Market — All listings are government-verified by the Ministry of Fisheries, Ethiopia</p>
          <p className="mt-1">Lake Tana, Amhara Region · Fresh. Legal. Verified.</p>
        </div>
      </footer>
    </div>
  )
}
