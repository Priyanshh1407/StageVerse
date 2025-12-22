'use client';

import React from 'react';
import { Copy, RefreshCw, Bookmark, CheckCircle, Info, Megaphone, Edit3 } from 'lucide-react';

export default function AIContentPreview() {
  return (
    <div className="flex flex-col h-full gap-4">
      
      {/* Main Output Box */}
      <div className="flex-1 bg-white dark:bg-[#192734] rounded-xl border border-slate-200 dark:border-[#2c3b47] relative overflow-hidden flex flex-col min-h-[500px]">
        
        {/* Toolbar */}
        <div className="border-b border-slate-200 dark:border-[#2c3b47] p-4 flex items-center justify-between bg-slate-50 dark:bg-[#101b22]/50">
          <h4 className="text-xs font-bold text-slate-500 dark:text-[#90b2cb] uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Generated Result
          </h4>
          <div className="flex gap-2">
            <ActionButton icon={Copy} title="Copy" />
            <ActionButton icon={RefreshCw} title="Regenerate" />
            <ActionButton icon={Bookmark} title="Save" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 prose prose-slate dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Experience the Pulse of the Underground</h2>
            
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              Get ready for a night where the bass drops deeper than ever before. This Saturday, <span className="text-primary font-semibold">Fred Again..</span> takes over the decks for an unforgettable journey through sound and emotion. Expect raw energy, euphoric melodies, and a crowd that moves as one.
            </p>
            
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              We're transforming the venue into an immersive auditory haven. With state-of-the-art visuals and a sound system tuned to perfection, this isn't just a concert—it's a spiritual reset.
            </p>

            <ul className="space-y-2 mb-6">
              <ListItem text="Exclusive rooftop access with skyline views" />
              <ListItem text="Extended 2-hour set" />
              <ListItem text="Immersive light show installation" />
            </ul>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-slate-800 dark:text-white font-medium text-center italic">
              "Don't miss the most anticipated electronic event of the season."
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#2c3b47] flex justify-between items-center text-xs text-slate-400">
          <span>Words: 145</span>
          <span className="flex items-center gap-1">
            AI Model: Gemini Pro <Info className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SuggestionCard 
          icon={Megaphone} 
          color="text-orange-500" 
          bg="bg-orange-500/10" 
          title="Make it more Hype" 
          desc="Regenerate with more exclamation and energy." 
        />
        <SuggestionCard 
          icon={Edit3} 
          color="text-purple-500" 
          bg="bg-purple-500/10" 
          title="Add SEO Keywords" 
          desc="Optimize for search engines automatically." 
        />
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ActionButton({ icon: Icon, title }) {
  return (
    <button className="p-2 hover:bg-slate-200 dark:hover:bg-[#2c3b47] rounded-lg text-slate-500 dark:text-slate-400 transition-colors" title={title}>
      <Icon className="w-5 h-5" />
    </button>
  );
}

function ListItem({ text }) {
  return (
    <li className="flex items-center gap-2 text-slate-700 dark:text-[#90b2cb]">
      <CheckCircle className="w-4 h-4 text-primary" />
      <span>{text}</span>
    </li>
  );
}

function SuggestionCard({ icon: Icon, color, bg, title, desc }) {
  return (
    <div className="bg-white dark:bg-[#192734] p-4 rounded-lg border border-slate-200 dark:border-[#2c3b47] flex gap-3 items-start cursor-pointer hover:border-primary/50 transition-all group">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`${color} w-5 h-5 group-hover:scale-110 transition-transform`} />
      </div>
      <div>
        <h5 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h5>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
  );
}