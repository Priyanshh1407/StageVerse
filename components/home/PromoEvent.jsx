'use client';

import { Sparkles, DollarSign } from 'lucide-react';

export default function PromoSection() {
  return (
    <section className="py-24 bg-black relative">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row gap-12 items-center bg-[#141414] rounded-3xl p-8 lg:p-12 border border-white/5">
          
          {}
          <div className="lg:w-1/2 w-full">
            <div className="rounded-xl overflow-hidden aspect-video relative">
              {}
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop" 
                alt="Dashboard BG" 
                className="w-full h-full object-cover opacity-80" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full bg-gradient-to-r from-[#141414] to-transparent absolute inset-0"></div>
              </div>
              
              {}
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop" 
                alt="Analytics" 
                className="absolute top-0 right-0 w-2/3 h-full object-cover object-left" 
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black)' }}
              />
            </div>
          </div>

          {}
          <div className="lg:w-1/2 w-full space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
              Manage Your Event. <br/>
              <span className="text-[#00d4ff]">Seamlessly.</span>
            </h2>
            
            <div className="flex items-start gap-3 text-slate-300">
              <Sparkles className="w-6 h-6 text-[#00d4ff] mt-1 shrink-0" />
              <p className="text-lg">Use our AI powered assistant to write compelling event descriptions in seconds and automate your workflows.</p>
            </div>
            
            <div className="flex items-start gap-3 text-slate-300">
              <DollarSign className="w-6 h-6 text-[#00d4ff] mt-1 shrink-0" />
              <p className="text-lg">Transparent ticketing with instant payouts and comprehensive analytics.</p>
            </div>
            
            <div className="pt-4">
              <button className="px-8 py-3 rounded-lg border border-[#00d4ff]/50 text-[#00d4ff] font-bold hover:bg-[#00d4ff] hover:text-black transition-all uppercase tracking-wide">
                Become a Partner
              </button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}