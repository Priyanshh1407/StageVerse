'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
const DEFAULT_DATA = [
  { date: 'Aug 01', velocity: 20 },
  { date: 'Aug 05', velocity: 45 },
  { date: 'Aug 10', velocity: 30 },
  { date: 'Aug 15', velocity: 60 },
  { date: 'Aug 20', velocity: 55 },
  { date: 'Aug 25', velocity: 85 },
  { date: 'Aug 30', velocity: 70 },
];

export default function HypeChart({ data = DEFAULT_DATA, period = "Last 30 Days" }) {
  
  return (
    <div className="bg-[#192734] rounded-xl border border-[#2c3b47] p-6 relative overflow-hidden h-full flex flex-col">
      
      {}
      <div className="flex flex-wrap justify-between items-center mb-6 z-10">
        <div>
          <h3 className="text-xl font-bold text-white">Hype Analytics</h3>
          <p className="text-[#90b2cb] text-sm">Velocity Index (Sales + Social Mentions)</p>
        </div>
        
        {}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#0d93f2]"></span>
            <span className="text-xs text-white">Velocity</span>
          </div>
          <select className="bg-[#101b22] border border-[#2c3b47] text-white text-xs rounded-md px-2 py-1 focus:outline-none focus:border-[#0d93f2]">
            <option>{period}</option>
            <option>Last 7 Days</option>
            <option>Last 24 Hours</option>
          </select>
        </div>
      </div>

      {}
      <div className="flex-1 min-h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              {}
              <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d93f2" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#0d93f2" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#2c3b47" 
            />
            
            <XAxis 
              dataKey="date" 
              hide={true} // Hide labels for cleaner look, or set to false
            />
            
            <YAxis 
              hide={true} // Hide Y Axis numbers
              domain={[0, 100]} 
            />
            
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#101b22', 
                borderColor: '#2c3b47', 
                borderRadius: '8px',
                color: '#fff'
              }}
              itemStyle={{ color: '#0d93f2', fontWeight: 'bold' }}
              labelStyle={{ color: '#90b2cb', marginBottom: '4px' }}
              cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            
            <Area 
              type="monotone" 
              dataKey="velocity" 
              stroke="#0d93f2" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorVelocity)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}