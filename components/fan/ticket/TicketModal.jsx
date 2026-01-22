'use client';
import React from 'react';
import { useEffect } from 'react';
import { X, Share2, Wallet, RefreshCw, MoreHorizontal, QrCode } from 'lucide-react';
import Image from 'next/image';

export default function TicketModal({ isOpen, onClose, ticket }) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        }

        if(isOpen){
            window.addEventListener('keydown', handleKeyDown);
        }   

        return() => {
            window.removeEventListener('keydown', handleKeyDown);
        }
    },[isOpen, onClose]);

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-[#1a2632] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[85vh] md:h-auto">
        
        {}
        <div className="bg-[#0d93f2] p-6 text-white text-center relative shrink-0">
          <h3 className="text-xl font-bold">{ticket.artist}</h3>
          <p className="text-sm opacity-90">{ticket.date} • {ticket.time}</p>
          <p className="text-xs opacity-75 mt-1">{ticket.venue}</p>
          
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {}
        <div className="flex-1 bg-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
          {}
          <div className="flex justify-between w-full mb-8 text-slate-900">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Sec</p>
              <p className="font-black text-xl">TERR</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Row</p>
              <p className="font-black text-xl">4</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400">Seat</p>
              <p className="font-black text-xl">22</p>
            </div>
          </div>

          {}
          <div className="relative w-48 h-48 bg-slate-900 rounded-xl flex items-center justify-center shadow-inner overflow-hidden group">
            {}
            <QrCode className="text-white w-32 h-32 relative z-10" />
            
            {}
            <div className="absolute top-0 left-0 w-full h-1 bg-[#0d93f2] shadow-[0_0_15px_rgba(13,147,242,0.8)] z-20 animate-scan"></div>
            
            {}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 opacity-50"></div>
          </div>

          <p className="text-xs text-slate-400 mt-4 font-mono tracking-widest">
            {ticket.qrCode || "ID: 8X9-SEC-URE"}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Live Ticket</span>
          </div>
        </div>

        {}
        <div className="bg-slate-50 dark:bg-[#151f28] p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button className="w-full mb-3 flex items-center justify-center gap-2 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-900 transition-colors">
            <Wallet className="w-4 h-4" /> Add to Apple Wallet
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-2.5 bg-[#0d93f2]/10 text-[#0d93f2] rounded-lg font-bold text-xs hover:bg-[#0d93f2]/20 transition-colors">
              <Share2 className="w-3.5 h-3.5" /> Transfer
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 bg-[#0d93f2]/10 text-[#0d93f2] rounded-lg font-bold text-xs hover:bg-[#0d93f2]/20 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Sell
            </button>
          </div>
        </div>

      </div>
      
      {}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}