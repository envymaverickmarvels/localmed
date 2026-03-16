'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthContext } from '@/components/auth-provider';
import {
  Search,
  MapPin,
  Package,
  User,
  LogIn,
  Bell,
} from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
}

export function MainLayout({ children, showSearch = false }: MainLayoutProps) {
  const { user, isAuthenticated, logout } = useAuthContext();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">L</span>
              </div>
              <span className="font-bold text-xl hidden sm:block">LocalMed</span>
            </Link>

            {/* Search */}
            {showSearch && (
              <div className="flex-1 max-w-xl mx-4 hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for medicines..."
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex items-center gap-2">
              <Link
                href="/search"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <Search className="h-5 w-5" />
                <span className="hidden sm:inline">Search</span>
              </Link>
              <Link
                href="/pharmacies"
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <MapPin className="h-5 w-5" />
                <span className="hidden sm:inline">Pharmacies</span>
              </Link>

              {isAuthenticated ? (
                <>
                  <Link
                    href="/reservations"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  >
                    <Package className="h-5 w-5" />
                    <span className="hidden sm:inline">Orders</span>
                  </Link>
                  <Link
                    href="/notifications"
                    className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  >
                    <Bell className="h-5 w-5" />
                  </Link>
                  <div className="relative group">
                    <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        {user?.name?.charAt(0) || <User className="h-5 w-5" />}
                      </div>
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <div className="p-3 border-b">
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.phone}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/profile"
                          className="block px-3 py-2 rounded hover:bg-gray-100"
                        >
                          Profile
                        </Link>
                        {user?.role === 'PHARMACY_OWNER' && (
                          <Link
                            href="/dashboard"
                            className="block px-3 py-2 rounded hover:bg-gray-100"
                          >
                            Pharmacy Dashboard
                          </Link>
                        )}
                        {user?.role === 'RIDER' && (
                          <Link
                            href="/rider/dashboard"
                            className="block px-3 py-2 rounded hover:bg-gray-100"
                          >
                            Rider Dashboard
                          </Link>
                        )}
                        <button
                          onClick={logout}
                          className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-red-600"
                        >
                          Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  >
                    <LogIn className="h-5 w-5" />
                    <span className="hidden sm:inline">Login</span>
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="font-bold">L</span>
                </div>
                <span className="font-bold">LocalMed</span>
              </div>
              <p className="text-gray-400 text-sm">
                Find medicines near you. Your health, our priority.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/search" className="hover:text-white">Search Medicines</Link></li>
                <li><Link href="/pharmacies" className="hover:text-white">Find Pharmacies</Link></li>
                <li><Link href="/prescription" className="hover:text-white">Upload Prescription</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Business</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/pharmacy/register" className="hover:text-white">Register Pharmacy</Link></li>
                <li><Link href="/rider/register" className="hover:text-white">Become a Rider</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
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