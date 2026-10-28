'use client';

export default function VisionSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-[#0F0F10]">
      <div className="absolute inset-0 bg-[#0F0F10]"></div>
      <div 
        className="absolute inset-0 opacity-[0.05]" 
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      ></div>
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-[#00E5FF] font-bold uppercase tracking-widest text-sm mb-4 block">The StageVerse Vision</span>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-8 leading-tight">
            Building the <span className="text-[#00E5FF]">meta-layer</span> for live events.
        </h2>
        <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            We envision a future where the boundary between physical and digital attendance dissolves. Where you can feel the bass in your chest whether you&apos;re in the front row or in your living room. We are building the infrastructure for the next generation of entertainment.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-12">
          <Stat number="2M+" label="Tickets Sold" />
          <Stat number="15k+" label="Events Hosted" />
          <Stat number="50+" label="Cities Active" />
          <Stat number="4.9" label="App Store Rating" />
        </div>
      </div>
    </section>
  );
}

function Stat({ number, label }) {
  return (
    <div>
      <div className="text-4xl font-bold text-white mb-1">{number}</div>
      <div className="text-sm text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}