import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ShoppingCart, BadgePercent, Clock3 } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Item, Order } from '../types';
import { deleteApiResource, postApiResource } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Orders() {
  const { orders, items, fetchOrders, fetchItems, loading, loaded, errors } = useInventory();
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    void fetchOrders();
    void fetchItems();
  }, [fetchOrders, fetchItems]);

  const isLoading = !loaded.orders || loading.orders;
  const isLoadingItems = !loaded.items || loading.items;
  const availableItems = useMemo(() => {
    return items.filter((item) => {
      const variantQty = item.variants.reduce((sum, variant) => sum + (variant.qty || 0), 0);
      return item.total_qty > 0 || variantQty > 0;
    });
  }, [items]);
  const selectedItem = useMemo(() => {
    return availableItems.find((item) => item.id === Number(selectedItemId)) || null;
  }, [availableItems, selectedItemId]);
  const selectedVariant = selectedItem?.variants.find((variant) => variant.qty > 0) || selectedItem?.variants[0] || null;
  const selectedAvailableQty = selectedVariant?.qty ?? selectedItem?.total_qty ?? 0;
  const selectedUnitPrice = selectedItem?.sold_price ?? 0;
  const orderPreviewTotal = selectedUnitPrice * quantity;

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      return (
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_phone.toLowerCase().includes(query) ||
        order.customer_address.toLowerCase().includes(query) ||
        String(order.id).includes(query)
      );
    });
  }, [orders, search]);

  const pendingOrders = orders.filter((order) => order.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
  const totalItems = orders.reduce((sum, order) => sum + (order.total_items || 0), 0);

  const createDisabled =
    isCreating ||
    !customerName.trim() ||
    !phone.trim() ||
    !address.trim() ||
    !selectedItem ||
    quantity < 1 ||
    selectedAvailableQty < quantity;

  const onCreate = async () => {
    if (createDisabled) {
      toast.error('Customer details, an available item, and a valid quantity are required.');
      return;
    }

    setIsCreating(true);
    try {
      const order = await postApiResource<Order>('/orders', {
        customer_name: customerName.trim(),
        customer_phone: phone.trim(),
        customer_address: address.trim(),
        notes: notes.trim() || null,
      });
      await postApiResource(`/orders/${order.id}/items`, {
        item_id: selectedItem.id,
        variant_id: selectedVariant?.id ?? null,
        quantity,
        unit_price: selectedUnitPrice,
        approved_physically: false,
      });
      await fetchOrders();
      await fetchItems();
      setCustomerName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setSelectedItemId('');
      setQuantity(1);
      toast.success('Order created with item');
    } catch (error) {
      console.error('Create order failed', error);
      toast.error(error instanceof Error ? error.message : 'Create order failed');
    } finally {
      setIsCreating(false);
    }
  };

  const onDelete = async (orderId: number) => {
    if (!confirm('Delete order?')) {
      return;
    }

    setDeletingId(orderId);
    try {
      await deleteApiResource(`/orders/${orderId}`);
      await fetchOrders();
      toast.success('Order deleted');
    } catch (error) {
      console.error('Delete failed', error);
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-gray-500 mt-1">Track customer orders and their fulfillment totals.</p>
        </div>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
      </div>

      {errors.orders && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errors.orders}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <ShoppingCart className="h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.orders ? orders.length : '--'}</span>
            <span className="text-xs text-slate-500 mb-1">{loaded.orders ? 'Records' : 'Loading...'}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending</span>
            <Clock3 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.orders ? pendingOrders : '--'}</span>
            <span className="text-xs text-slate-400 mb-1">Awaiting fulfillment</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</span>
            <BadgePercent className="h-4 w-4 text-green-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{loaded.orders ? `$${totalRevenue.toFixed(2)}` : '--'}</span>
            <span className="text-xs text-slate-400 mb-1">{loaded.orders ? `${totalItems} items` : 'Loading...'}</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-lg">Create Order</CardTitle>
              <p className="text-sm text-gray-500 mt-1">Add a customer order to the system.</p>
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                className="pl-9 bg-gray-50"
                placeholder="Search id, customer, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <select
              className="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
              value={selectedItemId}
              onChange={(event) => {
                setSelectedItemId(event.target.value);
                setQuantity(1);
              }}
              disabled={isLoadingItems}
            >
              <option value="">{isLoadingItems ? 'Loading items...' : 'Select item'}</option>
              {availableItems.map((item: Item) => {
                const variantQty = item.variants.reduce((sum, variant) => sum + (variant.qty || 0), 0);
                const availableQty = variantQty || item.total_qty;
                return (
                  <option key={item.id} value={item.id}>
                    {item.name} | {availableQty} available | ${Number(item.sold_price || 0).toFixed(2)}
                  </option>
                );
              })}
            </select>
            <Input
              min={1}
              max={Math.max(selectedAvailableQty, 1)}
              placeholder="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
            <Input value={`$${orderPreviewTotal.toFixed(2)}`} readOnly className="bg-gray-50" />
          </div>
          <div className="mt-3 flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {selectedItem
                ? `${selectedAvailableQty} available for ${selectedItem.name}`
                : 'Choose an inventory item to include in the order.'}
            </span>
            {selectedItem && selectedAvailableQty < quantity && (
              <span className="font-medium text-red-600">Quantity is higher than available stock.</span>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={onCreate} disabled={createDisabled}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create order
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-bold px-4 py-2">ID</TableHead>
                  <TableHead className="font-bold px-4 py-2">Customer</TableHead>
                  <TableHead className="font-bold px-4 py-2">Phone</TableHead>
                  <TableHead className="font-bold px-4 py-2">Items</TableHead>
                  <TableHead className="font-bold px-4 py-2">Total</TableHead>
                  <TableHead className="font-bold px-4 py-2">Status</TableHead>
                  <TableHead className="font-bold px-4 py-2">Notes</TableHead>
                  <TableHead className="font-bold px-4 py-2 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-[11px] divide-y divide-gray-100">
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filteredOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50/50">
                    <TableCell className="font-mono text-slate-500 px-4 py-3">#{order.id}</TableCell>
                    <TableCell className="px-4 py-3 font-bold text-slate-800">{order.customer_name}</TableCell>
                    <TableCell className="px-4 py-3 text-slate-500">{order.customer_phone}</TableCell>
                    <TableCell className="px-4 py-3 font-mono text-slate-500">{order.total_items}</TableCell>
                    <TableCell className="px-4 py-3 font-mono text-slate-500">${order.total_price.toFixed(2)}</TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={`${order.status === 'fulfilled' ? 'bg-green-100/50 text-green-700 border-green-200 hover:bg-green-100/50' : order.status === 'cancelled' ? 'bg-red-100/50 text-red-700 border-red-200 hover:bg-red-100/50' : 'bg-blue-100/50 text-blue-700 border-blue-200 hover:bg-blue-100/50'} border`}
                      >
                        {order.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-slate-500">
                      {order.notes || 'No notes'}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(order.id)}
                        disabled={deletingId === order.id}
                      >
                        {deletingId === order.id && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                      {search ? 'No orders found matching your search.' : 'No orders found.'}
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
