import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { Card, Button, Spinner } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Profile</Text>
      </View>

      {/* User Info */}
      <Card style={{ margin: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: '#dbeafe',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb' }}>
              {user?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827' }}>
              {user?.name || 'User'}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
              {user?.phone}
            </Text>
            {user?.email && (
              <Text style={{ fontSize: 14, color: '#6b7280' }}>{user.email}</Text>
            )}
          </View>
        </View>
      </Card>

      {/* Menu Items */}
      <View style={{ paddingHorizontal: 16 }}>
        <Card style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
          >
            <Ionicons name="person-outline" size={24} color="#374151" />
            <Text style={{ marginLeft: 12, fontSize: 16, color: '#374151' }}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
          >
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            <Text style={{ marginLeft: 12, fontSize: 16, color: '#374151' }}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
          >
            <Ionicons name="location-outline" size={24} color="#374151" />
            <Text style={{ marginLeft: 12, fontSize: 16, color: '#374151' }}>Saved Addresses</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
          >
            <Ionicons name="card-outline" size={24} color="#374151" />
            <Text style={{ marginLeft: 12, fontSize: 16, color: '#374151' }}>Payment Methods</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
          >
            <Ionicons name="help-circle-outline" size={24} color="#374151" />
            <Text style={{ marginLeft: 12, fontSize: 16, color: '#374151' }}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
          >
            <Ionicons name="document-text-outline" size={24} color="#374151" />
            <Text style={{ marginLeft: 12, fontSize: 16, color: '#374151' }}>Terms & Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </Card>

        <Card style={{ marginBottom: 24 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            <Text style={{ marginLeft: 12, fontSize: 16, color: '#ef4444' }}>Logout</Text>
          </TouchableOpacity>
        </Card>

        {/* App Version */}
        <Text style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginBottom: 24 }}>
          LocalMed v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}