'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { pharmacyApi } from '@/lib/api-client';
import { PharmacyDetail } from '@/components/pharmacy-card';
import { Card, Badge, Spinner, Button } from '@/components/ui';
import { MapPin, Clock, Package, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  medicine: {
    id: string;
    name: string;
    genericName: string | null;
    form: string;
    strength: string | null;
  };
  quantity: number;
  price: number;
  mrp: number;
  discountPercent: number;
  batchNumber: string | null;
  expiryDate: string | null;
}

export default function PharmacyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pharmacyId = params.id as string;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: pharmacy, isLoading: pharmacyLoading } = useQuery({
    queryKey: ['pharmacy', pharmacyId],
    queryFn: () => pharmacyApi.getById(pharmacyId),
  });

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['pharmacy-inventory', pharmacyId, searchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/pharmacy/${pharmacyId}?search=${searchQuery}`);
      return response.json();
    },
    enabled: !!pharmacyId,
  });

  if (pharmacyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Pharmacy not found</h2>
          <Button className="mt-4" onClick={() => router.push('/search')}>
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  const filteredInventory = inventory?.data?.inventory?.filter((item: InventoryItem) => {
    if (selectedCategory && item.medicine.form !== selectedCategory) {
      return false;
    }
    return true;
  }) || [];

  const categories = [...new Set(inventory?.data?.inventory?.map((item: InventoryItem) => item.medicine.form) || [])];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <span>←</span>
            <span>Back</span>
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Pharmacy Info */}
        <Card className="p-6 mb-6">
          <PharmacyDetail pharmacy={pharmacy.data} />
        </Card>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input flex-1"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((category: string) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inventory */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Available Medicines
            </h2>
          </div>

          {inventoryLoading ? (
            <div className="p-8 text-center">
              <Spinner />
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No medicines found matching your search' : 'No medicines available'}
            </div>
          ) : (
            <div className="divide-y">
              {filteredInventory.map((item: InventoryItem) => (
                <div
                  key={item.id}
                  className="p-4 flex justify-between items-center hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.medicine.name}</h3>
                    {item.medicine.genericName && (
                      <p className="text-sm text-gray-500">{item.medicine.genericName}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      {item.medicine.form} {item.medicine.strength}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {item.quantity < 10 && (
                        <Badge variant="warning">Low Stock</Badge>
                      )}
                      {item.expiryDate && new Date(item.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) && (
                        <Badge variant="danger">Expiring Soon</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">₹{item.price}</p>
                    {item.discountPercent > 0 && (
                      <p className="text-sm text-green-600">{item.discountPercent}% off</p>
                    )}
                    <p className="text-sm text-gray-500 line-through">MRP ₹{item.mrp}</p>
                    <p className="text-sm text-gray-500 mt-1">Stock: {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}