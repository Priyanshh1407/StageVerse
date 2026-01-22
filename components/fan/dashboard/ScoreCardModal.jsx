'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, AlertCircle, XCircle, Trophy } from 'lucide-react';

export default function ScorecardModal({ isOpen, onClose, artistName = "Artist", prediction = [], actualSetlist = [], totalScore = 0 }) {

  const results = actualSetlist.map((actualSong, index) => {
    const actualTitle = actualSong.title;    const userGuess = prediction[index];

    let status = 'wrong';
    let guessTitle = userGuess ? userGuess.title : '-';

    if (userGuess) {      const isExactMatch =
        (userGuess.id && actualSong.songId && userGuess.id.toString() === actualSong.songId.toString()) ||
        (userGuess.title.trim().toLowerCase() === actualTitle.trim().toLowerCase());

      if (isExactMatch) {
        status = 'correct';
      } else {        const existsElsewhere = actualSetlist.some(s =>
          (userGuess.id && s.songId && s.songId.toString() === userGuess.id.toString()) ||
          (s.title.trim().toLowerCase() === userGuess.title.trim().toLowerCase())
        );

        if (existsElsewhere) {
          status = 'misplaced';
        }
      }
    } else {
      status = 'wrong'; // No guess made for this slot
    }

    return {
      position: index + 1,
      guess: guessTitle,
      actual: actualTitle,
      status: status
    };
  });  useEffect(() => {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #182934; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #315168; border-radius: 20px; }
      `}</style>

      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-[#101b23] rounded-2xl border border-[#315168] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">

        {}
        <div className="bg-gradient-to-r from-[#0d93f2] to-blue-700 p-8 text-center relative overflow-hidden flex-none">
          <div className="relative z-10">
            <div className="inline-flex p-3 bg-white/10 rounded-full mb-3 backdrop-blur-md border border-white/20">
              <Trophy className="w-8 h-8 text-yellow-300" />
            </div>
            <h2 className="text-white text-3xl font-bold tracking-tight mb-1">Prediction Results</h2>
            <p className="text-blue-100 text-sm font-medium uppercase tracking-widest">{artistName}</p>

            <div className="mt-6 inline-block">
              <span className="text-5xl font-black text-white drop-shadow-md">+{totalScore}</span>
              <span className="text-blue-200 text-lg ml-2">PTS</span>
            </div>
          </div>

          {}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        </div>

        {}
        <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10 z-20">
          <X className="w-6 h-6" />
        </button>

        {}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="grid grid-cols-12 text-xs font-bold text-[#90b2cb] uppercase tracking-wider mb-4 px-4">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-10 sm:col-span-5">Your Prediction</div>
            <div className="hidden sm:block sm:col-span-5">Actual Setlist</div>
            <div className="col-span-1 text-center">Result</div>
          </div>

          <div className="space-y-2">
            {results.length > 0 ? results.map((row) => (
              <div key={row.position} className="grid grid-cols-12 items-center bg-[#182934] rounded-lg p-3 border border-[#315168]/50">
                <div className="col-span-1 text-center text-[#90b2cb] font-mono">{row.position}</div>

                {}
                <div className={`col-span-10 sm:col-span-5 font-medium ${row.status === 'correct' ? 'text-[#0d93f2]' : 'text-slate-400'}`}>
                  {row.guess}
                  {}
                  <div className="sm:hidden text-xs text-slate-500 mt-1 block">
                    Actual: {row.actual}
                  </div>
                </div>

                {}
                <div className="hidden sm:block sm:col-span-5 text-white font-medium">
                  {row.actual}
                </div>

                {}
                <div className="col-span-1 flex justify-center">
                  {row.status === 'correct' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {row.status === 'misplaced' && <AlertCircle className="w-5 h-5 text-yellow-500" title="Right song, wrong spot" />}
                  {row.status === 'wrong' && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </div>
            )) : (
              <div className="text-center text-slate-500 py-8">Wait for the artist to save the setlist!</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}