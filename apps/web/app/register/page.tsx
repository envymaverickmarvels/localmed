'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { Store, User, Truck } from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<'USER' | 'PHARMACY_OWNER' | 'RIDER'>('USER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuthContext();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'REGISTRATION' }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('otp');
      } else {
        setError(data.error?.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.isNewUser) {
          setStep('details');
        } else {
          // User already exists, log them in
          login(data.data.accessToken, data.data.refreshToken, data.data.user);
          router.push('/');
        }
      } else {
        setError(data.error?.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          email: email || undefined,
          role,
        }),
      });

      const data = await response.json();

      if (data.success) {
        login(data.data.accessToken, data.data.refreshToken, data.data.user);

        // Redirect based on role
        if (role === 'PHARMACY_OWNER') {
          router.push('/pharmacy/register');
        } else if (role === 'RIDER') {
          router.push('/rider/register');
        } else {
          router.push('/');
        }
      } else {
        setError(data.error?.message || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">L</span>
            </div>
            <span className="font-bold text-2xl">LocalMed</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Create an Account</h1>
          <p className="text-gray-500 mt-2">
            {step === 'phone' && 'Enter your phone number to get started'}
            {step === 'otp' && 'Enter the OTP sent to your phone'}
            {step === 'details' && 'Complete your profile'}
          </p>
        </div>

        <Card className="p-6">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {step === 'phone' && (
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  I want to
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('USER')}
                    className={`p-3 rounded-lg border text-center ${
                      role === 'USER'
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <User className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Find Medicines</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('PHARMACY_OWNER')}
                    className={`p-3 rounded-lg border text-center ${
                      role === 'PHARMACY_OWNER'
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Store className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Register Pharmacy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('RIDER')}
                    className={`p-3 rounded-lg border text-center ${
                      role === 'RIDER'
                        ? 'border-blue-500 bg-blue-50 text-blue-600'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="h-6 w-6 mx-auto mb-1" />
                    <span className="text-sm">Become Rider</span>
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={phone.length !== 10 || isLoading}>
                {isLoading ? 'Sending OTP...' : 'Send OTP'}
              </Button>

              <p className="text-center text-sm text-gray-500 mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Login
                </Link>
              </p>
            </form>
          )}

          {step === 'otp' && (
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

              <Button type="submit" className="w-full" disabled={otp.length !== 6 || isLoading}>
                {isLoading ? 'Verifying...' : 'Verify OTP'}
              </Button>

              <div className="text-center mt-4 space-y-2">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Resend OTP
                </button>
                <br />
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-gray-500 text-sm hover:underline"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}

          {step === 'details' && (
            <form onSubmit={handleRegister}>
              <div className="mb-4">
                <Input
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="mb-4">
                <Input
                  label="Email (optional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <Button type="submit" className="w-full" disabled={!name.trim() || isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}