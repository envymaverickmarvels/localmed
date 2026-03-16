import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Button Component
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const sizeStyles = {
    sm: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
    md: { paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
    lg: { paddingHorizontal: 24, paddingVertical: 16, fontSize: 18 },
  };

  const variantStyles = {
    primary: { backgroundColor: '#2563eb' },
    secondary: { backgroundColor: '#f3f4f6' },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#d1d5db' },
    danger: { backgroundColor: '#dc2626' },
  };

  const textStyles = {
    primary: { color: '#ffffff' },
    secondary: { color: '#374151' },
    outline: { color: '#374151' },
    danger: { color: '#ffffff' },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
        },
        sizeStyles[size],
        variantStyles[variant],
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textStyles[variant].color} />
      ) : (
        <Text style={[{ fontWeight: '600' }, sizeStyles[size], textStyles[variant]]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// Input Component
interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  multiline = false,
  numberOfLines = 1,
}: InputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={{
          backgroundColor: '#f9fafb',
          borderWidth: 1,
          borderColor: error ? '#ef4444' : '#d1d5db',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          fontSize: 16,
          minHeight: multiline ? 80 : 48,
        }}
      />
      {error && (
        <Text style={{ fontSize: 14, color: '#ef4444', marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
}

// Card Component
interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Badge Component
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  style?: ViewStyle;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const variantStyles = {
    default: { backgroundColor: '#f3f4f6', color: '#374151' },
    success: { backgroundColor: '#dcfce7', color: '#166534' },
    warning: { backgroundColor: '#fef3c7', color: '#92400e' },
    danger: { backgroundColor: '#fee2e2', color: '#991b1b' },
    info: { backgroundColor: '#dbeafe', color: '#1e40af' },
  };

  return (
    <View
      style={[
        {
          backgroundColor: variantStyles[variant].backgroundColor,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 9999,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: variantStyles[variant].color }}>
        {children}
      </Text>
    </View>
  );
}

// Spinner Component
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 16, md: 24, lg: 32 };
  return <ActivityIndicator size={sizes[size]} color="#2563eb" />;
}

// Empty State Component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      {icon && <View style={{ marginBottom: 16 }}>{icon}</View>}
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', textAlign: 'center' }}>
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
          {description}
        </Text>
      )}
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}