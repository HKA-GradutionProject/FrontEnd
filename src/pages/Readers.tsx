import { useInventory } from '../context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Cpu, RadioReceiver, Loader2 } from 'lucide-react';

export default function Readers() {
  const { readers, zones, rpiDevices, loading, loaded } = useInventory();
  const isLoading = !loaded.readers || !loaded.zones || !loaded.rpiDevices || loading.readers || loading.zones || loading.rpiDevices;

  const rpiNodeIds = Array.from(new Set([
    ...rpiDevices.map(device => device.id),
    ...readers.map(reader => reader.rpi_device_id),
  ]));

  const rpiGroups = rpiNodeIds.reduce((acc, rpiId) => {
    acc[rpiId] = {
      device: rpiDevices.find(device => device.id === rpiId),
      readers: readers.filter(reader => reader.rpi_device_id === rpiId),
    };
    return acc;
  }, {} as Record<number, { device: typeof rpiDevices[number] | undefined; readers: typeof readers }>);

  const hasData = Object.keys(rpiGroups).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Readers & Devices</h1>
          <p className="text-gray-500 mt-1">Manage Raspberry Pis and connected RFID Readers.</p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
      </div>

      {!loaded.readers || !loaded.rpiDevices ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Loading devices and readers...
          </CardContent>
        </Card>
      ) : !hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No reader or device data found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {Object.entries(rpiGroups).map(([rpiId, group]) => {
            const deviceStatus = group.device?.status || (group.readers.some(reader => reader.status === 'active') ? 'active' : 'offline');
            const deviceName = group.device?.name || 'Raspberry Pi Node';
            const deviceCode = group.device?.device_id || `Node ${rpiId}`;

            return (
              <Card key={rpiId}>
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        <Cpu className="text-blue-500 w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {deviceName}
                        </CardTitle>
                        <p className="font-mono text-xs text-gray-500 mt-0.5">{deviceCode}</p>
                      </div>
                    </div>
                    <Badge
                      className={deviceStatus === 'active' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-gray-100 text-gray-700 hover:bg-gray-100'}
                      variant="secondary"
                    >
                      {deviceStatus.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Node ID</div>
                      <div className="mt-1 font-mono text-gray-800">{rpiId}</div>
                    </div>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Last Seen</div>
                      <div className="mt-1 text-gray-800">
                        {group.device?.last_seen_at ? new Date(group.device.last_seen_at).toLocaleString() : 'Unavailable'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Connected Readers</h3>
                    {group.readers.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                        No readers connected to this device.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {group.readers.map(reader => {
                          const zone = zones.find(z => z.id === reader.zone_id);
                          return (
                            <div key={reader.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-gray-300 transition-colors bg-white">
                              <div className="flex items-center gap-3">
                                <RadioReceiver className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="font-medium text-gray-900">{reader.name}</p>
                                  <div className="flex items-center gap-2 mt-1 font-mono text-[10px] text-gray-500">
                                    <span>{reader.reader_device_id}</span>
                                    <span>&bull;</span>
                                    <span>{reader.reader_type}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                  {zone?.name || 'Unknown Zone'}
                                </Badge>
                                <span className={
                                  reader.status === 'active' ? 'flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                                  'flex h-2 w-2 rounded-full bg-gray-300'
                                } title={reader.status} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
