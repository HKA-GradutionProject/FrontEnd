import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';

export default function Events() {
  const { events, loading, loaded } = useInventory();
  const [search, setSearch] = useState('');
  const isLoading = !loaded.events || loading.events;

  const filteredEvents = events.filter(e => 
    e.tag.toLowerCase().includes(search.toLowerCase()) || 
    e.label.toLowerCase().includes(search.toLowerCase()) ||
    e.reader_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RFID Events</h1>
          <p className="text-gray-500 mt-1">Real-time log of all tags detected by active readers.</p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex justify-between items-center">
             <CardTitle className="text-lg">Event History</CardTitle>
             <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  className="pl-9 bg-gray-50"
                  placeholder="Search tag, label, or reader..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold">Time</TableHead>
                  <TableHead className="font-bold">RPi ID</TableHead>
                  <TableHead className="font-bold">Reader</TableHead>
                  <TableHead className="font-bold">Label</TableHead>
                  <TableHead className="font-bold">RFID Tag / EPC</TableHead>
                  <TableHead className="font-bold text-right">RSSI</TableHead>
                  <TableHead className="font-bold text-right">Distance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] divide-y divide-gray-100">
                {!loaded.events && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                      Loading RFID events...
                    </TableCell>
                  </TableRow>
                )}
                {filteredEvents.map((event) => (
                  <TableRow key={event.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-mono text-slate-500 whitespace-nowrap px-4 py-3">
                      {new Date(event.received_at).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="font-mono text-slate-500 px-4 py-3">{event.rpi_device_code}</TableCell>
                    <TableCell className="font-bold text-slate-800 px-4 py-3">{event.reader_name}</TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="font-bold text-slate-800">{event.label}</span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-500 truncate max-w-[200px] px-4 py-3">{event.tag}</TableCell>
                    <TableCell className="text-right font-mono px-4 py-3">{event.rssi}</TableCell>
                    <TableCell className="text-right px-4 py-3">
                      <Badge className={
                        event.distance === 'CLOSE' ? 'bg-green-100 text-green-800 hover:bg-green-100 border-none' :
                        event.distance === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-none' :
                        'bg-gray-100 text-gray-800 hover:bg-gray-100 border-none'
                      } variant="secondary">
                      {event.distance}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {loaded.events && filteredEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                      {search ? 'No events found matching your criteria.' : 'No RFID events available.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
