'use client';

import React from 'react';
import { formatLocalDate } from '@/lib/timezone-utils';

interface LicenseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseInfo?: {
    type: string;
    createdAt: string;
    expiresAt: string | null;
    licenseKey?: string;
  };
  userEmail?: string;
}

export default function LicenseInfoModal({
  isOpen,
  onClose,
  licenseInfo,
  userEmail,
}: LicenseInfoModalProps) {
  if (!isOpen || !licenseInfo) return null;

  const expiresDate = licenseInfo.expiresAt
    ? formatLocalDate(licenseInfo.expiresAt)
    : 'Never';
  const createdDate = formatLocalDate(licenseInfo.createdAt);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {licenseInfo.type === 'lifetime' ? '🎉 Lifetime License Active' : '⏱️ Trial License Active'}
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">License Type</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {licenseInfo.type}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Created</p>
            <p className="text-lg font-semibold text-gray-900">{createdDate}</p>
          </div>

          {licenseInfo.type === 'trial' && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Expires</p>
              <p className="text-lg font-semibold text-gray-900">{expiresDate}</p>
            </div>
          )}

          {licenseInfo.licenseKey && (
            <div>
              <p className="text-sm text-gray-600 mb-1">License Key</p>
              <div className="p-3 bg-gray-100 rounded font-mono text-sm break-all">
                {licenseInfo.licenseKey}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
          <p className="text-sm text-blue-900">
            📧 A confirmation email with your license key has been sent to{' '}
            <span className="font-semibold">{userEmail}</span>. Please check your inbox and spam
            folder.
          </p>
        </div>

        {licenseInfo.type === 'trial' && (
          <div className="bg-purple-50 border border-purple-200 rounded p-4 mb-6">
            <p className="text-sm text-purple-900 font-semibold mb-2">Want unlimited access?</p>
            <p className="text-sm text-purple-900 mb-3">
              Upgrade to a Lifetime License for just $49 - valid forever!
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Got It, Thanks!
        </button>
      </div>
    </div>
  );
}
