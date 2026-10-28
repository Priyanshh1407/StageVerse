'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import FanSidebar from '@/components/fan/FanSidebar';
import { Menu, Users, UserPlus, UserCheck, Search, Calendar, MapPin, Ticket, Loader2 } from 'lucide-react';

function Avatar({ name, src, size = 48 }) {
  if (src) {
    return (
      <div className="relative shrink-0 rounded-full overflow-hidden" style={{ width: size, height: size }}>
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      </div>
    );
  }
  return (
    <div className="shrink-0 rounded-full bg-[#0d93f2]/20 text-[#0d93f2] font-bold flex items-center justify-center" style={{ width: size, height: size }}>
      {name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  );
}

const showDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export default function SocialPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [following, setFollowing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [goingWith, setGoingWith] = useState([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(null); // id of the person being (un)followed

  const load = async () => {
    try {
      const [social, friends] = await Promise.all([
        fetch('/api/social').then((r) => r.json()),
        fetch('/api/discover/friends').then((r) => r.json()),
      ]);
      if (social.success) {
        setFollowing(social.following);
        setSuggestions(social.suggestions);
      }
      if (friends.success) setGoingWith(friends.data);
    } catch {
      toast.error('Could not load your friends');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    load();
  }, []);

  const setFollow = async (person, follow) => {
    setBusy(person.id);
    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: person.id, follow }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      toast.success(follow ? `You're following ${person.name}` : `Unfollowed ${person.name}`);
      await load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const q = search.trim().toLowerCase();
  const shownFollowing = following.filter((f) => !q || f.name.toLowerCase().includes(q) || f.location.toLowerCase().includes(q));

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white overflow-hidden">
      <FanSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a2632]">
          <span className="font-bold text-lg">Friends</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300" aria-label="Open menu">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto flex flex-col gap-10 pb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Friends</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">The people you go to shows with, and where they&apos;re going next.</p>
              </div>
              <div className="relative md:w-72">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search friends..."
                  className="w-full bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#0d93f2]"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#0d93f2]" /></div>
            ) : (
              <>
                {goingWith.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Ticket className="w-5 h-5 text-[#0d93f2]" />Shows your friends are going to</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {goingWith.map((event) => (
                        <div key={event.id} className="flex gap-4 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                          <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-800">
                            {event.image && <Image src={event.image} alt={event.title} fill sizes="96px" className="object-cover" />}
                          </div>
                          <div className="min-w-0 flex flex-col justify-between">
                            <div>
                              <p className="font-bold truncate">{event.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1"><Calendar className="w-3 h-3" />{event.date}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex -space-x-2">
                                {event.attendees.slice(0, 4).map((a) => (
                                  <div key={a.id} className="ring-2 ring-white dark:ring-[#1a2632] rounded-full" title={a.name}>
                                    <Avatar name={a.name} src={a.img} size={28} />
                                  </div>
                                ))}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {event.attendees.map((a) => a.name.split(' ')[0]).slice(0, 2).join(', ')}
                                {event.attendees.length > 2 ? ` +${event.attendees.length - 2}` : ''} going
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Users className="w-5 h-5 text-[#0d93f2]" />Following ({following.length})</h3>
                  {shownFollowing.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {shownFollowing.map((f) => (
                        <div key={f.id} className="bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={f.name} src={f.avatar} />
                            <div className="min-w-0">
                              <p className="font-bold truncate">{f.name}</p>
                              {f.location && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{f.location}</p>}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {f.sharedShows > 0 ? `${f.sharedShows} show${f.sharedShows > 1 ? 's' : ''} together` : 'No shows together yet'}
                          </p>
                          {f.nextShow && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">Next: <span className="text-[#0d93f2] font-medium">{f.nextShow.title}</span>, {showDate(f.nextShow.date)}</p>
                          )}
                          <button
                            onClick={() => setFollow(f, false)}
                            disabled={busy === f.id}
                            className="mt-auto flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold border border-slate-200 dark:border-slate-700 hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-50"
                          >
                            <UserCheck className="w-4 h-4" /> Following
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                      {q ? 'No friends match your search.' : 'You are not following anyone yet. Start with the people below, or find shows on '}
                      {!q && <Link href="/discover" className="text-[#0d93f2] font-medium">Discover</Link>}
                    </div>
                  )}
                </section>

                {suggestions.length > 0 && (
                  <section>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><UserPlus className="w-5 h-5 text-[#0d93f2]" />People going to your shows</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {suggestions.map((p) => (
                        <div key={p.id} className="bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-3">
                          <Avatar name={p.name} src={p.avatar} />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{p.reason}</p>
                          </div>
                          <button
                            onClick={() => setFollow(p, true)}
                            disabled={busy === p.id}
                            className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-[#0d93f2] hover:bg-[#0d93f2]/90 text-white disabled:opacity-50"
                          >
                            <UserPlus className="w-4 h-4" /> Follow
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
