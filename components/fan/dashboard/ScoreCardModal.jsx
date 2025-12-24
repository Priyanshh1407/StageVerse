'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, AlertCircle, XCircle, Trophy } from 'lucide-react';

export default function ScorecardModal({ isOpen, onClose, artistName = "Arctic Monkeys" }) {
  
  // Example Result Data
  const results = [
    { position: 1, guess: "Do I Wanna Know?", actual: "Do I Wanna Know?", status: "correct" },
    { position: 2, guess: "Brianstorm", actual: "Brianstorm", status: "correct" },
    { position: 3, guess: "Teddy Picker", actual: "Snap Out Of It", status: "wrong" },
    { position: 4, guess: "Crying Lightning", actual: "Crying Lightning", status: "correct" },
    { position: 5, guess: "505", actual: "Teddy Picker", status: "misplaced" }, // Correct song, wrong spot
  ];

  const score = 350; // Total Points

  // Trigger Confetti on Mount
  useEffect(() => {
    if (isOpen) {
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#0d93f2', '#ffffff']
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#0d93f2', '#ffffff']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#101b23] rounded-2xl border border-[#315168] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header / Score Banner */}
        <div className="bg-gradient-to-r from-[#0d93f2] to-blue-700 p-8 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/10 rounded-full mb-3 backdrop-blur-md border border-white/20">
                <Trophy className="w-8 h-8 text-yellow-300" />
            </div>
            <h2 className="text-white text-3xl font-bold tracking-tight mb-1">Prediction Results</h2>
            <p className="text-blue-100 text-sm font-medium uppercase tracking-widest">{artistName}</p>
            
            <div className="mt-6 inline-block">
                <span className="text-5xl font-black text-white drop-shadow-md">+{score}</span>
                <span className="text-blue-200 text-lg ml-2">PTS</span>
            </div>
          </div>
          
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 z-20">
            <X className="w-6 h-6" />
        </button>

        {/* Results Table */}
        <div className="p-6">
            <div className="grid grid-cols-12 text-xs font-bold text-[#90b2cb] uppercase tracking-wider mb-4 px-4">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">Your Prediction</div>
                <div className="col-span-5">Actual Setlist</div>
                <div className="col-span-1 text-center">Result</div>
            </div>

            <div className="space-y-2">
                {results.map((row) => (
                    <div key={row.position} className="grid grid-cols-12 items-center bg-[#182934] rounded-lg p-3 border border-[#315168]/50">
                        <div className="col-span-1 text-center text-[#90b2cb] font-mono">{row.position}</div>
                        
                        {/* Guess */}
                        <div className={`col-span-5 font-medium ${row.status === 'correct' ? 'text-[#0d93f2]' : 'text-slate-400'}`}>
                            {row.guess}
                        </div>

                        {/* Actual */}
                        <div className="col-span-5 text-white font-medium">
                            {row.actual}
                        </div>

                        {/* Icon */}
                        <div className="col-span-1 flex justify-center">
                            {row.status === 'correct' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {row.status === 'misplaced' && <AlertCircle className="w-5 h-5 text-yellow-500" title="Right song, wrong spot" />}
                            {row.status === 'wrong' && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#142029] border-t border-[#315168] text-center">
            <button onClick={onClose} className="text-[#90b2cb] hover:text-white text-sm font-bold hover:underline">
                Close Results
            </button>
        </div>

      </div>
    </div>
  );
}