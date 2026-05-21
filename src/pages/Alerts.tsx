import { useInventory } from '../context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export default function Alerts() {
  const { alerts, resolveAlert } = useInventory();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Alerts</h1>
          <p className="text-gray-500 mt-1">Review and manage possible unathorized exits and missing items.</p>
        </div>
      </div>

      <div className="grid gap-4">
        {alerts.length === 0 ? (
          <div className="p-8 text-center border rounded-lg bg-gray-50 border-dashed">
            <ShieldAlert className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No Alerts</h3>
            <p className="text-sm text-gray-500 mt-1">Everything looks secure.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <Card key={alert.id} className={alert.status === 'new' ? 'border-red-200 shadow-sm' : 'border-gray-200 opacity-70'}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-full mt-1 ${alert.status === 'new' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-lg font-semibold ${alert.status === 'new' ? 'text-red-700' : 'text-gray-700'}`}>
                          {alert.type}
                        </h3>
                        <Badge variant="outline" className={
                           alert.status === 'new' ? 'border-red-200 text-red-600' :
                           alert.status === 'resolved' ? 'border-green-200 text-green-600' :
                           'border-gray-200 text-gray-600'
                        }>
                          {alert.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Detected <strong>{alert.itemName}</strong> (Tag: <span className="font-mono text-xs">{alert.rfidTag}</span>) at <strong>{alert.readerName}</strong>.
                      </p>
                      <div className="text-xs text-gray-400 font-mono">
                        {new Date(alert.time).toLocaleString()} • ID: {alert.id}
                      </div>
                    </div>
                  </div>
                  
                  {alert.status === 'new' && (
                    <div className="flex flex-col gap-2">
                       <Button size="sm" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => resolveAlert(alert.id, 'resolved')}>
                         <CheckCircle2 className="w-4 h-4 mr-2" />
                         Mark Resolved
                       </Button>
                       <Button size="sm" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => resolveAlert(alert.id, 'false_alarm')}>
                         <XCircle className="w-4 h-4 mr-2" />
                         False Alarm
                       </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
