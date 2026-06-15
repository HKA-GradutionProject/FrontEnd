import { Fragment, useMemo, useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, ChevronDown, ChevronRight, ImageIcon, ShoppingCart, Tag } from 'lucide-react';
import { postApiResource } from '@/lib/api';
import { toast } from 'sonner';

export default function Items() {
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);
  const { items, zones, loading, loaded, fetchItems, fetchOrders } = useInventory();
  const isLoading = !loaded.items || !loaded.zones || loading.items || loading.zones;
  const selectedVariantOption = useMemo(() => {
    for (const item of items) {
      const variant = item.variants.find((itemVariant) => itemVariant.id === selectedVariantId);

      if (variant) {
        return {
          item,
          variant,
          unitPrice: Number(item.sold_price || 0),
        };
      }
    }

    return null;
  }, [items, selectedVariantId]);
  const orderTotal = selectedVariantOption ? selectedVariantOption.unitPrice * orderQuantity : 0;
  const makeOrderDisabled =
    orderLoading ||
    !selectedVariantOption ||
    !customerName.trim() ||
    !customerPhone.trim() ||
    !customerAddress.trim() ||
    orderQuantity < 1 ||
    orderQuantity > selectedVariantOption.variant.qty;

  const selectVariantForOrder = (variantId: number, itemId: number) => {
    setSelectedVariantId(variantId);
    setExpandedItemId(itemId);
    setOrderQuantity(1);
  };

  const toggleItemSelection = (itemId: number) => {
    const item = items.find((inventoryItem) => inventoryItem.id === itemId);
    if (!item || item.variants.length === 0) {
      toast.error('This item has no variants to order.');
      return;
    }

    if (selectedVariantOption?.item.id === itemId) {
      setSelectedVariantId(null);
      return;
    }

    selectVariantForOrder(item.variants[0].id, itemId);
  };

  const openOrderForm = () => {
    if (!selectedVariantOption) {
      toast.error('Select a variant first.');
      return;
    }

    if (selectedVariantOption.variant.qty < 1) {
      toast.error('Selected variant is out of stock.');
      return;
    }

    setOrderQuantity(1);
    setOrderModalOpen(true);
  };

  const resetOrderForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setOrderNotes('');
    setOrderQuantity(1);
  };

  const createVariantOrder = async () => {
    if (makeOrderDisabled || !selectedVariantOption) {
      toast.error('Customer details and a valid variant quantity are required.');
      return;
    }

    setOrderLoading(true);
    try {
      await postApiResource('/orders/with-variants', {
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        notes: orderNotes.trim() || null,
        ordered_variants: [
          {
            variant_id: selectedVariantOption.variant.id,
            quantity: orderQuantity,
            unit_price: selectedVariantOption.unitPrice,
            approved_physically: false,
          },
        ],
      });
      await Promise.all([fetchItems(), fetchOrders()]);
      setSelectedVariantId(null);
      setOrderModalOpen(false);
      resetOrderForm();
      toast.success('Order created and variant stock reserved');
    } catch (error) {
      console.error('Create variant order failed', error);
      toast.error(error instanceof Error ? error.message : 'Create variant order failed');
    } finally {
      setOrderLoading(false);
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>All Items</CardTitle>
              {selectedVariantOption && (
                <p className="mt-1 text-sm text-slate-500">
                  Selected variant #{selectedVariantOption.variant.id} from {selectedVariantOption.item.name}
                </p>
              )}
            </div>
            {selectedVariantOption && (
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                disabled={selectedVariantOption.variant.qty < 1}
                onClick={openOrderForm}
              >
                <ShoppingCart className="h-4 w-4" />
                Make Order
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] font-bold px-4 py-2"></TableHead>
                  <TableHead className="w-[56px] font-bold px-4 py-2">Select</TableHead>
                  <TableHead className="w-[88px] font-bold px-4 py-2">Image</TableHead>
                  <TableHead className="font-bold px-4 py-2">SKU</TableHead>
                  <TableHead className="font-bold px-4 py-2">Name</TableHead>
                  <TableHead className="font-bold px-4 py-2">RFID Label</TableHead>
                  <TableHead className="font-bold px-4 py-2 text-right">Price</TableHead>
                  <TableHead className="font-bold px-4 py-2 text-right">Total Qty</TableHead>
                  <TableHead className="font-bold px-4 py-2 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] divide-y divide-gray-100">
                {(!loaded.items || !loaded.zones) && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">Loading inventory items...</TableCell>
                  </TableRow>
                )}
                {loaded.items && loaded.zones && items.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  const itemImageUrl = item.thumbnail || item.images[0]?.url || null;
                  const isItemSelected = selectedVariantOption?.item.id === item.id;
                  
                  return (
                    <Fragment key={item.id}>
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
                        <TableCell className="px-4 py-3">
                          <input
                            checked={isItemSelected}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            disabled={item.variants.length === 0}
                            onChange={() => toggleItemSelection(item.id)}
                            type="checkbox"
                          />
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          {itemImageUrl ? (
                            <img
                              src={itemImageUrl}
                              alt={item.name}
                              className="h-12 w-12 rounded-md border border-slate-200 bg-slate-100 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50">
                              <ImageIcon className="h-5 w-5 text-slate-300" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-slate-500 px-4 py-3">{item.sku}</TableCell>
                        <TableCell className="font-bold text-slate-800 px-4 py-3">{item.name}</TableCell>
                        <TableCell className="px-4 py-3">
                           {item.label ? (
                             <span className="font-mono bg-blue-600/10 text-blue-600 px-2 py-1 rounded-md text-xs font-bold border border-blue-200/50">{item.label}</span>
                           ) : (
                             <span className="text-slate-400">None</span>
                           )}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-semibold text-slate-800">
                          ${Number(item.sold_price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-mono text-slate-600">
                          {item.total_qty}
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
                          <TableCell colSpan={9} className="px-4 py-4">
                            <div className="grid gap-4 text-sm text-slate-700">
                              <div>
                                <div className="font-semibold text-slate-900 mb-2">Variants ({item.variants.length})</div>
                                {item.variants.length === 0 ? (
                                  <div className="text-slate-500">No variants available for this item.</div>
                                ) : (
                                  <div className="grid gap-2">
                                    {item.variants.map(variant => (
                                      <div key={variant.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <input
                                              checked={selectedVariantId === variant.id}
                                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                              disabled={variant.qty < 1}
                                              onChange={() => selectVariantForOrder(variant.id, item.id)}
                                              type="radio"
                                              name="selectedVariant"
                                            />
                                            Select variant #{variant.id}
                                          </label>
                                          <div className="text-sm font-semibold text-slate-900">
                                            ${Number(item.sold_price || 0).toFixed(2)}
                                          </div>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                                          {(() => {
                                            const variantZone = zones.find((zone) => zone.id === variant.current_zone_id);

                                            return (
                                              <>
                                                <span>Location: {variantZone?.name ?? 'None'}</span>
                                                <span className="flex items-center gap-1">
                                                  <Tag className="h-3 w-3" />
                                                  Tag Code: {variant.rfid_tag_code ?? 'None'}
                                                </span>
                                              </>
                                            );
                                          })()}
                                          <span>ID: {variant.id}</span>
                                          <span>Qty: {variant.qty}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                {loaded.items && loaded.zones && items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">No items found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={orderModalOpen} onOpenChange={setOrderModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Order</DialogTitle>
          </DialogHeader>
          {selectedVariantOption && (
            <div className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                <div className="font-semibold text-slate-900">{selectedVariantOption.item.name}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Variant #{selectedVariantOption.variant.id}</span>
                  <span>Available: {selectedVariantOption.variant.qty}</span>
                  <span>Unit price: ${selectedVariantOption.unitPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Customer name</span>
                  <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Ahmad Nasser" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Phone</span>
                  <Input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="0599001001" />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Address</span>
                <Input value={customerAddress} onChange={(event) => setCustomerAddress(event.target.value)} placeholder="Ramallah - Al Tireh" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
                <Input value={orderNotes} onChange={(event) => setOrderNotes(event.target.value)} placeholder="Pickup after RFID verification." />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Quantity</span>
                  <Input
                    min={1}
                    max={selectedVariantOption.variant.qty}
                    type="number"
                    value={orderQuantity}
                    onChange={(event) => setOrderQuantity(Number(event.target.value))}
                  />
                </label>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">${orderTotal.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderModalOpen(false)} disabled={orderLoading}>
              Cancel
            </Button>
            <Button
              onClick={createVariantOrder}
              disabled={makeOrderDisabled}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {orderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
