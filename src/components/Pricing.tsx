"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PRICING } from "@/lib/constants";
import { useAuth } from "../../app/AuthContext";
import LicenseInfoModal from "./LicenseInfoModal";

export default function Pricing() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState<string>("");
  const [existingLicense, setExistingLicense] = useState<any>(null);

  const handleCheckout = async (licenseType: 'trial' | 'lifetime') => {
    setShowError("");
    
    if (!user?.id) {
      router.push(`/auth/signup?plan=${licenseType}`);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          licenseType,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Checkout failed');
      }

      if (data.checkoutUrl) {
        // Redirect to Polar checkout
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setShowError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Try free for 7 days. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Trial Card */}
          <div className="p-8 rounded-xl border-2 border-gray-200 hover:border-blue-200 transition hover:shadow-lg">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-gray-900">{PRICING.TRIAL.name}</h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">
                  {PRICING.TRIAL.price}
                </span>
                <span className="ml-2 text-xl text-gray-600">
                  for {PRICING.TRIAL.duration}
                </span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {PRICING.TRIAL.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('trial')}
              disabled={loading}
              className="block w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : PRICING.TRIAL.cta}
            </button>

            {showError && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                ✕ {showError}
              </div>
            )}
          </div>

          {/* Lifetime Card (Featured) */}
          <div className="relative p-8 rounded-xl border-2 border-blue-600 bg-blue-50 shadow-xl transform hover:scale-105 transition">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </span>
            </div>

            <div className="mb-4">
              <h3 className="text-2xl font-bold text-gray-900">
                {PRICING.LIFETIME.name}
              </h3>
              <div className="mt-4 flex items-baseline">
                <span className="text-5xl font-bold text-gray-900">
                  {PRICING.LIFETIME.currency}
                  {PRICING.LIFETIME.price}
                </span>
                <span className="ml-2 text-xl text-gray-600">one-time</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {PRICING.LIFETIME.features.map((feature, index) => (
                <li key={index} className="flex items-center space-x-3">
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('lifetime')}
              disabled={loading}
              className="block w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : PRICING.LIFETIME.cta}
            </button>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-center text-sm text-gray-600 mt-8">
          * Multi-device support coming soon
        </p>
      </div>

      {/* License Info Modal */}
      <LicenseInfoModal
        isOpen={!!existingLicense}
        onClose={() => setExistingLicense(null)}
        licenseInfo={existingLicense}
        userEmail={user?.email}
      />
    </section>
  );
}
