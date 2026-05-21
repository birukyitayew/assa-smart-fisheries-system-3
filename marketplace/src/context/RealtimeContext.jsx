import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useAuth } from './AuthContext'

const MARKET_EVENTS = ['listing.created', 'order.placed']

const RealtimeContext = createContext(null)

function formatToast(type, payload) {
  if (type === 'listing.created') {
    return `New listing: ${payload.species} ${payload.quantity_kg}kg @ ETB ${payload.price_per_kg}/kg`
  }
  if (type === 'order.placed') {
    return `Order placed: ${payload.quantity_kg}kg ${payload.species}`
  }
  return type
}

export function RealtimeProvider({ children }) {
  const { user } = useAuth()
  const esRef = useRef(null)
  const retryRef = useRef(null)

  const handleEvent = useCallback((type, data) => {
    if (data.replay) return
    toast.info(formatToast(type, data.payload || data), { duration: 5000 })
  }, [])

  useEffect(() => {
    const connect = () => {
      if (esRef.current) esRef.current.close()

      const token = localStorage.getItem('assa_token')
      const url = token
        ? `/api/realtime/market/stream?token=${encodeURIComponent(token)}`
        : '/api/realtime/market/stream'

      const es = new EventSource(url)
      esRef.current = es

      es.onerror = () => {
        es.close()
        retryRef.current = setTimeout(connect, 8000)
      }

      MARKET_EVENTS.forEach((type) => {
        es.addEventListener(type, (ev) => {
          try {
            const data = JSON.parse(ev.data)
            handleEvent(type, data)
          } catch {
            /* ignore */
          }
        })
      })
    }

    connect()

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      if (esRef.current) esRef.current.close()
    }
  }, [user, handleEvent])

  return <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}
