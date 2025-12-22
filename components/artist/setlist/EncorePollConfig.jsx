'use client';

import { useState } from 'react';
import { BarChart2, PlusCircle, Edit, Trash2, ListMusic, List, Timer, X, ChevronDown, Info, Smartphone, Check, ArrowLeft } from 'lucide-react';

export default function EncorePollConfig() {
  const [view, setView] = useState('grid'); // 'grid' | 'editor'
  const [showPreview, setShowPreview] = useState(false);

  // Toggle Views
  const handleEdit = () => setView('editor');
  const handleSave = () => setView('grid');
  
  return (
    <div className="bg-[#1a2c38] border border-[#223949] rounded-xl p-6 flex flex-col gap-6 relative">
      {view === 'grid' ? (
        <PollGrid onEdit={handleEdit} onPreview={() => setShowPreview(true)} />
      ) : (
        <PollEditor onSave={handleSave} onCancel={handleSave} />
      )}
      
      {showPreview && <PollPreviewModal onClose={() => setShowPreview(false)} />}
    </div>
  );
}

// --- SUB-COMPONENT: POLL GRID (Unchanged) ---
function PollGrid({ onEdit, onPreview }) {
  // ... (Keep the exact same grid code from previous answer) ...
  // For brevity, I am not repeating the Grid code here, assume it is the same as before.
  // If you need it repeated, I can provide it, but the focus is on the Editor logic below.
  return (
      <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl text-white font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-purple-400" />
            Live Show Polls & Interactions
          </h3>
          <p className="text-[#90b2cb] text-sm">Configure audience interactions triggered at specific moments.</p>
        </div>
        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#223949] hover:bg-purple-600/20 text-purple-300 border border-purple-500/30 transition-all font-semibold text-sm group">
          <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Add New Poll
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1 */}
        <div className="group bg-[#101b22] border border-[#223949] hover:border-purple-500/40 rounded-xl p-5 relative transition-all">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Ready</span>
              </div>
              <h4 className="text-white font-bold text-lg">Encore Vote</h4>
            </div>
            <div className="flex gap-1">
              <button onClick={onEdit} className="p-1.5 text-[#90b2cb] hover:text-white hover:bg-[#223949] rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="space-y-3 mb-4">
             <p className="text-[#90b2cb] text-xs">Trigger: After Song 5</p>
             <p className="text-[#90b2cb] text-xs">Options: Wonderwall, Don't Stop Believing</p>
          </div>
          <div className="pt-3 border-t border-[#223949] mt-auto">
            <button onClick={onPreview} className="w-full py-2 bg-[#223949]/30 hover:bg-[#223949] text-sm text-[#90b2cb] hover:text-white rounded font-medium transition-colors">Preview Interaction</button>
          </div>
        </div>
      </div>
      </>
  )
}

// --- SUB-COMPONENT: POLL EDITOR (Updated with Auto-Create Logic) ---
function PollEditor({ onSave, onCancel }) {
  const [isEnabled, setIsEnabled] = useState(true);
  
  // 1. Dynamic Options State
  const [options, setOptions] = useState([
    { id: 1, value: "Wonderwall (Oasis Cover)" },
    { id: 2, value: "Don't Stop Believing" },
    { id: 3, value: "" } // Initial empty row
  ]);

  // 2. Logic to handle input changes and auto-add
  const handleOptionChange = (id, newValue) => {
    const newOptions = options.map(opt => opt.id === id ? { ...opt, value: newValue } : opt);
    setOptions(newOptions);

    // If we are typing in the LAST input and it becomes non-empty, add a new empty one
    const lastOption = newOptions[newOptions.length - 1];
    if (lastOption.id === id && newValue.trim() !== "") {
      setOptions([...newOptions, { id: Date.now(), value: "" }]);
    }
  };

  const removeOption = (id) => {
    // Prevent removing the last empty row if it's the only one, or strictly enforce logic
    if (options.length <= 1) return;
    setOptions(options.filter(opt => opt.id !== id));
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 border-b border-[#223949] pb-4">
        <button onClick={onCancel} className="p-2 hover:bg-[#223949] rounded-full text-[#90b2cb] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h3 className="text-lg text-white font-bold">Edit Poll</h3>
            <p className="text-[#90b2cb] text-xs">Configure dynamic options</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Dynamic Inputs */}
        <div className="flex flex-col gap-4">
          <h4 className="text-white text-sm font-bold uppercase tracking-wider">Poll Options</h4>
          <div className="space-y-3">
            {options.map((opt, index) => (
              <div key={opt.id} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-200">
                <span className="text-[#90b2cb] font-mono text-sm w-4">{index + 1}.</span>
                <div className="relative flex-1">
                  <input 
                    className={`w-full bg-[#101b22] border text-white text-sm rounded-lg focus:ring-1 focus:ring-[#0d93f2] focus:border-[#0d93f2] p-2.5 placeholder:text-[#90b2cb]/50 ${opt.value === "" ? 'border-dashed border-[#223949] bg-[#223949]/10' : 'border-[#223949]'}`}
                    type="text" 
                    value={opt.value}
                    onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                    placeholder={index === options.length - 1 ? "Type to add another option..." : "Enter option..."}
                  />
                  {/* Only show delete if it's not the last empty one (unless it has value) */}
                  {(index !== options.length - 1 || opt.value !== "") && (
                    <button onClick={() => removeOption(opt.id)} className="absolute right-2 top-2 text-[#90b2cb] hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Preview (Static for now) */}
        <div className="flex flex-col gap-6">
           {/* ... Duration selector logic ... */}
           <div className="bg-[#223949]/30 rounded-lg p-4 border border-[#223949]/50">
             {/* ... Preview Visual ... */}
             <p className="text-[#90b2cb] text-xs">Preview updates as you type options...</p>
           </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[#223949] flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-[#90b2cb] hover:text-white text-sm font-bold transition-colors">Cancel</button>
        <button onClick={onSave} className="px-6 py-2 bg-[#0d93f2] hover:bg-[#0b85db] text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2"><Check className="w-4 h-4" /> Save Poll</button>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: POLL PREVIEW MODAL (Same as before) ---
function PollPreviewModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-[#101b22] p-6 rounded-xl border border-white/10 w-full max-w-md">
            <h2 className="text-white text-xl font-bold mb-4">Poll Preview</h2>
            <button onClick={onClose} className="w-full bg-[#0d93f2] py-2 rounded font-bold">Close Preview</button>
        </div>
    </div>
  );
}