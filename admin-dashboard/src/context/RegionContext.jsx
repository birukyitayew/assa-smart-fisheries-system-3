import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { lakeTanaMapCenter } from '../lib/lakeTana'
import { useAuth } from './AuthContext'

const STORAGE_KEY = 'assa_region_id'
const RegionContext = createContext(null)

export function RegionProvider({ children }) {
  const { user } = useAuth()
  const [regions, setRegions] = useState([])
  const [selectedRegionId, setSelectedRegionId] = useState(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored === 'all' || stored === '' || stored == null) return null
    const n = Number(stored)
    return Number.isFinite(n) && n > 0 ? n : null
  })
  const [loading, setLoading] = useState(false)

  const isRegionalAdmin = user?.role === 'regional_admin'
  const forcedRegionId = isRegionalAdmin ? (user?.region_id ?? null) : null
  const effectiveRegionId = forcedRegionId ?? selectedRegionId

  const loadRegions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await api.get('/admin/regions')
      setRegions(res.data.regions || [])
    } catch {
      setRegions([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadRegions()
  }, [loadRegions])

  useEffect(() => {
    if (isRegionalAdmin && user?.region_id) {
      setSelectedRegionId(user.region_id)
      sessionStorage.setItem(STORAGE_KEY, String(user.region_id))
    }
  }, [isRegionalAdmin, user?.region_id])

  function selectRegion(id) {
    if (isRegionalAdmin) return
    const next = id == null || id === 'all' ? null : Number(id)
    setSelectedRegionId(next)
    sessionStorage.setItem(STORAGE_KEY, next == null ? 'all' : String(next))
  }

  const selectedRegion = useMemo(
    () => regions.find((r) => r.id === effectiveRegionId) ?? null,
    [regions, effectiveRegionId],
  )

  const mapCenter = useMemo(() => lakeTanaMapCenter(selectedRegion), [selectedRegion])

  const value = {
    regions,
    loading,
    selectedRegionId: effectiveRegionId,
    selectedRegion,
    selectRegion,
    isRegionalAdmin,
    canSelectRegion: !isRegionalAdmin,
    mapCenter,
    regionLabel: selectedRegion?.name ?? (effectiveRegionId == null ? 'All lakes (national)' : 'Unknown region'),
  }

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

export function useRegion() {
  const ctx = useContext(RegionContext)
  if (!ctx) throw new Error('useRegion must be used within RegionProvider')
  return ctx
}
