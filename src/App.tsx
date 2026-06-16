/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { InventoryProvider } from './context/InventoryContext';
import { getStoredAuthUser } from './lib/auth';

import Dashboard from './pages/Dashboard';
import Simulation from './pages/Simulation';
import Events from './pages/Events';
import Items from './pages/Items';
import Readers from './pages/Readers';
import Alerts from './pages/Alerts';
import Orders from './pages/Orders';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Login from './pages/Login';

function RequireAuth() {
  const location = useLocation();

  if (!getStoredAuthUser()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

function LoginRoute() {
  const location = useLocation();

  if (getStoredAuthUser()) {
    const from = location.state as { from?: { pathname?: string; search?: string } } | null;
    const redirectPath = from?.from?.pathname && from.from.pathname !== '/login'
      ? `${from.from.pathname}${from.from.search || ''}`
      : '/';

    return <Navigate to={redirectPath} replace />;
  }

  return <Login />;
}

export default function App() {
  return (
    <InventoryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="simulation" element={<Simulation />} />
              <Route path="events" element={<Events />} />
              <Route path="items" element={<Items />} />
              <Route path="readers" element={<Readers />} />
              <Route path="orders" element={<Orders />} />
              <Route path="employees" element={<Employees />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </InventoryProvider>
  );
}
