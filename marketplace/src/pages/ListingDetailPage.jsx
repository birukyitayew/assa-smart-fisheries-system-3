import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Minus, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import OrderModal from '../components/OrderModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [ordering, setOrdering] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api
      .get(`/marketplace/listings/${id}`)
      .then((res) => setListing(res.data.listing))
      .catch(() => navigate('/'))
  }, [id, navigate])

  async function handleOrder() {
    if (!user) {
      navigate('/login')
      return
    }
    setOrdering(true)
    setError('')
    try {
      const res = await api.post('/marketplace/orders', {
        listing_id: Number(id),
        quantity_kg: Number(quantity),
      })
      navigate('/order-success', { state: { order: res.data, listing } })
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed. Please try again.')
    } finally {
      setOrdering(false)
      setShowModal(false)
    }
  }

  if (!listing) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const totalPrice = (quantity * listing.price_per_kg).toFixed(0)
  const isAvailable = listing.status === 'ACTIVE' && listing.quantity_available_kg > 0
  const imageUrl = FISH_IMAGES[listing.species] || FISH_IMAGES.Tilapia

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Button variant="link" className="px-0" asChild>
        <Link to="/">← Back to Marketplace</Link>
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative h-72 rounded-xl overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={`${listing.species} verified catch`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="text-white font-semibold text-lg">{listing.species}</div>
            <Badge className="bg-background text-primary">ASSA Verified</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline">ASSA Verified</Badge>
              {!isAvailable && <Badge variant="secondary">Sold Out</Badge>}
            </div>
            <h1 className="text-2xl font-bold text-foreground">{listing.species}</h1>
            <p className="text-sm text-muted-foreground mt-1">{listing.zone_name}</p>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">ETB {listing.price_per_kg}</span>
            <span className="text-muted-foreground">/kg</span>
          </div>

          <p className="text-sm text-muted-foreground">{listing.description}</p>

          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium">{formatKg(listing.quantity_available_kg)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fishing Gear</span>
                <span>{listing.fishing_gear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Catch Date</span>
                <span>{listing.fishing_date}</span>
              </div>
            </CardContent>
          </Card>

          {isAvailable && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Quantity (kg)</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    max={listing.quantity_available_kg}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.min(Number(e.target.value), listing.quantity_available_kg))
                    }
                    className="w-20 text-center text-lg font-semibold"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setQuantity((q) => Math.min(q + 1, listing.quantity_available_kg))
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="text-xl font-bold text-foreground">
                  ETB {Number(totalPrice).toLocaleString()}
                </span>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button
                className="w-full"
                onClick={() => (user ? setShowModal(true) : navigate('/login'))}
              >
                {user ? 'Order Now' : 'Sign in to Order'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Traceability & Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Fisher</div>
              <div className="font-medium mt-0.5">{listing.fisher_name}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">License</div>
              <div className="font-mono text-xs mt-0.5">{listing.license_number}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Submitted</div>
              <div className="mt-0.5">
                {listing.submitted_at
                  ? new Date(listing.submitted_at).toLocaleDateString('en-ET')
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Verified by Ministry</div>
              <div className="mt-0.5 text-primary font-medium">
                {listing.verified_at
                  ? new Date(listing.verified_at).toLocaleDateString('en-ET')
                  : '—'}
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary">
            This catch was submitted on {listing.fishing_date}, reviewed and verified by the
            Ministry of Fisheries, Ethiopia.
          </div>
        </CardContent>
      </Card>

      <OrderModal
        open={showModal}
        listing={listing}
        quantity={quantity}
        onConfirm={handleOrder}
        onCancel={() => setShowModal(false)}
        loading={ordering}
      />
    </div>
  )
}
