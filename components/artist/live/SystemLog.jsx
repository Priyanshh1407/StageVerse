import { useState } from 'react';
import { History, Plus } from 'lucide-react';

export default function SystemLog({ logs, onAddLog }) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onAddLog(inputValue);
    setInputValue("");
  };

  return (
    <div className="bg-white dark:bg-[#15232d] rounded-xl border border-slate-200 dark:border-[#223949] flex flex-col h-full max-h-[calc(100vh-140px)] shadow-sm">
      <div className="p-5 border-b border-slate-200 dark:border-[#223949] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#587386]" />
          <h3 className="font-bold text-lg uppercase tracking-tight">System Log</h3>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <ul className="flex flex-col gap-1">
          {logs.map((log) => (
            <li 
              key={log.id} 
              className={`p-3 rounded-lg border-l-2 transition-colors animate-in slide-in-from-left-2 duration-300 ${
                log.critical
                ? 'bg-red-500/20 border-red-500' // Critical Style
                : log.active 
                ? 'bg-[#223949]/30 border-[#0d93f2]' // Active Style
                : 'hover:bg-white/5 border-transparent hover:border-[#315168]' // Normal Style
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-mono font-bold ${log.critical ? 'text-red-400' : log.active ? 'text-[#0d93f2]' : 'text-[#587386]'}`}>{log.time}</span>
                {log.active && <span className="text-[10px] uppercase font-bold text-[#0d93f2] bg-[#0d93f2]/10 px-1.5 py-0.5 rounded">Active</span>}
                {log.critical && <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">Alert</span>}
              </div>
              <p className={`text-sm font-medium ${log.active || log.critical ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{log.msg}</p>
              {log.sub && <p className="text-xs text-[#90b2cb] mt-0.5">{log.sub}</p>}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-[#223949] bg-slate-50 dark:bg-[#101b23] rounded-b-xl">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full h-10 bg-white dark:bg-[#1a2c38] border border-slate-300 dark:border-[#315168] rounded-lg px-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#587386] focus:outline-none focus:border-[#0d93f2]" 
              placeholder="Add manual log entry..." 
              type="text"
            />
          </div>
          <button 
            onClick={handleSubmit}
            className="w-10 h-10 flex items-center justify-center bg-[#223949] hover:bg-[#2c4759] text-white rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}