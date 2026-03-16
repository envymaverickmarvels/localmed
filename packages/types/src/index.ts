// User Roles
export type UserRole = 'USER' | 'PHARMACY_OWNER' | 'RIDER' | 'ADMIN';

// User Entity
export interface User {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: UserRole;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Pharmacy Entity
export interface Pharmacy {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  phone: string;
  email: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  location: {
    latitude: number;
    longitude: number;
  };
  licenseNumber: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isOperational: boolean;
  operatingHours: OperatingHours;
  deliveryAvailable: boolean;
  deliveryRadius: number | null;
  rating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperatingHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

export interface DayHours {
  open: string; // HH:MM format
  close: string; // HH:MM format
  isOpen24Hours: boolean;
}

// Medicine Entity
export interface Medicine {
  id: string;
  name: string;
  genericName: string | null;
  brandName: string | null;
  category: string | null;
  form: 'TABLET' | 'CAPSULE' | 'SYRUP' | 'INJECTION' | 'OINTMENT' | 'DROPS' | 'INHALER' | 'OTHER';
  strength: string | null;
  manufacturer: string | null;
  schedule: 'OTC' | 'H1' | 'H' | 'X';
  description: string | null;
  sideEffects: string[] | null;
  usageInstructions: string | null;
  storageInstructions: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Inventory Entity
export interface Inventory {
  id: string;
  pharmacyId: string;
  medicineId: string;
  quantity: number;
  price: number;
  mrp: number;
  batchNumber: string | null;
  expiryDate: Date | null;
  discountPercent: number;
  isActive: boolean;
  lastRestockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Reservation Entity
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';

export interface Reservation {
  id: string;
  userId: string;
  pharmacyId: string;
  status: ReservationStatus;
  totalAmount: number;
  expiresAt: Date;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationItem {
  id: string;
  reservationId: string;
  inventoryId: string;
  medicineId: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// Delivery Entity
export type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export interface Delivery {
  id: string;
  reservationId: string;
  riderId: string | null;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryLocation: {
    latitude: number;
    longitude: number;
  } | null;
  otp: string;
  estimatedDeliveryAt: Date | null;
  actualDeliveryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Prescription Entity
export type PrescriptionStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';

export interface Prescription {
  id: string;
  userId: string;
  imageUrl: string;
  ocrText: string | null;
  extractedMedicines: ExtractedMedicine[] | null;
  confidence: number | null;
  status: PrescriptionStatus;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedMedicine {
  name: string;
  confidence: number;
  matchedMedicineId: string | null;
  dosage: string | null;
  frequency: string | null;
}

// Notification Entity
export type NotificationType = 'RESERVATION_CREATED' | 'RESERVATION_CONFIRMED' | 'RESERVATION_CANCELLED' | 'DELIVERY_ASSIGNED' | 'DELIVERY_STARTED' | 'DELIVERY_COMPLETED' | 'PRESCRIPTION_PROCESSED' | 'LOW_STOCK' | 'SYSTEM';
export type NotificationChannel = 'IN_APP' | 'SMS' | 'PUSH' | 'EMAIL';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}

// Search Types
export interface SearchRequest {
  query: string;
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
  offset?: number;
  filters?: SearchFilters;
}

export interface SearchFilters {
  openNow?: boolean;
  hasStock?: boolean;
  maxDistance?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  deliveryAvailable?: boolean;
}

export interface SearchResult {
  pharmacies: PharmacySearchResult[];
  total: number;
  hasMore: boolean;
}

export interface PharmacySearchResult {
  pharmacy: Pharmacy;
  medicines: MedicineAvailability[];
  distance: number;
  estimatedDeliveryTime: number | null;
}

export interface MedicineAvailability {
  medicine: Medicine;
  inventory: Inventory;
  inStock: boolean;
}

// Pagination
export interface PaginatedRequest {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
  };
}