'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';
import {
    Menu, Search, Bell, ChevronDown, DollarSign,
    Ticket, Package, Zap, Percent, Users, MoreVertical,
    Filter, PlusCircle, X, User, Trash2, Copy, PauseCircle, PlayCircle, Edit2, RefreshCw, Check, Save
} from 'lucide-react';

export default function TicketingPage() {
    const { id: eventId } = useParams();

    useEffect(() => {
        if (eventId) fetchData();
    }, [eventId]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // --- REAL DATA STATE ---
    const [data, setData] = useState({
        eventTitle: "Loading...",
        events: [],
        stats: { revenue: 0, sold: 0, inventory: 0 },
        tiers: [],
        orders: [],
        discounts: []
    });

    // --- UI STATES ---
    const [pricingMode, setPricingMode] = useState(false); // Controls the "Adjust Pricing" inputs
    const [tierFilter, setTierFilter] = useState("All");

    // --- DROPDOWN & MODAL STATES ---
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [activeModal, setActiveModal] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    // --- FETCH DATA ---
    const fetchData = async () => {
        if (!eventId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/events/${eventId}/ticketing`);
            const json = await res.json();
            if (json.success) {
                setData(prev => ({ ...prev, ...json.data }));
            }
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- HELPERS ---
    const toggleDropdown = (name, e) => {
        e?.stopPropagation();
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const openModal = (name, item = null) => {
        setActiveModal(name);
        setSelectedItem(item);
        setActiveDropdown(null);
    };

    const closeModal = () => {
        setActiveModal(null);
        setSelectedItem(null);
    };

    // --- GENERIC API HANDLER ---
    const handleApiAction = async (type, action, payload) => {
        // Note: We don't set global isLoading to true here to prevent full page flicker on small edits
        try {
            const res = await fetch(`/api/events/${eventId}/ticketing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, action, data: payload })
            });

            if (res.ok) {
                await fetchData(); // Refresh data
                closeModal();
            } else {
                const err = await res.json();
                alert(`Action failed: ${err.message}`);
            }
        } catch (err) {
            console.error(err);
            alert("Error processing request.");
        }
    };

    // --- TIER HANDLERS ---
    const handleSaveTier = (formData) => {
        const action = selectedItem ? 'update' : 'create';
        const payload = { ...formData, _id: selectedItem?._id };
        handleApiAction('tier', action, payload);
    };

    // ⚡ New Function: Handles the inline "Adjust Pricing" save
    const handleQuickTierUpdate = (id, updates) => {
        handleApiAction('tier', 'update', { _id: id, ...updates });
    };

    const handleTierAction = (action, tier) => {
        setActiveDropdown(null);
        if (action === 'Edit Tier') openModal('create-tier', tier);
        else if (action === 'Delete') {
            if (confirm(`Delete ${tier.name}?`)) handleApiAction('tier', 'delete', { _id: tier._id });
        }
        else if (action === 'Pause Sales' || action === 'Resume Sales') {
            handleApiAction('tier', 'toggle_status', { _id: tier._id });
        }
        else if (action === 'Duplicate') {
            handleApiAction('tier', 'create', {
                name: `${tier.name} (Copy)`,
                price: tier.price,
                capacity: tier.capacity
            });
        }
    };

    // --- DISCOUNT HANDLERS ---
    const handleSaveDiscount = (formData) => {
        const action = selectedItem ? 'update' : 'create';
        const payload = { ...formData, _id: selectedItem?._id };
        handleApiAction('discount', action, payload);
    };

    const handleDiscountAction = (action, discount) => {
        setActiveDropdown(null);
        if (action === 'Edit') openModal('manage-discounts', discount);
        else if (action === 'Delete') {
            if (confirm(`Delete code ${discount.code}?`)) handleApiAction('discount', 'delete', { _id: discount._id });
        }
    };

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveDropdown(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const filteredTiers = tierFilter === "All" ? data.tiers : data.tiers.filter(t => t.status === tierFilter);

    if (isLoading && !data.tiers.length && !data.eventTitle) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#f5f7f8] dark:bg-[#101b22]">
                <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#0d93f2]" />
                    <p className="text-slate-500 text-sm">Loading Ticketing Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white overflow-hidden selection:bg-[#0d93f2]/30">
            <style>{`
        .no-spinner::-webkit-inner-spin-button, 
        .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
      `}</style>

            <OrganizerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* HEADER */}
                <header className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 bg-white/95 dark:bg-[#1a2632]/95 backdrop-blur-sm z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 dark:text-slate-300">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col">
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ticketing Manager</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
                                {data.eventTitle !== "Loading..." ? `Managing: ${data.eventTitle}` : "Loading Event..."}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0d93f2] to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full bg-white dark:bg-[#1a2632] flex items-center justify-center overflow-hidden">
                                <Image src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" alt="User" width={40} height={40} className="object-cover" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-[1400px] mx-auto flex flex-col gap-6">

                        {/* STATS */}
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-12 lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <StatCard label="Total Revenue" value={`$${(data.stats?.revenue || 0).toLocaleString()}`} icon={DollarSign} footer={<span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded text-xs font-bold">Live Data</span>} />
                                <StatCard label="Tickets Sold" value={(data.stats?.sold || 0).toLocaleString()} icon={Ticket} footer={<span className="text-slate-500 text-xs">Across all tiers</span>} />
                                <StatCard label="Inventory Left" value={(data.stats?.inventory || 0).toLocaleString()} icon={Package} footer={<span className="text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded text-xs font-bold">Track Stock</span>} />
                            </div>
                            <div className="col-span-12 lg:col-span-3 bg-white dark:bg-[#1a2632] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                                <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white"><Zap className="text-[#0d93f2] w-4 h-4" /> Quick Actions</h4>
                                <div className="flex flex-col gap-2">
                                    <ActionButton label="Create New Ticket Tier" icon={PlusCircle} primary onClick={() => openModal('create-tier')} />
                                    <ActionButton label="Manage Discounts" icon={Percent} onClick={() => openModal('create-discount')} />
                                </div>
                            </div>
                        </div>

                        {/* TICKET TIERS TABLE */}
                        <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ticket Tiers</h3>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setPricingMode(!pricingMode)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${pricingMode
                                            ? 'bg-[#0d93f2] text-white border-[#0d93f2]'
                                            : 'bg-white dark:bg-[#1a2632] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0d93f2] dark:hover:border-[#0d93f2]'
                                            }`}
                                    >
                                        {pricingMode ? 'Done Editing' : 'Adjust Pricing'}
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto min-h-[200px]">
                                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                                    <thead className="bg-slate-50 dark:bg-[#151f28] text-xs uppercase font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-6 py-4">Tier Name</th>
                                            <th className="px-6 py-4">Price</th>
                                            <th className="px-6 py-4">Sold / Cap</th>
                                            <th className="px-6 py-4">Revenue</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                        {filteredTiers && filteredTiers.length > 0 ? filteredTiers.map((tier) => (
                                            <TicketTierRow
                                                key={tier._id}
                                                tier={tier}
                                                isEditing={pricingMode} // Pass the mode down
                                                activeDropdown={activeDropdown}
                                                onToggleDropdown={toggleDropdown}
                                                onAction={(action) => handleTierAction(action, tier)}
                                                onQuickUpdate={handleQuickTierUpdate} // Pass the update handler
                                            />
                                        )) : (
                                            <tr><td colSpan="6" className="p-6 text-center">No ticket tiers created yet.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* ORDERS & DISCOUNTS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                            <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Orders</h3>
                                </div>
                                <div className="p-4 flex flex-col gap-2">
                                    {data.orders && data.orders.length > 0 ? (
                                        data.orders.map((order) => (
                                            <div key={order._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-[#151f28] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">#</div>
                                                    <div><p className="text-slate-900 dark:text-white text-sm font-bold">Order #{order._id.slice(-6)}</p><p className="text-slate-500 text-xs">Qty: {order.quantity}</p></div>
                                                </div>
                                                <div className="text-right"><p className="text-slate-900 dark:text-white text-sm font-bold">${order.totalAmount}</p></div>
                                            </div>
                                        ))
                                    ) : <p className="text-center text-slate-400 py-4 text-sm">No orders yet.</p>}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Discounts</h3>
                                    <button onClick={() => openModal('create-discount')} className="text-slate-400 hover:text-[#0d93f2]"><PlusCircle className="w-5 h-5" /></button>
                                </div>
                                <div className="p-4 flex flex-col gap-2">
                                    {data.discounts && data.discounts.map((discount) => (
                                        <DiscountRow
                                            key={discount._id}
                                            discount={discount}
                                            activeDropdown={activeDropdown}
                                            onToggleDropdown={toggleDropdown}
                                            onAction={(action) => handleDiscountAction(action, discount)}
                                            onClick={() => openModal('manage-discounts', discount)}
                                        />
                                    ))}
                                    <div onClick={() => openModal('create-discount')} className="flex items-center justify-between p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-[#0d93f2]/50 cursor-pointer transition-colors group">
                                        <div className="flex items-center gap-2 text-slate-500 group-hover:text-[#0d93f2]">
                                            <PlusCircle className="w-5 h-5" /><span className="text-sm font-medium">Create new promo code</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            <GenericModal
                isOpen={!!activeModal && activeModal !== 'info-tooltip'}
                onClose={closeModal}
                title={
                    activeModal === 'create-tier' ? (selectedItem ? 'Edit Ticket Tier' : 'Create New Ticket Tier') :
                        activeModal === 'manage-discounts' ? 'Edit Discount' :
                            activeModal === 'create-discount' ? 'Create New Discount' : ''
                }
            >
                {activeModal === 'create-tier' && <CreateTierForm onSave={handleSaveTier} initialData={selectedItem} />}
                {activeModal === 'create-discount' && <DiscountForm onSave={handleSaveDiscount} />}
                {activeModal === 'manage-discounts' && <DiscountForm onSave={handleSaveDiscount} initialData={selectedItem} />}
            </GenericModal>
        </div>
    );
}

// --- UPDATED SUB COMPONENTS ---

// 1. UPDATED TICKET TIER ROW (Handles Inline Editing)
function TicketTierRow({ tier, isEditing, activeDropdown, onToggleDropdown, onAction, onQuickUpdate }) {
    const percentSold = tier.capacity > 0 ? (tier.sold / tier.capacity) * 100 : 0;

    // Local state for inline editing
    const [localPrice, setLocalPrice] = useState(tier.price);

    // Sync local state when the tier prop updates
    useEffect(() => { setLocalPrice(tier.price) }, [tier.price]);

    const handleInlineSave = () => {
        onQuickUpdate(tier._id, { price: Number(localPrice) });
    };

    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors group">
            <td className="px-6 py-4">
                <p className="text-slate-900 dark:text-white font-bold text-sm">{tier.name}</p>
            </td>
            <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">$</span>
                        <input
                            type="number"
                            value={localPrice}
                            onChange={(e) => setLocalPrice(e.target.value)}
                            className="w-20 p-1 bg-white dark:bg-[#101b22] border border-slate-300 dark:border-slate-600 rounded text-sm focus:border-[#0d93f2] outline-none"
                        />
                        {/* Show Save Button only if value changed */}
                        {Number(localPrice) !== tier.price && (
                            <button onClick={handleInlineSave} className="p-1 bg-green-500 text-white rounded hover:bg-green-600" title="Save Price">
                                <Check className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ) : (
                    `$${tier.price.toFixed(2)}`
                )}
            </td>
            <td className="px-6 py-4">
                <div className="flex flex-col gap-1 w-32">
                    <div className="flex justify-between text-xs text-slate-500"><span>{tier.sold}</span><span>{tier.capacity}</span></div>
                    <div className="w-full bg-slate-200 dark:bg-[#101b22] h-1.5 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#0d93f2]" style={{ width: `${percentSold}%` }}></div></div>
                </div>
            </td>
            <td className="px-6 py-4 text-slate-900 dark:text-white font-mono">${(tier.revenue || 0).toLocaleString()}</td>
            <td className="px-6 py-4"><span className="text-xs font-bold px-2 py-1 rounded bg-green-500/10 text-green-500">{tier.status}</span></td>
            <td className="px-6 py-4 text-right relative">
                <button onClick={(e) => onToggleDropdown(`tier-${tier._id}`, e)}><MoreVertical className="w-4 h-4 text-slate-400" /></button>
                {activeDropdown === `tier-${tier._id}` && (
                    <div className="absolute right-0 top-10 w-40 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <button onClick={() => onAction('Edit Tier')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-[#22303c] flex items-center gap-2"><Edit2 className="w-3 h-3" /> Edit Tier</button>
                        <button onClick={() => onAction('Delete')} className="w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-3 h-3" /> Delete</button>
                    </div>
                )}
            </td>
        </tr>
    );
}

// 2. UPDATED DISCOUNT FORM (Fixes state reset and value types)
function DiscountForm({ initialData, onSave }) {
    // We use key/useEffect pattern or state reset to ensure form clears when switching modes
    const [code, setCode] = useState('');
    const [type, setType] = useState('percentage'); // Lowercase default
    const [value, setValue] = useState('');

    // Effect to load data when the modal opens/initialData changes
    useEffect(() => {
        if (initialData) {
            setCode(initialData.code || '');
            setType(initialData.type?.toLowerCase() || 'percentage');
            setValue(initialData.value || '');
        } else {
            setCode('');
            setType('percentage');
            setValue('');
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            code,
            type, // This will now be 'percentage' or 'fixed'
            value: parseFloat(value)
        });
    };

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Code</label>
                <input required value={code} onChange={e => setCode(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white uppercase font-mono" placeholder="SUMMER20" />
            </div>
            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Type</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed Amount</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Value</label>
                    <input required type="number" value={value} onChange={e => setValue(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" placeholder="20" />
                </div>
            </div>
            <button type="submit" className="w-full py-3 bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold rounded-xl mt-2">Save Discount</button>
        </form>
    );
}

// ... (Other components GenericModal, CreateTierForm, StatCard, ActionButton, DiscountRow remain the same)
function GenericModal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

function CreateTierForm({ onSave, initialData }) {
    const [name, setName] = useState(initialData?.name || '');
    const [price, setPrice] = useState(initialData?.price || '');
    const [capacity, setCapacity] = useState(initialData?.capacity || '');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, price: parseFloat(price), capacity: parseInt(capacity) });
    };

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tier Name</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2]" placeholder="e.g. VIP Early Bird" />
            </div>
            <div className="grid grid-cols-2 gap-5">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Price</label>
                    <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="no-spinner w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2]" placeholder="0.00" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quantity</label>
                    <input required type="number" value={capacity} onChange={e => setCapacity(e.target.value)} className="no-spinner w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2]" placeholder="100" />
                </div>
            </div>
            <button type="submit" className="w-full py-3 bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold rounded-xl mt-2">{initialData ? 'Update Tier' : 'Create Tier'}</button>
        </form>
    );
}

function StatCard({ label, value, icon: Icon, footer }) {
    return (
        <div className="bg-white dark:bg-[#1a2632] rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
                <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p><h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3></div>
                <span className="p-2 bg-slate-100 dark:bg-[#151f28] rounded-lg text-slate-400"><Icon className="w-6 h-6" /></span>
            </div>
            <div className="mt-4 flex items-center gap-2">{footer}</div>
        </div>
    );
}

function ActionButton({ label, icon: Icon, primary, onClick }) {
    return (
        <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm flex justify-between items-center group ${primary ? "bg-[#0d93f2] text-white hover:bg-[#0b84db]" : "bg-slate-100 dark:bg-[#151f28] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e2a35]"}`}>
            {label} <Icon className="w-5 h-5" />
        </button>
    );
}

function DiscountRow({ discount, onClick, activeDropdown, onToggleDropdown, onAction }) {
    const isPercentage = discount.type === 'Percentage' || discount.type === 'percentage';
    return (
        <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#101b22]">
            <div className="flex-1 cursor-pointer" onClick={onClick}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-900 dark:text-white font-mono text-sm font-bold bg-white dark:bg-[#1a2632] px-2 py-0.5 rounded border border-slate-200">{discount.code}</span>
                </div>
                <p className="text-slate-500 text-xs">{isPercentage ? `${discount.value}%` : `$${discount.value}`} Off</p>
            </div>
            <div className="relative">
                <button onClick={(e) => onToggleDropdown(`disc-${discount._id}`, e)}><MoreVertical className="w-4 h-4 text-slate-400" /></button>
                {activeDropdown === `disc-${discount._id}` && (
                    <div className="absolute right-0 top-8 w-32 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        <button onClick={() => onAction('Edit')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 flex gap-2">Edit</button>
                        <button onClick={() => onAction('Delete')} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 flex gap-2">Delete</button>
                    </div>
                )}
            </div>
        </div>
    );
}