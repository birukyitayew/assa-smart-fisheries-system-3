import { useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

function formatKg(value) {
  return Number(value).toLocaleString('en-ET', { maximumFractionDigits: 1 })
}

export default function OrderSuccessPage() {
  const { state } = useLocation()
  const order = state?.order
  const listing = state?.listing

  if (!order) {
    return (
      <Button variant="link" asChild>
        <Link to="/">← Back to Marketplace</Link>
      </Button>
    )
  }

  return (
    <div className="max-w-md mx-auto text-center py-12 space-y-6">
      <div className="text-7xl">✅</div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order Placed!</h1>
        <p className="text-muted-foreground mt-2">Your order has been confirmed.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-3 text-sm text-left">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order Reference</span>
            <span className="font-mono font-bold text-primary">{order.order_reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Species</span>
            <span className="font-medium">{listing?.species}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Paid</span>
            <span className="font-bold">ETB {Number(order.total_price).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Remaining Stock</span>
            <span>{formatKg(order.quantity_remaining)} kg</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" asChild>
          <Link to="/">Continue Shopping</Link>
        </Button>
        <Button variant="outline" className="flex-1" asChild>
          <Link to="/my-orders">My Orders</Link>
        </Button>
      </div>
    </div>
  )
}
