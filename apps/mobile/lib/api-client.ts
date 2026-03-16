import { useAuthStore } from '@/stores/auth-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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
  const url = `${API_URL}/api${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add auth token if available
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
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

  getProfile: () =>
    api.get('/auth/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.patch('/auth/me', data),
};

// Search API
export const searchApi = {
  searchMedicine: async (params: {
    q: string;
    latitude: number;
    longitude: number;
    radius?: number;
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

  nearbyPharmacies: async (params: {
    latitude: number;
    longitude: number;
    radius?: number;
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

  getInventory: (pharmacyId: string, params?: { category?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    return api.get(`/inventory/pharmacy/${pharmacyId}?${searchParams.toString()}`);
  },
};

// Reservation API
export const reservationApi = {
  create: (data: {
    pharmacyId: string;
    items: Array<{ inventoryId: string; quantity: number }>;
    notes?: string;
  }) => api.post('/reservations', data),

  getMyReservations: (status?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return api.get(`/reservations/my?${params.toString()}`);
  },

  getById: (id: string) =>
    api.get(`/reservations/${id}`),

  cancel: (id: string, notes?: string) =>
    api.post(`/reservations/${id}/cancel`, { notes }),
};

// Prescription API
export const prescriptionApi = {
  upload: async (imageUri: string) => {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'prescription.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('prescription', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const { accessToken } = useAuthStore.getState();
    const response = await fetch(`${API_URL}/api/prescriptions/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.error?.code, data.error?.message);
    }
    return data.data;
  },

  getMyPrescriptions: (status?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', String(page));
    params.append('limit', String(limit));
    return api.get(`/prescriptions/my?${params.toString()}`);
  },

  getById: (id: string) =>
    api.get(`/prescriptions/${id}`),

  searchPharmacies: (id: string, params: { latitude: number; longitude: number; radius?: number }) =>
    api.post(`/prescriptions/${id}/search-pharmacies`, params),
};