# API Documentation

## Base URL

```
Development: http://localhost:3000/api
Production: https://api.localmed.com/api
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## Endpoints

### Authentication

#### Send OTP
```
POST /api/auth/send-otp
```

Request body:
```json
{
  "phone": "9876543210",
  "purpose": "LOGIN"
}
```

#### Verify OTP
```
POST /api/auth/verify-otp
```

Request body:
```json
{
  "phone": "9876543210",
  "otp": "123456",
  "name": "John Doe" // Optional, for new users
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+919876543210",
      "name": "John Doe",
      "role": "USER"
    },
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

#### Get Current User
```
GET /api/auth/me
```

#### Update Profile
```
PATCH /api/auth/me
```

Request body:
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Medicines

#### Search Medicines
```
GET /api/medicines/search?q=paracetamol&page=1&limit=20
```

#### Get Medicine Details
```
GET /api/medicines/:id
```

#### Get Suggestions (Autocomplete)
```
GET /api/medicines/suggestions?q=para
```

### Search

#### Search Medicine Availability
```
GET /api/search/medicine?q=paracetamol&latitude=28.6139&longitude=77.2090&radius=5
```

Query parameters:
- `q` (required): Medicine name to search
- `latitude` (required): User's latitude
- `longitude` (required): User's longitude
- `radius`: Search radius in km (default: 5)
- `open`: Filter open pharmacies (true/false)
- `delivery`: Filter delivery available (true/false)
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `sortBy`: Sort by (distance, price, rating)
- `page`: Page number
- `limit`: Results per page

#### Nearby Pharmacies
```
GET /api/search/pharmacies/nearby?latitude=28.6139&longitude=77.2090&radius=5
```

### Reservations

#### Create Reservation
```
POST /api/reservations
```

Request body:
```json
{
  "pharmacyId": "uuid",
  "items": [
    {
      "inventoryId": "uuid",
      "quantity": 2
    }
  ],
  "notes": "Optional notes"
}
```

#### Get My Reservations
```
GET /api/reservations/my?status=PENDING&page=1&limit=20
```

#### Get Reservation Details
```
GET /api/reservations/:id
```

#### Confirm Reservation (Pharmacy Owner)
```
POST /api/reservations/:id/confirm
```

#### Cancel Reservation
```
POST /api/reservations/:id/cancel
```

Request body:
```json
{
  "notes": "Reason for cancellation"
}
```

#### Extend Reservation
```
POST /api/reservations/:id/extend
```

### Pharmacies

#### Get Pharmacy Details
```
GET /api/pharmacies/:id
```

#### Get Pharmacy Operating Hours
```
GET /api/pharmacies/:id/hours
```

### Inventory (Pharmacy Owner)

#### Get Inventory
```
GET /api/inventory/pharmacy/:pharmacyId?page=1&limit=50&lowStock=true
```

#### Add Inventory Item
```
POST /api/inventory/pharmacy/:pharmacyId
```

Request body:
```json
{
  "medicineId": "uuid",
  "quantity": 100,
  "price": 25.00,
  "mrp": 30.00,
  "batchNumber": "BATCH001",
  "expiryDate": "2025-12-31"
}
```

#### Update Inventory Item
```
PATCH /api/inventory/:id
```

#### Adjust Stock
```
POST /api/inventory/:id/adjust-stock
```

Request body:
```json
{
  "quantity": -10,
  "reason": "Damaged goods"
}
```

### Prescriptions

#### Upload Prescription
```
POST /api/prescriptions/upload
```

Multipart form data with `prescription` file field.

#### Get My Prescriptions
```
GET /api/prescriptions/my?status=PROCESSED
```

#### Get Prescription Details
```
GET /api/prescriptions/:id
```

#### Search Pharmacies from Prescription
```
POST /api/prescriptions/:id/search-pharmacies
```

Request body:
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "radius": 5
}
```

### Notifications

#### Get Notifications
```
GET /api/notifications?unreadOnly=false&page=1&limit=20
```

#### Mark as Read
```
POST /api/notifications/mark-read
```

Request body:
```json
{
  "ids": ["uuid1", "uuid2"]
}
```

### Deliveries

#### Create Delivery
```
POST /api/deliveries
```

Request body:
```json
{
  "reservationId": "uuid",
  "deliveryAddress": "123 Main St, City",
  "deliveryLatitude": 28.6139,
  "deliveryLongitude": 77.2090,
  "deliveryNotes": "Gate code: 1234"
}
```

#### Track Delivery
```
GET /api/deliveries/:id/track
```

## Error Codes

| Code | Description |
|------|-------------|
| `BAD_REQUEST` | Invalid request data |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Permission denied |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource conflict (e.g., duplicate) |
| `VALIDATION_ERROR` | Input validation failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

## Rate Limits

- Default: 100 requests per 15 minutes per IP
- Auth endpoints: 5 requests per minute per phone number

## WebSocket Events

Connect to: `ws://localhost:3000`

### Authentication
Send token in auth handshake:
```javascript
const socket = io('ws://localhost:3000', {
  auth: { token: 'your_jwt_token' }
});
```

### Events

#### Client → Server

| Event | Description | Data |
|-------|-------------|------|
| `join:pharmacy` | Join pharmacy room | `pharmacyId` |
| `track:delivery` | Track delivery | `deliveryId` |
| `rider:location` | Update rider location | `{ deliveryId, latitude, longitude }` |

#### Server → Client

| Event | Description | Data |
|-------|-------------|------|
| `notification` | New notification | Notification object |
| `delivery:location` | Delivery location update | `{ deliveryId, latitude, longitude, timestamp }` |
| `reservation:confirmed` | Reservation confirmed | `{ reservationId }` |