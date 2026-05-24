import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'

const EVENT_TYPES = [
  'catch.submitted',
  'catch.approved',
  'catch.rejected',
  'listing.created',
  'order.placed',
  'quota.warning',
  'violation.created',
  'inspection.assigned',
  'inspection.completed',
]

const RealtimeContext = createContext(null)

function formatEventLabel(type, payload) {
  switch (type) {
    case 'catch.submitted':
      return `${payload.fisher_name || 'Fisher'} submitted ${payload.quantity_kg}kg ${payload.species}`
    case 'catch.approved':
      return `Catch ${payload.reference_id || ''} approved → marketplace`
    case 'catch.rejected':
      return `Catch ${payload.reference_id || ''} rejected`
    case 'listing.created':
      return `New listing: ${payload.species} ${payload.quantity_kg}kg @ ETB ${payload.price_per_kg}/kg`
    case 'order.placed':
      return `Order ${payload.order_reference}: ${payload.buyer_name} bought ${payload.quantity_kg}kg ${payload.species}`
    case 'quota.warning':
      return `Quota warning: ${payload.species} at ${payload.usage_pct}%`
    case 'violation.created':
      return `Violation filed: ${payload.type} (${payload.reference_id || ''})`
    case 'inspection.assigned':
      return `Inspection assigned: ${payload.title || payload.reference_id}`
    case 'inspection.completed':
      return `Inspection completed: ${payload.outcome}`
    default:
      return type
  }
}

export function RealtimeProvider({ children }) {
  const { user } = useAuth()
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState([])
  const esRef = useRef(null)
  const retryRef = useRef(null)

  const pushEvent = useCallback((type, payload, timestamp) => {
    const entry = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      payload,
      timestamp: timestamp || new Date().toISOString(),
      label: formatEventLabel(type, payload),
    }
    setEvents((prev) => [entry, ...prev].slice(0, 50))
  }, [])

  const loadRecent = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/events/recent?limit=20', {
        headers: { Authorization: `Bearer ${localStorage.getItem('assa_token')}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const mapped = (data.events || []).map((e, i) => ({
        id: `seed-${i}-${e.timestamp}`,
        type: e.type,
        payload: e.payload,
        timestamp: e.timestamp,
        label: formatEventLabel(e.type, e.payload),
      }))
      setEvents(mapped)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!user) return undefined

    loadRecent()

    // Exponential backoff state (local to this effect, not React state)
    let retryDelay = 1000
    let lastEventId = null

    const connect = () => {
      const token = localStorage.getItem('assa_token')
      if (!token) return

      if (esRef.current) {
        esRef.current.close()
      }

      let url = `/api/realtime/stream?token=${encodeURIComponent(token)}`
      if (lastEventId) url += `&lastEventId=${encodeURIComponent(lastEventId)}`

      const es = new EventSource(url)
      esRef.current = es

      es.onopen = () => {
        setConnected(true)
        retryDelay = 1000 // reset backoff on successful connect
      }

      const onError = () => {
        setConnected(false)
        es.close()
        retryRef.current = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30000)
          connect()
        }, retryDelay)
      }
      es.onerror = onError

      EVENT_TYPES.forEach((type) => {
        es.addEventListener(type, (ev) => {
          if (ev.lastEventId) lastEventId = ev.lastEventId
          try {
            const data = JSON.parse(ev.data)
            if (!data.replay) {
              pushEvent(type, data.payload || data, data.timestamp)
            }
          } catch {
            /* ignore parse errors */
          }
        })
      })
    }

    connect()

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      if (esRef.current) esRef.current.close()
      setConnected(false)
    }
  }, [user, loadRecent, pushEvent])

  return (
    <RealtimeContext.Provider value={{ connected, events, pushEvent, refreshEvents: loadRecent }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider')
  return ctx
}
