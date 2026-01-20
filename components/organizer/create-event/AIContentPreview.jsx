'use client';

import React from 'react';
import { Copy, RefreshCw, Bookmark, CheckCircle, Info, Megaphone, Edit3 } from 'lucide-react';
import { toast } from "sonner";

export default function AIContentPreview({ content, onRequestAI }) {

  // Simple Parser for the structured AI output
  const parsed = React.useMemo(() => {
    if (!content) return null;

    // Default fallback
    const data = {
      headline: "Event Preview",
      hook: content,
      atmosphere: "",
      highlights: [],
      closing: ""
    };

    try {
      // Regex for new Labelled format
      const headlineMatch = content.match(/HEADLINE:\s*(.*)/i);
      const hookMatch = content.match(/HOOK:\s*([\s\S]*?)(?=ATMOSPHERE:)/i);
      const atmosMatch = content.match(/ATMOSPHERE:\s*([\s\S]*?)(?=HIGHLIGHTS:)/i);
      const highlightSection = content.match(/HIGHLIGHTS:\s*([\s\S]*?)(?=CLOSING:)/i);
      const closingMatch = content.match(/CLOSING:\s*(.*)/i);

      if (headlineMatch) data.headline = headlineMatch[1].trim();
      if (hookMatch) data.hook = hookMatch[1].trim();
      if (atmosMatch) data.atmosphere = atmosMatch[1].trim();

      if (highlightSection) {
        // Extract bullet points (-, *, or just lines)
        const lines = highlightSection[1].split('\n').map(l => l.trim()).filter(l => l.length > 0 && l !== '-');
        data.highlights = lines.map(l => l.replace(/^[-*]\s*/, ''));
      }

      if (closingMatch) data.closing = closingMatch[1].trim().replace(/^"|"$/g, '');

    } catch (e) { console.error("Parse error", e); }

    return data;
  }, [content]);

  const handleCopy = () => {
    if (!content) return;
    // Copy the raw plain text content (or formatted? User likely wants the generation result text)
    // The "content" prop holds the formatted string from the API.
    navigator.clipboard.writeText(content);
    toast.success("Content copied to clipboard!");
  };

  // If no content, show placeholder or static example (for now, keeping static if empty)
  if (!parsed) {
    // Return existing static mockup as "Example"
    return (
      <div className="flex flex-col h-full gap-4 opacity-50 pointer-events-none filter blur-[1px]">
        {/* ... keeping structure but indicating it's waiting ... */}
        <div className="flex-1 bg-white dark:bg-[#192734] rounded-xl border border-slate-200 dark:border-[#2c3b47] flex items-center justify-center text-slate-500">
          <div className="text-center p-8">
            <RefreshCw className="w-12 h-12 mx-auto mb-4 text-[#0d93f2] animate-pulse" />
            <h3 className="text-lg font-bold text-white">Ready to Dream?</h3>
            <p className="max-w-xs mx-auto mt-2">Fill the form and hit "Generate AI" to see the magic here.</p>
          </div>
        </div>
      </div>
    );
  }

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
            <ActionButton icon={Copy} title="Copy" onClick={handleCopy} />
            <ActionButton icon={RefreshCw} title="Regenerate" onClick={() => onRequestAI && onRequestAI('regen')} />
            <ActionButton icon={Bookmark} title="Save" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 relative overflow-y-auto custom-scrollbar">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative z-10 prose prose-slate dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">{parsed.headline}</h2>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
              {parsed.hook}
            </p>

            {parsed.atmosphere && (
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {parsed.atmosphere}
              </p>
            )}

            {parsed.highlights.length > 0 && (
              <ul className="space-y-2 mb-6">
                {parsed.highlights.map((h, i) => <ListItem key={i} text={h} />)}
              </ul>
            )}

            {parsed.closing && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-slate-800 dark:text-white font-medium text-center italic">
                "{parsed.closing}"
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-[#2c3b47] flex justify-between items-center text-xs text-slate-400">
          <span>Words: {content.split(' ').length}</span>
          <span className="flex items-center gap-1">
            AI Model: Gemini 2.5 <Info className="w-3 h-3" />
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
          onClick={() => onRequestAI && onRequestAI('hype')}
        />
        <SuggestionCard
          icon={Edit3}
          color="text-purple-500"
          bg="bg-purple-500/10"
          title="Add SEO Keywords"
          desc="Optimize for search engines automatically."
          onClick={() => onRequestAI && onRequestAI('seo')}
        />
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ActionButton({ icon: Icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-slate-200 dark:hover:bg-[#2c3b47] rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
      title={title}
    >
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

function SuggestionCard({ icon: Icon, color, bg, title, desc, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-[#192734] p-4 rounded-lg border border-slate-200 dark:border-[#2c3b47] flex gap-3 items-start cursor-pointer hover:border-primary/50 transition-all group"
    >
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