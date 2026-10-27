'use client';

import { useState } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight, Edit2, MoreHorizontal, Clock, CheckCircle } from 'lucide-react';

export default function GuestTable({ data, onDelete, onEdit, onCheckIn }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState('All Tiers');

  const filteredData = data.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guest.email && guest.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTier = filterTier === 'All Tiers' || guest.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const timeAgo = (dateStr) => {
    const diff = (new Date() - new Date(dateStr)) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return '1d+ ago';
  };

  return (
    <div className="w-full lg:col-span-2 flex flex-col gap-4">

      {}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-lg bg-white dark:bg-[#182934] border border-slate-200 dark:border-[#315168] text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2] outline-none transition-all"
            placeholder="Search by name or email..."
            type="text"
          />
        </div>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="h-11 px-3 rounded-lg bg-white dark:bg-[#182934] border border-slate-200 dark:border-[#315168] text-slate-700 dark:text-white outline-none focus:border-[#0d93f2] cursor-pointer w-full sm:w-auto min-w-[140px]"
        >
          <option>All Tiers</option>
          <option>All Access</option>
          <option>VIP</option>
          <option>Afterparty</option>
        </select>
      </div>

      {}
      <div className="bg-white dark:bg-[#182934] rounded-xl border border-slate-200 dark:border-[#315168] shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">

        {filteredData.length > 0 ? (
          <>
            {}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-[#223949] border-b border-slate-200 dark:border-[#315168]">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Guest</th>
                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Tier</th>
                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Added</th>
                    <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#223949]">
                  {filteredData.map((guest) => (
                    <GuestRow key={guest.id} guest={guest} timeAgo={timeAgo} onDelete={onDelete} onEdit={onEdit} onCheckIn={onCheckIn} />
                  ))}
                </tbody>
              </table>
            </div>

            {}
            <div className="md:hidden flex flex-col divide-y divide-slate-200 dark:divide-[#315168]">
              {filteredData.map((guest) => (
                <MobileGuestCard key={guest.id} guest={guest} timeAgo={timeAgo} onDelete={onDelete} onEdit={onEdit} onCheckIn={onCheckIn} />
              ))}
            </div>
          </>
        ) : (
          
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-500">
            <p>No guests found matching your filters.</p>
          </div>
        )}

        {}
        <div className="border-t border-slate-200 dark:border-[#315168] bg-slate-50 dark:bg-[#223949] px-4 md:px-6 py-3 flex items-center justify-between mt-auto">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredData.length} of {data.length} guests
          </p>
          <div className="flex gap-1">
            <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
            <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
function GuestRow({ guest, timeAgo, onDelete, onEdit, onCheckIn }) {
  const tierStyles = {
    'All Access': 'text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20',
    'VIP': 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    'Afterparty': 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  };

  const avatarColors = {
    indigo: 'bg-indigo-500/20 text-indigo-500',
    purple: 'bg-purple-500/20 text-purple-500',
    pink: 'bg-pink-500/20 text-pink-500',
    blue: 'bg-blue-500/20 text-blue-500',
    orange: 'bg-orange-500/20 text-orange-500',
  };

  return (
    <tr className={`group transition-colors ${guest.status === 'Checked In' ? 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-[#1e2e3a]'}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${avatarColors[guest.color] || avatarColors.blue}`}>
            {guest.initials}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{guest.name}</p>
            {guest.email && <p className="text-xs text-slate-500 dark:text-slate-400">{guest.email}</p>}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tierStyles[guest.tier]}`}>
          <span className={`w-1.5 h-1.5 rounded-full bg-current`}></span>
          {guest.tier}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${guest.status === 'Checked In' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
          {guest.status}
        </span>
      </td>
      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
        {timeAgo(guest.added)}
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onCheckIn(guest.id, guest.status)}
            title={guest.status === 'Checked In' ? "Undo Check-in" : "Check In"}
            className={`p-1.5 rounded-md transition-colors ${guest.status === 'Checked In' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(guest)} className="text-slate-400 hover:text-[#0d93f2] p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#223949] transition-colors"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(guest.id)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
}
function MobileGuestCard({ guest, timeAgo, onDelete, onEdit, onCheckIn }) {
  const tierStyles = {
    'All Access': 'text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20',
    'VIP': 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    'Afterparty': 'text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  };

  const avatarColors = {
    indigo: 'bg-indigo-500/20 text-indigo-500',
    purple: 'bg-purple-500/20 text-purple-500',
    pink: 'bg-pink-500/20 text-pink-500',
    blue: 'bg-blue-500/20 text-blue-500',
    orange: 'bg-orange-500/20 text-orange-500',
  };

  return (
    <div className={`p-4 flex flex-col gap-3 ${guest.status === 'Checked In' ? 'bg-emerald-50/30 dark:bg-emerald-900/10' : 'bg-white dark:bg-[#182934]'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${avatarColors[guest.color] || avatarColors.blue}`}>
            {guest.initials}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{guest.name}</p>
            {guest.email && <p className="text-xs text-slate-500 dark:text-slate-400">{guest.email}</p>}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onCheckIn(guest.id, guest.status)}
            className={`p-2 rounded-lg ${guest.status === 'Checked In' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' : 'text-slate-400 hover:text-emerald-500 bg-slate-50 dark:bg-[#223949]'}`}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(guest)} className="p-2 text-slate-400 hover:text-[#0d93f2] bg-slate-50 dark:bg-[#223949] rounded-lg"><Edit2 className="w-4 h-4" /></button>
          <button onClick={() => onDelete(guest.id)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-[#223949] rounded-lg"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold border ${tierStyles[guest.tier]}`}>
            {guest.tier}
          </span>
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${guest.status === 'Checked In' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
            {guest.status}
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <Clock className="w-3 h-3" />
          {timeAgo(guest.added)}
        </div>
      </div>
    </div>
  );
}