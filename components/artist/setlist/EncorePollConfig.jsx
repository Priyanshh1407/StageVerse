'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { BarChart2, PlusCircle, Edit, Trash2, ListMusic, List, Timer, X, ChevronDown, Info, Smartphone, Check, ArrowLeft, Loader2, Eye } from 'lucide-react';

export default function EncorePollConfig({ eventId }) {
  const [view, setView] = useState('grid'); // 'grid' | 'editor'
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null); // the poll being previewed

  // the polls saved for this show
  const loadPolls = useCallback(async () => {
    if (!eventId) { setPolls([]); return; }
    setLoading(true);
    try {
      const json = await fetch(`/api/artist/poll?eventId=${eventId}`).then((r) => r.json());
      setPolls(json.success ? json.polls : []);
    } catch { setPolls([]); } finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch: syncing with the server is what this effect is for
    loadPolls();
  }, [loadPolls]);

  const afterSave = () => { setView('grid'); loadPolls(); };

  return (
    <div className="bg-[#1a2c38] border border-[#223949] rounded-xl p-6 flex flex-col gap-6 relative">
      {view === 'grid' ? (
        <PollGrid polls={polls} loading={loading} hasEvent={Boolean(eventId)} onAdd={() => setView('editor')} onPreview={setPreview} />
      ) : (
        <PollEditor onSave={afterSave} onCancel={() => setView('grid')} eventId={eventId} />
      )}
      {preview && <PollPreviewModal poll={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function PollGrid({ polls, loading, hasEvent, onAdd, onPreview }) {
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-xl text-white font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#ff6a00]" />
            Live Show Polls & Interactions
          </h3>
          <p className="text-[#90b2cb] text-sm">Polls you start from the live show console; fans vote on their phones.</p>
        </div>
        <button type="button" onClick={onAdd} disabled={!hasEvent}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-black font-bold text-sm bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] hover:brightness-110 disabled:opacity-40 transition-all">
          <PlusCircle className="w-5 h-5" />
          Add New Poll
        </button>
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#ff6a00]" /></div>}
      {!loading && !hasEvent && <p className="text-sm text-[#90b2cb] py-6 text-center">Pick a show above to see and add its polls.</p>}
      {!loading && hasEvent && polls.length === 0 && (
        <p className="text-sm text-[#90b2cb] py-6 text-center">No polls for this show yet. Add one, then start it from the live show console.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {polls.map((poll) => {
          const votes = poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
          return (
            <div key={poll._id} className="bg-[#101b22] border border-[#223949] hover:border-[#ff6a00]/40 rounded-xl p-5 flex flex-col gap-3 transition-all">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${poll.isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-[#ffb000]'}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${poll.isActive ? 'text-emerald-400' : 'text-[#ffb000]'}`}>{poll.isActive ? 'Live now' : 'Ready'}</span>
                <span className="ml-auto text-[11px] text-[#90b2cb]">{votes} vote{votes === 1 ? '' : 's'}</span>
              </div>
              <h4 className="text-white font-bold text-lg leading-snug">{poll.question}</h4>
              <p className="text-[#90b2cb] text-xs">Options: {poll.options.map((o) => o.text).join(', ')}</p>
              <button type="button" onClick={() => onPreview(poll)}
                className="mt-auto w-full py-2 rounded-lg border border-[#ff6a00]/40 text-sm font-bold text-white hover:bg-[#ff6a00]/10 flex items-center justify-center gap-2 transition-colors">
                <Eye className="w-4 h-4" /> Preview on a fan&apos;s phone
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
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
              className="w-full bg-[#101b22] border border-[#223949] text-white text-sm rounded-lg focus:ring-1 focus:ring-[#a855f7] focus:border-[#a855f7] p-2.5"
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
                    className={`w-full bg-[#101b22] border text-white text-sm rounded-lg focus:ring-1 focus:ring-[#a855f7] focus:border-[#a855f7] p-2.5 placeholder:text-[#90b2cb]/50 ${opt.value === "" ? 'border-dashed border-[#223949] bg-[#223949]/10' : 'border-[#223949]'}`}
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
          className="px-6 py-2 bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] hover:brightness-110 text-black text-sm font-bold rounded-lg shadow-lg flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? 'Saving...' : <><Check className="w-4 h-4" /> Save Poll</>}
        </button>
      </div>
    </div>
  );
}
function PollPreviewModal({ poll, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const total = poll.options.reduce((sum, o) => sum + (o.votes || 0), 0);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Poll preview">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex flex-col items-center gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ffb000] flex items-center gap-2"><Smartphone className="w-4 h-4" /> What fans see</p>
        <div className="w-[300px] rounded-[2.2rem] border-[6px] border-[#2a2f3a] bg-[#0b0f14] p-5 shadow-2xl">
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#2a2f3a]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">● Live poll</span>
          <h3 className="mt-2 text-white text-lg font-bold leading-snug">{poll.question}</h3>
          <div className="mt-4 flex flex-col gap-2.5">
            {poll.options.map((o) => {
              const pct = total ? Math.round(((o.votes || 0) / total) * 100) : 0;
              return (
                <div key={o.text} className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ffb000]/35 via-[#ff6a00]/30 to-[#ff3d7a]/25" style={{ width: `${pct}%` }} />
                  <div className="relative flex justify-between text-sm"><span className="text-white font-medium">{o.text}</span><span className="text-[#ffb000] font-bold">{pct}%</span></div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-500">{total} vote{total === 1 ? '' : 's'} so far · tap an option to vote</p>
        </div>
        <button type="button" onClick={onClose}
          className="px-6 py-2.5 rounded-lg font-bold text-black bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] hover:brightness-110">Close preview</button>
      </div>
    </div>
  );
}
