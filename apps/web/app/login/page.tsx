'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setTokens = useAuthStore((s) => s.setTokens);

  const sendOtpMutation = useMutation({
    mutationFn: () => authApi.sendOtp(phone),
    onSuccess: () => {
      setStep('otp');
      setError('');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to send OTP');
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () => authApi.verifyOtp(phone, otp),
    onSuccess: (data: any) => {
      setUser(data.user);
      setTokens(data.accessToken, data.refreshToken);
      router.push('/');
    },
    onError: (err: any) => {
      setError(err.message || 'Invalid OTP');
    },
  });

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length === 10) {
      sendOtpMutation.mutate();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      verifyOtpMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">L</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to LocalMed</h1>
          <p className="text-gray-600 mt-2">
            {step === 'phone' ? 'Enter your phone number to continue' : 'Enter the OTP sent to your phone'}
          </p>
        </div>

        <div className="card p-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter your phone number"
                    className="input rounded-l-none flex-1"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={phone.length !== 10 || sendOtpMutation.isPending}
                className="btn-primary w-full py-3"
              >
                {sendOtpMutation.isPending ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter OTP
                </label>
                <div className="flex gap-2 justify-center">
                  {[...Array(6)].map((_, i) => (
                    <input
                      key={i}
                      type="text"
                      maxLength={1}
                      value={otp[i] || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const newOtp = otp.split('');
                        newOtp[i] = value;
                        setOtp(newOtp.join(''));
                        // Focus next input
                        if (value && i < 5) {
                          const nextInput = document.getElementById(`otp-${i + 1}`);
                          nextInput?.focus();
                        }
                      }}
                      id={`otp-${i}`}
                      className="input w-12 h-12 text-center text-xl"
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">
                  OTP sent to +91 {phone}
                </p>
              </div>

              <button
                type="submit"
                disabled={otp.length !== 6 || verifyOtpMutation.isPending}
                className="btn-primary w-full py-3"
              >
                {verifyOtpMutation.isPending ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError('');
                  }}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}