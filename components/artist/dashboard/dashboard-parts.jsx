'use client';
import { MapPin, ArrowRight, Ticket, AlertTriangle, Heart, TrendingUp, Sun, DollarSign, BarChart3, ChevronRight, CheckCircle } from 'lucide-react';

// 1. Live Show Hero Card
export function LiveShowCard({ data }) {
  if (!data) return null; // Safety check

  return (
    <div className="relative group overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10 h-full min-h-[400px]">
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

          </div>
        </div>
      </div>
    </div>
  );
}

// 2. Ticket Sales Component (Wide/Rectangular)
export function TicketStatsCard({ data }) {
  if (!data) return null;

  const percentStyle = `${data.percentage}%`;

  return (
    <div className="w-full bg-white dark:bg-[#223949] rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-8 items-center justify-between">

      {/* Left: Main Progress */}
      <div className="flex-1 w-full flex flex-col gap-4">
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
          <div className="flex justify-between items-end mb-2">
            <span className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{data.percentage}%</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              {data.sold.toLocaleString()} / {data.capacity.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-3 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-[#0d93f2] to-blue-400 h-3 rounded-full relative overflow-hidden" style={{ width: percentStyle }}>
              <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Breakdown Stats */}
      <div className="flex w-full md:w-auto gap-4 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700 pt-4 md:pt-0 md:pl-8">
        <div className="flex-1 text-center min-w-[100px]">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">VIP Tiers</p>
          <p className="text-slate-900 dark:text-white text-2xl font-bold">{data.vipPercent}%</p>
          <p className="text-xs text-green-500 font-bold">High Yield</p>
        </div>
        <div className="flex-1 text-center min-w-[100px]">
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">GA Floor</p>
          <p className="text-slate-900 dark:text-white text-2xl font-bold">{data.gaPercent}%</p>
          <p className="text-xs text-slate-400 font-bold">Standard</p>
        </div>
      </div>
    </div>
  );
}

// 3. Merch / Alert Box
export function MerchAlert({ data, onClick }) {
  // This looks like a component prop, not a direct alert call inside logic.
  // Checking previous grep... "onClick={() => alert(...)}" ?
  // Grep said line 110: export function MerchAlert({ data, onClick }) { ... matches "alert(" ? No.
  // Wait, the grep output was:
  // {"File":"...dashboard-parts.jsx","LineNumber":110,"LineContent":"export function MerchAlert({ data, onClick }) {"}
  // Why did it match? Maybe "Alert" in MerchAlert?
  // Ah, grep was case insensitive `alert(`. 
  // "MerchAlert" matches.
  // I should check if there is actual alert usage inside.
  // The grep didn't show usage for this file other than the definition line which is a false positive if I'm not careful.
  // Let's Skip this file unless I see actual usage.
  // Grep match: "MerchAlert" -> "Alert" is part of the name.

  if (!data || !data.active) return null;

  const colorMap = {
    critical: "bg-red-500 text-white",
    warning: "bg-amber-500 text-white",
    info: "bg-[#0d93f2] text-white"
  };

  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={`${colorMap[data.type] || colorMap.info} p-6 rounded-2xl shadow-lg relative overflow-hidden group ${isClickable ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all' : ''}`}
    >
      <div className="relative z-10 flex flex-col md:flex-row h-full items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <h3 className="text-xl font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            {data.title}
          </h3>
          <p className="opacity-90 text-sm font-medium leading-relaxed">
            {data.message} <strong className="font-bold border-b border-white/40 pb-0.5 whitespace-nowrap">{data.highlight}</strong>
          </p>
        </div>
        {isClickable && (
          <button className="bg-white/20 hover:bg-white/30 text-white px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap backdrop-blur-sm transition-colors flex items-center gap-2 shadow-sm">
            View & Resolve <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Decorative bg elements */}
      <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/20 transition-colors"></div>
    </div>
  );
}

// 4. Quick Stats Row
export function StatGrid({ data, onAction }) {
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
        const isActionable = !!stat.action;

        return (
          <div
            key={i}
            onClick={() => isActionable && onAction && onAction(stat.action)}
            className={`bg-white dark:bg-[#223949] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-3 shadow-sm transition-all
                ${isActionable ? 'cursor-pointer hover:border-[#0d93f2] hover:shadow-lg hover:-translate-y-1' : 'hover:border-[#0d93f2]/30'}
            `}
          >
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

// 5. Upcoming Stops (All Concerts)
export function UpcomingStops({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-slate-900 dark:text-white text-xl font-bold">All Upcoming Concerts</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {data.map((stop, i) => (
          <div key={i} className="bg-white dark:bg-[#223949] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 group cursor-pointer hover:border-[#0d93f2]/50 transition-all hover:shadow-md relative overflow-hidden">
            {/* Ticket Progress Stripe */}
            <div className="absolute bottom-0 left-0 h-1 bg-slate-100 dark:bg-slate-700 w-full">
              <div className="h-full bg-[#0d93f2]" style={{ width: `${stop.percentSold || 0}%` }}></div>
            </div>

            <div className="bg-slate-50 dark:bg-[#101b23] w-14 h-14 flex flex-col items-center justify-center rounded-xl flex-shrink-0 border border-slate-100 dark:border-slate-700">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stop.month}</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white leading-none mt-0.5">{stop.date}</span>
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <h4 className="text-slate-900 dark:text-white font-bold truncate text-lg">{stop.city}</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm truncate">{stop.venue}</p>

              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${stop.percentSold >= 100 ? 'bg-green-500/10 text-green-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {stop.percentSold >= 100 ? 'Sold Out' : `${stop.percentSold}% Sold`}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">{stop.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. Smart Day Sheet Widget (Redesigned)
export function DaySheetCard({ onClick }) {
  const schedule = [
    { time: "14:00", event: "Load In", status: "past" },
    { time: "16:00", event: "Soundcheck", status: "active" },
    { time: "19:00", event: "Doors Open", status: "future" },
    { time: "21:15", event: "Showtime", status: "future" },
  ];

  return (
    <div
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl shadow-xl cursor-pointer group h-full min-h-[350px] bg-[#0b1219] border border-slate-800"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d93f2]/5 to-transparent pointer-events-none"></div>

      <div className="relative z-10 p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0d93f2]/20 rounded-lg text-[#0d93f2] shadow-[0_0_15px_rgba(13,147,242,0.3)]">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-none">Day Sheet</h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">Today's Schedule</p>
            </div>
          </div>
          <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white" />
          </div>
        </div>

        <div className="flex-1 relative">
          {/* Glowing Timeline Line */}
          <div className="absolute left-[23px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#0d93f2] via-[#0d93f2]/20 to-transparent shadow-[0_0_10px_#0d93f2]"></div>

          <div className="space-y-7">
            {schedule.map((item, i) => {
              const isActive = item.status === 'active';
              const isPast = item.status === 'past';

              return (
                <div key={i} className={`relative pl-14 flex items-center justify-between group/item ${isPast ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                  {/* Timeline Node */}
                  <div className={`absolute left-[16px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 z-10 transition-all duration-500
                                    ${isActive
                      ? 'bg-[#0d93f2] border-white shadow-[0_0_20px_#0d93f2] scale-125'
                      : 'bg-[#0b1219] border-slate-600 group-hover/item:border-[#0d93f2]'}
                                `}>
                    {isActive && <div className="absolute inset-0 bg-[#0d93f2] animate-ping rounded-full opacity-50"></div>}
                  </div>

                  <div>
                    <span className={`block text-xs font-mono mb-0.5 ${isActive ? 'text-[#0d93f2] font-bold' : 'text-slate-500'}`}>{item.time}</span>
                    <span className={`text-sm md:text-base ${isActive ? 'text-white font-bold tracking-wide' : 'text-slate-300 font-medium'}`}>{item.event}</span>
                  </div>

                  {isActive && <span className="text-[10px] font-bold bg-[#0d93f2] text-white px-2 py-0.5 rounded shadow-lg shadow-blue-500/40">NOW</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className="text-xs text-slate-500 font-medium group-hover:text-[#0d93f2] transition-colors uppercase tracking-widest">Tap to view full sheet</p>
        </div>
      </div>
    </div>
  );
}