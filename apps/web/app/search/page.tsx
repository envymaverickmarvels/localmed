'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/lib/api-client';
import { MapPin, Search, Clock, Truck, Star } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Get user's location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['medicine-search', query, location],
    queryFn: () =>
      searchApi.searchMedicine({
        q: query,
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        radius: 10,
      }),
    enabled: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setHasSearched(true);
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">L</span>
              </div>
              <span className="font-bold text-lg">LocalMed</span>
            </a>
            <nav className="flex items-center gap-4">
              <a href="/login" className="text-gray-600 hover:text-gray-900">
                Login
              </a>
              <a href="/register" className="btn-primary px-4 py-2 text-sm">
                Sign Up
              </a>
            </nav>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for medicines..."
                className="input w-full pl-10"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !location}
              className="btn-primary px-6"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          {!location && (
            <p className="text-sm text-amber-600 mt-2">
              Please enable location access for better results
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {!hasSearched ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Search for Medicines
            </h2>
            <p className="text-gray-600">
              Enter a medicine name to find nearby pharmacies with stock
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Searching pharmacies near you...</p>
          </div>
        ) : data?.pharmacies?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No pharmacies found with this medicine in stock nearby.</p>
            <p className="text-sm text-gray-500">
              Try searching for an alternative medicine or expanding your search radius.
            </p>
          </div>
        ) : (
          <>
            {/* Medicine Info */}
            {data?.medicine && (
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h2 className="font-semibold text-lg">{data.medicine.name}</h2>
                {data.medicine.genericName && (
                  <p className="text-gray-600">Generic: {data.medicine.genericName}</p>
                )}
                <p className="text-sm text-gray-500">
                  {data.medicine.form} {data.medicine.strength}
                </p>
              </div>
            )}

            {/* Results */}
            <div className="space-y-4">
              {data?.pharmacies?.map((pharmacy: any) => (
                <div
                  key={pharmacy.id}
                  className="card p-4 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{pharmacy.name}</h3>
                      <p className="text-gray-600 text-sm">{pharmacy.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{pharmacy.inventory.price}</p>
                      <p className="text-sm text-gray-500">
                        MRP: ₹{pharmacy.inventory.mrp}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {pharmacy.distance} km away
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {pharmacy.rating?.toFixed(1) || 'N/A'} ({pharmacy.totalRatings})
                    </span>
                    {pharmacy.deliveryAvailable && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Truck className="w-4 h-4" />
                        Delivery available
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      In stock: {pharmacy.inventory.quantity} units
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button className="btn-primary flex-1 py-2">
                      Reserve Now
                    </button>
                    {pharmacy.deliveryAvailable && (
                      <button className="btn-outline py-2">
                        Request Delivery
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data?.pagination?.hasMore && (
              <div className="text-center mt-6">
                <button className="btn-outline px-8 py-2">
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Add useEffect import
import { useEffect } from 'react';