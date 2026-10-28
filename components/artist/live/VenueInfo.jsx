'use client';
export default function VenueInfo() {
  return (
    <div className="bg-white dark:bg-[#15232d] rounded-xl border border-slate-200 dark:border-[#223949] overflow-hidden shadow-sm h-[200px] relative group">
      {}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:opacity-40 transition-opacity" 
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop")' }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#15232d] via-transparent to-transparent"></div>
      
      <div className="absolute bottom-0 left-0 p-4 w-full">
        <p className="text-xs text-[#90b2cb] font-bold uppercase tracking-wider mb-1">Venue Connection</p>
        <div className="flex justify-between items-end">
          <p className="text-white font-bold text-lg">SoFi Stadium Net A</p>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
        </div>
      </div>
    </div>
  );
}