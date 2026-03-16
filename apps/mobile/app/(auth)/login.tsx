import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Button, Input } from '@/components/ui';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phone}`, purpose: 'LOGIN' }),
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
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+91${phone}`, otp }),
      });

      const data = await response.json();

      if (data.success) {
        login(data.data.user, data.data.accessToken, data.data.refreshToken);
        router.replace('/(tabs)');
      } else {
        setError(data.error?.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 64,
                height: 64,
                backgroundColor: '#2563eb',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#ffffff' }}>L</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>
              Welcome to LocalMed
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
              {step === 'phone' ? 'Enter your phone number to continue' : 'Enter the OTP sent to your phone'}
            </Text>
          </View>

          {error ? (
            <View
              style={{
                backgroundColor: '#fee2e2',
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: '#991b1b' }}>{error}</Text>
            </View>
          ) : null}

          {step === 'phone' ? (
            <>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
                  Phone Number
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      backgroundColor: '#f3f4f6',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderRightWidth: 0,
                      borderTopLeftRadius: 12,
                      borderBottomLeftRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ fontSize: 16, color: '#6b7280' }}>+91</Text>
                  </View>
                  <TextInput
                    value={phone}
                    onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                    style={{
                      flex: 1,
                      backgroundColor: '#f9fafb',
                      borderWidth: 1,
                      borderColor: '#d1d5db',
                      borderTopRightRadius: 12,
                      borderBottomRightRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      fontSize: 16,
                    }}
                  />
                </View>
              </View>

              <Button
                title={loading ? 'Sending...' : 'Send OTP'}
                onPress={handleSendOtp}
                disabled={phone.length !== 10}
                loading={loading}
              />
            </>
          ) : (
            <>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                  Enter OTP
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {[...Array(6)].map((_, i) => (
                    <TextInput
                      key={i}
                      value={otp[i] || ''}
                      onChangeText={(text) => {
                        const newOtp = otp.split('');
                        newOtp[i] = text.replace(/\D/g, '');
                        setOtp(newOtp.join(''));
                        if (text && i < 5) {
                          // Focus next input (would need ref in production)
                        }
                      }}
                      keyboardType="numeric"
                      maxLength={1}
                      style={{
                        width: 48,
                        height: 56,
                        backgroundColor: '#f9fafb',
                        borderWidth: 1,
                        borderColor: '#d1d5db',
                        borderRadius: 12,
                        textAlign: 'center',
                        fontSize: 24,
                        fontWeight: '600',
                      }}
                    />
                  ))}
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                  OTP sent to +91 {phone}
                </Text>
              </View>

              <Button
                title={loading ? 'Verifying...' : 'Verify OTP'}
                onPress={handleVerifyOtp}
                disabled={otp.length !== 6}
                loading={loading}
              />

              <TouchableOpacity
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                }}
                style={{ marginTop: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#2563eb', fontSize: 14 }}>Change phone number</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => router.push('/register')}
            style={{ marginTop: 24, alignItems: 'center' }}
          >
            <Text style={{ color: '#6b7280' }}>
              Don't have an account?{' '}
              <Text style={{ color: '#2563eb', fontWeight: '600' }}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}