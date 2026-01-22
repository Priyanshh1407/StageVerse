'use client';

import React, { useState } from 'react';
import { Ticket, CreditCard, CheckCircle2, ChevronRight, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

export default function TicketSelection({ eventId, tiers = [] }) {
  const router = useRouter();  const [step, setStep] = useState(1); // 1 = Select, 2 = Details/Pay
  const [selectedTierId, setSelectedTierId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState(""); // 🆕 Collect Name
  const [isBuying, setIsBuying] = useState(false);  const selectedTier = tiers.find(t => t._id === selectedTierId);
  const totalPrice = selectedTier ? (selectedTier.price * quantity) : 0;  const handleProceed = () => {
    if (!selectedTierId) return toast.error("Please select a ticket");
    setStep(2);
  };

  const handleBuy = async () => {
    if (!buyerName.trim()) return toast.error("Please enter the name for the ticket booking");

    setIsBuying(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          ticketTierId: selectedTierId,
          quantity,
          buyerName // 👈 Sending the name
        })
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Success! Order ID: ${data.trxId}`);
        router.refresh();        setStep(1);
        setQuantity(1);
        setSelectedTierId(null);
      } else {
        toast.error(data.message || "Purchase failed");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsBuying(false);
    }
  };

  if (tiers.length === 0) {
    return (
      <div className="bg-[#192734] border border-[#2c3b47] rounded-xl p-6 text-center text-[#90b2cb]">
        <p>No tickets available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#192734] border border-slate-200 dark:border-[#2c3b47] rounded-xl p-6 shadow-xl top-24 overflow-hidden">

      {}
      <div className="flex items-center gap-3 mb-6">
        {step === 2 && (
          <button onClick={() => setStep(1)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-[#2c3b47] transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-[#90b2cb]" />
          </button>
        )}
        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {step === 1 ? <><Ticket className="w-5 h-5 text-[#0d93f2]" /> Select Tickets</> : 'Confirm Details'}
        </h3>
      </div>

      {}
      {step === 1 && (
        <div className="animate-in slide-in-from-left-4 fade-in duration-300">
          <div className="flex flex-col gap-3 mb-6">
            {tiers.map((tier) => {
              const isSoldOut = (tier.sold >= tier.capacity) || tier.status === 'Sold Out';
              const isSelected = selectedTierId === tier._id;

              return (
                <div
                  key={tier._id}
                  onClick={() => !isSoldOut && setSelectedTierId(tier._id)}
                  className={`
                    relative p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center
                    ${isSoldOut
                      ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#101b22] border-slate-200 dark:border-[#2c3b47]'
                      : isSelected
                        ? 'border-[#0d93f2] bg-[#0d93f2]/10 ring-1 ring-[#0d93f2]'
                        : 'border-slate-200 dark:border-[#2c3b47] bg-white dark:bg-[#101b22] hover:border-[#0d93f2]/50'}
                  `}
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{tier.name}</p>
                    <p className="text-xs text-slate-500 dark:text-[#90b2cb] mt-0.5">
                      {isSoldOut ? <span className="text-red-500 font-bold">Sold Out</span> : `${tier.capacity - tier.sold} left`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white">${tier.price}</p>
                    {isSelected && <CheckCircle className="w-4 h-4 text-[#0d93f2] absolute top-2 right-2" />}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedTierId && (
            <div className="flex justify-between items-center mb-6 p-4 bg-slate-50 dark:bg-[#101b22] rounded-lg border border-slate-200 dark:border-[#2c3b47]">
              <span className="text-sm text-slate-500 dark:text-[#90b2cb]">Quantity</span>
              <div className="flex items-center gap-4">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-full bg-white dark:bg-[#192734] border border-slate-300 dark:border-[#2c3b47] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#233342] text-slate-900 dark:text-white"><Minus className="w-4 h-4" /></button>
                <span className="font-mono font-bold text-slate-900 dark:text-white w-4 text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(10, quantity + 1))} className="w-8 h-8 rounded-full bg-white dark:bg-[#192734] border border-slate-300 dark:border-[#2c3b47] flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#233342] text-slate-900 dark:text-white"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          <div className="flex justify-between items-end mb-4 border-t border-slate-200 dark:border-[#2c3b47] pt-4">
            <span className="text-slate-500 dark:text-[#90b2cb] text-sm">Total</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">${totalPrice.toLocaleString()}</span>
          </div>

          <button
            onClick={handleProceed}
            disabled={!selectedTierId}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-[#0d93f2] hover:bg-[#0b84db] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Continue
          </button>
        </div>
      )}

      {}
      {step === 2 && (
        <div className="animate-in slide-in-from-right-4 fade-in duration-300">

          {}
          <div className="bg-slate-50 dark:bg-[#101b22] p-4 rounded-lg border border-slate-200 dark:border-[#2c3b47] mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500 dark:text-[#90b2cb]">{selectedTier?.name} <span className="text-xs">x{quantity}</span></span>
              <span className="text-slate-900 dark:text-white font-bold">${totalPrice}</span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-[#2c3b47] my-3"></div>
            <div className="flex justify-between items-center">
              <span className="text-slate-900 dark:text-white font-bold text-sm">Total Due</span>
              <span className="text-xl font-black text-[#0d93f2]">${totalPrice}</span>
            </div>
          </div>

          {}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase mb-1.5">Booking Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full pl-10 p-2.5 bg-slate-50 dark:bg-[#101b22] border border-slate-200 dark:border-[#2c3b47] rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#0d93f2]"
                  placeholder="Who is this ticket for?"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">This name will appear on the ticket.</p>
            </div>

            {}
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase mb-1.5">Payment Method</label>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#101b22] border border-slate-200 dark:border-[#2c3b47] rounded-lg opacity-80">
                <CreditCard className="w-4 h-4 text-slate-900 dark:text-white" />
                <span className="text-sm text-slate-900 dark:text-white">•••• •••• •••• 4242</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleBuy}
            disabled={isBuying || !buyerName}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-[#0d93f2] hover:bg-[#0b84db] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#0d93f2]/20"
          >
            {isBuying ? <Loader2 className="w-5 h-5 animate-spin" /> : `Pay $${totalPrice}`}
          </button>
        </div>
      )}

      <p className="text-xs text-center text-slate-400 dark:text-[#5c6b7f] mt-4">
        Powered by StageVerse Secure Checkout
      </p>
    </div>
  );
}