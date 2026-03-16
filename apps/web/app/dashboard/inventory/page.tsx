'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Input, Badge, Spinner, Modal, EmptyState } from '@/components/ui';
import { Table, Pagination } from '@/components/table';
import { Search, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  medicine: {
    id: string;
    name: string;
    genericName: string | null;
    form: string;
    strength: string | null;
  };
  quantity: number;
  price: number;
  mrp: number;
  discountPercent: number;
  batchNumber: string | null;
  expiryDate: string | null;
  isActive: boolean;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search && { search }),
      });
      const response = await fetch(`/api/inventory?${params}`);
      return response.json();
    },
  });

  const inventory = data?.data?.inventory || [];
  const pagination = data?.data?.pagination;

  const columns = [
    {
      key: 'medicine.name',
      header: 'Medicine',
      render: (item: InventoryItem) => (
        <div>
          <p className="font-medium">{item.medicine.name}</p>
          {item.medicine.genericName && (
            <p className="text-sm text-gray-500">{item.medicine.genericName}</p>
          )}
          <p className="text-xs text-gray-400">
            {item.medicine.form} {item.medicine.strength}
          </p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock',
      render: (item: InventoryItem) => (
        <div>
          <p className={item.quantity < 10 ? 'text-red-600 font-medium' : ''}>
            {item.quantity}
          </p>
          {item.quantity < 10 && (
            <Badge variant="danger">Low Stock</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (item: InventoryItem) => (
        <div>
          <p className="font-medium">₹{item.price}</p>
          {item.discountPercent > 0 && (
            <p className="text-sm text-green-600">{item.discountPercent}% off</p>
          )}
          <p className="text-xs text-gray-400 line-through">₹{item.mrp}</p>
        </div>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry',
      render: (item: InventoryItem) => {
        if (!item.expiryDate) return <span className="text-gray-400">N/A</span>;
        const expiry = new Date(item.expiryDate);
        const now = new Date();
        const monthsUntilExpiry = Math.floor(
          (expiry.getTime() - now.getTime()) / (30 * 24 * 60 * 60 * 1000)
        );
        const isExpiringSoon = monthsUntilExpiry < 3;
        return (
          <div>
            <p className={isExpiringSoon ? 'text-red-600' : ''}>
              {expiry.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            </p>
            {isExpiringSoon && <Badge variant="danger">Expiring</Badge>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (item: InventoryItem) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(item);
              setShowEditModal(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(item);
              setShowDeleteModal(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-gray-500">Manage your medicine stock</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search medicines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10 w-full"
        />
      </div>

      {/* Alerts */}
      {data?.data?.alerts && data.data.alerts.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">
              {data.data.alerts.length} items need attention
            </span>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Spinner size="lg" />
          </div>
        ) : inventory.length === 0 ? (
          <EmptyState
            icon={<Package className="h-12 w-12" />}
            title="No inventory found"
            description={
              search
                ? 'Try a different search term'
                : 'Add your first medicine to get started'
            }
          />
        ) : (
          <>
            <Table
              columns={columns}
              data={inventory}
              keyExtractor={(item) => item.id}
            />
            {pagination && (
              <div className="p-4 border-t">
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  totalItems={pagination.total}
                />
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Medicine to Inventory"
        size="lg"
      >
        <AddMedicineForm
          onSuccess={() => {
            setShowAddModal(false);
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Inventory"
        size="md"
      >
        {selectedItem && (
          <EditInventoryForm
            item={selectedItem}
            onSuccess={() => {
              setShowEditModal(false);
              queryClient.invalidateQueries({ queryKey: ['inventory'] });
            }}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remove from Inventory"
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to remove {selectedItem?.medicine.name} from inventory?
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => {
            // Delete logic
            setShowDeleteModal(false);
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}>
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Add Medicine Form Component
function AddMedicineForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [formData, setFormData] = useState({
    quantity: '',
    price: '',
    mrp: '',
    discountPercent: '0',
    batchNumber: '',
    expiryDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: medicines, isFetching } = useQuery({
    queryKey: ['medicine-search', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return null;
      const response = await fetch(`/api/medicines/search?q=${encodeURIComponent(searchQuery)}`);
      return response.json();
    },
    enabled: searchQuery.length >= 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) return;

    setIsSubmitting(true);
    try {
      // Add inventory API call
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicineId: selectedMedicine.id,
          ...formData,
        }),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to add inventory:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Medicine Search */}
      <div>
        <label className="block text-sm font-medium mb-1">Medicine</label>
        {selectedMedicine ? (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">{selectedMedicine.name}</p>
              <p className="text-sm text-gray-500">{selectedMedicine.form}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMedicine(null)}>
              Change
            </Button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Search for medicine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full"
            />
            {isFetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
            {medicines?.data?.medicines?.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {medicines.data.medicines.map((med: any) => (
                  <button
                    key={med.id}
                    type="button"
                    onClick={() => {
                      setSelectedMedicine(med);
                      setSearchQuery('');
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50"
                  >
                    <p className="font-medium">{med.name}</p>
                    <p className="text-sm text-gray-500">{med.form} {med.strength}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stock Details */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Quantity"
          type="number"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
          required
        />
        <Input
          label="MRP (₹)"
          type="number"
          step="0.01"
          value={formData.mrp}
          onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Selling Price (₹)"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
        />
        <Input
          label="Discount (%)"
          type="number"
          value={formData.discountPercent}
          onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Batch Number"
          value={formData.batchNumber}
          onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
        />
        <Input
          label="Expiry Date"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!selectedMedicine || isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add to Inventory'}
        </Button>
      </div>
    </form>
  );
}

// Edit Inventory Form Component
function EditInventoryForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: InventoryItem;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    quantity: String(item.quantity),
    price: String(item.price),
    mrp: String(item.mrp),
    discountPercent: String(item.discountPercent),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch(`/api/inventory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to update inventory:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg mb-4">
        <p className="font-medium">{item.medicine.name}</p>
        <p className="text-sm text-gray-500">
          {item.medicine.form} {item.medicine.strength}
        </p>
      </div>

      <Input
        label="Quantity"
        type="number"
        value={formData.quantity}
        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="MRP (₹)"
          type="number"
          step="0.01"
          value={formData.mrp}
          onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
          required
        />
        <Input
          label="Selling Price (₹)"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
        />
      </div>

      <Input
        label="Discount (%)"
        type="number"
        value={formData.discountPercent}
        onChange={(e) => setFormData({ ...formData, discountPercent: e.target.value })}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}