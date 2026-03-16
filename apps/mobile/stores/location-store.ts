import { create } from 'zustand';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  isLoading: boolean;
  error: string | null;
  setLocation: (lat: number, lng: number, address?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearLocation: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  address: null,
  isLoading: false,
  error: null,

  setLocation: (latitude, longitude, address) => set({
    latitude,
    longitude,
    address,
    isLoading: false,
    error: null,
  }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  clearLocation: () => set({
    latitude: null,
    longitude: null,
    address: null,
    error: null,
  }),
}));

export function formatAddress(lat: number, lng: number): Promise<string> {
  // In production, use Google Maps Geocoding API
  return Promise.resolve(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
}