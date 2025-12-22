'use client';
import { MapPin, ArrowRight, Ticket, AlertTriangle, Heart, TrendingUp, Sun, DollarSign, BarChart3, ChevronRight, CheckCircle } from 'lucide-react';

// 1. Live Show Hero Card
export function LiveShowCard({ data }) {
  if (!data) return null; // Safety check

  return (
    <div className="lg:col-span-2 relative group overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 h-full min-h-[400px]">
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
        style={{ backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 100%), url("${data.image}")` }}
      />
      <div className="relative z-10 flex flex-col h-full justify-between p-6 md:p-10">
        <div className="flex justify-between items-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white uppercase tracking-wider border border-white/10 shadow-lg">
            <span className={`h-2 w-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${data.isLive ? 'bg-[#0d93f2] text-[#0d93f2]' : 'bg-gray-400 text-gray-400'}`}></span>
            {data.statusLabel}
          </span>
          <div className="flex flex-col items-end text-right bg-black/20 backdrop-blur-sm p-3 rounded-lg border border-white/5">
            <p className="text-white/80 text-xs uppercase tracking-widest font-bold mb-1">Local Time</p>
            <p className="text-white text-2xl font-bold font-display tabular-nums">{data.localTime}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-white tracking-tighter text-5xl md:text-7xl font-bold leading-none uppercase">{data.city}</h2>
            <div className="flex items-center gap-2 text-[#0d93f2] text-xl md:text-2xl font-medium">
              <MapPin className="w-6 h-6 fill-none" />
              {data.venue}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-white/10">
            <div className="flex gap-8">
              <div className="flex flex-col">
                <span className="text-white/60 text-xs uppercase tracking-wider mb-1">Doors Open</span>
                <span className="text-white font-bold text-lg">{data.doorsOpen}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-white/60 text-xs uppercase tracking-wider mb-1">Show Start</span>
                <span className="text-white font-bold text-lg">{data.showStart}</span>
              </div>
            </div>
            <button className="flex items-center justify-center gap-3 rounded-xl h-14 px-8 bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white font-bold tracking-wide transition-all shadow-[0_0_30px_rgba(13,147,242,0.4)] hover:shadow-[0_0_40px_rgba(13,147,242,0.6)] transform hover:-translate-y-0.5">
              <span>VIEW DAY SHEET</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Ticket Sales Component
export function TicketStatsCard({ data }) {
  if (!data) return null;

  // Calculate generic percentage string for style width
  const percentStyle = `${data.percentage}%`;

  return (
    <div className="flex-1 bg-white dark:bg-[#223949] rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-center gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-800 dark:text-white">
          <div className="p-2 rounded-lg bg-[#0d93f2]/10 text-[#0d93f2]">
            <Ticket className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold">Tickets Sold</h3>
        </div>
        <span className={`border text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${data.soldOut ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'}`}>
          {data.soldOut ? 'Sold Out' : 'Selling Fast'}
        </span>
      </div>
      <div>
        <div className="flex justify-between items-end mb-3">
          <span className="text-5xl font-bold text-slate-900 dark:text-white tracking-tight">{data.percentage}%</span>
          <span className="text-slate-500 dark:text-slate-400 font-medium mb-1.5">
            {data.sold.toLocaleString()} / {data.capacity.toLocaleString()}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-4 overflow-hidden shadow-inner">
          <div className="bg-gradient-to-r from-[#0d93f2] to-blue-400 h-4 rounded-full relative overflow-hidden" style={{ width: percentStyle }}>
            <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#f5f7f8] dark:bg-[#101b23] p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">VIP</p>
          <p className="text-slate-900 dark:text-white text-xl font-bold">{data.vipPercent}%</p>
        </div>
        <div className="bg-[#f5f7f8] dark:bg-[#101b23] p-4 rounded-xl border border-slate-200 dark:border-slate-700/50">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">GA</p>
          <p className="text-slate-900 dark:text-white text-xl font-bold">{data.gaPercent}%</p>
        </div>
      </div>
    </div>
  );
}

// 3. Merch Alert
export function MerchAlert({ data }) {
  if (!data || !data.active) return null; // Don't render if no alert

  return (
    <div className="bg-red-50 dark:bg-[#f03e3e]/10 border border-red-100 dark:border-[#f03e3e]/20 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
      <div className="bg-red-100 dark:bg-[#f03e3e]/20 p-2.5 rounded-xl text-red-600 dark:text-[#f03e3e] flex-shrink-0">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div>
        <h4 className="text-red-700 dark:text-[#f03e3e] font-bold text-sm uppercase tracking-wide mb-1">
          {data.title}
        </h4>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          {data.message} <strong className="text-slate-900 dark:text-white font-bold">{data.highlight}</strong>
        </p>
      </div>
    </div>
  );
}

// 4. Quick Stats Row
export function StatGrid({ data }) {
  const iconMap = {
    Heart: Heart,
    Sun: Sun,
    DollarSign: DollarSign,
    BarChart3: BarChart3
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.map((stat, i) => {
        const IconComponent = iconMap[stat.iconName] || BarChart3;
        
        return (
          <div key={i} className="bg-white dark:bg-[#223949] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-sm hover:border-[#0d93f2]/30 transition-colors">
            <div className="flex items-center gap-2 text-slate-400">
              <IconComponent className="w-5 h-5" />
              <span className="text-sm font-medium">{stat.label}</span>
            </div>
            <p className="text-slate-900 dark:text-white text-3xl font-bold tracking-tight">{stat.value}</p>
            
            {stat.trend ? (
               <p className="text-green-500 text-sm font-bold flex items-center gap-1 bg-green-500/10 w-fit px-2 py-1 rounded">
                  <TrendingUp className="w-3 h-3" />
                  {stat.sub}
               </p>
            ) : (
              <p className={`${stat.success ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'} text-sm font-medium ${!stat.success ? 'bg-slate-100 dark:bg-slate-700/50 w-fit px-2 py-1 rounded' : ''}`}>
                {stat.sub}
              </p>
            )}
          </div>
        )
      })}
    </div>
  );
}

// 5. Upcoming Stops
export function UpcomingStops({ data }) {
  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-slate-900 dark:text-white text-xl font-bold">Upcoming Stops</h3>
        <a className="text-[#0d93f2] text-sm font-bold hover:text-[#0d93f2]/80 flex items-center gap-1 group" href="#">
           VIEW FULL ROUTING
           <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {data.map((stop, i) => (
          <div key={i} className="bg-white dark:bg-[#223949] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 group cursor-pointer hover:border-[#0d93f2]/50 transition-all hover:shadow-md">
            <div className="bg-slate-50 dark:bg-[#101b23] w-14 h-14 flex flex-col items-center justify-center rounded-xl flex-shrink-0 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stop.month}</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white leading-none mt-0.5">{stop.date}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-slate-900 dark:text-white font-bold truncate text-lg">{stop.city}</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm truncate">{stop.venue}</p>
            </div>
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 group-hover:bg-[#0d93f2] group-hover:text-white transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}