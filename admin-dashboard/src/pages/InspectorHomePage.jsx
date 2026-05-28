import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { usePolling } from '../hooks/usePolling';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statusVariant = {
  ASSIGNED: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
};

export default function InspectorHomePage() {
  const [assignments, setAssignments] = useState([]);
  const [suspicious, setSuspicious] = useState([]);

  const fetchAll = useCallback(async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/inspector/assignments'),
        api.get('/inspector/suspicious-fishers'),
      ]);
      setAssignments(aRes.data.assignments);
      setSuspicious(sRes.data.fishers);
    } catch (err) {
      console.error(err);
    }
  }, []);

  usePolling(fetchAll, 15000);

  const active = assignments.filter((a) => ['ASSIGNED', 'IN_PROGRESS'].includes(a.status));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
          Field Operations
        </h2>
        <p className="text-sm text-muted-foreground">
          Your inspection assignments and patrol targets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Assignments ({active.length})</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/violations">Report violation</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active assignments</p>
            ) : (
              active.map((a) => (
                <div key={a.id} className="p-3 rounded-lg border border-border">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-medium text-sm">{a.title}</span>
                    <Badge variant={statusVariant[a.status]}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{a.reference_id}</p>
                  {a.fisher_name && (
                    <p className="text-xs mt-1">
                      Fisher: {a.fisher_name} · {a.license_status}
                    </p>
                  )}
                  {a.zone_name && (
                    <p className="text-xs text-muted-foreground">Zone: {a.zone_name}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {a.status === 'ASSIGNED' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          await api.put(`/inspector/assignments/${a.id}/start`);
                          fetchAll();
                        }}
                      >
                        Start
                      </Button>
                    )}
                    {a.status === 'IN_PROGRESS' && (
                      <>
                        <Button
                          size="sm"
                          onClick={async () => {
                            await api.put(`/inspector/assignments/${a.id}/complete`, {
                              outcome: 'PASS',
                              notes: 'Routine check passed',
                            });
                            fetchAll();
                          }}
                        >
                          Pass
                        </Button>
                        <Button size="sm" variant="destructive" asChild>
                          <Link to="/violations">Violation</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suspicious Fishers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {suspicious.map((f) => (
              <div key={f.fisher_id} className="p-3 rounded-lg border border-border text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{f.name}</span>
                  <Badge variant={f.compliance_score < 50 ? 'destructive' : 'outline'}>
                    Score {f.compliance_score}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {f.license_status} · {f.open_violations} open violations · {f.flagged_catches_30d}{' '}
                  flagged catches
                </p>
                <Button size="sm" variant="link" className="px-0 h-auto mt-1" asChild>
                  <Link to={`/fishermen`}>Verify license →</Link>
                </Button>
              </div>
            ))}
            {suspicious.length === 0 && (
              <p className="text-sm text-muted-foreground">No flagged fishers</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
