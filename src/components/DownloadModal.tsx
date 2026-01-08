'use client';

import { useState } from 'react';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DownloadModal({ isOpen, onClose }: DownloadModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Download Started!
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-6">
            Your VibeRyt download has started. To activate the app, you'll need a license key.
          </p>

          {/* CTA */}
          <div className="space-y-3">
            <a
              href="/auth/signup"
              className="block w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign Up for Free License Key
            </a>
            <button
              onClick={onClose}
              className="block w-full bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              I'll Sign Up Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
