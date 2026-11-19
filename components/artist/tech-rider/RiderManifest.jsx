'use client';

import { ScrollText, FileJson, File } from 'lucide-react';

export default function RiderManifest({ gear, hazer, onDownloadPDF }) {
  const totalItems = gear.reduce((acc, item) => acc + item.count, 0) + (hazer ? 1 : 0);
  const activeGear = gear.filter(g => g.count > 0);
  // the rider as a file: the gear asked for, and the hazer
  const downloadJson = () => {
    const rider = { gear: activeGear.map(({ name, type, count }) => ({ name, type, count })), hazer: Boolean(hazer), totalItems };
    const url = URL.createObjectURL(new Blob([JSON.stringify(rider, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'tech-rider.json' });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-full lg:w-80 flex-none">
      <div className="sticky top-24 flex flex-col gap-6">

        {}
        <div className="bg-[#1a2632] rounded-xl border border-[#223949] p-0 shadow-lg overflow-hidden">
          <div className="p-5 border-b border-[#223949] bg-black/20">
            <h3 className="text-white text-lg font-bold flex items-center gap-2">
              <ScrollText className="text-[#ff6a00] w-5 h-5" />
              Request Manifest
            </h3>
            <p className="text-xs text-white/50 mt-1">Current selection for JSON export.</p>
          </div>
          <div className="p-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-white/40 font-medium border-b border-white/5">
                <tr>
                  <th className="px-4 py-2">Item</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeGear.length === 0 && !hazer && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-white/30 italic text-xs">
                      No items selected
                    </td>
                  </tr>
                )}

                {activeGear.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-right text-[#ff6a00] font-bold font-mono">{item.count}</td>
                  </tr>
                ))}

                {hazer && (
                  <tr>
                    <td className="px-4 py-3 text-white font-medium">Hazer</td>
                    <td className="px-4 py-3 text-right text-green-400 font-bold text-xs uppercase">Yes</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-white/5">
                <tr>
                  <td className="px-4 py-3 text-white/60 font-medium text-xs uppercase tracking-wider">Total Items</td>
                  <td className="px-4 py-3 text-right text-white font-bold font-mono">{totalItems}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {}
        <div className="bg-[#1a2632] rounded-xl border border-[#223949] p-5 shadow-lg">
          <h3 className="text-white text-sm font-bold mb-3 uppercase tracking-wider text-opacity-80">Export Options</h3>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={downloadJson}
              className="flex min-h-11 items-center gap-3 w-full p-2 text-left rounded-lg hover:bg-white/5 text-white/80 hover:text-white transition-colors text-sm font-medium">
              <FileJson className="w-5 h-5" aria-hidden />
              Download the rider (JSON)
            </button>
            <button
              onClick={onDownloadPDF}
              className="flex items-center gap-3 w-full p-2 text-left rounded-lg hover:bg-white/5 text-white/80 hover:text-white transition-colors text-sm font-medium"
            >
              <File className="w-5 h-5" />
              Download PDF Rider
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
}