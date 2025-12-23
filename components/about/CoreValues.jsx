'use client';

import { Music, Users, ShieldCheck } from 'lucide-react';

export default function CoreValues() {
  return (
    <section className="py-24 bg-[#0F0F10]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">What We Believe</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Our core values aren't just words on a wall. They are the riffs we play on repeat, guiding every feature we build and every partnership we make.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <ValueCard 
            icon={Music} 
            title="Music First" 
            text="Technology should amplify the experience, not distract from it. We design for the moment the lights go down and the first chord strikes."
          />
          
          <ValueCard 
            icon={Users} 
            title="Community Driven" 
            text="A concert is a shared experience. We build tools that help fans find their tribe, share their moments, and keep the energy alive long after the encore."
          />
          
          <ValueCard 
            icon={ShieldCheck} 
            title="Fair Play" 
            text="We are committed to transparent pricing and fighting scalpers. True fans deserve a fair shot at seeing their idols without breaking the bank."
          />

        </div>
      </div>
    </section>
  );
}

function ValueCard({ icon: Icon, title, text }) {
  return (
    <div className="group bg-[#18181B] p-8 rounded-2xl border border-white/5 hover:border-[#00E5FF]/50 transition-all duration-300 hover:-translate-y-1">
      <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#00E5FF] transition-colors duration-300">
        <Icon className="w-8 h-8 text-white group-hover:text-black" />
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{text}</p>
    </div>
  );
}