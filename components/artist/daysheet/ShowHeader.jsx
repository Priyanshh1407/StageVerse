import { useState, useEffect } from 'react';
import { MessageSquare, CalendarDays, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function ShowHeader({ city, venue, date }) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isCalendarOpen) setIsCalendarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalendarOpen]);  useEffect(() => {
    if (isCalendarOpen && events.length === 0) {
      fetch('/api/artist/day-sheet', { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (data.success) setEvents(data.data);
        })
        .catch(err => console.error("Calendar fetch error:", err));
    }
  }, [isCalendarOpen]);  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay, year, month };
  };

  const { days, firstDay, year, month } = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-[#315168]/30">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-black leading-tight tracking-tighter uppercase text-slate-900 dark:text-white">
              {city}
            </h1>
            <span className="px-3 py-1 rounded-full bg-[#0d93f2]/20 text-[#0d93f2] text-xs font-bold uppercase tracking-wider border border-[#0d93f2]/30 animate-pulse">
              Live Sync
            </span>
          </div>
          <p className="text-slate-500 dark:text-[#90b2cb] text-lg md:text-xl font-medium">
            {venue} • {date}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none h-12 px-6 rounded-lg bg-[#223949] hover:bg-[#315168] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
            <MessageSquare className="w-5 h-5" />
            <span>Tour Manager</span>
          </button>
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="h-12 w-12 rounded-lg border border-[#315168] text-[#90b2cb] hover:text-white flex items-center justify-center transition-colors"
          >
            <CalendarDays className="w-5 h-5" />
          </button>
        </div>
      </div>

      {}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#131d24] border border-[#315168] rounded-2xl shadow-2xl p-6">

            {}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Tour Schedule</h3>
              <button onClick={() => setIsCalendarOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-[#223949] rounded-full text-white"><ChevronLeft className="w-5 h-5" /></button>
              <span className="font-bold text-white uppercase tracking-wider">{monthName}</span>
              <button onClick={nextMonth} className="p-2 hover:bg-[#223949] rounded-full text-white"><ChevronRight className="w-5 h-5" /></button>
            </div>

            {}
            <div className="grid grid-cols-7 mb-2 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-xs text-slate-500 font-bold">{d}</div>
              ))}
            </div>

            {}
            <div className="grid grid-cols-7 gap-2">
              {}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}

              {}
              {Array.from({ length: days }).map((_, i) => {
                const dayNum = i + 1;                const thisDateStr = new Date(year, month, dayNum).toDateString();
                const eventOnDay = events.find(e => new Date(e.date).toDateString() === thisDateStr);

                return (
                  <div key={dayNum} className="aspect-square flex flex-col items-center justify-center relative">
                    {eventOnDay ? (
                      <Link
                        href={`/day-sheet/${eventOnDay._id || eventOnDay.eventId}`} // Use correct ID
                        className="w-full h-full flex items-center justify-center rounded-full bg-[#0d93f2] text-white font-bold shadow-lg hover:scale-110 transition-transform cursor-pointer"
                      >
                        {dayNum}
                      </Link>
                    ) : (
                      <div className="text-slate-500 text-sm">{dayNum}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-3 h-3 rounded-full bg-[#0d93f2]"></div>
              <span>Show Day</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
}