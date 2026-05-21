import { useInventory } from '../context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package2, Loader2 } from 'lucide-react';

export default function Items() {
  const { items, zones, loading, loaded } = useInventory();
  const isLoading = !loaded.items || !loaded.zones || loading.items || loading.zones;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Items</h1>
          <p className="text-gray-500 mt-1">Manage physical items and their RFID tags.</p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] font-bold px-4 py-2"></TableHead>
                  <TableHead className="font-bold px-4 py-2">SKU</TableHead>
                  <TableHead className="font-bold px-4 py-2">Name</TableHead>
                  <TableHead className="font-bold px-4 py-2">Location</TableHead>
                  <TableHead className="font-bold px-4 py-2">RFID Label</TableHead>
                  <TableHead className="font-bold px-4 py-2">Tag Code</TableHead>
                  <TableHead className="font-bold px-4 py-2 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] divide-y divide-gray-100">
                {(!loaded.items || !loaded.zones) && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">Loading inventory items...</TableCell>
                  </TableRow>
                )}
                {loaded.items && loaded.zones && items.map((item) => {
                  const zone = zones.find(z => z.id === item.current_zone_id);
                  
                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50/50">
                      <TableCell className="px-4 py-3">
                        <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-md flex items-center justify-center">
                          <Package2 className="w-4 h-4 text-blue-500" />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-500 px-4 py-3">{item.sku}</TableCell>
                      <TableCell className="font-bold text-slate-800 px-4 py-3">{item.name}</TableCell>
                      <TableCell className="px-4 py-3">
                         <span className="text-slate-600 font-medium">{zone ? zone.name : 'Unknown'}</span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                         {item.label ? (
                           <span className="font-mono bg-blue-600/10 text-blue-600 px-2 py-1 rounded-md text-xs font-bold border border-blue-200/50">{item.label}</span>
                         ) : (
                           <span className="text-slate-400">None</span>
                         )}
                      </TableCell>
                      <TableCell className="font-mono text-slate-500 px-4 py-3">
                        {item.rfid_tag_code || 'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Badge className={`${
                          item.status === 'in_stock' ? 'bg-blue-100/50 text-blue-700 border-blue-200 hover:bg-blue-100/50' :
                          item.status === 'ordered' ? 'bg-purple-100/50 text-purple-700 border-purple-200 hover:bg-purple-100/50' :
                          item.status === 'sold' ? 'bg-green-100/50 text-green-700 border-green-200 hover:bg-green-100/50' :
                          'bg-red-100/50 text-red-700 border-red-200 hover:bg-red-100/50'
                        } border`} variant="secondary">
                          {item.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {loaded.items && loaded.zones && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-gray-500">No items found.</TableCell>
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
