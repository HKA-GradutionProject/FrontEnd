import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Search, ShoppingCart, BadgePercent, Clock3 } from 'lucide-react';
import { OrderFilters, useInventory } from '../context/InventoryContext';
import { OrderItem } from '../types';
import { deleteApiResource, fetchApiResource } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Orders() {
  const { orders, fetchOrders, loading, loaded, errors } = useInventory();
  const [search, setSearch] = useState('');
  const [orderId, setOrderId] = useState('');
  const [status, setStatus] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [itemId, setItemId] = useState('');
  const [approvedPhysically, setApprovedPhysically] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderItemsByOrderId, setOrderItemsByOrderId] = useState<Record<number, OrderItem[]>>({});
  const [loadingOrderItemsId, setLoadingOrderItemsId] = useState<number | null>(null);
  const [orderItemsErrors, setOrderItemsErrors] = useState<Record<number, string | null>>({});

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const isLoading = !loaded.orders || loading.orders;
  const pendingOrders = orders.filter((order) => order.status === 'pending').length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
  const totalItems = orders.reduce((sum, order) => sum + (order.total_items || 0), 0);

  const buildOrderFilters = (): OrderFilters => {
    const filters: OrderFilters = {};

    if (orderId.trim()) {
      filters.order_id = Number(orderId);
      return filters;
    }

    if (search.trim()) {
      filters.search = search.trim();
    }

    if (status) {
      filters.status = status;
    }

    if (createdFrom) {
      filters.created_from = new Date(createdFrom).toISOString();
    }

    if (createdTo) {
      filters.created_to = new Date(createdTo).toISOString();
    }

    if (itemId.trim()) {
      filters.item_id = Number(itemId);
    }

    if (approvedPhysically) {
      filters.approved_physically = approvedPhysically === 'true';
    }

    return filters;
  };

  const applyFilters = async () => {
    setExpandedOrderId(null);
    setOrderItemsByOrderId({});
    await fetchOrders(buildOrderFilters());
  };

  const clearFilters = async () => {
    setSearch('');
    setOrderId('');
    setStatus('');
    setCreatedFrom('');
    setCreatedTo('');
    setItemId('');
    setApprovedPhysically('');
    setExpandedOrderId(null);
    setOrderItemsByOrderId({});
    await fetchOrders();
  };

  const onDelete = async (orderId: number) => {
    if (!confirm('Delete order?')) {
      return;
    }

    setDeletingId(orderId);
    try {
      await deleteApiResource(`/orders/${orderId}`);
      await fetchOrders(buildOrderFilters());
      toast.success('Order deleted');
    } catch (error) {
      console.error('Delete failed', error);
      toast.error(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleOrderItems = async (orderId: number) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);

    if (orderItemsByOrderId[orderId]) {
      return;
    }

    setLoadingOrderItemsId(orderId);
    setOrderItemsErrors((prev) => ({ ...prev, [orderId]: null }));

    try {
      const orderItems = await fetchApiResource<OrderItem[]>(`/orders/${orderId}/items`);
      setOrderItemsByOrderId((prev) => ({ ...prev, [orderId]: orderItems }));
    } catch (error) {
      console.error('Fetch order items failed', error);
      setOrderItemsErrors((prev) => ({
        ...prev,
        [orderId]: error instanceof Error ? error.message : 'Failed to load order items',
      }));
    } finally {
      setLoadingOrderItemsId(null);
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
        <CardHeader className="pb-2">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Search</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  className="pl-9"
                  placeholder="Customer, phone, address, notes"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Order ID</span>
              <Input min={1} value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="1" type="number" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Status</span>
              <select
                className="h-8 w-full rounded-lg border border-input bg-white px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="pending">pending</option>
                <option value="fulfilled">fulfilled</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Item ID</span>
              <Input min={1} value={itemId} onChange={(event) => setItemId(event.target.value)} placeholder="1" type="number" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Physical Approval</span>
              <select
                className="h-8 w-full rounded-lg border border-input bg-white px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={approvedPhysically}
                onChange={(event) => setApprovedPhysically(event.target.value)}
              >
                <option value="">All</option>
                <option value="true">Approved</option>
                <option value="false">Pending</option>
              </select>
            </label>
            <div className="grid gap-3 md:col-span-2 xl:col-span-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Date From</span>
                <Input value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} type="datetime-local" />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Date To</span>
                <Input value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} type="datetime-local" />
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={clearFilters} disabled={isLoading}>
              Clear
            </Button>
            <Button onClick={applyFilters} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Order History</CardTitle>
            <div className="text-sm text-slate-500">{orders.length} matching orders</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[50px] font-bold px-4 py-2"></TableHead>
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
                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                      Loading orders...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const orderItems = orderItemsByOrderId[order.id] || [];
                  const orderItemsError = orderItemsErrors[order.id];
                  const isLoadingOrderItems = loadingOrderItemsId === order.id;

                  return (
                    <>
                      <TableRow key={`order-${order.id}`} className="hover:bg-gray-50/50">
                        <TableCell className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleOrderItems(order.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-100 bg-blue-50"
                            aria-label={isExpanded ? 'Collapse order items' : 'Expand order items'}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-blue-500" /> : <ChevronRight className="h-4 w-4 text-blue-500" />}
                          </button>
                        </TableCell>
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

                      {isExpanded && (
                        <TableRow key={`order-items-${order.id}`} className="bg-slate-50">
                          <TableCell colSpan={9} className="px-4 py-4">
                            {isLoadingOrderItems ? (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading ordered items...
                              </div>
                            ) : orderItemsError ? (
                              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {orderItemsError}
                              </div>
                            ) : orderItems.length === 0 ? (
                              <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
                                No ordered items found for this order.
                              </div>
                            ) : (
                              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                  <thead className="bg-white text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <tr>
                                      <th className="px-3 py-2 text-left">Order Item</th>
                                      <th className="px-3 py-2 text-left">Item ID</th>
                                      <th className="px-3 py-2 text-left">Variant ID</th>
                                      <th className="px-3 py-2 text-right">Qty</th>
                                      <th className="px-3 py-2 text-right">Unit Price</th>
                                      <th className="px-3 py-2 text-right">Qty Before</th>
                                      <th className="px-3 py-2 text-right">Qty After</th>
                                      <th className="px-3 py-2 text-left">Physical</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {orderItems.map((orderItem) => (
                                      <tr key={orderItem.id}>
                                        <td className="px-3 py-2 font-mono text-slate-500">#{orderItem.id}</td>
                                        <td className="px-3 py-2 font-mono text-slate-500">{orderItem.item_id}</td>
                                        <td className="px-3 py-2 font-mono text-slate-500">{orderItem.variant_id ?? 'None'}</td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-700">{orderItem.quantity}</td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                                          ${Number(orderItem.unit_price || 0).toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-500">{orderItem.qty_before}</td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-500">{orderItem.qty_after}</td>
                                        <td className="px-3 py-2">
                                          <Badge variant="outline" className={orderItem.approved_physically ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                                            {orderItem.approved_physically ? 'Approved' : 'Pending'}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
                {!isLoading && orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-gray-500">
                      No orders found for the selected filters.
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
