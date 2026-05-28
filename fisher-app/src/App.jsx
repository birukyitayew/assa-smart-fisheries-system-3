import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SubmitCatchPage from './pages/SubmitCatchPage';
import MyCatchesPage from './pages/MyCatchesPage';
import NotificationsPage from './pages/NotificationsPage';
import FishingZonesPage from './pages/FishingZonesPage';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="submit" element={<SubmitCatchPage />} />
        <Route path="catches" element={<MyCatchesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="zones" element={<FishingZonesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
