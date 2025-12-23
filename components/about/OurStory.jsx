'use client';

export default function OurStory() {
  return (
    <section className="py-20 bg-[#0F0F10] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          <div className="relative mb-12 lg:mb-0">
            <div className="absolute -top-4 -left-4 w-24 h-24 border-t-4 border-l-4 border-[#00E5FF] opacity-50"></div>
            <img 
              alt="Backstage view of a concert" 
              className="rounded-lg shadow-2xl w-full object-cover h-[500px] grayscale hover:grayscale-0 transition-all duration-500" 
              src="https://images.unsplash.com/photo-1501612780327-45045538702b?q=80&w=2070&auto=format&fit=crop"
            />
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-4 border-r-4 border-[#00E5FF] opacity-50"></div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-px w-8 bg-[#00E5FF]"></span>
              <span className="text-[#00E5FF] font-bold uppercase tracking-widest text-sm">Our Story</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">From Garage Gigs to Global Stages</h2>
            <div className="prose prose-lg prose-invert text-gray-400">
              <p className="mb-6">
                StageVerse was born in 2020, a year when the lights went out on stages around the world. We realized that the connection between artist and audience was fragile, relying on outdated systems that didn't serve the modern fan.
              </p>
              <p className="mb-6">
                We started with a simple idea: make discovery intuitive and access seamless. No hidden fees, no confusing queues—just music. What began as a small project to help local indie bands manage bookings has exploded into a global platform hosting millions of fans.
              </p>
              <p>
                Today, we are a team of musicians, engineers, and dreamers working from 12 different countries, united by a single obsession: the perfect show.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}