'use client';

import React from 'react';
import { FileCode, FileJson, AlertTriangle, Wrench } from 'lucide-react';

// Added onEditFixture prop
export default function PatchMainArea({ patches = [], onEditFixture }) {
  return (
    <main className="flex-1 flex flex-col bg-[#0F0F10] relative overflow-hidden h-full min-w-0">
      {/* Table Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">

        {/* Table Head (Fixed) */}
        <div className="grid grid-cols-12 bg-[#141b22] border-b border-[#2c3e50] py-3 px-6 text-[10px] font-bold text-[#90b2cb] uppercase tracking-wider select-none shrink-0 flex-none gap-4">
          <div className="col-span-1 text-center">ID</div>
          <div className="col-span-3">Fixture Name</div>
          <div className="col-span-1 text-center">Univ</div>
          <div className="col-span-3">Address</div>
          <div className="col-span-2">Mode (Ch)</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {/* Table Body (Scrollable) */}
        {/* Added min-h-0 to ensure flex container respects height limits */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0F0F10] min-h-0">
          {patches.map((patch) => {
            const isConflict = ['conflict', 'collision', 'error'].includes(patch.status);

            return (
              <div
                key={patch.id || patch.fixtureId}
                className={`grid grid-cols-12 border-b items-center py-2 px-6 text-sm group transition-colors gap-4
                  ${isConflict
                    ? 'border-y border-[#e74c3c]/40 bg-[#e74c3c]/10 relative'
                    : 'border-[#2c3e50] hover:bg-white/5'
                  }`}
              >
                {isConflict && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#e74c3c] shadow-[0_0_15px_rgba(231,76,60,0.6)]"></div>
                )}

                <div className={`col-span-1 font-mono text-center font-bold ${isConflict ? 'text-red-200' : 'text-gray-500'}`}>
                  {patch.fixtureId}
                </div>

                <div className="col-span-3 font-medium text-white flex items-center gap-2 truncate">
                  {patch.profile}
                  {isConflict && <AlertTriangle className="w-4 h-4 text-[#e74c3c]" />}
                </div>

                <div className={`col-span-1 font-mono text-center ${isConflict ? 'text-red-200' : 'text-gray-400'}`}>
                  {patch.universe}
                </div>

                {/* Address Visual Bar */}
                <div className="col-span-3 pr-8">
                  <div className="flex flex-col gap-1.5 w-full">
                    <span className="font-mono text-xs text-white tracking-wider">{String(patch.address).padStart(3, '0')}</span>
                    <div className={`h-1 rounded-full w-full overflow-hidden flex ${isConflict ? 'bg-red-900/40' : 'bg-gray-800'}`}>
                      <div style={{ width: `${((patch.address - 1) / 512) * 100}%` }} className="h-full bg-transparent shrink-0"></div>
                      <div
                        style={{ width: `${(patch.channels / 512) * 100}%` }}
                        className={`h-full shrink-0 ${isConflict ? 'bg-[#e74c3c] animate-pulse' : 'bg-[#2ecc71]'}`}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className={`col-span-2 text-xs truncate ${isConflict ? 'text-red-200' : 'text-gray-400'}`}>
                  {patch.mode || 'Standard'} ({patch.channels})
                </div>

                <div className="col-span-2 text-right flex items-center justify-end gap-3">
                  {isConflict ? (
                    <button
                      onClick={() => onEditFixture && onEditFixture(patch)}
                      className="flex items-center gap-1 pl-2 pr-3 py-1 bg-[#e74c3c] hover:bg-red-500 text-white rounded shadow-lg shadow-[#e74c3c]/20 text-[10px] font-bold uppercase tracking-wide transition-all hover:scale-105 active:scale-95"
                    >
                      <Wrench className="w-3 h-3" /> Fix
                    </button>
                  ) : (
                    <span className="text-[#2ecc71] text-[10px] font-bold uppercase tracking-wide">OK</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Table Footer */}
          <div className="py-2 px-6 bg-[#141b22] border-t border-[#2c3e50] text-[10px] text-gray-500 font-mono flex justify-between shrink-0 min-h-[40px] items-center">
            <span>Total Fixtures: {patches.length}</span>
            <span>Universe 1 Usage: {patches.length > 0 ? '25.6%' : '0%'}</span>
          </div>
        </div>
      </div>
    </main>
  );
}

function ActionButton({ icon: Icon, label }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[#2c3e50] text-[#90b2cb] hover:text-white hover:bg-white/5 hover:border-gray-500 transition-all text-[11px] font-bold uppercase tracking-wide">
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}