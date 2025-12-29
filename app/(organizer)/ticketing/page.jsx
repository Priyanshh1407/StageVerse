'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';
import { 
  Menu, Search, Bell, ChevronDown, DollarSign, 
  Ticket, Package, Zap, Percent, Users, MoreVertical, 
  Filter, PlusCircle, X, User, Trash2, Copy, PauseCircle, PlayCircle, Edit2
} from 'lucide-react';

// --- INITIAL DATA ---
const INITIAL_DATA = {
  events: ["Neon Nights 2023", "Summer Bass Bash", "Tech Conference 2024"],
  notifications: [
    { id: 1, text: "VIP Tier is running low ( < 10%)", time: "10m ago", active: true },
    { id: 2, text: "New bulk order: 10 tickets", time: "1h ago", active: false }
  ],
  stats: {
    revenue: { value: 142500, change: "+15%", label: "Total Revenue", info: "Gross revenue from all ticket sales, excluding fees." },
    sold: { value: 12450, total: 16000, label: "Tickets Sold", info: "Total valid tickets distributed (paid + comp)." },
    inventory: { value: 3550, alert: "Low Stock on VIP", label: "Remaining Inventory", info: "Tickets available for purchase across all tiers." }
  },
  tiers: [
    { id: 1, name: "Early Bird", status: "Sold Out", price: 45.00, sold: 500, cap: 500, revenue: 22500, color: "bg-blue-500" },
    { id: 2, name: "General Admission", status: "Active", price: 65.00, sold: 8400, cap: 10000, revenue: 546000, color: "bg-[#0d93f2]" },
    { id: 3, name: "VIP Access", status: "Low Stock", price: 150.00, sold: 450, cap: 500, revenue: 67500, color: "bg-purple-500" },
  ],
  orders: [
    { id: 1, name: "John Doe", items: "2x General Admission", total: 130.00, time: "2 min ago", initials: "JD", color: "text-[#0d93f2] bg-[#0d93f2]/20" },
    { id: 2, name: "Alice Smith", items: "1x VIP Access", total: 150.00, time: "15 min ago", initials: "AS", color: "text-purple-500 bg-purple-500/20" },
    { id: 3, name: "Michael Ross", items: "4x General Admission", total: 260.00, time: "42 min ago", initials: "MR", color: "text-green-500 bg-green-500/20" },
    { id: 4, name: "Sarah Connor", items: "1x Early Bird", total: 45.00, time: "1h ago", initials: "SC", color: "text-blue-500 bg-blue-500/20" },
  ],
  discounts: [
    { id: 'd1', code: "SUMMER2023", discount: "20%", type: "Percentage", target: "General Admission", uses: 142, status: "Active" },
    { id: 'd2', code: "VIP-FLASH", discount: "$50", type: "Fixed Amount", target: "VIP Access", uses: 28, status: "Expiring Soon" },
  ]
};

