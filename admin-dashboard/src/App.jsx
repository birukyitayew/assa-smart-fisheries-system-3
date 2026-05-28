import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import InspectorHomePage from './pages/InspectorHomePage';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DailyCatchesPage from './pages/DailyCatchesPage';
import CatchDetailPage from './pages/CatchDetailPage';
import FishermanPage from './pages/FishermanPage';
import QuotasPage from './pages/QuotasPage';
import AlertsPage from './pages/AlertsPage';
import ReportsPage from './pages/ReportsPage';
import ZonesPage from './pages/ZonesPage';
import LiveOperationsPage from './pages/LiveOperationsPage';
import CommandMapPage from './pages/CommandMapPage';
import MarketMonitorPage from './pages/MarketMonitorPage';
import AuditLogPage from './pages/AuditLogPage';
import InspectionsPage from './pages/InspectionsPage';
import ViolationsPage from './pages/ViolationsPage';
import FleetPage from './pages/FleetPage';
import IntelligencePage from './pages/IntelligencePage';
import UsersPage from './pages/UsersPage';
import SecurityPage from './pages/SecurityPage';

function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === 'inspector') return <InspectorHomePage />;
  return <DashboardPage />;
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <ErrorBoundary>
              <HomeRoute />
            </ErrorBoundary>
          }
        />
        <Route
          path="live"
          element={
            <ErrorBoundary>
              <LiveOperationsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="map"
          element={
            <ErrorBoundary>
              <CommandMapPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="fleet"
          element={
            <ErrorBoundary>
              <FleetPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="intelligence"
          element={
            <ErrorBoundary>
              <IntelligencePage />
            </ErrorBoundary>
          }
        />
        <Route
          path="security"
          element={
            <ErrorBoundary>
              <SecurityPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="market"
          element={
            <ErrorBoundary>
              <MarketMonitorPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="inspections"
          element={
            <ErrorBoundary>
              <InspectionsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="violations"
          element={
            <ErrorBoundary>
              <ViolationsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="audit"
          element={
            <ErrorBoundary>
              <AuditLogPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="catches"
          element={
            <ErrorBoundary>
              <DailyCatchesPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="catches/:id"
          element={
            <ErrorBoundary>
              <CatchDetailPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="fishermen"
          element={
            <ErrorBoundary>
              <FishermanPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="users/create"
          element={
            <ErrorBoundary>
              <UsersPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="quotas"
          element={
            <ErrorBoundary>
              <QuotasPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="alerts"
          element={
            <ErrorBoundary>
              <AlertsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="reports"
          element={
            <ErrorBoundary>
              <ReportsPage />
            </ErrorBoundary>
          }
        />
        <Route
          path="zones"
          element={
            <ErrorBoundary>
              <ZonesPage />
            </ErrorBoundary>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
