'use client';

import React, { useState } from 'react';
import { X, Upload, Calendar, MapPin, Layers, Loader2 } from 'lucide-react';

export default function CreateShowModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    venue: '',
    date: '',
    type: 'Touring'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  // Fetch pending requests on mount
  React.useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/production/events/pending');
        const data = await res.json();
        if (data.success) {
          setPendingRequests(data.data);
        }
      } catch (e) { console.error("Failed to load requests", e); }
    }
    fetchPending();
  }, []);

  const handleSelectRequest = (e) => {
    const reqId = e.target.value;
    if (!reqId) {
      setSelectedRequestId(null);
      setFormData({ title: '', artist: '', venue: '', date: '', 'type': 'Touring' }); // Reset
      return;
    }

    const req = pendingRequests.find(r => r._id === reqId);
    if (req) {
      setSelectedRequestId(reqId);
      setFormData({
        title: req.title,
        artist: req.artist,
        venue: req.venue?.name || req.city, // Handle populated venue
        date: req.date ? new Date(req.date).toISOString().split('T')[0] : '',
        type: req.genre || 'Touring'
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // If we selected a request, we UPDATE it to 'active' instead of creating new
      const url = selectedRequestId
        ? `/api/production/events/${selectedRequestId}`
        : '/api/production/events';

      const method = selectedRequestId ? 'PUT' : 'POST';
      const payload = selectedRequestId ? { ...formData, status: 'active' } : formData;

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        onSave(data.data);
      } else {
        alert(data.error || 'Failed to save show');
      }
    } catch (err) {
      console.error(err);
      alert('System error saving show');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#18181B] border border-[#27272A] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#27272A]">
          <div>
            <h2 className="text-white font-bold text-xl tracking-tight">
              {selectedRequestId ? 'Initialize Production' : 'Create New Show'}
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              {selectedRequestId ? 'From Artist Request' : 'Manual Entry'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">

          {/* PENDING REQUESTS DROPDOWN */}
          {pendingRequests.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-2">
              <label className="block text-xs font-bold text-blue-400 uppercase mb-2">
                Select Assigned Show ({pendingRequests.length})
              </label>
              <select
                onChange={handleSelectRequest}
                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer text-sm"
              >
                <option value="">-- Start from Scratch --</option>
                {pendingRequests.map(req => (
                  <option key={req._id} value={req._id}>
                    {req.title} (Artist: {req.artist})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Show Name / Tour Title</label>
            <input
              autoFocus
              type="text"
              required
              placeholder="e.g. Neon Nights World Tour"
              className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-700 font-medium"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Type Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Production Type</label>
              <div className="relative">
                <select
                  className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option>Touring</option>
                  <option>Festival</option>
                  <option>Corporate</option>
                  <option>Theatre</option>
                </select>
                <Layers className="absolute right-3 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg px-4 py-2.5 text-white focus:ring-1 focus:ring-blue-500 outline-none text-sm [color-scheme:dark]"
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  value={formData.date}
                />
              </div>
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Venue / Location</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Wembley Stadium"
                className="w-full bg-[#0F0F10] border border-[#27272A] rounded-lg pl-10 pr-4 py-3 text-white focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-gray-700"
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                value={formData.venue}
              />
              <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Rider Upload (Visual Only) */}
          <div className="border-2 border-dashed border-[#27272A] rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-[#0F0F10] hover:border-blue-500/50 transition-all cursor-pointer group">
            <div className="size-10 rounded-full bg-[#0F0F10] flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Upload className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Drop Technical Rider (PDF)</p>
            <p className="text-xs text-gray-600">Optional • Max 10MB</p>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg font-bold text-sm text-gray-400 hover:text-white hover:bg-[#27272A] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}