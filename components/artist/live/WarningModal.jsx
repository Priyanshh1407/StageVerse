'use client';

import { AlertTriangle, Flag } from 'lucide-react'; // Added Flag icon

export default function WarningModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-2xl bg-[#101b22] border-2 border-orange-500 rounded-2xl shadow-[0_0_50px_rgba(249,115,22,0.3)] overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-300">
        
        {}
        <div className="hidden md:flex w-24 bg-orange-500 items-center justify-center flex-col gap-2 p-4 text-black">
          <Flag className="w-12 h-12 animate-pulse" /> {}
          <span className="font-black text-xs uppercase tracking-widest -rotate-90 whitespace-nowrap mt-8">Finale</span>
        </div>
        
        {}
        <div className="md:hidden h-16 bg-orange-500 flex items-center px-6 gap-4 text-black">
          <Flag className="w-8 h-8 animate-pulse" />
          <span className="font-black text-lg uppercase tracking-wider">Finale Alert</span>
        </div>

        {}
        <div className="p-8 md:p-10 flex-1 flex flex-col justify-center relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          
          <h1 className="text-4xl md:text-5xl font-black text-white uppercase leading-none mb-6 tracking-tight">
            Next Track:<br/>
            <span className="text-orange-500">Last Song</span>
          </h1>
          
          <div className="space-y-3">
            <p className="text-xl md:text-2xl font-bold text-white leading-tight">
              Prepare for Show End.
            </p>
            <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed">
              Alerting: House Lights, Security Egress, and Pyro Team.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2 text-orange-500/80 text-xs font-mono uppercase tracking-widest">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
              Broadcast to Crew Comms
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button 
                    onClick={onClose}
                    className="flex-1 md:flex-none px-6 py-3 rounded-lg border border-slate-700 text-slate-300 hover:text-white font-bold uppercase tracking-wider text-sm transition-all"
                >
                    Cancel
                </button>
                <button 
                    onClick={onConfirm}
                    className="flex-1 md:flex-none bg-orange-500 hover:bg-orange-400 text-black font-bold py-3 px-8 rounded-lg uppercase tracking-wider text-sm transition-all transform hover:scale-105 shadow-lg shadow-orange-500/20"
                >
                    Confirm & Send
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}