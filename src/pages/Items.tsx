import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Package2, Loader2, ChevronDown, ChevronRight, Tag, X } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function Items() {
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [rfidModalOpen, setRfidModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [rfidCode, setRfidCode] = useState('');
  const [rfidLoading, setRfidLoading] = useState(false);
  const { items, zones, loading, loaded, fetchItems } = useInventory();
  const isLoading = !loaded.items || !loaded.zones || loading.items || loading.zones;

  const assignRfidTag = async () => {
    if (!selectedItemId || !rfidCode.trim()) return;
    
    setRfidLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/items/${selectedItemId}/assign-rfid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid_tag_code: rfidCode.trim() }),
      });
      if (response.ok) {
        await fetchItems();
        setRfidModalOpen(false);
        setRfidCode('');
        setSelectedItemId(null);
      } else {
        alert('Failed to assign RFID tag');
      }
    } catch (error) {
      console.error('Error assigning RFID:', error);
      alert('Error assigning RFID tag');
    } finally {
      setRfidLoading(false);
    }
  };

  const removeRfidTag = async (itemId: number) => {
    if (!window.confirm('Remove RFID tag from this item?')) return;
    
    setRfidLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/items/${itemId}/remove-rfid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        await fetchItems();
      } else {
        alert('Failed to remove RFID tag');
      }
    } catch (error) {
      console.error('Error removing RFID:', error);
      alert('Error removing RFID tag');
    } finally {
      setRfidLoading(false);
    }
  };

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
                  const isExpanded = expandedItemId === item.id;
                  
                  return (
                    <>
                      <TableRow key={`item-${item.id}`} className="hover:bg-gray-50/50">
                        <TableCell className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-md flex items-center justify-center"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronRight className="w-4 h-4 text-blue-500" />}
                          </button>
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
                        <TableCell className="px-4 py-3">
                          {item.rfid_tag_code ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-green-600/10 text-green-600 px-2 py-1 rounded-md text-xs font-bold border border-green-200/50 flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {item.rfid_tag_code}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeRfidTag(item.id)}
                                disabled={rfidLoading}
                                className="h-6 w-6 p-0 hover:bg-red-100"
                              >
                                <X className="w-3 h-3 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setRfidModalOpen(true);
                              }}
                              disabled={rfidLoading}
                              className="text-xs"
                            >
                              <Tag className="w-3 h-3 mr-1" />
                              Assign RFID
                            </Button>
                          )}
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

                      {isExpanded && (
                        <TableRow key={`details-${item.id}`} className="bg-slate-50">
                          <TableCell colSpan={7} className="px-4 py-4">
                            <div className="grid gap-4 text-sm text-slate-700">
                              <div>
                                <div className="font-semibold text-slate-900 mb-2">Variants ({item.variants.length})</div>
                                {item.variants.length === 0 ? (
                                  <div className="text-slate-500">No variants available for this item.</div>
                                ) : (
                                  <div className="grid gap-2">
                                    {item.variants.map(variant => (
                                      <div key={variant.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                          <span>ID: {variant.id}</span>
                                          <span>Qty: {variant.qty}</span>
                                          <span>Zone: {variant.current_zone_id ?? 'None'}</span>
                                          <span>RFID: {variant.rfid_tag_code ?? 'None'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div>
                                <div className="font-semibold text-slate-900 mb-2">Images ({item.images.length})</div>
                                {item.images.length === 0 ? (
                                  <div className="text-slate-500">No images available for this item.</div>
                                ) : (
                                  <div className="grid gap-2">
                                    {item.images.map(image => (
                                      <div key={image.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                        <div className="text-xs text-slate-500 mb-1">Image ID: {image.id}</div>
                                        <div className="mb-3">
                                          <img
                                            src={image.url}
                                            alt={image.spec || `Item image ${image.id}`}
                                            className="w-full max-w-[240px] rounded-md border border-slate-200 bg-slate-100 object-cover"
                                          />
                                        </div>
                                        <div className="text-sm text-slate-800 break-all">{image.url}</div>
                                        {image.spec && <div className="text-xs text-slate-500 mt-1">Spec: {image.spec}</div>}
                                        {image.ev && <div className="text-xs text-slate-500">EV: {image.ev}</div>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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

      {/* RFID Assignment Modal */}
      <Dialog open={rfidModalOpen} onOpenChange={setRfidModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign RFID Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">RFID Tag Code</label>
              <Input
                placeholder="Enter RFID tag code (e.g., TAG123456)"
                value={rfidCode}
                onChange={(e) => setRfidCode(e.target.value)}
                disabled={rfidLoading}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRfidModalOpen(false)} disabled={rfidLoading}>
              Cancel
            </Button>
            <Button 
              onClick={assignRfidTag} 
              disabled={rfidLoading || !rfidCode.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {rfidLoading ? 'Assigning...' : 'Assign RFID'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
