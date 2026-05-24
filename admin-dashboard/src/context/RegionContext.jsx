import { createContext, useContext, useMemo } from 'react'
import { LAKE_TANA_CENTER } from '../lib/lakeTana'

const RegionContext = createContext(null)

export function RegionProvider({ children }) {
  const value = useMemo(() => ({
    regions: [],
    loading: false,
    selectedRegionId: null,
    selectedRegion: null,
    selectRegion: () => {},
    isRegionalAdmin: false,
    canSelectRegion: false,
    mapCenter: LAKE_TANA_CENTER,
    regionLabel: 'Lake Tana',
  }), [])

  return <RegionContext.Provider value={value}>{children}</RegionContext.Provider>
}

export function useRegion() {
  const ctx = useContext(RegionContext)
  if (!ctx) throw new Error('useRegion must be used within RegionProvider')
  return ctx
}
