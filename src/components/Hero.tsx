"use client";

import Link from "next/link";
import DownloadButton from "./DownloadButton";

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Your Voice,{" "}
                <span className="text-blue-600">Perfectly Transcribed</span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
                AI-powered voice-to-text that understands context, accents, and
                technical terms. Transcribe instantly, locally, and securely.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <DownloadButton className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-center">
                Download Now
              </DownloadButton>
              <Link
                href="/auth/signup"
                className="px-8 py-4 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold text-center"
              >
                Create Account
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row gap-8 pt-4">
              <div>
                <div className="text-2xl font-bold text-gray-900">100%</div>
                <div className="text-sm text-gray-600">Privacy Local</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">7 Days</div>
                <div className="text-sm text-gray-600">Free Trial</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">$49</div>
                <div className="text-sm text-gray-600">Lifetime License</div>
              </div>
            </div>
          </div>

          {/* Right: Hero Image Placeholder */}
          <div className="flex items-center justify-center">
            <div className="w-full aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
              <div className="text-center space-y-4">
                <svg
                  className="w-24 h-24 mx-auto text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 19V5m0 0a7 7 0 010 14m0-14a7 7 0 000 14m0 0h7m-7 0H5"
                  />
                </svg>
                <p className="text-blue-600 font-medium">Hero Image Placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