export default function TicketingPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [data, setData] = useState(INITIAL_DATA);

  // --- UI STATES ---
  const [selectedEvent, setSelectedEvent] = useState(INITIAL_DATA.events[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pricingMode, setPricingMode] = useState(false); 
  const [tierFilter, setTierFilter] = useState("All");

  // --- DROPDOWN & MODAL STATES ---
  const [activeDropdown, setActiveDropdown] = useState(null); 
  const [activeModal, setActiveModal] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null); 

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

  // --- TIER LOGIC ---
  const handleSaveTier = (formData) => {
    if (selectedItem) {
      // EDIT MODE
      setData(prev => ({
        ...prev,
        tiers: prev.tiers.map(t => t.id === selectedItem.id ? { ...t, ...formData, price: parseFloat(formData.price), cap: parseInt(formData.cap) } : t)
      }));
    } else {
      // CREATE MODE
      const newTier = {
        id: Date.now(),
        name: formData.name,
        price: parseFloat(formData.price),
        cap: parseInt(formData.cap),
        sold: 0,
        revenue: 0,
        status: "Active",
        color: "bg-gray-500" 
      };
      setData(prev => ({ ...prev, tiers: [...prev.tiers, newTier] }));
    }
    closeModal();
  };

  const handleTierAction = (action, tier) => {
    setActiveDropdown(null); // Close dropdown
    
    if (action === 'Edit Tier') {
      openModal('create-tier', tier);
    } 
    else if (action === 'Delete') {
      if(confirm(`Are you sure you want to delete ${tier.name}?`)) {
        setData(prev => ({ ...prev, tiers: prev.tiers.filter(t => t.id !== tier.id) }));
      }
    } 
    else if (action === 'Duplicate') {
      const copy = { ...tier, id: Date.now(), name: `Copy of ${tier.name}`, sold: 0, revenue: 0 };
      setData(prev => ({ ...prev, tiers: [...prev.tiers, copy] }));
    } 
    else if (action === 'Pause Sales' || action === 'Resume Sales') {
      const newStatus = tier.status === 'Paused' ? 'Active' : 'Paused';
      setData(prev => ({
        ...prev,
        tiers: prev.tiers.map(t => t.id === tier.id ? { ...t, status: newStatus } : t)
      }));
    }
  };

  // --- DISCOUNT LOGIC ---
  const handleSaveDiscount = (formData) => {
    if (selectedItem) {
       // EDIT DISCOUNT
       setData(prev => ({
         ...prev,
         discounts: prev.discounts.map(d => d.id === selectedItem.id ? { ...d, ...formData, discount: formData.type === 'Percentage' ? `${formData.value}%` : `$${formData.value}` } : d)
       }));
    } else {
      // CREATE DISCOUNT
      const newDiscount = {
        id: Date.now(),
        code: formData.code.toUpperCase(),
        discount: formData.type === 'Percentage' ? `${formData.value}%` : `$${formData.value}`,
        target: "All Tickets", 
        uses: 0,
        status: "Active"
      };
      setData(prev => ({ ...prev, discounts: [...prev.discounts, newDiscount] }));
    }
    closeModal();
  };

  const handleDiscountAction = (action, discount) => {
    setActiveDropdown(null);
    if (action === 'Edit') {
      openModal('manage-discounts', discount);
    } else if (action === 'Delete') {
      if(confirm(`Delete discount code ${discount.code}?`)) {
        setData(prev => ({ ...prev, discounts: prev.discounts.filter(d => d.id !== discount.id) }));
      }
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter Logic
  const filteredOrders = data.orders.filter(order => 
    order.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.items.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTiers = tierFilter === "All" 
    ? data.tiers 
    : data.tiers.filter(t => t.status === tierFilter);

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-slate-900 dark:text-white overflow-hidden selection:bg-[#0d93f2]/30">
      
      {/* GLOBAL STYLES FOR REMOVING SPINNER */}
      <style>{`
        .no-spinner::-webkit-inner-spin-button, 
        .no-spinner::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .no-spinner { -moz-appearance: textfield; }
      `}</style>

      <OrganizerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* --- HEADER --- */}
        <header className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 bg-white/95 dark:bg-[#1a2632]/95 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-600 dark:text-slate-300">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ticketing Manager</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Manage sales, pricing & inventory</p>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-6">
            <div className="hidden md:block w-64 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#151f28] border-none rounded-lg text-sm focus:ring-2 focus:ring-[#0d93f2] outline-none transition-all" placeholder="Search orders, attendees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            
            {/* Event Dropdown */}
            <div className="relative">
              <button onClick={(e) => toggleDropdown('event', e)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-[#151f28] rounded-lg border border-transparent hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                <span className="text-sm font-medium">{selectedEvent}</span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              {activeDropdown === 'event' && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  {data.events.map(event => (
                    <button key={event} onClick={() => setSelectedEvent(event)} className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-[#22303c] transition-colors">{event}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={(e) => toggleDropdown('notification', e)} className="relative p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a2632]"></span>
              </button>
              {activeDropdown === 'notification' && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-2 py-2 border-b border-slate-100 dark:border-slate-700 font-bold text-sm">Notifications</div>
                  {data.notifications.map(note => (
                    <div key={note.id} className="p-3 hover:bg-slate-50 dark:hover:bg-[#22303c] rounded-lg cursor-pointer">
                      <p className="text-sm text-slate-800 dark:text-slate-200">{note.text}</p>
                      <p className="text-xs text-slate-400 mt-1">{note.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* User Profile */}
            <div className="relative">
              <div onClick={(e) => toggleDropdown('profile', e)} className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0d93f2] to-purple-500 p-[2px] cursor-pointer">
                <div className="w-full h-full rounded-full bg-white dark:bg-[#1a2632] relative overflow-hidden">
                   <Image src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop" alt="Profile" fill className="object-cover" />
                </div>
              </div>
              {activeDropdown === 'profile' && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <button className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-[#22303c] flex items-center gap-2"><User className="w-4 h-4"/> My Profile</button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                  <button className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">Log Out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* --- CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6">
            
            {/* STATS ROW */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-9 grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label={data.stats.revenue.label} 
                  value={`$${data.stats.revenue.value.toLocaleString()}`}
                  icon={DollarSign}
                  info={data.stats.revenue.info}
                  footer={<span className="text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded text-xs font-bold">{data.stats.revenue.change} vs last week</span>}
                  onInfoClick={(info) => openModal('info-tooltip', info)}
                />
                <StatCard 
                  label={data.stats.sold.label} 
                  value={data.stats.sold.value.toLocaleString()} 
                  icon={Ticket}
                  info={data.stats.sold.info}
                  progress={(data.stats.sold.value / data.stats.sold.total) * 100}
                  footer={<span className="text-slate-500 text-xs">{((data.stats.sold.value / data.stats.sold.total) * 100).toFixed(0)}% of Capacity</span>}
                  onInfoClick={(info) => openModal('info-tooltip', info)}
                />
                <StatCard 
                  label={data.stats.inventory.label} 
                  value={data.stats.inventory.value.toLocaleString()} 
                  icon={Package}
                  info={data.stats.inventory.info}
                  footer={<span className="text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded text-xs font-bold">{data.stats.inventory.alert}</span>}
                  onInfoClick={(info) => openModal('info-tooltip', info)}
                />
              </div>

              {/* QUICK ACTIONS */}
              <div className="col-span-12 lg:col-span-3 bg-white dark:bg-[#1a2632] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h4 className="font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
                  <Zap className="text-[#0d93f2] w-4 h-4" /> Quick Actions
                </h4>
                <div className="flex flex-col gap-2">
                  <ActionButton label="Create New Ticket Tier" icon={PlusCircle} primary onClick={() => openModal('create-tier')} />
                  <ActionButton label="Manage Discounts" icon={Percent} onClick={() => openModal('manage-discounts')} />
                  <ActionButton label="View Attendee List" icon={Users} onClick={() => openModal('attendee-list')} />
                </div>
              </div>
            </div>

            {/* TICKET TIERS */}
            <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ticket Tiers</h3>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setPricingMode(!pricingMode)} 
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      pricingMode 
                        ? 'bg-[#0d93f2] text-white border-[#0d93f2]' 
                        : 'bg-white dark:bg-[#1a2632] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-[#0d93f2] dark:hover:border-[#0d93f2]'
                    }`}
                  >
                    {pricingMode ? 'Done Editing' : 'Adjust Pricing'}
                  </button>
                  
                  <div className="relative">
                    <button onClick={(e) => toggleDropdown('tier-filter', e)} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-[#151f28] rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e2a35] transition-colors h-full">
                      <Filter className="w-3.5 h-3.5" /> Filter
                    </button>
                    {activeDropdown === 'tier-filter' && (
                      <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50">
                        {['All', 'Active', 'Sold Out', 'Low Stock'].map(f => (
                          <button key={f} onClick={() => setTierFilter(f)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-[#22303c]">{f}</button>
                        ))}
                      </div>
                    )}
                  </div>
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
                    {filteredTiers.map((tier) => (
                      <TicketTierRow 
                        key={tier.id} 
                        tier={tier} 
                        isEditing={pricingMode} 
                        activeDropdown={activeDropdown} 
                        onToggleDropdown={toggleDropdown}
                        onAction={(action) => handleTierAction(action, tier)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ORDERS & DISCOUNTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              
              {/* Recent Orders */}
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent Orders</h3>
                  <button onClick={() => openModal('all-orders')} className="text-xs bg-slate-100 dark:bg-[#151f28] px-2 py-1 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">View All</button>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.slice(0, 5).map((order) => (
                      <RecentOrderRow key={order.id} order={order} onClick={() => openModal('order-details', order)} />
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-4 text-sm">No orders found.</p>
                  )}
                </div>
              </div>

              {/* Discounts */}
              <div className="bg-white dark:bg-[#1a2632] rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Discounts</h3>
                  <button onClick={() => openModal('create-discount')} className="text-slate-400 hover:text-[#0d93f2]"><PlusCircle className="w-5 h-5" /></button>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {data.discounts.map((discount) => (
                    <DiscountRow 
                      key={discount.id} 
                      discount={discount} 
                      activeDropdown={activeDropdown}
                      onToggleDropdown={toggleDropdown}
                      onAction={(action) => handleDiscountAction(action, discount)}
                      onClick={() => openModal('manage-discounts', discount)} 
                    />
                  ))}
                  <div onClick={() => openModal('create-discount')} className="flex items-center justify-between p-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg hover:border-[#0d93f2]/50 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-[#0d93f2]">
                      <PlusCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Create new promo code</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* --- ALL MODALS --- */}
      <GenericModal 
        isOpen={!!activeModal && activeModal !== 'info-tooltip'} 
        onClose={closeModal} 
        title={
          activeModal === 'create-tier' ? (selectedItem ? 'Edit Ticket Tier' : 'Create New Ticket Tier') :
          activeModal === 'manage-discounts' ? 'Edit Discount' :
          activeModal === 'create-discount' ? 'Create New Discount' :
          activeModal === 'attendee-list' ? 'Attendee List' :
          activeModal === 'all-orders' ? 'Order History' :
          activeModal === 'order-details' ? 'Order Details' : ''
        }
      >
        {activeModal === 'create-tier' && <CreateTierForm onSave={handleSaveTier} initialData={selectedItem} />}
        {activeModal === 'create-discount' && <DiscountForm onSave={handleSaveDiscount} />}
        {activeModal === 'manage-discounts' && <DiscountForm onSave={handleSaveDiscount} initialData={selectedItem} />}
        {activeModal === 'attendee-list' && <div className="p-4 text-center text-slate-500">Full attendee list table would go here.</div>}
        {activeModal === 'all-orders' && <div className="p-4 text-center text-slate-500">Full order history table would go here.</div>}
        {activeModal === 'order-details' && selectedItem && (
          <div className="space-y-3">
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500 text-sm">Customer</span><span className="font-bold text-slate-900 dark:text-white">{selectedItem.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-slate-500 text-sm">Items</span><span className="font-bold text-slate-900 dark:text-white">{selectedItem.items}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-slate-500 text-sm">Total Paid</span><span className="font-bold text-green-500 text-lg">${selectedItem.total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </GenericModal>

      {/* TOOLTIP MODAL */}
      {activeModal === 'info-tooltip' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white dark:bg-[#1a2632] p-6 rounded-xl shadow-2xl max-w-sm animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-lg mb-2 text-slate-900 dark:text-white">Definition</h4>
            <p className="text-slate-600 dark:text-slate-300">{selectedItem}</p>
            <button onClick={closeModal} className="mt-4 w-full py-2 bg-slate-100 dark:bg-[#22303c] rounded-lg text-sm font-bold">Got it</button>
          </div>
        </div>
      )}

    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function GenericModal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-900 dark:hover:text-white" /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function CreateTierForm({ onSave, initialData }) {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [cap, setCap] = useState(initialData?.cap || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name && price && cap) {
      onSave({ name, price, cap });
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tier Name</label>
        <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2]" placeholder="e.g. VIP Early Bird" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
            <input required type="number" value={price} onChange={e => setPrice(e.target.value)} className="no-spinner w-full p-3 pl-7 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2]" placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quantity</label>
          <input required type="number" value={cap} onChange={e => setCap(e.target.value)} className="no-spinner w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2]" placeholder="100" />
        </div>
      </div>
      <button type="submit" className="w-full py-3 bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold rounded-xl mt-2">{initialData ? 'Update Tier' : 'Create Tier'}</button>
    </form>
  );
}

function DiscountForm({ initialData, onSave }) {
  const [code, setCode] = useState(initialData?.code || '');
  const [type, setType] = useState(initialData?.type || 'Percentage');
  // Extract number from string "$50" or "20%"
  const [value, setValue] = useState(initialData?.discount?.replace(/[^0-9.]/g, '') || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code && value) {
      onSave({ code, type, value });
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Discount Code</label>
          <input required value={code} onChange={e => setCode(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2] uppercase tracking-wider font-mono" placeholder="e.g. SAVE20" />
      </div>
      <div className="grid grid-cols-2 gap-5">
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Type</label>
              <div className="relative">
                  <select value={type} onChange={e => setType(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2] appearance-none cursor-pointer">
                      <option>Percentage</option><option>Fixed Amount</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Value</label>
              <input required type="number" value={value} onChange={e => setValue(e.target.value)} className="no-spinner w-full p-3 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0d93f2]" placeholder={type === 'Percentage' ? "20" : "50"} />
          </div>
      </div>
      <button type="submit" className="w-full py-3 bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold rounded-xl mt-2">{initialData ? 'Update Discount' : 'Save Discount'}</button>
    </form>
  );
}

function StatCard({ label, value, icon: Icon, footer, progress, onInfoClick, info }) {
  return (
    <div className="bg-white dark:bg-[#1a2632] rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col justify-between group hover:border-[#0d93f2]/50 transition-colors shadow-sm relative">
      <button onClick={() => onInfoClick(info)} className="absolute top-3 right-3 text-slate-300 hover:text-[#0d93f2]"><Search className="w-4 h-4" /></button>
      <div className="flex justify-between items-start">
        <div><p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p><h3 className="text-3xl font-bold text-slate-900 dark:text-white">{value}</h3></div>
        <span className="p-2 bg-slate-100 dark:bg-[#151f28] rounded-lg text-slate-400 group-hover:text-[#0d93f2] group-hover:bg-[#0d93f2]/10 transition-colors mr-6"><Icon className="w-6 h-6" /></span>
      </div>
      <div className="mt-4">
        {progress && <div className="w-full bg-slate-100 dark:bg-[#101b22] h-1.5 rounded-full overflow-hidden mb-2"><div className="bg-[#0d93f2] h-full rounded-full" style={{ width: `${progress}%` }}></div></div>}
        <div className="flex items-center gap-2">{footer}</div>
      </div>
    </div>
  );
}

function ActionButton({ label, icon: Icon, primary, onClick }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm transition-colors flex justify-between items-center group ${primary ? "bg-[#0d93f2] text-white hover:bg-[#0b84db]" : "bg-slate-100 dark:bg-[#151f28] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1e2a35]"}`}>
      {label}
      <Icon className={`w-5 h-5 ${primary ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white'}`} />
    </button>
  );
}

function TicketTierRow({ tier, isEditing, activeDropdown, onToggleDropdown, onAction }) {
  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-[#1e2a35] transition-colors">
      <td className="px-6 py-4 flex items-center gap-3">
        <div className={`w-1.5 h-10 rounded-full ${tier.color}`}></div>
        <div><p className="text-slate-900 dark:text-white font-bold text-sm">{tier.name}</p><p className="text-xs text-slate-500">#{tier.id}024</p></div>
      </td>
      <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">
        {isEditing ? <input className="w-20 p-1 text-sm border rounded dark:bg-[#101b22] dark:border-slate-700" defaultValue={tier.price} /> : `$${tier.price.toFixed(2)}`}
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-1 w-32">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400"><span>{tier.sold}</span><span>{tier.cap}</span></div>
          <div className="w-full bg-slate-200 dark:bg-[#101b22] h-1.5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${tier.color}`} style={{ width: `${(tier.sold / tier.cap) * 100}%` }}></div></div>
        </div>
      </td>
      <td className="px-6 py-4 text-slate-900 dark:text-white font-mono">${tier.revenue.toLocaleString()}</td>
      <td className="px-6 py-4">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${tier.status === 'Sold Out' ? 'bg-red-500/10 text-red-500 border-red-500/20' : tier.status === 'Active' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{tier.status}</span>
      </td>
      <td className="px-6 py-4 text-right relative">
        <button onClick={(e) => onToggleDropdown(`tier-action-${tier.id}`, e)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded hover:bg-slate-100 dark:hover:bg-[#151f28]"><MoreVertical className="w-4 h-4" /></button>
        {activeDropdown === `tier-action-${tier.id}` && (
          <div className="absolute right-0 top-10 w-40 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <button onClick={() => onAction('Edit Tier')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-[#22303c] flex items-center gap-2"><Edit2 className="w-3 h-3"/> Edit Tier</button>
            <button onClick={() => onAction(tier.status === 'Paused' ? 'Resume Sales' : 'Pause Sales')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-[#22303c] flex items-center gap-2">
                {tier.status === 'Paused' ? <PlayCircle className="w-3 h-3"/> : <PauseCircle className="w-3 h-3"/>} 
                {tier.status === 'Paused' ? 'Resume Sales' : 'Pause Sales'}
            </button>
            <button onClick={() => onAction('Duplicate')} className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-[#22303c] flex items-center gap-2"><Copy className="w-3 h-3"/> Duplicate</button>
            <div className="h-px bg-slate-100 dark:bg-slate-700"></div>
            <button onClick={() => onAction('Delete')} className="w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"><Trash2 className="w-3 h-3"/> Delete</button>
          </div>
        )}
      </td>
    </tr>
  );
}

function DiscountRow({ discount, onClick, activeDropdown, onToggleDropdown, onAction }) {
  return (
    <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-[#101b22] hover:border-[#0d93f2]/50 transition-colors">
      <div className="flex-1 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-slate-900 dark:text-white font-mono text-sm font-bold bg-white dark:bg-[#1a2632] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">{discount.code}</span>
          <span className={`text-xs px-1.5 rounded font-bold ${discount.status === 'Active' ? 'text-green-500 bg-green-500/10' : 'text-yellow-500 bg-yellow-500/10'}`}>{discount.status}</span>
        </div>
        <p className="text-slate-500 text-xs">{discount.discount} • {discount.target}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-slate-900 dark:text-white text-sm font-bold">{discount.uses}</p>
          <p className="text-slate-500 text-xs">Uses</p>
        </div>
        <div className="relative">
          <button onClick={(e) => onToggleDropdown(`disc-action-${discount.id}`, e)} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-[#1e2a35]"><MoreVertical className="w-4 h-4" /></button>
          {activeDropdown === `disc-action-${discount.id}` && (
            <div className="absolute right-0 top-8 w-32 bg-white dark:bg-[#1a2632] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
               <button onClick={() => onAction('Edit')} className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-[#22303c] flex items-center gap-2"><Edit2 className="w-3 h-3"/> Edit</button>
               <button onClick={() => onAction('Delete')} className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"><Trash2 className="w-3 h-3"/> Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecentOrderRow({ order, onClick }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-[#151f28] transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${order.color}`}>{order.initials}</div>
        <div><p className="text-slate-900 dark:text-white text-sm font-bold">{order.name}</p><p className="text-slate-500 text-xs">{order.items}</p></div>
      </div>
      <div className="text-right"><p className="text-slate-900 dark:text-white text-sm font-bold">${order.total.toFixed(2)}</p><p className="text-slate-500 text-xs">{order.time}</p></div>
    </div>
  );
}