'use client';

import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="py-20 bg-[#0F0F10]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-12 relative overflow-hidden border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#00E5FF]/10 rounded-full blur-[80px]"></div>
          <h2 className="text-3xl font-bold text-white mb-6 relative z-10">Ready to join the Verse?</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto relative z-10">
              Discover upcoming events, follow your favorite artists, and never miss a beat. Join thousands of music lovers today.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
            <Link href="/signup">
              <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-full font-bold text-lg transition-transform transform hover:scale-105 shadow-[0_0_20px_rgba(0,229,255,0.25)]">
                  Create Free Account
              </button>
            </Link>
            <Link href="/explore">
              <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-full font-bold text-lg transition-transform transform hover:scale-105 shadow-[0_0_20px_rgba(0,229,255,0.25)]">
                  Explore Events
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}