import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { searchApi } from '@/lib/api-client';
import { Card, Badge, Button, Spinner } from '@/components/ui';
import { useLocationStore } from '@/stores';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { latitude, longitude, setLocation } = useLocationStore();

  // Get location on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords.latitude, location.coords.longitude);
      }
    })();
  }, []);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['medicine-search', debouncedQuery, latitude, longitude],
    queryFn: () => {
      if (!debouncedQuery || !latitude || !longitude) return null;
      return searchApi.searchMedicine({
        q: debouncedQuery,
        latitude,
        longitude,
        radius: 10,
      });
    },
    enabled: !!debouncedQuery && !!latitude && !!longitude,
  });

  const handleSearch = () => {
    if (query.trim()) {
      setDebouncedQuery(query.trim());
      refetch();
    }
  };

  const medicines = data?.data?.pharmacies || [];

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Search Header */}
      <View style={{ padding: 16, backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
          Find Medicines
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f3f4f6',
              borderRadius: 12,
              paddingHorizontal: 12,
            }}
          >
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search for medicines..."
              style={{ flex: 1, padding: 12, fontSize: 16 }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
          <Button title="Search" onPress={handleSearch} size="md" style={{ paddingHorizontal: 16 }} />
        </View>

        {!latitude && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 12,
              padding: 8,
              backgroundColor: '#fef3c7',
              borderRadius: 8,
            }}
          >
            <Ionicons name="location-outline" size={16} color="#92400e" />
            <Text style={{ marginLeft: 8, color: '#92400e', fontSize: 14 }}>
              Enable location for better results
            </Text>
          </View>
        )}
      </View>

      {/* Results */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 32 }}>
            <Spinner size="lg" />
            <Text style={{ marginTop: 16, color: '#6b7280' }}>Searching...</Text>
          </View>
        ) : !debouncedQuery ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
            <Ionicons name="medical" size={64} color="#d1d5db" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 }}>
              Search for Medicines
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
              Enter a medicine name to find pharmacies with stock near you
            </Text>
          </View>
        ) : medicines.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
            <Ionicons name="search-outline" size={64} color="#d1d5db" />
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 }}>
              No Results Found
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
              Try a different search term or expand your search radius
            </Text>
          </View>
        ) : (
          <>
            {/* Medicine Info */}
            {data?.data?.medicine && (
              <Card style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
                  {data.data.medicine.name}
                </Text>
                {data.data.medicine.genericName && (
                  <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                    Generic: {data.data.medicine.genericName}
                  </Text>
                )}
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  {data.data.medicine.form} {data.data.medicine.strength}
                </Text>
              </Card>
            )}

            <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
              {medicines.length} pharmacies found
            </Text>

            {medicines.map((pharmacy: any) => (
              <Card key={pharmacy.id} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                      {pharmacy.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      {pharmacy.address}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                      ₹{pharmacy.inventory.price}
                    </Text>
                    {pharmacy.inventory.mrp > pharmacy.inventory.price && (
                      <Text style={{ fontSize: 12, color: '#6b7280', textDecorationLine: 'line-through' }}>
                        MRP ₹{pharmacy.inventory.mrp}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={{ fontSize: 12, color: '#6b7280', marginLeft: 4 }}>
                      {pharmacy.distance} km
                    </Text>
                  </View>
                  {pharmacy.deliveryAvailable && (
                    <Badge variant="success">
                      <Ionicons name="bicycle" size={12} color="#166534" />
                      <Text style={{ marginLeft: 4 }}>Delivery</Text>
                    </Badge>
                  )}
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    Stock: {pharmacy.inventory.quantity}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    title="Reserve"
                    onPress={() => {
                      // Navigate to reservation screen
                      // In production, would pass pharmacy and medicine data
                    }}
                    style={{ flex: 1 }}
                  />
                  {pharmacy.deliveryAvailable && (
                    <Button
                      title="Delivery"
                      variant="outline"
                      onPress={() => {}}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}