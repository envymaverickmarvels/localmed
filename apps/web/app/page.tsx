import Link from 'next/link';
import { Search, MapPin, Clock, Shield, Truck, Bell } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="font-bold text-xl text-gray-900">LocalMed</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/search" className="text-gray-600 hover:text-gray-900 transition">
              Search
            </Link>
            <Link href="/pharmacies" className="text-gray-600 hover:text-gray-900 transition">
              Pharmacies
            </Link>
            <Link href="/login" className="btn-outline px-4 py-2">
              Login
            </Link>
            <Link href="/register" className="btn-primary px-4 py-2">
              Sign Up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              Find Medicines Near You
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Search for medicines and discover nearby pharmacies with stock in real-time.
              Reserve your medicines and pick them up hassle-free.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/search" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-blue-50 transition">
                Search Medicines
              </Link>
              <Link href="/prescription" className="bg-blue-500 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-400 transition border border-white/20">
                Upload Prescription
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search Preview */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="card p-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search for medicines..."
                    className="input w-full"
                    disabled
                  />
                </div>
                <button className="btn-primary px-6">Search</button>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Try: Paracetamol, Azithromycin, Omeprazole
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Search</h3>
              <p className="text-gray-600">
                Search for any medicine and find pharmacies near you with stock available.
              </p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Reserve</h3>
              <p className="text-gray-600">
                Reserve your medicines for 30 minutes. No more waiting in queues.
              </p>
            </div>
            <div className="card p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Pick Up</h3>
              <p className="text-gray-600">
                Navigate to the pharmacy and pick up your reserved medicines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <Truck className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="font-semibold mb-2">Home Delivery</h3>
              <p className="text-sm text-gray-600">
                Get your medicines delivered to your doorstep by verified riders.
              </p>
            </div>
            <div className="card p-6">
              <Shield className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="font-semibold mb-2">Verified Pharmacies</h3>
              <p className="text-sm text-gray-600">
                All pharmacies are verified to ensure authentic medicines.
              </p>
            </div>
            <div className="card p-6">
              <Bell className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="font-semibold mb-2">Notifications</h3>
              <p className="text-sm text-gray-600">
                Get notified when your reservation is confirmed or ready for pickup.
              </p>
            </div>
            <div className="card p-6">
              <Clock className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="font-semibold mb-2">24/7 Emergency</h3>
              <p className="text-sm text-gray-600">
                Emergency mode to find medicines from 24/7 pharmacies nearby.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Pharmacy Owners */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-4">For Pharmacy Owners</h2>
              <p className="text-gray-600 mb-6">
                Join LocalMed to reach more customers in your area. Manage your inventory,
                receive reservations, and grow your business.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">✓</span>
                  <span>Real-time inventory management</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">✓</span>
                  <span>Instant notifications for reservations</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">✓</span>
                  <span>Analytics and insights dashboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm">✓</span>
                  <span>Easy-to-use mobile dashboard</span>
                </li>
              </ul>
              <Link href="/pharmacy/register" className="btn-primary px-6 py-3">
                Register Your Pharmacy
              </Link>
            </div>
            <div className="flex-1">
              <div className="bg-gray-100 rounded-xl p-8">
                <div className="text-4xl font-bold text-blue-600 mb-2">500+</div>
                <div className="text-gray-600 mb-4">Pharmacies already registered</div>
                <div className="text-4xl font-bold text-green-600 mb-2">50K+</div>
                <div className="text-gray-600">Monthly reservations</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="font-bold">L</span>
                </div>
                <span className="font-bold text-xl">LocalMed</span>
              </div>
              <p className="text-gray-400 text-sm">
                Find medicines near you. Your health, our priority.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/search" className="hover:text-white transition">Search Medicines</Link></li>
                <li><Link href="/pharmacies" className="hover:text-white transition">Find Pharmacies</Link></li>
                <li><Link href="/prescription" className="hover:text-white transition">Upload Prescription</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Business</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/pharmacy/register" className="hover:text-white transition">Register Pharmacy</Link></li>
                <li><Link href="/rider/register" className="hover:text-white transition">Become a Rider</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} LocalMed. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}