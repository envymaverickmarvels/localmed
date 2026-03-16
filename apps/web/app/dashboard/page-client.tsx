import DashboardGuard from './page-wrapper';

export default function DashboardPage() {
  return (
    <DashboardGuard>
      <DashboardContent />
    </DashboardGuard>
  );
}

function DashboardContent() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Stats will be added */}
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-500">Welcome!</div>
          <div className="text-2xl font-bold">Pharmacy Dashboard</div>
        </div>
      </div>
    </div>
  );
}