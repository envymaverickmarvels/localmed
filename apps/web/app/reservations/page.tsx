'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reservationApi } from '@/lib/api-client';
import { Card, Badge, Button, Spinner, EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { Clock, Package, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

export default function ReservationsPage() {
  const { isAuthenticated } = useAuth(true);
  const [status, setStatus] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reservations', status],
    queryFn: () => reservationApi.getMyReservations(status || undefined),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  const reservations = data?.data?.reservations || [];

  const statusColors: Record<string, 'default' | 'warning' | 'success' | 'danger' | 'info'> = {
    PENDING: 'warning',
    CONFIRMED: 'info',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    EXPIRED: 'default',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold">My Reservations</h1>
            <Link href="/search">
              <Button>New Reservation</Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : reservations.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="No reservations found"
            description="Start by searching for medicines and reserving them at nearby pharmacies."
            action={
              <Link href="/search">
                <Button>Search Medicines</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {reservations.map((reservation: any) => (
              <Card key={reservation.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusColors[reservation.status]}>
                        {reservation.status}
                      </Badge>
                      {reservation.status === 'PENDING' && (
                        <span className="text-sm text-amber-600 flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Expires in 30 min
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(reservation.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <p className="font-bold text-lg">₹{reservation.totalAmount}</p>
                </div>

                {/* Pharmacy Info */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">{reservation.pharmacy?.name}</p>
                      <p className="text-sm text-gray-500">{reservation.pharmacy?.address}</p>
                      {reservation.pharmacy?.phone && (
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" />
                          {reservation.pharmacy.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {reservation.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.medicineName} x {item.quantity}
                      </span>
                      <span>₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {reservation.status === 'PENDING' && (
                  <div className="flex gap-2 mt-4">
                    <Link href={`/reservations/${reservation.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/pharmacy/${reservation.pharmacyId}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Get Directions
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}