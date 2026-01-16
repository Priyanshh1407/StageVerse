'use client';

import React, { useState } from 'react';

export default function ArtistApiTestPage() {
    const [responses, setResponses] = useState({});
    const [loading, setLoading] = useState(false);

    // Default Data States (Editable by User)
    const [riderBody, setRiderBody] = useState(JSON.stringify({
        gear: [
            { name: 'Viper Profile', count: 12, type: 'Spot', iconKey: 'Scan' },
            { name: 'JDC1 Strobe', count: 24, type: 'Wash', iconKey: 'Zap' }
        ],
        notes: "No haze allowed in venue."
    }, null, 2));

    const [setlistBody, setSetlistBody] = useState(JSON.stringify({
        eventId: '13',
        items: [
            { title: "Intro / Lights", duration: "2:00", bpm: "128", status: 'pending' },
            { title: "Blinding Lights", duration: "3:45", bpm: "170", status: 'pending' },
            { title: "Starboy", duration: "4:00", bpm: "186", status: 'pending' }
        ]
    }, null, 2));

    const [guestBody, setGuestBody] = useState(JSON.stringify({
        eventId: '13',
        name: `VIP Guest ${Math.floor(Math.random() * 100)}`,
        tier: 'VIP',
        email: 'vip@example.com'
    }, null, 2));

    // Helper to get Event ID (Numeric) for GET requests
    const [getEventId, setGetEventId] = useState('13');

    const runTest = async (key, url, method = 'GET', bodyString = null) => {
        setLoading(true);
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (bodyString) {
                // Validate JSON before sending
                try {
                    options.body = bodyString; // Already stringified
                    JSON.parse(bodyString); // Check validity
                } catch (e) {
                    throw new Error("Invalid JSON in text area");
                }
            }

            const res = await fetch(url, options);
            const data = await res.json();

            setResponses(prev => ({
                ...prev,
                [key]: {
                    status: res.status,
                    data: data
                }
            }));
        } catch (error) {
            setResponses(prev => ({
                ...prev,
                [key]: { error: error.message }
            }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F10] text-white p-8 font-mono">
            <h1 className="text-2xl font-bold mb-6 text-[#00d4ff] flex items-center justify-between">
                <span>Artist API Verification Harness</span>
                <span className="text-xs text-gray-500 font-normal">Edit JSON below to test persistence</span>
            </h1>

            {/* SEED DATA SECTION */}
            <div className="p-6 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 mb-8">
                <h2 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                    🌱 Setup Data
                </h2>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={async () => {
                            const res = await fetch('/api/artist/seed', { method: 'POST' });
                            const json = await res.json();
                            alert(json.message || json.error);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded"
                    >
                        Generate Dashboard Data
                    </button>
                    <p className="text-sm text-slate-400">Creates: 1 Venue (Jio World), 3 Events (Mumbai, Delhi, Bangalore) w/ ticket stats.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ACTIONS */}
                <div className="space-y-8">

                    {/* 1. DASHBOARD */}
                    <div className="p-4 border border-gray-800 rounded-lg">
                        <h2 className="text-xl font-bold mb-2">1. Dashboard</h2>
                        <button
                            onClick={() => runTest('dashboard', '/api/artist/dashboard')}
                            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm w-full font-bold"
                        >
                            GET Stats & Next Show
                        </button>
                    </div>

                    {/* 2. RIDER */}
                    <div className="p-4 border border-gray-800 rounded-lg">
                        <h2 className="text-xl font-bold mb-2">2. Rider</h2>
                        <textarea
                            value={riderBody}
                            onChange={(e) => setRiderBody(e.target.value)}
                            className="w-full h-32 bg-[#050505] border border-gray-700 rounded p-2 text-xs text-green-400 font-mono mb-2 focus:border-[#00d4ff] outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => runTest('getRider', '/api/artist/rider')}
                                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm flex-1"
                            >
                                GET Current Rider
                            </button>
                            <button
                                onClick={() => runTest('postRider', '/api/artist/rider', 'POST', riderBody)}
                                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm flex-1 font-bold"
                            >
                                POST (Update) Rider
                            </button>
                        </div>
                    </div>

                    {/* 3. SETLIST */}
                    <div className="p-4 border border-gray-800 rounded-lg">
                        <h2 className="text-xl font-bold mb-2">3. Setlist</h2>
                        <textarea
                            value={setlistBody}
                            onChange={(e) => setSetlistBody(e.target.value)}
                            className="w-full h-48 bg-[#050505] border border-gray-700 rounded p-2 text-xs text-green-400 font-mono mb-2 focus:border-[#00d4ff] outline-none"
                        />
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400">GET Query ID:</span>
                            <input
                                type="text" value={getEventId} onChange={e => setGetEventId(e.target.value)}
                                className="bg-gray-900 border border-gray-700 p-1 px-2 rounded text-xs w-20 text-center"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => runTest('getSetlist', `/api/artist/setlist?eventId=${getEventId}`)}
                                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm flex-1"
                            >
                                GET Setlist
                            </button>
                            <button
                                onClick={() => runTest('postSetlist', '/api/artist/setlist', 'POST', setlistBody)}
                                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm flex-1 font-bold"
                            >
                                POST (Save) Setlist
                            </button>
                        </div>
                    </div>

                    {/* 4. GUEST LIST */}
                    <div className="p-4 border border-gray-800 rounded-lg">
                        <h2 className="text-xl font-bold mb-2">4. Guest List</h2>
                        <textarea
                            value={guestBody}
                            onChange={(e) => setGuestBody(e.target.value)}
                            className="w-full h-32 bg-[#050505] border border-gray-700 rounded p-2 text-xs text-green-400 font-mono mb-2 focus:border-[#00d4ff] outline-none"
                        />
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-gray-400">GET Query ID:</span>
                            <input
                                type="text" value={getEventId} onChange={e => setGetEventId(e.target.value)}
                                className="bg-gray-900 border border-gray-700 p-1 px-2 rounded text-xs w-20 text-center"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => runTest('getGuests', `/api/artist/guest-list?eventId=${getEventId}`)}
                                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm flex-1"
                            >
                                GET Guests
                            </button>
                            <button
                                onClick={() => runTest('postGuest', '/api/artist/guest-list', 'POST', guestBody)}
                                className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm flex-1 font-bold"
                            >
                                POST (Add) VIP
                            </button>
                        </div>
                    </div>

                </div>

                {/* RESULTS */}
                <div className="bg-[#050505] p-4 rounded-lg border border-gray-800 overflow-auto max-h-[90vh] sticky top-8">
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">API Responses</h2>
                    {loading && <div className="text-yellow-400 mb-4 animate-pulse">Running Request...</div>}

                    {Object.keys(responses).length === 0 && <div className="text-gray-500">Run a test to see results.</div>}

                    {Object.entries(responses).map(([key, result]) => (
                        <div key={key} className="mb-6">
                            <div className="text-xs uppercase text-gray-500 font-bold mb-1">{key}</div>
                            <pre className={`text-xs p-3 rounded overflow-x-auto ${result.status >= 400 || result.error ? 'bg-red-900/20 text-red-200' : 'bg-gray-900 text-green-200'}`}>
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
