'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Input, Spinner } from '@/components/ui';
import { Save, Store, MapPin, Clock } from 'lucide-react';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    deliveryAvailable: false,
    deliveryRadius: '',
  });

  // Fetch pharmacy settings
  useQuery({
    queryKey: ['pharmacy-settings'],
    queryFn: async () => {
      const response = await fetch('/api/pharmacy/my');
      const data = await response.json();
      if (data.success) {
        setFormData({
          name: data.data.pharmacy.name || '',
          description: data.data.pharmacy.description || '',
          phone: data.data.pharmacy.phone || '',
          email: data.data.pharmacy.email || '',
          address: data.data.pharmacy.address || '',
          city: data.data.pharmacy.city || '',
          state: data.data.pharmacy.state || '',
          pincode: data.data.pharmacy.pincode || '',
          deliveryAvailable: data.data.pharmacy.deliveryAvailable || false,
          deliveryRadius: data.data.pharmacy.deliveryRadius || '',
        });
      }
      return data;
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save settings
      await fetch('/api/pharmacy/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      // Show success message
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOperatingHours = async (hours: any) => {
    try {
      await fetch('/api/pharmacy/my/hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
    } catch (error) {
      console.error('Failed to save operating hours:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your pharmacy information</p>
      </div>

      {/* Pharmacy Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Store className="h-5 w-5" />
          Pharmacy Information
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Pharmacy Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of your pharmacy"
          />
        </div>

        <h3 className="text-sm font-semibold mt-6 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Address
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Street Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="md:col-span-2"
          />
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Pincode"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            />
          </div>
        </div>

        <h3 className="text-sm font-semibold mt-6 mb-3">Delivery Options</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.deliveryAvailable}
              onChange={(e) =>
                setFormData({ ...formData, deliveryAvailable: e.target.checked })
              }
              className="w-4 h-4 rounded border-gray-300"
            />
            <span>Offer home delivery</span>
          </label>
          {formData.deliveryAvailable && (
            <Input
              label="Delivery Radius (km)"
              type="number"
              value={formData.deliveryRadius}
              onChange={(e) =>
                setFormData({ ...formData, deliveryRadius: e.target.value })
              }
            />
          )}
        </div>
      </Card>

      {/* Operating Hours */}
      <OperatingHoursCard onSave={handleSaveOperatingHours} />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}

function OperatingHoursCard({ onSave }: { onSave: (hours: any) => void }) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [hours, setHours] = useState(
    days.map((day) => ({
      dayOfWeek: days.indexOf(day),
      openTime: '09:00',
      closeTime: '21:00',
      is24Hours: false,
      isClosed: day === 'Sunday',
    }))
  );

  const { isLoading } = useQuery({
    queryKey: ['operating-hours'],
    queryFn: async () => {
      const response = await fetch('/api/pharmacy/my/hours');
      const data = await response.json();
      if (data.success && data.data.hours) {
        setHours(
          days.map((day, index) => {
            const existing = data.data.hours.find((h: any) => h.dayOfWeek === index);
            return existing || hours[index];
          })
        );
      }
      return data;
    },
  });

  const updateHour = (index: number, field: string, value: any) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleSave = async () => {
    await onSave(hours);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Operating Hours
      </h2>
      <div className="space-y-3">
        {days.map((day, index) => (
          <div key={day} className="flex items-center gap-4">
            <div className="w-24">
              <span className="font-medium">{day}</span>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hours[index].isClosed}
                onChange={(e) => updateHour(index, 'isClosed', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm">Closed</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hours[index].is24Hours}
                onChange={(e) => updateHour(index, 'is24Hours', e.target.checked)}
                disabled={hours[index].isClosed}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm">24 Hours</span>
            </label>
            {!hours[index].isClosed && !hours[index].is24Hours && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={hours[index].openTime}
                  onChange={(e) => updateHour(index, 'openTime', e.target.value)}
                  className="input w-28"
                />
                <span>to</span>
                <input
                  type="time"
                  value={hours[index].closeTime}
                  onChange={(e) => updateHour(index, 'closeTime', e.target.value)}
                  className="input w-28"
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave}>Save Hours</Button>
      </div>
    </Card>
  );
}