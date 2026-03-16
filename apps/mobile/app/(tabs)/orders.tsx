import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { reservationApi } from '@/lib/api-client';
import { Card, Badge, Spinner } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';

export default function OrdersScreen() {
  const [status, setStatus] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reservations', status],
    queryFn: () => reservationApi.getMyReservations(status || undefined),
  });

  const reservations = data?.data?.reservations || [];

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    EXPIRED: 'default',
  };

  const filters = ['All', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>My Orders</Text>

        {/* Filters */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setStatus(filter === 'All' ? null : filter)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: (filter === 'All' && !status) || status === filter ? '#2563eb' : '#f3f4f6',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: (filter === 'All' && !status) || status === filter ? '#ffffff' : '#374151',
                }}
              >
                {filter.charAt(0) + filter.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      <FlatList
        data={reservations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
              <Spinner size="lg" />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
              <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 }}>
                No Orders Yet
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                Your reservations will appear here once you make one
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Badge variant={statusColors[item.status]}>{item.status}</Badge>
                {item.status === 'PENDING' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={14} color="#92400e" />
                    <Text style={{ fontSize: 12, color: '#92400e', marginLeft: 4 }}>30 min</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                ₹{item.totalAmount}
              </Text>
            </View>

            <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Ionicons name="location" size={16} color="#6b7280" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '500', color: '#111827' }}>
                    {item.pharmacy?.name || 'Pharmacy'}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {item.pharmacy?.address}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items */}
            <View style={{ marginBottom: 12 }}>
              {item.items?.slice(0, 3).map((orderItem: any, index: number) => (
                <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, color: '#374151' }}>
                    {orderItem.medicineName} × {orderItem.quantity}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#374151' }}>₹{orderItem.subtotal}</Text>
                </View>
              ))}
              {item.items?.length > 3 && (
                <Text style={{ fontSize: 12, color: '#6b7280' }}>
                  +{item.items.length - 3} more items
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '500' }}>View Details</Text>
              </TouchableOpacity>
              {item.status === 'PENDING' && (
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    alignItems: 'center',
                    borderRadius: 8,
                    backgroundColor: '#2563eb',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '500' }}>Get Directions</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
      />
    </View>
  );
}