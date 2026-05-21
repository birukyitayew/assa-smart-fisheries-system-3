import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppLogo from './brand/AppLogo'
import { Button } from '@/components/ui/button'

export default function MarketLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/">
            <AppLogo size="sm" market subtitle="Verified Lake Tana listings" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/browse" className="hover:text-primary transition-colors">
              Marketplace
            </Link>
            {user && (
              <Link to="/my-orders" className="hover:text-primary transition-colors">
                My Orders
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Hi, {user.name.split(' ')[0]}</span>
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

      <main className="max-w-7xl mx-auto px-4 py-6">
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
