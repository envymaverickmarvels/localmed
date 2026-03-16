'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth(required = false) {
  const { user, isAuthenticated, accessToken } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (required && !isAuthenticated) {
      router.push('/login');
    }
  }, [required, isAuthenticated, router]);

  return {
    user,
    isAuthenticated,
    accessToken,
    isLoading: !isAuthenticated && !accessToken,
  };
}

export function useRequireAuth() {
  return useAuth(true);
}