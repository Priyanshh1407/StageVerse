'use client';

import React, { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Clock, ListMusic, Sparkles, GripVertical, Lock, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import PromptModal from './PromptModal';
import { toast } from 'sonner';

export default function SetlistCanvas({ items, setItems }) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [aiCurated, setAiCurated] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // State for modal
  const totalDuration = useMemo(() => {
    let totalSeconds = 0;
    items.forEach(item => {
      if (!item.duration || typeof item.duration !== 'string') return;

      const parts = item.duration.split(':');
      if (parts.length < 2) return;

      const [mins, secs] = parts.map(Number);
      if (!isNaN(mins) && !isNaN(secs)) {
        totalSeconds += (mins * 60) + secs;
      }
    });

    const displayMins = Math.floor(totalSeconds / 60);
    const displaySecs = totalSeconds % 60;
    return `${displayMins}:${displaySecs.toString().padStart(2, '0')}`;
  }, [items]);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);
    setItems(newItems);
  };
  const handleOptimizeClick = () => {
    setIsModalOpen(true);
  };
  const handleFinalSubmit = async (promptText) => {
    setIsModalOpen(false); // Close modal

    if (items.length < 2) {
      toast.error("Add at least 2 songs to optimize.");
      return;
    }

    setIsOptimizing(true); // Start loading state
    setAiCurated(false);

    try {
      const simplifiedList = items.map(item => ({
        id: item.id, // Ensure this exists and is unique
        title: item.title,
        bpm: item.bpm,
        tags: item.tags.map(t => t.label).join(", ")
      }));

      const fullPrompt = `
      I have a setlist of songs: ${JSON.stringify(simplifiedList)}
      
      User Goal: "${promptText}"
      
      Task: Reorder the songs to best match the user's goal (e.g. flow by BPM, key, or energy).
      CRITICAL: Return ONLY a JSON array of the song "id"s in the new optimized order.
      Example usage: ["id_123", "id_456"]
      `;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      let text = data.result;
      if (text.startsWith("```json")) text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      else if (text.startsWith("```")) text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");

      const optimizedIds = JSON.parse(text);

      if (!Array.isArray(optimizedIds)) throw new Error("AI did not return an array");
      const itemMap = new Map(items.map(item => [String(item.id), item]));

      const newOrder = [];
      optimizedIds.forEach(id => {
        const item = itemMap.get(String(id));
        if (item) {
          newOrder.push(item);
          itemMap.delete(String(id)); // Remove so we know what's left
        }
      });
      itemMap.forEach(item => newOrder.push(item));

      setItems(newOrder);
      setAiCurated(true);
      toast.success("Setlist optimized by AI!");

    } catch (e) {
      console.error(e);
      toast.error("Failed to optimize flow.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRemove = (indexToRemove) => {
    const newItems = items.filter((_, index) => index !== indexToRemove);
    setItems(newItems);
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-[#1a2c38] border border-[#223949] rounded-2xl p-6 flex flex-wrap md:flex-nowrap justify-between items-center gap-4 shadow-xl shadow-black/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-900/20 to-transparent pointer-events-none"></div>

          <div className="relative z-10">
            <h2 className="text-2xl text-white font-bold mb-1 flex items-center gap-3">
              Tonight&apos;s Set
              {aiCurated && (
                <span className="animate-in fade-in zoom-in duration-300 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wide border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  AI Curated Flow
                </span>
              )}
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#90b2cb] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Est. Duration: <span className="text-white font-mono font-bold">{totalDuration}</span>
              </span>
              <span className="text-[#90b2cb] flex items-center gap-2">
                <ListMusic className="w-4 h-4" />
                Tracks: <span className="text-white font-mono font-medium">{items.length}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="hidden xl:block text-right">
              <div className="flex items-center justify-end gap-1 text-xs text-emerald-400 font-bold uppercase tracking-wider mb-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Gemini API Ready
              </div>
              <div className="text-xs text-[#90b2cb]">AI can suggest better flow based on mood tags</div>
            </div>

            <button
              onClick={handleOptimizeClick} // Updated Handler
              disabled={isOptimizing}
              className={`relative overflow-hidden group flex items-center gap-3 px-6 py-3.5 rounded-xl text-white font-bold shadow-lg transition-all border border-white/10
                ${isOptimizing
                  ? 'bg-[#223949] cursor-not-allowed opacity-80'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]'
                }
              `}
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-[#90b2cb]" />
                  <span className="text-[#90b2cb]">Optimizing...</span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <Sparkles className="relative z-10 w-5 h-5" />
                  <span className="relative z-10 text-base">Optimize Flow</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="relative min-h-[400px]">
          {isOptimizing && (
            <div className="absolute inset-0 z-50 bg-[#101b22]/50 backdrop-blur-sm flex flex-col gap-3 animate-in fade-in duration-300">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-[88px] w-full bg-[#223949]/40 rounded-xl animate-pulse border border-[#223949]/50"></div>
              ))}
            </div>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="setlist-droppable">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="flex flex-col gap-3 pb-20">
                  {items.map((item, index) => (
                    <Draggable key={item.uniqueId || item.id} draggableId={String(item.uniqueId || item.id)} index={index} isDragDisabled={isOptimizing}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group relative flex gap-4 bg-[#101b22] hover:bg-[#223949] border rounded-xl px-4 py-5 justify-between transition-all 
                            ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-[#0d93f2] bg-[#1a2c38] z-50' : 'border-[#223949]'}
                          `}
                          style={{ ...provided.draggableProps.style }}
                        >
                          {index === 0 && !snapshot.isDragging && (<div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0d93f2] rounded-l-xl"></div>)}
                          <div className="flex items-start gap-5">
                            <div {...provided.dragHandleProps} className="text-[#90b2cb]/30 group-hover:text-[#90b2cb] flex items-center justify-center shrink-0 w-6 pt-1.5 cursor-grab active:cursor-grabbing hover:bg-white/5 rounded">
                              <GripVertical className="w-6 h-6" />
                            </div>
                            <div className="flex flex-1 flex-col justify-center">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`font-mono text-base ${index === 0 ? 'text-[#0d93f2] font-bold' : 'text-[#90b2cb]'}`}>{String(index + 1).padStart(2, '0')}</span>
                                <p className={`text-xl leading-normal ${index === 0 ? 'text-white font-bold' : 'text-white/90 group-hover:text-white font-medium'}`}>{item.title}</p>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {item.tags.map((tag, i) => (
                                  <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border ${tag.color === 'indigo' ? 'bg-[#1e1b4b] text-indigo-300 border-indigo-500/30' : tag.color === 'red' ? 'bg-[#450a0a] text-red-300 border-red-500/30' : 'bg-[#223949] text-[#90b2cb] border-white/10'}`}>{tag.label}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end justify-between gap-2">
                            <span className="font-mono text-sm text-[#90b2cb]">{item.duration}</span>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button className="text-[#90b2cb] hover:text-white p-1.5 rounded hover:bg-white/10"><Lock className="w-4 h-4" /></button>
                              <button onClick={() => handleRemove(index)} className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-white/10"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {}
      <PromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFinalSubmit}
      />
    </>
  );
}