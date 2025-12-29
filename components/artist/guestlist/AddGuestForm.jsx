'use client';

import { useState, useEffect } from 'react';
import { Minus, Plus, UserPlus, CheckCircle2, Save, X } from 'lucide-react';

export default function AddGuestForm({ onAdd, onUpdate, editingGuest, onCancel }) {
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState('VIP');
  const [status, setStatus] = useState('Pending');
  const [isSuccess, setIsSuccess] = useState(false);

  // --- POPULATE FORM WHEN EDITING STARTS ---
  useEffect(() => {
    if (editingGuest) {
      setName(editingGuest.name);
      setEmail(editingGuest.email || '');
      setTier(editingGuest.tier);
      setStatus(editingGuest.status);
      setQty(1); 
    } else {
      // Reset form
      setName('');
      setEmail('');
      setTier('VIP');
      setStatus('Pending');
      setQty(1);
    }
  }, [editingGuest]);

  const handleSubmit = () => {
    if (!name.trim()) return;

    const formData = { name, email, tier, status };

    if (editingGuest) {
      onUpdate(formData);
    } else {
      onAdd(formData);
    }

    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
    
    if (!editingGuest) {
        setName('');
        setEmail('');
        setStatus('Pending');
    }
  };

  return (
    // Responsive Wrapper: Full width on mobile, Col-span-1 on desktop
    <div className="w-full lg:col-span-1 mb-8 lg:mb-0">
      
      {/* Container: 
          - Mobile: Relative positioning (flows with page)
          - Desktop: Sticky positioning (stays on side) 
      */}
      <div className={`
        relative md:sticky md:top-24 
        bg-white dark:bg-[#182934] 
        rounded-xl border shadow-sm overflow-hidden transition-colors 
        ${editingGuest ? 'border-[#0d93f2] ring-1 ring-[#0d93f2]' : 'border-slate-200 dark:border-[#315168]'}
      `}>
        
        {/* Header Image */}
        <div 
          className="h-24 md:h-32 bg-cover bg-center relative" 
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800&auto=format&fit=crop")' }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#182934] to-transparent"></div>
          <div className="absolute bottom-3 left-4 md:bottom-4">
            <h3 className="text-white text-base md:text-lg font-bold font-sans">
                {editingGuest ? 'Edit Guest Details' : 'Add New Guest'}
            </h3>
            <p className="text-slate-300 text-[10px] md:text-xs">
                {editingGuest ? 'Updating existing record' : 'Fill details for instant sync'}
            </p>
          </div>
          {editingGuest && (
            <button onClick={onCancel} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors">
                <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Form Content */}
        <div className="p-4 md:p-5 flex flex-col gap-3 md:gap-4">
          
          {/* Inputs */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Guest Name</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 md:h-11 px-3 rounded-lg bg-slate-50 dark:bg-[#101b23] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2] outline-none transition-all text-sm" 
              placeholder="Full Name" 
              type="text"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Email (Optional)</label>
            <input 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 md:h-11 px-3 rounded-lg bg-slate-50 dark:bg-[#101b23] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2] outline-none transition-all text-sm" 
              placeholder="guest@example.com" 
              type="email"
            />
          </div>

          {/* Status Selector */}
          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Current Status</label>
             <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setStatus('Pending')}
                  className={`h-9 md:h-10 rounded-lg text-xs md:text-sm font-bold border transition-all ${status === 'Pending' ? 'bg-slate-200 dark:bg-slate-700 border-slate-400 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-[#223949]'}`}
                >
                    Pending
                </button>
                <button 
                  onClick={() => setStatus('Checked In')}
                  className={`h-9 md:h-10 rounded-lg text-xs md:text-sm font-bold border transition-all ${status === 'Checked In' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-[#223949]'}`}
                >
                    Checked In
                </button>
             </div>
          </div>

          {/* Access Tier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Access Tier</label>
            <div className="grid grid-cols-1 gap-2">
              <TierOption label="All Access" sub="Backstage + VIP" badge="Gold" color="amber" current={tier} set={setTier} />
              <TierOption label="VIP" sub="Main + VIP Bar" badge="Standard" color="purple" current={tier} set={setTier} />
              <TierOption label="Afterparty" sub="Entry after 11 PM" badge="Late" color="emerald" current={tier} set={setTier} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 mt-2">
            {!editingGuest && (
                <div className="w-full sm:w-1/3 flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#101b23] h-10 md:h-11 px-1">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><Minus className="w-4 h-4" /></button>
                    <input className="w-full bg-transparent border-none text-center text-slate-900 dark:text-white font-bold focus:ring-0 p-0 text-sm" type="text" value={qty} readOnly/>
                    <button onClick={() => setQty(q => q + 1)} className="w-10 h-full flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
            )}
            
            <button 
              onClick={handleSubmit}
              disabled={!name}
              className={`w-full sm:flex-1 h-10 md:h-11 font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] text-sm md:text-base ${isSuccess ? 'bg-green-500 text-white' : 'bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white disabled:opacity-50 disabled:cursor-not-allowed'} ${editingGuest ? 'w-full' : ''}`}
            >
              {isSuccess ? (
                  <><CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" /> {editingGuest ? 'Updated' : 'Added'}</>
              ) : (
                  editingGuest ? <><Save className="w-4 h-4 md:w-5 md:h-5" /> Update Guest</> : <><UserPlus className="w-4 h-4 md:w-5 md:h-5" /> Add to List</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function TierOption({ label, sub, badge, color, current, set }) {
  const isSelected = current === label;
  const badgeColors = {
    amber: 'text-amber-500 bg-amber-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
  };

  return (
    <div 
      onClick={() => set(label)}
      className={`relative flex items-center p-2.5 md:p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-[#0d93f2] bg-[#0d93f2]/5 dark:bg-[#0d93f2]/10' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#223949]'}`}
    >
      <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center shrink-0 ${isSelected ? 'border-[#0d93f2] bg-[#0d93f2]' : 'border-slate-400'}`}>
        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs md:text-sm font-bold text-slate-900 dark:text-white truncate">{label}</span>
        <span className="block text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate">{sub}</span>
      </div>
      <span className={`text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded ${badgeColors[color]}`}>{badge}</span>
    </div>
  );
}