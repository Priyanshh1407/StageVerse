import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ label, value, icon: Icon, trend, trendLabel, progress }) {
  const isPositive = trend >= 0;

  return (
    <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#90b2cb] text-sm font-medium mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        <span className="p-2 bg-[#2c3b47]/50 rounded-lg text-[#0d93f2]">
          <Icon className="w-6 h-6" />
        </span>
      </div>

      {progress ? (
        <div className="mt-4">
          <div className="w-full bg-[#2c3b47] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#0d93f2] h-full rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="mt-2 text-right">
            <span className="text-[#90b2cb] text-xs">{progress}% Capacity</span>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-xs font-bold flex items-center ${isPositive ? 'text-[#0bda5b] bg-[#0bda5b]/10' : 'text-red-500 bg-red-500/10'}`}>
            {isPositive ? '+' : ''}{trend}%
          </span>
          <span className="text-[#90b2cb] text-xs">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}