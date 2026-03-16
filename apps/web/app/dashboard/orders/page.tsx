'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Badge, Button, Spinner } from '@/components/ui';
import { Table, Pagination } from '@/components/table';
import { Clock, CheckCircle, XCircle, Phone, MapPin } from 'lucide-react';

export default function OrdersPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(status && { status }),
      });
      const response = await fetch(`/api/dashboard/orders?${params}`);
      return response.json();
    },
  });

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination;

  const statusColors: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    EXPIRED: 'default',
  };

  const columns = [
    {
      key: 'id',
      header: 'Order ID',
      render: (order: any) => (
        <span className="font-mono text-sm">{order.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order: any) => (
        <div>
          <p className="font-medium">{order.user?.name || 'Guest'}</p>
          <p className="text-sm text-gray-500">{order.user?.phone}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order: any) => (
        <div>
          <p>{order.items?.length || 0} items</p>
          <p className="text-sm text-gray-500">
            {order.items?.slice(0, 2).map((i: any) => i.medicineName).join(', ')}
            {order.items?.length > 2 && '...'}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (order: any) => (
        <p className="font-medium">₹{order.totalAmount}</p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: any) => (
        <Badge variant={statusColors[order.status]}>{order.status}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Time',
      render: (order: any) => (
        <div>
          <p className="text-sm">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(order.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (order: any) => (
        <div className="flex gap-2">
          {order.status === 'PENDING' && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConfirm(order.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancel(order.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </>
          )}
          {order.status === 'CONFIRMED' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleComplete(order.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handleConfirm = async (orderId: string) => {
    try {
      await fetch(`/api/reservations/${orderId}/confirm`, { method: 'POST' });
      // Invalidate and refetch
    } catch (error) {
      console.error('Failed to confirm order:', error);
    }
  };

  const handleCancel = async (orderId: string) => {
    try {
      await fetch(`/api/reservations/${orderId}/cancel`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to cancel order:', error);
    }
  };

  const handleComplete = async (orderId: string) => {
    try {
      await fetch(`/api/reservations/${orderId}/complete`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to complete order:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-gray-500">Manage customer reservations</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setStatus(null)}
          className={`px-3 py-1 rounded-full text-sm ${
            status === null ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          All
        </button>
        {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded-full text-sm ${
              status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Pending Alert */}
      {status === null && data?.data?.pendingCount > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <Clock className="h-5 w-5" />
            <span className="font-medium">
              {data.data.pendingCount} pending orders require attention
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStatus('PENDING')}
              className="ml-auto"
            >
              View Pending
            </Button>
          </div>
        </Card>
      )}

      {/* Orders Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No orders found
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={orders}
              keyExtractor={(order) => order.id}
              onRowClick={(order) => {
                // Navigate to order details
                console.log('View order:', order.id);
              }}
            />
            {pagination && (
              <div className="p-4 border-t">
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  totalItems={pagination.total}
                />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}