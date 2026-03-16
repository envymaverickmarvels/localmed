import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { prescriptionApi } from '@/lib/api-client';
import { Card, Badge, Spinner, Button } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

export default function PrescriptionsScreen() {
  const [uploading, setUploading] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: () => prescriptionApi.getMyPrescriptions(),
  });

  const prescriptions = data?.data?.prescriptions || [];

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'danger' | 'default'> = {
    UPLOADED: 'warning',
    PROCESSING: 'info',
    PROCESSED: 'success',
    FAILED: 'danger',
  };

  const pickImage = async () => {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (!result.granted) {
      alert('Camera permission is required to upload prescriptions');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      await uploadPrescription(pickerResult.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (!result.granted) {
      alert('Camera permission is required to take photos');
      return;
    }

    const pickerResult = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]) {
      await uploadPrescription(pickerResult.assets[0].uri);
    }
  };

  const uploadPrescription = async (uri: string) => {
    setUploading(true);
    try {
      await prescriptionApi.upload(uri);
      refetch();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload prescription. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ padding: 16, backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Prescriptions</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          Upload and track your prescriptions
        </Text>
      </View>

      {/* Upload Buttons */}
      <View style={{ padding: 16, backgroundColor: '#ffffff' }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button
            title="Take Photo"
            onPress={takePhoto}
            loading={uploading}
            style={{ flex: 1 }}
          />
          <Button
            title="Upload"
            variant="outline"
            onPress={pickImage}
            loading={uploading}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Prescriptions List */}
      <FlatList
        data={prescriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
              <Spinner size="lg" />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 }}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 }}>
                No Prescriptions
              </Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                Upload a prescription to get started
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Badge variant={statusColors[item.status]}>{item.status}</Badge>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {item.extractedMedicines && item.extractedMedicines.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>
                  Medicines Found:
                </Text>
                {item.extractedMedicines.slice(0, 3).map((med: any, index: number) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="medical" size={14} color="#2563eb" />
                    <Text style={{ marginLeft: 8, fontSize: 14, color: '#374151' }}>{med.name}</Text>
                    {med.confidence && (
                      <Text style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>
                        {Math.round(med.confidence * 100)}% match
                      </Text>
                    )}
                  </View>
                ))}
                {item.extractedMedicines.length > 3 && (
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    +{item.extractedMedicines.length - 3} more
                  </Text>
                )}
              </View>
            )}

            {item.status === 'PROCESSED' && (
              <TouchableOpacity
                style={{
                  marginTop: 12,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 8,
                  backgroundColor: '#2563eb',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '500' }}>Search Pharmacies</Text>
              </TouchableOpacity>
            )}
          </Card>
        )}
      />
    </View>
  );
}