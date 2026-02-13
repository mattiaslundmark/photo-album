'use client';

import Link from 'next/link';
import { useAuth } from './AuthProvider';

export default function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-lg font-semibold tracking-tight text-gray-700">
            Photo Album
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            {loading ? (
              <span className="text-gray-400">...</span>
            ) : user ? (
              <>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Manage
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
