import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ReservationsPage } from './pages/ReservationsPage';

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = localStorage.getItem('adminToken');

  if (!token) {
    return <Navigate to="/login" replace state={{ redirectTo: location.pathname }} />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={(
          <RequireAdmin>
            <AppShell />
          </RequireAdmin>
        )}
      >
        <Route path="/reservas" element={<ReservationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/reservas" replace />} />
    </Routes>
  );
}
