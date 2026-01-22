'use client';
export default function ShowTimer({ time, status }) {  const label = status === 'Standby' ? "Time To Showtime" : "Show Duration";  const secondsColor = status === 'Paused' ? 'text-red-500' : 'text-[#0d93f2]';
  const labelColor = status === 'Paused' ? 'text-red-500/50' : 'text-[#587386]';

  return (
    <section className={`rounded-xl p-8 border relative overflow-hidden group transition-colors duration-500 ${status === 'Paused' ? 'bg-[#1a0505] border-red-900/30' : 'bg-black border-slate-800'}`}>
      {}
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500 ${status === 'Paused' ? 'bg-red-500/10' : 'bg-[#0d93f2]/10'}`}></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center">
        <p className={`text-xs font-bold uppercase tracking-[0.2em] mb-4 transition-colors ${labelColor}`}>
            {status === 'Paused' ? 'Timer Paused' : label}
        </p>
        
        <div className="flex items-end gap-2 md:gap-6 font-mono">
          {}
          <div className="flex flex-col items-center">
            <span className="text-5xl md:text-8xl font-bold text-white leading-none tracking-tighter">
                {time?.hours || "00"}
            </span>
            <span className="text-xs text-[#587386] uppercase mt-2 font-bold tracking-wider">Hours</span>
          </div>

          <span className="text-3xl md:text-6xl text-[#315168] font-light mb-6 md:mb-8">:</span>

          {}
          <div className="flex flex-col items-center">
            <span className="text-5xl md:text-8xl font-bold text-white leading-none tracking-tighter">
                {time?.minutes || "00"}
            </span>
            <span className="text-xs text-[#587386] uppercase mt-2 font-bold tracking-wider">Minutes</span>
          </div>

          <span className="text-3xl md:text-6xl text-[#315168] font-light mb-6 md:mb-8">:</span>

          {}
          <div className="flex flex-col items-center">
            <span className={`text-5xl md:text-8xl font-bold leading-none tracking-tighter transition-colors ${secondsColor}`}>
                {time?.seconds || "00"}
            </span>
            <span className="text-xs text-[#587386] uppercase mt-2 font-bold tracking-wider">Seconds</span>
          </div>
        </div>
      </div>
    </section>
  );
}