'use client';

export default function AboutHero() {
  return (
    <header className="relative overflow-hidden pt-20 pb-32 lg:pt-32 lg:pb-48 bg-[#0F0F10]">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px]"></div>
        <div 
          className="w-full h-full opacity-20 mix-blend-overlay bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1459749411177-3c0714b62437?q=80&w=2070&auto=format&fit=crop")' }}
        ></div>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
            We Connect Fans to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00E5FF] to-purple-400">Rhythm of Life</span>
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-300">
            StageVerse is more than a ticketing platform. We are the digital heartbeat of the live music ecosystem, bridging the gap between iconic performances and the fans who live for them.
        </p>
      </div>
    </header>
  );
}