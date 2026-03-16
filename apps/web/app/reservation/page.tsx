'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { reservationApi, pharmacyApi } from '@/lib/api-client';
import { Card, Button, Badge, Modal, Input, Textarea } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { MapPin, Clock, Truck, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface CartItem {
  inventoryId: string;
  medicineId: string;
  medicineName: string;
  pharmacyId: string;
  pharmacyName: string;
  price: number;
  mrp: number;
  quantity: number;
}

export default function ReservationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('localmed-cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart:', e);
      }
    }
  }, []);

  // Check if we have items to reserve
  const pharmacyId = searchParams.get('pharmacy');
  const medicineId = searchParams.get('medicine');

  const { data: pharmacy } = useQuery({
    queryKey: ['pharmacy', pharmacyId],
    queryFn: () => pharmacyApi.getById(pharmacyId!),
    enabled: !!pharmacyId,
  });

  const createReservationMutation = useMutation({
    mutationFn: (data: {
      pharmacyId: string;
      items: Array<{ inventoryId: string; quantity: number }>;
      notes?: string;
    }) => reservationApi.create(data),
    onSuccess: (data) => {
      setReservationId(data.reservation.id);
      setShowSuccessModal(true);
      localStorage.removeItem('localmed-cart');
    },
  });

  const handleReserve = () => {
    if (cart.length === 0) return;

    const items = cart.map((item) => ({
      inventoryId: item.inventoryId,
      quantity: item.quantity,
    }));

    createReservationMutation.mutate({
      pharmacyId: cart[0].pharmacyId,
      items,
      notes: notes || undefined,
    });
  };

  const removeFromCart = (inventoryId: string) => {
    const newCart = cart.filter((item) => item.inventoryId !== inventoryId);
    setCart(newCart);
    localStorage.setItem('localmed-cart', JSON.stringify(newCart));
  };

  const updateQuantity = (inventoryId: string, quantity: number) => {
    const newCart = cart.map((item) =>
      item.inventoryId === inventoryId ? { ...item, quantity } : item
    );
    setCart(newCart);
    localStorage.setItem('localmed-cart', JSON.stringify(newCart));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalSavings = cart.reduce(
    (sum, item) => sum + (item.mrp - item.price) * item.quantity,
    0
  );

  if (!isAuthenticated) {
    return null;
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No items to reserve</h2>
          <p className="text-gray-500 mb-4">
            Search for medicines and add items to your cart first.
          </p>
          <Button onClick={() => router.push('/search')}>Search Medicines</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Reserve Medicines</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="md:col-span-2 space-y-4">
            {/* Pharmacy Info */}
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium">{cart[0]?.pharmacyName}</p>
                  <p className="text-sm text-gray-500">{pharmacy?.data?.address}</p>
                </div>
              </div>
            </Card>

            {/* Items */}
            <Card className="divide-y">
              {cart.map((item) => (
                <div key={item.inventoryId} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.medicineName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold">₹{item.price}</span>
                        {item.mrp > item.price && (
                          <span className="text-sm text-gray-500 line-through">
                            ₹{item.mrp}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.inventoryId)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => updateQuantity(item.inventoryId, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.inventoryId, item.quantity + 1)}
                      className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </Card>

            {/* Notes */}
            <Card className="p-4">
              <Textarea
                placeholder="Add notes for the pharmacy (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="p-6 sticky top-24">
              <h2 className="font-semibold mb-4">Order Summary</h2>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                  </span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>You save</span>
                    <span>₹{totalSavings.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reservation fee</span>
                  <span className="text-green-600">Free</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="flex justify-between font-semibold">
                  <span>Total to pay</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pay directly at the pharmacy when you pick up
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-blue-700 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>Reservation valid for 30 minutes</span>
                </div>
              </div>

              <Button
                onClick={handleReserve}
                isLoading={createReservationMutation.isPending}
                className="w-full"
              >
                Reserve Now
              </Button>

              <p className="text-xs text-gray-500 text-center mt-3">
                By reserving, you agree to pick up the medicines within 30 minutes
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.push('/reservations');
        }}
        title="Reservation Confirmed!"
      >
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">
            Your reservation has been confirmed. Please visit the pharmacy within 30 minutes
            to pick up your medicines.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Reservation ID: {reservationId}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/reservations')}>
              View Reservations
            </Button>
            <Button onClick={() => router.push('/search')}>Continue Shopping</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}