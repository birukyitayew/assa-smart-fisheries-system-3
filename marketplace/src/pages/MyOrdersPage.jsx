import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get('/marketplace/orders').then((res) => setOrders(res.data.orders));
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">My Orders</h2>
        <p className="text-sm text-muted-foreground">
          {orders.length} order{orders.length !== 1 ? 's' : ''}
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-3">🛒</div>
            <p className="text-muted-foreground">No orders yet.</p>
            <Button variant="link" className="mt-4" asChild>
              <Link to="/">Browse listings →</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="pt-6 flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">{o.reference_id}</div>
                  <div className="font-semibold text-foreground mt-0.5">
                    {o.species} — {o.quantity_kg} kg
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">From {o.fisher_name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">
                    ETB {Math.round(o.total_price).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(o.ordered_at).toLocaleDateString('en-ET', { dateStyle: 'medium' })}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {o.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
