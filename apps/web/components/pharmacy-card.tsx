import { MapPin, Clock, Star, Truck, Phone, Navigation } from 'lucide-react';
import { Card, Badge } from './ui';

interface PharmacyCardProps {
  pharmacy: {
    id: string;
    name: string;
    phone: string;
    address: string;
    city: string;
    distance?: string;
    rating?: number;
    totalRatings?: number;
    deliveryAvailable?: boolean;
    isOpen?: boolean;
    inventory?: {
      price: number;
      mrp: number;
      quantity: number;
      discountPercent?: number;
    };
  };
  showInventory?: boolean;
  onViewDetails?: () => void;
  onReserve?: () => void;
  onDelivery?: () => void;
}

export function PharmacyCard({
  pharmacy,
  showInventory = false,
  onViewDetails,
  onReserve,
  onDelivery,
}: PharmacyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg text-gray-900">{pharmacy.name}</h3>
            {pharmacy.isOpen !== undefined && (
              <Badge variant={pharmacy.isOpen ? 'success' : 'danger'}>
                {pharmacy.isOpen ? 'Open' : 'Closed'}
              </Badge>
            )}
          </div>
          <p className="text-gray-600 text-sm">{pharmacy.address}</p>
          {pharmacy.distance && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <MapPin className="h-4 w-4" />
              <span>{pharmacy.distance} km away</span>
            </div>
          )}
        </div>
        {showInventory && pharmacy.inventory && (
          <div className="text-right">
            <p className="font-bold text-xl text-gray-900">
              {formatPrice(pharmacy.inventory.price)}
            </p>
            {pharmacy.inventory.discountPercent && pharmacy.inventory.discountPercent > 0 && (
              <p className="text-sm text-green-600">
                {pharmacy.inventory.discountPercent}% off
              </p>
            )}
            <p className="text-sm text-gray-500 line-through">
              MRP {formatPrice(pharmacy.inventory.mrp)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
        {pharmacy.rating !== undefined && (
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{pharmacy.rating.toFixed(1)}</span>
            {pharmacy.totalRatings && (
              <span className="text-gray-400">({pharmacy.totalRatings})</span>
            )}
          </span>
        )}
        {pharmacy.deliveryAvailable && (
          <span className="flex items-center gap-1 text-green-600">
            <Truck className="h-4 w-4" />
            <span>Delivery</span>
          </span>
        )}
        <span className="flex items-center gap-1">
          <Phone className="h-4 w-4" />
          <span>{pharmacy.phone}</span>
        </span>
      </div>

      {showInventory && pharmacy.inventory && (
        <div className="bg-gray-50 rounded-lg p-2 mb-3 text-sm">
          <span className="text-gray-600">In stock: </span>
          <span className="font-medium text-green-600">
            {pharmacy.inventory.quantity} units
          </span>
        </div>
      )}

      <div className="flex gap-2">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex-1 btn btn-outline py-2"
          >
            View Details
          </button>
        )}
        {onReserve && (
          <button
            onClick={onReserve}
            className="flex-1 btn btn-primary py-2"
          >
            Reserve
          </button>
        )}
        {onDelivery && pharmacy.deliveryAvailable && (
          <button
            onClick={onDelivery}
            className="flex-1 btn btn-outline py-2"
          >
            Request Delivery
          </button>
        )}
      </div>
    </Card>
  );
}

// Pharmacy Detail Card (for pharmacy profile page)
interface PharmacyDetailProps {
  pharmacy: {
    id: string;
    name: string;
    description?: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    totalRatings?: number;
    deliveryAvailable?: boolean;
    deliveryRadius?: number;
    operatingHours?: Array<{
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      is24Hours: boolean;
      isClosed: boolean;
    }>;
  };
}

export function PharmacyDetail({ pharmacy }: PharmacyDetailProps) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date().getDay();
  const todayHours = pharmacy.operatingHours?.find((h) => h.dayOfWeek === today);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pharmacy.name}</h1>
          {pharmacy.description && (
            <p className="text-gray-600 mt-2">{pharmacy.description}</p>
          )}
        </div>
        {pharmacy.rating !== undefined && (
          <div className="flex items-center gap-2 bg-yellow-50 px-3 py-2 rounded-lg">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{pharmacy.rating.toFixed(1)}</span>
            <span className="text-gray-500">({pharmacy.totalRatings})</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{pharmacy.phone}</span>
            </div>
            {pharmacy.email && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">@</span>
                <span>{pharmacy.email}</span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <span>
                {pharmacy.address}, {pharmacy.city}, {pharmacy.state} - {pharmacy.pincode}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Operating Hours</h3>
          <div className="space-y-1 text-sm">
            {pharmacy.operatingHours ? (
              pharmacy.operatingHours.map((hours) => (
                <div
                  key={hours.dayOfWeek}
                  className={`flex justify-between ${
                    hours.dayOfWeek === today ? 'font-medium text-blue-600' : ''
                  }`}
                >
                  <span>{dayNames[hours.dayOfWeek]}</span>
                  <span>
                    {hours.is24Hours
                      ? '24 Hours'
                      : hours.isClosed
                      ? 'Closed'
                      : `${hours.openTime} - ${hours.closeTime}`}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">Hours not available</p>
            )}
          </div>
        </Card>
      </div>

      <div className="flex gap-4">
        {pharmacy.deliveryAvailable && (
          <div className="flex items-center gap-2 text-green-600">
            <Truck className="h-5 w-5" />
            <span>Delivery available ({pharmacy.deliveryRadius}km radius)</span>
          </div>
        )}
        {pharmacy.location && (
          <button className="flex items-center gap-2 text-blue-600 hover:underline">
            <Navigation className="h-5 w-5" />
            <span>Get Directions</span>
          </button>
        )}
      </div>
    </div>
  );
}