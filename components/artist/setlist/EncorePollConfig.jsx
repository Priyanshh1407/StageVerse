'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { BarChart2, PlusCircle, Edit, Trash2, ListMusic, List, Timer, X, ChevronDown, Info, Smartphone, Check, ArrowLeft } from 'lucide-react';

export default function EncorePollConfig({ eventId }) { // Prop
  const [view, setView] = useState('grid'); // 'grid' | 'editor'
  const [showPreview, setShowPreview] = useState(false);
  const handleEdit = () => setView('editor');
  const handleSave = () => setView('grid');

  return (
    <div className="bg-[#1a2c38] border border-[#223949] rounded-xl p-6 flex flex-col gap-6 relative">
      {view === 'grid' ? (
        <PollGrid onEdit={handleEdit} onPreview={() => setShowPreview(true)} />
      ) : (
        <PollEditor onSave={handleSave} onCancel={handleSave} eventId={eventId} />
      )}

      {showPreview && <PollPreviewModal onClose={() => setShowPreview(false)} />}
    </div>
  );
}
function PollGrid({ onEdit, onPreview }) {
  return (
    <>
      {}
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
        {}
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
            <p className="text-[#90b2cb] text-xs">Options: Wonderwall, Don&apos;t Stop Believing</p>
          </div>
          <div className="pt-3 border-t border-[#223949] mt-auto">
            <button onClick={onPreview} className="w-full py-2 bg-[#223949]/30 hover:bg-[#223949] text-sm text-[#90b2cb] hover:text-white rounded font-medium transition-colors">Preview Interaction</button>
          </div>
        </div>
      </div>
    </>
  )
}
function PollEditor({ onSave, onCancel, eventId }) { // Added eventId prop
  const [question, setQuestion] = useState("Which song should we play next?");
  const [options, setOptions] = useState([
    { id: 1, value: "Wonderwall (Oasis Cover)" },
    { id: 2, value: "Don't Stop Believing" },
    { id: 3, value: "" }
  ]);
  const [loading, setLoading] = useState(false); // Loading state
  const nextOptionId = useRef(1000); // ids for newly added option rows
  const handleOptionChange = (id, newValue) => {
    const newOptions = options.map(opt => opt.id === id ? { ...opt, value: newValue } : opt);
    setOptions(newOptions);
    const lastOption = newOptions[newOptions.length - 1];
    if (lastOption.id === id && newValue.trim() !== "") {
      nextOptionId.current += 1;
      setOptions([...newOptions, { id: nextOptionId.current, value: "" }]);
    }
  };

  const removeOption = (id) => {
    if (options.length <= 1) return;
    setOptions(options.filter(opt => opt.id !== id));
  };

  const handleSavePoll = async () => {
    const validOptions = options.map(o => o.value.trim()).filter(v => v !== "");

    if (validOptions.length < 2) {
      toast.error("Please provide at least 2 options.");
      return;
    }

    if (!eventId) {
      toast.error("No event selected. Please select an event first.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/artist/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          question,
          options: validOptions
        })
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Poll Created Successfully!");
        onSave(); // Close editor
      } else {
        toast.error(json.error || "Failed to create poll");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving poll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-full">
      {}
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
        {}
        <div className="flex flex-col gap-4">
          {}
          <div className="flex flex-col gap-2">
            <label className="text-white text-sm font-bold uppercase tracking-wider">Poll Question</label>
            <input
              className="w-full bg-[#101b22] border border-[#223949] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#0d93f2] focus:border-[#0d93f2] p-2.5"
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <h4 className="text-white text-sm font-bold uppercase tracking-wider mt-4">Poll Options</h4>
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

        {}
        <div className="flex flex-col gap-6">
          <div className="bg-[#223949]/30 rounded-lg p-6 border border-[#223949]/50 text-center">
            <Smartphone className="w-8 h-8 text-[#90b2cb] mx-auto mb-2 opacity-50" />
            <p className="text-white font-bold mb-2">{question}</p>
            <div className="space-y-2">
              {options.filter(o => o.value).map(o => (
                <div key={o.id} className="bg-[#101b22] p-2 rounded text-sm text-[#90b2cb] border border-[#223949]">{o.value}</div>
              ))}
            </div>
            <p className="text-[#90b2cb] text-xs mt-4">Preview visual</p>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[#223949] flex justify-end gap-3">
        <button onClick={onCancel} className="px-4 py-2 text-[#90b2cb] hover:text-white text-sm font-bold transition-colors">Cancel</button>
        <button
          onClick={handleSavePoll}
          disabled={loading}
          className="px-6 py-2 bg-[#0d93f2] hover:bg-[#0b85db] text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Saving...' : <><Check className="w-4 h-4" /> Save Poll</>}
        </button>
      </div>
    </div>
  );
}
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