import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import InspectorHomePage from './pages/InspectorHomePage'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DailyCatchesPage from './pages/DailyCatchesPage'
import CatchDetailPage from './pages/CatchDetailPage'
import FishermanPage from './pages/FishermanPage'
import QuotasPage from './pages/QuotasPage'
import AlertsPage from './pages/AlertsPage'
import ReportsPage from './pages/ReportsPage'
import ZonesPage from './pages/ZonesPage'
import LiveOperationsPage from './pages/LiveOperationsPage'
import CommandMapPage from './pages/CommandMapPage'
import MarketMonitorPage from './pages/MarketMonitorPage'
import AuditLogPage from './pages/AuditLogPage'
import InspectionsPage from './pages/InspectionsPage'
import ViolationsPage from './pages/ViolationsPage'
import FleetPage from './pages/FleetPage'
import IntelligencePage from './pages/IntelligencePage'

function HomeRoute() {
  const { user } = useAuth()
  if (user?.role === 'inspector') return <InspectorHomePage />
  return <DashboardPage />
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<HomeRoute />} />
        <Route path="live" element={<LiveOperationsPage />} />
        <Route path="map" element={<CommandMapPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="intelligence" element={<IntelligencePage />} />
        <Route path="market" element={<MarketMonitorPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="violations" element={<ViolationsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="catches" element={<DailyCatchesPage />} />
        <Route path="catches/:id" element={<CatchDetailPage />} />
        <Route path="fishermen" element={<FishermanPage />} />
        <Route path="quotas" element={<QuotasPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="zones" element={<ZonesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
