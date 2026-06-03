import { Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useAuth } from './context/AuthContext';
import MarketLayout from './components/MarketLayout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import Browse from './pages/Browse';
import ListingDetailPage from './pages/ListingDetailPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import MyOrdersPage from './pages/MyOrdersPage';

export default function App() {
  const { user } = useAuth();
  return (
    <>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<MarketLayout />}>
        <Route index element={<HomePage />} />
        <Route path="browse" element={<Browse />} />
        <Route path="listing/:id" element={<ListingDetailPage />} />
        <Route path="order-success" element={<OrderSuccessPage />} />
        <Route
          path="my-orders"
          element={user ? <MyOrdersPage /> : <Navigate to="/login" replace />}
        />
      </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </>
  );
}
