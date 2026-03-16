// API Types - Database record types

export interface UserRecord {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  role: 'USER' | 'PHARMACY_OWNER' | 'RIDER' | 'ADMIN';
  password_hash: string | null;
  is_phone_verified: boolean;
  is_email_verified: boolean;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface PharmacyRecord {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string;
  email: string | null;
  address: string;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  location: string; // PostGIS geography
  license_number: string;
  license_document_url: string | null;
  verification_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason: string | null;
  verified_by: string | null;
  verified_at: Date | null;
  is_operational: boolean;
  delivery_available: boolean;
  delivery_radius_km: number | null;
  rating: number;
  total_ratings: number;
  created_at: Date;
  updated_at: Date;
}

export interface PharmacyHoursRecord {
  id: string;
  pharmacy_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  open_time: string;
  close_time: string;
  is_24_hours: boolean;
  is_closed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MedicineRecord {
  id: string;
  name: string;
  generic_name: string | null;
  brand_name: string | null;
  category: string | null;
  form: string;
  strength: string | null;
  manufacturer: string | null;
  schedule: 'OTC' | 'H1' | 'H' | 'X';
  description: string | null;
  usage_instructions: string | null;
  storage_instructions: string | null;
  side_effects: string[] | null;
  drug_interactions: string[] | null;
  contraindications: string[] | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface InventoryRecord {
  id: string;
  pharmacy_id: string;
  medicine_id: string;
  quantity: number;
  price: number;
  mrp: number;
  discount_percent: number;
  batch_number: string | null;
  manufacturing_date: Date | null;
  expiry_date: Date | null;
  is_active: boolean;
  last_restocked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReservationRecord {
  id: string;
  user_id: string;
  pharmacy_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  total_amount: number;
  notes: string | null;
  expires_at: Date;
  confirmed_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  cancellation_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ReservationItemRecord {
  id: string;
  reservation_id: string;
  inventory_id: string;
  medicine_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: Date;
}

export interface StockHoldRecord {
  id: string;
  inventory_id: string;
  reservation_id: string;
  quantity: number;
  created_at: Date;
  expires_at: Date;
  released_at: Date | null;
}

export interface DeliveryRecord {
  id: string;
  reservation_id: string;
  rider_id: string | null;
  status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  pickup_address: string;
  delivery_address: string;
  delivery_location: string | null;
  otp: string;
  estimated_delivery_at: Date | null;
  actual_delivery_at: Date | null;
  delivery_notes: string | null;
  rider_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PrescriptionRecord {
  id: string;
  user_id: string;
  image_url: string;
  ocr_text: string | null;
  extracted_medicines: any | null;
  confidence: number | null;
  status: 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  error_message: string | null;
  processed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any | null;
  channels: string[];
  is_read: boolean;
  read_at: Date | null;
  sent_at: Date | null;
  created_at: Date;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  device_info: string | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  last_activity_at: Date;
  created_at: Date;
  expires_at: Date;
}

export interface OtpVerificationRecord {
  id: string;
  phone: string;
  otp_hash: string;
  purpose: 'LOGIN' | 'REGISTRATION' | 'PASSWORD_RESET' | 'PHONE_VERIFY';
  attempts: number;
  max_attempts: number;
  is_verified: boolean;
  created_at: Date;
  expires_at: Date;
}