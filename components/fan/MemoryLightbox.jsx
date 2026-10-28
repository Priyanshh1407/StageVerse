'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, MapPin, Calendar, Music } from 'lucide-react';

// Dates arrive as ISO strings (memory vault) or already formatted ("Oct 2026", fan dashboard)
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(String(date))) return String(date);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * A memory shown full size, with its details. `items` is the list being browsed and `index` the
 * open one (null = closed). Arrow keys and the side buttons step through the list; Esc, the close
 * button or a click on the backdrop closes it.
 */
export default function MemoryLightbox({ items, index, onClose, onIndex }) {
  const open = index !== null && index >= 0 && index < items.length;
  const count = items.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && count > 1) onIndex((index + 1) % count);
      else if (e.key === 'ArrowLeft' && count > 1) onIndex((index - 1 + count) % count);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, count, onClose, onIndex]);

  if (!open) return null;
  const item = items[index];
  const isVideo = item.type === 'video' && item.videoSrc;
  const place = [item.venue, item.location].filter(Boolean).join(', ');
  const date = formatDate(item.date);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.title || 'Memory'}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 py-3 text-slate-300 text-sm">
        <span>{count > 1 ? `${index + 1} / ${count}` : ''}</span>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white" aria-label="Close">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 mx-4 md:mx-16" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={item.videoSrc} poster={item.image} controls autoPlay playsInline className="w-full h-full object-contain" />
        ) : item.image ? (
          <Image src={item.image} alt={item.title || 'Memory'} fill sizes="100vw" className="object-contain" priority />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">No image for this memory</div>
        )}
      </div>

      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + count) % count); }}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Previous memory"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % count); }}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Next memory"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      <div className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-white text-xl md:text-2xl font-bold">{item.title}</h3>
        {item.subtitle && <p className="text-slate-300 text-sm mt-1">{item.subtitle}</p>}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 mt-2 text-slate-400 text-xs">
          {item.artist && <span className="flex items-center gap-1"><Music className="w-3.5 h-3.5" />{item.artist}</span>}
          {place && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{place}</span>}
          {date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{date}</span>}
        </div>
      </div>
    </div>
  );
}
