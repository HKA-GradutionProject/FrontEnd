/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { InventoryProvider } from './context/InventoryContext';

import Dashboard from './pages/Dashboard';
import Simulation from './pages/Simulation';
import Events from './pages/Events';
import Items from './pages/Items';
import Readers from './pages/Readers';
import Alerts from './pages/Alerts';

export default function App() {
  return (
    <InventoryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="simulation" element={<Simulation />} />
            <Route path="events" element={<Events />} />
            <Route path="items" element={<Items />} />
            <Route path="readers" element={<Readers />} />
            <Route path="alerts" element={<Alerts />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </InventoryProvider>
  );
}
