'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../app/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatLocalDate, formatLocalDateTime, isDateExpired, getDaysRemaining } from '@/lib/timezone-utils';

interface License {
  id: string;
  license_key: string;
  key_type: string;
  expires_at: string | null;
  created_at: string;
  is_activated: boolean;
  activated_at: string | null;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [license, setLicense] = useState<License | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      } else {
        setUserProfile(profileData);
      }

      // Fetch active license (most recent non-expired)
      const { data: licenseData, error: licenseError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (licenseError && licenseError.code !== 'PGRST116') {
        console.error('Error fetching license:', licenseError);
      } else if (licenseData) {
        setLicense(licenseData);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = license && license.expires_at && isDateExpired(license.expires_at);
  const isLifetime = license?.key_type === 'lifetime';
  const isTrial = license?.key_type === 'trial';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Viberyt</span>
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition font-medium"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Your Dashboard</h1>
              <p className="text-gray-600 mb-2">
                Email: <span className="font-medium">{user.email}</span>
              </p>
              {userProfile?.subscription_type && (
                <p className="text-gray-600">
                  Subscription: <span className="font-medium capitalize">{userProfile.subscription_type}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              title="Refresh data"
            >
              {refreshing ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          <div className="space-y-8">
            {/* License Key Display - Show First */}
            {license && (
              <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your License Key</h2>
                <div className="mb-4 p-4 bg-white rounded border border-green-200 font-mono text-sm break-all">
                  {license.license_key}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(license.license_key);
                    alert('License key copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                >
                  📋 Copy License Key
                </button>
              </div>
            )}

            {/* Subscription Status */}
            <div className={`p-6 rounded-lg border ${
              isLifetime
                ? 'bg-green-50 border-green-200'
                : isTrial
                ? 'bg-blue-50 border-blue-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Subscription Status</h2>
              {isLifetime ? (
                <div>
                  <p className="text-green-700 font-medium mb-2">✓ Lifetime License</p>
                  <p className="text-gray-600">You have unlimited access to VibeRyt</p>
                </div>
              ) : isTrial && !isExpired ? (
                <div>
                  <p className="text-blue-700 font-medium mb-2">⏱️ Trial Active</p>
                  <p className="text-gray-600 mb-2">
                    Expires on: <span className="font-medium">
                      {license?.expires_at ? formatLocalDate(license.expires_at) : 'N/A'}
                    </span>
                  </p>
                  <p className="text-sm text-blue-600">
                    {getDaysRemaining(license?.expires_at)} days remaining
                  </p>
                </div>
              ) : isTrial && isExpired ? (
                <div>
                  <p className="text-yellow-700 font-medium mb-2">⚠️ Trial Expired</p>
                  <p className="text-gray-600">Your trial ended on {license?.expires_at ? formatLocalDate(license.expires_at) : 'N/A'}</p>
                </div>
              ) : (
                <p className="text-gray-600">No active license</p>
              )}
            </div>

            {/* Upgrade Option */}
            {!isLifetime && (
              <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Get Started with VibeRyt</h2>
                <p className="text-gray-600 mb-6">
                  Choose how you'd like to start using VibeRyt
                </p>
                <div className="flex gap-4">
                  <Link
                    href="/#pricing"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-center"
                  >
                    🆓 Start a Trial
                  </Link>
                  <Link
                    href="/#pricing"
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-center"
                  >
                    ⭐ Get a Lifetime License
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
