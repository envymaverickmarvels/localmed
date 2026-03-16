export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add auth token if available
  if (typeof window !== 'undefined') {
    const authState = localStorage.getItem('localmed-auth');
    if (authState) {
      try {
        const { accessToken } = JSON.parse(authState);
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An unknown error occurred',
      data.error?.details
    );
  }

  return data.data;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Auth API
export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/send-otp', { phone, purpose: 'LOGIN' }),

  verifyOtp: (phone: string, otp: string, name?: string) =>
    api.post('/auth/verify-otp', { phone, otp, name }),

  logout: (allDevices = false) =>
    api.post('/auth/logout', { allDevices }),

  getProfile: () =>
    api.get('/auth/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch('/auth/me', data),
};

// Medicine API
export const medicineApi = {
  search: (query: string, page = 1, limit = 20) =>
    api.get(`/medicines/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),

  getSuggestions: (query: string) =>
    api.get(`/medicines/suggestions?q=${encodeURIComponent(query)}`),

  getById: (id: string) =>
    api.get(`/medicines/${id}`),
};

// Search API
export const searchApi = {
  searchMedicine: (params: {
    q: string;
    latitude: number;
    longitude: number;
    radius?: number;
    open?: boolean;
    hasStock?: boolean;
    delivery?: boolean;
    sortBy?: 'distance' | 'price' | 'rating';
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return api.get(`/search/medicine?${searchParams.toString()}`);
  },

  nearbyPharmacies: (params: {
    latitude: number;
    longitude: number;
    radius?: number;
    open?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return api.get(`/search/pharmacies/nearby?${searchParams.toString()}`);
  },
};

// Pharmacy API
export const pharmacyApi = {
  getById: (id: string) =>
    api.get(`/pharmacies/${id}`),

  getOperatingHours: (id: string) =>
    api.get(`/pharmacies/${id}/hours`),

  getMyPharmacies: () =>
    api.get('/pharmacies/my/pharmacies'),
};

// Reservation API
export const reservationApi = {
  create: (data: {
    pharmacyId: string;
    items: Array<{ inventoryId: string; quantity: number }>;
    notes?: string;
  }) =>
    api.post('/reservations', data),

  getMyReservations: (status?: string, page = 1, limit = 20) =>
    api.get(`/reservations/my?${status ? `status=${status}&` : ''}page=${page}&limit=${limit}`),

  getById: (id: string) =>
    api.get(`/reservations/${id}`),

  confirm: (id: string) =>
    api.post(`/reservations/${id}/confirm`),

  cancel: (id: string, notes?: string) =>
    api.post(`/reservations/${id}/cancel`, { notes }),

  extend: (id: string) =>
    api.post(`/reservations/${id}/extend`),
};