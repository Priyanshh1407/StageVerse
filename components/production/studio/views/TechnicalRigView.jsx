'use client';

import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Pencil, Trash2, Info, Loader2, X, Save } from 'lucide-react';

export default function TechnicalRigView({ fixtures, onDeleteFixture, onEditFixture }) {
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingFixture, setEditingFixture] = useState(null);
  const [viewingFixture, setViewingFixture] = useState(null);  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-menu-container')) {
        setActiveMenuId(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {        setEditingFixture(null);
        setViewingFixture(null);
        setActiveMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleMenu = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editingFixture && onEditFixture) {
      onEditFixture(editingFixture);
      setEditingFixture(null);
    }
  };

  return (
    <div className="min-h-[500px] pb-32 relative">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead className="bg-[#18181B] sticky top-0 z-20 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
          <tr>
            <th className="py-3 px-4 border-b border-[#27272A] w-16">ID</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Fixture Name</th>
            <th className="py-3 px-4 border-b border-[#27272A] text-center w-24">Universe</th>
            <th className="py-3 px-4 border-b border-[#27272A] w-32">Address</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Mode (Ch)</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Linked Cue</th>
            <th className="py-3 px-4 border-b border-[#27272A]">Status</th>
            <th className="py-3 px-4 border-b border-[#27272A] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#27272A] text-xs">

          {fixtures && fixtures.length > 0 ? (
            fixtures.map((fixture) => (
              <FixtureRow
                key={fixture.fixtureId || fixture.id}
                fixture={fixture}
                id={fixture.fixtureId || fixture.id}
                name={fixture.profile}
                univ={fixture.universe}
                addr={fixture.address}
                mode={fixture.mode}
                cue={fixture.cue}
                cueColor={fixture.cueColor}
                status={['conflict', 'collision', 'error'].includes(fixture.status) ? 'Collision' : 'Patched'}
                isConflict={['conflict', 'collision', 'error'].includes(fixture.status)}
                isOpen={activeMenuId === (fixture.fixtureId || fixture.id)}
                onToggle={() => toggleMenu(fixture.fixtureId || fixture.id)}
                onDelete={onDeleteFixture}
                onEdit={() => setEditingFixture(fixture)}
                onView={() => setViewingFixture(fixture)}
              />
            ))
          ) : (
            <tr>
              <td colSpan="8" className="py-12 text-center text-gray-500 italic">
                No fixtures patched yet. Switch to Creative Mode or use the Sidebar to add some!
              </td>
            </tr>
          )}

        </tbody>
      </table>

      {}
      {editingFixture && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16202a] border border-[#2c3e50] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#2c3e50] bg-[#111]">
              <h3 className="text-white font-bold flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-500" /> Edit Fixture {editingFixture.fixtureId}</h3>
              <button onClick={() => setEditingFixture(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Universe</label>
                  <input
                    type="number"
                    className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                    value={editingFixture.universe}
                    onChange={e => setEditingFixture({ ...editingFixture, universe: parseInt(e.target.value) })}
                    min={1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">Address</label>
                  <input
                    type="number"
                    className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                    value={editingFixture.address}
                    onChange={e => setEditingFixture({ ...editingFixture, address: parseInt(e.target.value) })}
                    min={1}
                    max={512}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Role / Cue</label>
                <select
                  value={editingFixture.cue}
                  onChange={e => {                    const colors = { "Intro Sequence": "blue", "Drum Solo": "red", "Main Wash": "orange", "Audience Blinders": "orange", "Specials": "blue" };
                    setEditingFixture({ ...editingFixture, cue: e.target.value, cueColor: colors[e.target.value] || 'blue' })
                  }}
                  className="w-full bg-[#0b1219] border border-[#2c3e50] rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                >
                  <option value="Intro Sequence">Intro Sequence</option>
                  <option value="Drum Solo">Drum Solo</option>
                  <option value="Main Wash">Main Wash</option>
                  <option value="Audience Blinders">Audience Blinders</option>
                  <option value="Specials">Specials</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg mt-2 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {}
      {viewingFixture && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16202a] border border-[#2c3e50] rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[#2c3e50] bg-[#111]">
              <h3 className="text-white font-bold flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> Fixture Details</h3>
              <button onClick={() => setViewingFixture(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">

              <div className="bg-[#0b1219] p-4 rounded-lg border border-[#2c3e50] space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500">Fixture ID</label>
                    <div className="text-white font-mono text-sm">{viewingFixture.fixtureId || viewingFixture.id}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500">Channels</label>
                    <div className="text-white font-mono text-sm">{viewingFixture.channels}</div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500">Profile</label>
                  <div className="text-white text-sm font-bold">{viewingFixture.profile}</div>
                  <div className="text-gray-400 text-xs">{viewingFixture.mode}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#2c3e50] mt-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500">Universe</label>
                    <div className="text-blue-400 font-mono text-lg">{viewingFixture.universe}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500">Address</label>
                    <div className="text-blue-400 font-mono text-lg">{viewingFixture.address}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2c3e50] mt-2">
                  <label className="text-[10px] uppercase font-bold text-gray-500">Role</label>
                  <div className="text-white text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full bg-${viewingFixture.cueColor}-500 inline-block`}></span>
                    {viewingFixture.cue}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setViewingFixture(null)}
                className="w-full bg-[#27272A] hover:bg-[#3F3F46] text-white font-bold py-3 rounded-lg mt-2 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}function FixtureRow({ id, name, univ, addr, mode, cue, cueColor, status, isConflict, isOpen, onToggle, onDelete, onEdit, onView }) {  const getCueColors = (color) => {
    const map = {
      blue: { bg: 'bg-blue-900/20', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
      orange: { bg: 'bg-orange-900/20', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-500' },
      red: { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
    };
    return map[color] || map.blue;
  };
  const theme = getCueColors(cueColor);

  return (
    <tr className={`transition-colors group relative ${isConflict ? 'bg-red-900/5 hover:bg-red-900/10 border-l-2 border-l-red-500' : 'hover:bg-[#18181B]'}`}>

      <td className={`py-3 px-4 font-bold ${isConflict ? 'text-white pl-3.5' : 'text-white'}`}>{id}</td>
      <td className="py-3 px-4 text-gray-400 group-hover:text-gray-300 transition-colors">{name}</td>

      <td className={`py-3 px-4 text-center font-mono ${isConflict ? 'text-white bg-[#18181B]/50 font-bold' : 'text-gray-300 bg-[#18181B]/50'}`}>
        {univ}
      </td>

      <td className="py-3 px-4">
        <div className="flex flex-col gap-1">
          <span className={`font-mono text-xs ${isConflict ? 'text-red-400 font-bold' : 'text-white'}`}>{addr}</span>
          <div className="w-16 h-1 bg-[#27272A] rounded-full overflow-hidden relative">
            <div className={`h-full w-[20%] ${isConflict ? 'bg-red-500/50 w-full animate-pulse absolute inset-0' : 'bg-green-500'}`}></div>
          </div>
        </div>
      </td>

      <td className="py-3 px-4 text-gray-400">{mode}</td>

      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${theme.bg} ${theme.text} ${theme.border}`}>
          <span className={`size-1.5 rounded-full ${theme.dot}`}></span> {cue}
        </span>
      </td>

      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${isConflict ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`}></span>
          <span className={isConflict ? 'text-red-400 font-bold' : 'text-gray-300'}>{status}</span>
        </div>
      </td>

      {}
      <td className="py-3 px-4 text-right relative action-menu-container">

        {isConflict && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="mr-3 bg-red-600 hover:bg-red-500 text-white text-[10px] uppercase font-bold py-1 px-3 rounded shadow-lg shadow-red-900/20 transition-all"
          >
            Fix
          </button>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`text-gray-600 hover:text-white transition-colors p-1 rounded ${isOpen ? 'text-white bg-[#27272A]' : ''}`}
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>

        {}
        {isOpen && (
          <div className="absolute right-8 top-8 w-40 bg-[#27272A] border border-[#3F3F46] rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
            <div className="flex flex-col py-1">

              <button
                onClick={() => { onEdit(); onToggle(); }}
                className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-blue-600 transition-colors w-full text-left group/item"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-500 group-hover/item:text-white" />
                Edit Fixture
              </button>

              <button
                onClick={() => { onView(); onToggle(); }}
                className="flex items-center gap-3 px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-blue-600 transition-colors w-full text-left group/item"
              >
                <Info className="w-3.5 h-3.5 text-gray-500 group-hover/item:text-white" />
                View Details
              </button>

              <div className="h-px bg-[#3F3F46] my-1 mx-2"></div>

              <button
                onClick={() => onDelete(id)}
                className="flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:text-white hover:bg-red-600 transition-colors w-full text-left group/item"
              >
                <Trash2 className="w-3.5 h-3.5 group-hover/item:text-white" />
                Delete
              </button>

            </div>
          </div>
        )}
      </td>
    </tr>
  );
}