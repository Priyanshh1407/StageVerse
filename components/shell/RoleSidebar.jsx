'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Compass, Image as ImageIcon, Users, MessageSquare, Bell, Calendar, PlusCircle, BarChart3,
  ListMusic, FileText, CalendarClock, ClipboardList, Radio, CheckSquare, Cable, Boxes, Lightbulb, Home, LogOut, Menu, X,
} from 'lucide-react';
import Logo from '@/components/brand/Logo';
import NotificationsModal from '@/components/fan/dashboard/NotificationsModal';
import MessagesModal from '@/components/fan/MessagesModal';
import CrewMessagesModal from './CrewMessagesModal';
import { ROLE_INFO } from '@/lib/roles';
import { nextShow } from '@/lib/shows';

// The crew's pages for one show (patch sheet, patch studio, logistics) need that show: the one in the address,
// otherwise the last one picked (remembered here, set by the crew's project picker)
export const PROJECT_KEY = 'sv:project';
const PROJECT_PAGE = /^\/(patch-sheet|patch-studio|logistics|live)\/([^/]+)/;

/** Every role's pages, in the same order of importance: home first, then the work, then messages. */
const NAV = {
  fan: [
    { label: 'My dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Discover shows', href: '/discover', icon: Compass },
    { label: 'Memories', href: '/memory-vault', icon: ImageIcon },
    { label: 'Friends', href: '/social', icon: Users },
    { label: 'Messages', action: 'messages', icon: MessageSquare },
    { label: 'Notifications', action: 'notifications', icon: Bell },
  ],
  organizer: [
    { label: 'Dashboard', href: '/manage/dashboard', icon: LayoutDashboard },
    { label: 'My events', href: '/events', icon: Calendar },
    { label: 'Create an event', href: '/create-event', icon: PlusCircle },
    { label: 'Analytics', href: '/analysis', icon: BarChart3 },
  ],
  artist: [
    { label: 'Dashboard', href: '/artist-dashboard', icon: LayoutDashboard },
    { label: 'Setlists', href: '/setlist-builder', icon: ListMusic },
    { label: 'Tech rider', href: '/tech-rider', icon: FileText },
    { label: 'Day sheets', href: '/day-sheet', icon: CalendarClock },
    { label: 'Guest list', href: '/guest-list', icon: ClipboardList },
    { label: 'Live show', href: '/live-show', icon: Radio },
    { label: 'Crew messages', action: 'crew', icon: MessageSquare },
  ],
  production: [
    { label: 'Dashboard', href: '/prod-dashboard', icon: LayoutDashboard },
    { label: 'Tasks', href: '/tasks', icon: CheckSquare },
    { label: 'Patch sheet', project: '/patch-sheet', icon: Cable },
    { label: 'Patch studio', project: '/patch-studio', icon: Lightbulb },
    { label: 'Logistics', project: '/logistics', icon: Boxes },
    { label: 'Live show', href: '/live', icon: Radio },
  ],
};

