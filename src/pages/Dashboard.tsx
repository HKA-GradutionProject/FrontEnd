import { useInventory } from '../context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package2, RadioReceiver, ShieldAlert, Navigation, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function Dashboard() {
  const { items, readers, alerts, events, loading, loaded } = useInventory();

  const totalItems = items.length;
  const inStock = items.filter(i => i.status === 'in_stock').length;
  const activeReaders = readers.filter(r => r.status === 'active').length;
  const activeAlerts = alerts.filter(a => a.status === 'new').length;
  const isRefreshing = loading.items || loading.readers || loading.events;
  const hasDashboardData = loaded.items && loaded.readers && loaded.events;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 mt-1">Real-time status of your smart warehouse.</p>
        </div>
        {isRefreshing && (
          <Badge variant="outline" className="gap-2 bg-white text-slate-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading data
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Items</span>
            <Package2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.items ? inStock : '--'}</span>
            <span className="text-xs text-slate-500 mb-1">{loaded.items ? `/ ${totalItems} total` : 'Loading items...'}</span>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Readers</span>
            <RadioReceiver className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.readers ? activeReaders : '--'}</span>
            <span className="text-xs text-slate-400 mb-1">{loaded.readers ? 'Online' : 'Loading readers...'}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recent Movements (30s)</span>
            <Navigation className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-blue-600">
              {loaded.events ? events.filter(e => new Date(e.received_at).getTime() > Date.now() - 30000).length : '--'}
            </span>
            <span className="text-xs text-slate-400 mb-1">{loaded.events ? 'Detections' : 'Loading events...'}</span>
          </div>
        </div>

        <div className={`p-6 rounded-xl border shadow-sm flex flex-col justify-center ${activeAlerts > 0 ? 'bg-white border-red-200' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-xs font-bold uppercase tracking-wider ${activeAlerts > 0 ? 'text-red-600' : 'text-slate-500'}`}>Security Alerts</span>
            <ShieldAlert className={`h-4 w-4 ${activeAlerts > 0 ? 'text-red-500' : 'text-gray-400'}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${activeAlerts > 0 ? 'text-red-600' : 'text-slate-900'}`}>{activeAlerts}</span>
            {activeAlerts > 0 && <span className="text-xs text-red-500 mb-1 animate-pulse font-medium">Action Required</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Latest Detections</CardTitle>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Reader</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loaded.events && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">Loading detections...</TableCell>
                    </TableRow>
                  )}
                  {events.slice(0, 5).map(event => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs text-gray-500">{new Date(event.received_at).toLocaleTimeString()}</TableCell>
                      <TableCell>{event.label}</TableCell>
                      <TableCell>{event.reader_name}</TableCell>
                    </TableRow>
                  ))}
                  {loaded.events && events.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500">No recent events.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
      {!hasDashboardData && !isRefreshing && (
        <p className="text-sm text-slate-500">Waiting for dashboard data...</p>
      )}
    </div>
  );
}
