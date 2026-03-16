'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, Spinner } from '@/components/ui';
import { Package, ShoppingCart, Clock, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      return response.json();
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/orders?limit=5');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.data?.totalOrders || 0,
      change: '+12%',
      icon: ShoppingCart,
      color: 'blue',
    },
    {
      title: 'Pending Orders',
      value: stats?.data?.pendingOrders || 0,
      icon: Clock,
      color: 'amber',
    },
    {
      title: 'Low Stock Items',
      value: stats?.data?.lowStockItems || 0,
      icon: Package,
      color: 'red',
    },
    {
      title: 'Revenue Today',
      value: `₹${stats?.data?.revenueToday || 0}`,
      change: '+8%',
      icon: TrendingUp,
      color: 'green',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's your pharmacy overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              {stat.change && (
                <span className="text-sm text-green-600">{stat.change}</span>
              )}
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.title}</p>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Recent Orders</h2>
        </div>
        {ordersLoading ? (
          <div className="p-8 text-center">
            <Spinner />
          </div>
        ) : recentOrders?.data?.orders?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No recent orders</div>
        ) : (
          <div className="divide-y">
            {recentOrders?.data?.orders?.slice(0, 5).map((order: any) => (
              <div key={order.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{order.userName || 'Customer'}</p>
                  <p className="text-sm text-gray-500">{order.itemCount} items</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{order.totalAmount}</p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-700'
                        : order.status === 'CONFIRMED'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-medium mb-2">Quick Actions</h3>
          <div className="space-y-2">
            <a
              href="/dashboard/inventory"
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <Package className="h-5 w-5 inline mr-2" />
              Update Inventory
            </a>
            <a
              href="/dashboard/orders"
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
            >
              <ShoppingCart className="h-5 w-5 inline mr-2" />
              View All Orders
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}