const isActive = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * The one menu for every role: who you are, your pages, then Back to the site and Log out, always in the same places.
 * `variant`: 'inline' (inside a page's own layout, the fan's and organizer's pages: a drawer on phones, opened by the
 * page's menu button) or 'shell' (the artist's and crew's layouts: it brings its own phone bar). `rail`: icons only,
 * for the dense editors.
 */
export default function RoleSidebar({ role, variant = 'inline', isOpen = false, onClose = () => {}, onOpenNotifications = null, rail = false }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [open, setOpen] = useState(false); // the shell's own drawer on phones
  const drawerOpen = variant === 'shell' ? open : isOpen;
  const close = () => { if (variant === 'shell') setOpen(false); else onClose(); };
  const [user, setUser] = useState(null);
  const [panel, setPanel] = useState(null); // 'messages' | 'notifications' | 'crew'
  const [messageStart, setMessageStart] = useState(null);
  const [project, setProject] = useState(null);
  const [crewCount, setCrewCount] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me').then((r) => (r.ok ? r.json() : null)).then((j) => { if (alive && j?.user) setUser(j.user); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  // any fan page can open a conversation (e.g. "Message" on a friend)
  useEffect(() => {
    if (role !== 'fan') return undefined;
    const openMessages = (e) => { setMessageStart(e.detail ?? null); setPanel('messages'); };
    window.addEventListener('sv:open-messages', openMessages);
    return () => window.removeEventListener('sv:open-messages', openMessages);
  }, [role]);
  // the crew's show: the address's, else the last one picked
  useEffect(() => {
    if (role !== 'production') return undefined;
    const read = () => {
      const fromPath = PROJECT_PAGE.exec(pathname)?.[2] ?? null;
      let saved = null;
      try { saved = localStorage.getItem(PROJECT_KEY); } catch { saved = null; }
      if (fromPath) { try { localStorage.setItem(PROJECT_KEY, fromPath); } catch { /* private mode */ } }
      setProject(fromPath ?? saved);
    };
    read();
    window.addEventListener('sv:project', read);
    return () => window.removeEventListener('sv:project', read);
  }, [role, pathname]);
  // (no show picked yet, or one remembered from another account: the crew's next show from their own list, so Patch
  // sheet, Patch studio and Logistics always open a show this person works on; they led back to the dashboard)
  const [shows, setShows] = useState(null);
  useEffect(() => {
    if (role !== 'production') return undefined;
    let alive = true;
    fetch('/api/production/dashboard').then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (alive) setShows(Array.isArray(j?.data?.shows) ? j.data.shows : []);
    }).catch(() => { if (alive) setShows([]); });
    return () => { alive = false; };
  }, [role]);
  useEffect(() => {
    if (role !== 'production' || !shows?.length) return;
    const ids = shows.map((s) => String(s.eventId ?? s.id));
    if (project && ids.includes(String(project))) return;
    if (PROJECT_PAGE.test(pathname)) return; // (a show in the address is the one on screen)
    const next = nextShow(shows);
    if (!next) return;
    const id = String(next.eventId ?? next.id);
    try { localStorage.setItem(PROJECT_KEY, id); } catch { /* private mode */ }
    setProject(id); // eslint-disable-line react-hooks/set-state-in-effect
  }, [role, shows, project, pathname]);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      try { localStorage.removeItem('user'); } catch { /* private mode */ }
      router.push('/');
      router.refresh();
    } catch (err) { console.error('Logout failed', err); }
  };

  const items = NAV[role] ?? [];
  const roleName = ROLE_INFO[role]?.label ?? '';
  // (a rail: icons only from tablet size up; the phone drawer always shows the names)
  const railBox = rail ? 'px-4 md:justify-center md:px-0' : 'px-4';
  const name = (text) => <span className={rail ? 'md:sr-only' : ''}>{text}</span>;
  const linkClass = (active) => `flex min-h-11 items-center gap-3 rounded-xl ${railBox} text-sm font-medium transition-all ${active
    ? 'bg-gradient-to-r from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-black shadow-lg shadow-orange-600/25'
    : 'text-slate-300 hover:bg-white/5 hover:text-white'}`;

  const renderItem = (item) => {
    const label = name(item.label);
    if (item.action) {
      const badge = item.action === 'crew' && crewCount > 0 ? crewCount : null;
      return (
        <button key={item.label} type="button" title={rail ? item.label : undefined}
          onClick={() => { close(); if (item.action === 'notifications' && onOpenNotifications) onOpenNotifications(); else { setMessageStart(null); setPanel(item.action); } }}
          className={`${linkClass(false)} w-full text-left relative`}>
          <item.icon className="h-5 w-5 shrink-0" aria-hidden />
          {label}
          {badge && <span className={`${rail ? 'ml-auto md:absolute md:right-1 md:top-1' : 'ml-auto'} rounded-full bg-red-500 px-1.5 text-xs font-bold text-white`}>{badge}</span>}
        </button>
      );
    }
    // (a crew page for one show: the show picked, else (no shows at all) the dashboard, which says how to get one)
    const href = item.project ? (project ? `${item.project}/${project}` : '/prod-dashboard') : item.href;
    const active = item.project ? pathname.startsWith(`${item.project}/`) : isActive(pathname, item.href);
    return (
      <Link key={item.label} href={href} onClick={close} aria-current={active ? 'page' : undefined}
        title={rail ? item.label : item.project && !project ? 'Pick a show on your dashboard first' : undefined}
        className={linkClass(active)}>
        <item.icon className="h-5 w-5 shrink-0" aria-hidden />
        {label}
      </Link>
    );
  };

  const body = (
    <>
      <div className={`mb-6 mt-1 flex items-center justify-between px-2 ${rail ? 'md:justify-center md:px-0' : ''}`}>
        <Link href="/" onClick={close} aria-label="StageVerse home" className="flex flex-col gap-1">
          <span className={rail ? 'md:hidden' : ''}><Logo size="sm" theme="auto" /></span>
          {rail && <span aria-hidden className="hidden h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[#ffb000] via-[#ff6a00] to-[#ff3d7a] text-sm font-black text-black md:grid">SV</span>}
          <span className={`text-xs font-semibold text-slate-400 ${rail ? 'md:hidden' : ''}`}>{roleName}{user?.name ? ` · ${user.name.split(' ')[0]}` : ''}</span>
        </Link>
        <button type="button" onClick={close} aria-label="Close the menu" className="grid h-11 w-11 place-items-center rounded-lg text-slate-300 hover:bg-white/10 md:hidden">
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>
      <nav aria-label={`${roleName} pages`} className="flex flex-1 flex-col gap-1">
        {items.map(renderItem)}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-white/10 pt-4">
        <Link href="/" onClick={close} title={rail ? 'Back to the site' : undefined} className={linkClass(false)}>
          <Home className="h-5 w-5 shrink-0" aria-hidden />{name('Back to the site')}
        </Link>
        <button type="button" onClick={logout} title={rail ? 'Log out' : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-xl ${railBox} text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-300`}>
          <LogOut className="h-5 w-5 shrink-0" aria-hidden />{name('Log out')}
        </button>
      </div>
    </>
  );

  const asideClass = `fixed left-0 top-0 z-50 flex h-[100dvh] ${rail ? 'w-64 md:w-20' : 'w-64'} shrink-0 flex-col border-r border-white/10 bg-[#121c26] p-4 text-white transition-transform duration-300 md:sticky md:translate-x-0 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`;

  return (
    <>
      {/* the shell's phone bar: the logo and the menu button (the inline pages have their own) */}
      {variant === 'shell' && (
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#121c26] px-4 md:hidden">
          <Link href="/" aria-label="StageVerse home"><Logo size="sm" theme="auto" /></Link>
          <button type="button" onClick={() => setOpen(true)} aria-label="Open the menu" aria-expanded={open}
            className="grid h-11 w-11 place-items-center rounded-lg text-white hover:bg-white/10">
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      )}
      <div aria-hidden className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden ${drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={close} />
      {/* (on phones the drawer always shows the names, a rail only on bigger screens) */}
      <aside className={asideClass}>{body}</aside>
      {role === 'fan' && <NotificationsModal isOpen={panel === 'notifications'} onClose={() => setPanel(null)} />}
      {role === 'fan' && <MessagesModal isOpen={panel === 'messages'} start={messageStart} onClose={() => { setPanel(null); setMessageStart(null); }} />}
      {role === 'artist' && <CrewMessagesModal isOpen={panel === 'crew'} onClose={() => setPanel(null)} onCount={setCrewCount} />}
    </>
  );
}
