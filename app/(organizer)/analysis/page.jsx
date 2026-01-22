'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  CalendarDays, Download, Info, TrendingUp, Sparkles, Lightbulb,
  Speaker, Beer, Shield, Filter, Smile, Frown, Menu, Bell, Loader2, FileText,
  Rocket, ArrowLeft // Added for Coming Soon screen
} from 'lucide-react';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';const IS_COMING_SOON = false;const TREND_DATA_EVENT = [
  { time: '12 PM', value: 40, type: 'positive' },
  { time: '1 PM', value: 45, type: 'positive' },
  { time: '2 PM', value: 55, type: 'positive' },
  { time: '3 PM', value: -30, type: 'negative', label: 'Gate Issues' },
  { time: '4 PM', value: -25, type: 'negative' },
  { time: '5 PM', value: 50, type: 'positive' },
  { time: '6 PM', value: 70, type: 'positive' },
  { time: '7 PM', value: 85, type: 'positive' },
  { time: '8 PM', value: 95, type: 'positive', label: 'Headliner' },
  { time: '9 PM', value: 90, type: 'positive' },
  { time: '10 PM', value: 80, type: 'positive' },
  { time: '11 PM', value: -40, type: 'negative', label: 'Exit Traffic' },
];

const TREND_DATA_POST = [
  { time: 'Day 1', value: 80, type: 'positive' },
  { time: 'Day 2', value: 75, type: 'positive' },
  { time: 'Day 3', value: 60, type: 'positive' },
  { time: 'Day 4', value: 40, type: 'positive' },
  { time: 'Day 5', value: 20, type: 'positive' },
  { time: 'Day 6', value: 10, type: 'positive' },
  { time: 'Day 7', value: 5, type: 'positive' },
];const REVIEWS = [
  { id: 1, user: "Sarah Jenkins", ticket: "Ticket #8492 • VIP Pass", text: "Honestly one of the best nights of my life. The transition between the opening act and the main event was seamless. The VIP area was worth every penny.", sentiment: "positive" },
  { id: 2, user: "Mike T.", ticket: "Ticket #1120 • GA Pass", text: "Missed the first 30 mins because the gates were a mess. No clear signage anywhere.", sentiment: "negative" },
  { id: 3, user: "Jessica Alverez", ticket: "Ticket #3391 • GA Pass", text: "The sound quality was insane! Could feel the bass in my chest. Lighting crew deserves a raise.", sentiment: "positive" },
  { id: 4, user: "David Chen", ticket: "Ticket #9910 • GA Pass", text: "Bar lines were way too long. Missed half a set just getting water.", sentiment: "negative" },
  { id: 5, user: "Emily R.", ticket: "Ticket #2210 • VIP Pass", text: "Loved the energy! Can't wait for next year.", sentiment: "positive" },
];

const KEYWORDS = [
  { label: "#Atmosphere", type: "positive", size: "text-lg" },
  { label: "#Parking", type: "neutral", size: "text-sm" },
  { label: "#Queue", type: "negative", size: "text-xl" },
  { label: "#Drinks", type: "neutral", size: "text-xs" },
  { label: "#Vibe", type: "positive", size: "text-base" },
  { label: "#Security", type: "neutral", size: "text-xs" },
  { label: "#Lights", type: "positive", size: "text-lg" },
  { label: "#Tickets", type: "neutral", size: "text-sm" },
  { label: "#Price", type: "negative", size: "text-base" },
  { label: "#Energy", type: "positive", size: "text-xl" },
];

export default function AnalysisPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);  const [chartView, setChartView] = useState('event');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast.success("Report generated successfully! Check your downloads.");
    }, 1500);
  };

  const handleReviewFilterToggle = () => {
    const states = ['all', 'positive', 'negative'];
    const nextIndex = (states.indexOf(reviewFilter) + 1) % states.length;
    setReviewFilter(states[nextIndex]);
  };

  const handleFullAnalysis = () => {
    toast.info("Navigating to full detailed analysis view...");
  };  const currentChartData = chartView === 'event' ? TREND_DATA_EVENT : TREND_DATA_POST;

  const filteredReviews = useMemo(() => {
    if (reviewFilter === 'all') return REVIEWS;
    return REVIEWS.filter(r => r.sentiment === reviewFilter);
  }, [reviewFilter]);

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-white overflow-hidden selection:bg-[#0d93f2]/30 relative">

      {}
      {IS_COMING_SOON && (
        <div className="absolute inset-0 z-[100] bg-[#101b22]/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
          <div className="bg-[#192734] p-8 rounded-2xl border border-[#2c3b47] shadow-2xl max-w-md w-full relative overflow-hidden group">

            {}
            <div className="absolute top-0 right-0 p-12 bg-[#0d93f2]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-[#0d93f2]/20 rounded-full flex items-center justify-center mb-6 text-[#0d93f2]">
                <Rocket className="w-8 h-8" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
              <p className="text-[#90b2cb] mb-8">
                Our advanced sentiment analysis engine is currently crunching the numbers. Check back shortly for insights.
              </p>

              <button
                onClick={() => router.push('/manage/dashboard')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0d93f2] hover:bg-[#0b84db] text-white font-bold transition-all shadow-lg shadow-[#0d93f2]/20"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
      {}

      <OrganizerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#101b22]">

        <Header
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          isGenerating={isGenerating}
          onGenerate={handleGenerateReport}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-[#2c3b47] scrollbar-track-[#101b22]">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6">

            {}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {}
              <div className="lg:col-span-1 bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col justify-center relative overflow-hidden">
                <div className="flex justify-between items-center mb-4 z-10">
                  <h3 className="text-white text-lg font-bold">Overall Sentiment</h3>
                  <button className="text-[#90b2cb] hover:text-white transition-colors" title="More Info">
                    <Info className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-end gap-3 mb-2 z-10">
                  <span className="text-5xl font-bold text-white tracking-tighter">84%</span>
                  <span className="text-[#0bda5b] text-sm font-medium mb-1.5 flex items-center bg-[#0bda5b]/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" /> +5% vs 2022
                  </span>
                </div>
                <p className="text-[#90b2cb] text-sm mb-6 z-10">Positive Experience Score</p>

                {}
                <div className="relative h-3 w-full bg-[#315168]/30 rounded-full overflow-hidden z-10">
                  <div className="absolute h-full bg-gradient-to-r from-blue-500 to-[#0d93f2] w-[84%] rounded-full shadow-[0_0_10px_rgba(13,147,242,0.5)]"></div>
                </div>
                <div className="flex justify-between mt-3 text-xs text-[#90b2cb] z-10">
                  <span>Based on 1,240 verified reviews</span>
                  <span>Last updated 2h ago</span>
                </div>
              </div>

              {}
              <div className="lg:col-span-2 bg-gradient-to-br from-[#18242e] to-[#1c2a35] rounded-xl border border-[#2c3b47] p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Sparkles className="w-32 h-32 text-[#0d93f2]" />
                </div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <Sparkles className="w-5 h-5 text-[#0d93f2]" />
                  <h3 className="text-white text-lg font-bold">AI Executive Summary</h3>
                </div>
                <p className="text-white/90 text-lg font-normal leading-relaxed mb-4 font-body relative z-10">
                  "Attendees were <span className="text-[#0bda5b] font-medium border-b border-[#0bda5b]/30">thrilled with the headliner performance</span> and visual effects, citing them as the highlight of the night. However, significant friction was reported regarding <span className="text-red-500 font-medium border-b border-red-500/30">queue times at the entrance and bar service</span>, which negatively impacted the early-event experience."
                </p>
                <div className="flex gap-3 relative z-10">
                  <div className="px-3 py-1 rounded bg-white/5 border border-white/10 text-xs text-[#90b2cb]">Confidence: High</div>
                  <div className="px-3 py-1 rounded bg-white/5 border border-white/10 text-xs text-[#90b2cb]">Sources: Social, Email, App</div>
                </div>
              </div>
            </div>

            {}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-white text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0d93f2]"></span>
                    What they loved
                  </h3>
                  <span className="text-xs text-[#90b2cb] uppercase tracking-wider font-bold">Positive Sentiment</span>
                </div>

                <TopicCard
                  icon={Lightbulb} title="LIGHTING & VISUALS" score="92%"
                  quote="Spectacular laser show" subtext='Mentioned 214 times • "Immersive", "Stunning"'
                  type="positive"
                />
                <TopicCard
                  icon={Speaker} title="SOUND QUALITY" score="88%"
                  quote="Crisp and punchy bass" subtext='Mentioned 156 times • "Loud", "Clear"'
                  type="positive"
                />
              </div>

              {}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-white text-xl font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Areas for improvement
                  </h3>
                  <span className="text-xs text-[#90b2cb] uppercase tracking-wider font-bold">Negative Sentiment</span>
                </div>

                <TopicCard
                  icon={Beer} title="BAR SERVICE" score="34%"
                  quote="Wait times over 20 mins" subtext='Mentioned 310 times • "Slow", "Crowded"'
                  type="negative"
                />
                <TopicCard
                  icon={Shield} title="ENTRY SECURITY" score="45%"
                  quote="Confusing line management" subtext='Mentioned 85 times • "Chaos", "Rude"'
                  type="negative"
                />
              </div>
            </div>

            {}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {}
              <div className="lg:col-span-2 bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white text-lg font-bold">Sentiment Over Time</h3>
                  <div className="flex bg-white/5 rounded-lg p-0.5">
                    <button
                      onClick={() => setChartView('event')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${chartView === 'event' ? 'bg-[#0d93f2] text-white shadow' : 'text-[#90b2cb] hover:text-white'}`}
                    >
                      Event Day
                    </button>
                    <button
                      onClick={() => setChartView('post')}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${chartView === 'post' ? 'bg-[#0d93f2] text-white shadow' : 'text-[#90b2cb] hover:text-white'}`}
                    >
                      Post-Event
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2c3b47" opacity={0.5} />
                      <XAxis dataKey="time" tick={{ fill: '#90b2cb', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: '#90b2cb', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#101b22', borderColor: '#2c3b47', color: '#fff', borderRadius: '8px' }}
                        cursor={{ fill: '#ffffff0a' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {currentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.type === 'positive' ? '#0d93f2' : '#f24822'} fillOpacity={0.8} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {}
              <div className="lg:col-span-1 bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col">
                <h3 className="text-white text-lg font-bold mb-4">Trending Keywords</h3>
                <div className="flex-1 flex flex-wrap content-start gap-2">
                  {KEYWORDS.map((tag, i) => (
                    <span
                      key={i}
                      className={`
                        px-3 py-1.5 rounded-lg border font-bold ${tag.size} cursor-default transition-transform hover:scale-105
                        ${tag.type === 'positive' ? 'bg-[#0d93f2]/20 text-[#0d93f2] border-[#0d93f2]/30' :
                          tag.type === 'negative' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                            'bg-white/5 text-white/80 border-white/10'}
                      `}
                    >
                      {tag.label}
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleFullAnalysis}
                  className="mt-4 w-full py-2 rounded-lg border border-white/10 text-[#90b2cb] text-xs font-bold hover:bg-white/5 transition-colors"
                >
                  View Full Analysis
                </button>
              </div>
            </div>

            {}
            <div className="bg-[#192734] rounded-xl border border-[#2c3b47] overflow-hidden">
              <div className="p-4 border-b border-[#2c3b47] flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-white text-sm font-bold uppercase tracking-wider">Recent Verified Reviews</h3>
                  <span className="text-xs text-[#90b2cb] font-normal lowercase bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    Filter: {reviewFilter}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleReviewFilterToggle}
                    className={`p-1 rounded transition-colors ${reviewFilter !== 'all' ? 'text-[#0d93f2] bg-[#0d93f2]/10' : 'text-[#90b2cb] hover:text-white'}`}
                    title="Toggle Filter (All / Positive / Negative)"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toast.info("Downloading reviews CSV...")}
                    className="text-[#90b2cb] hover:text-white p-1"
                    title="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[#2c3b47]">
                {filteredReviews.length > 0 ? (
                  filteredReviews.map((review) => (
                    <div key={review.id} className="p-4 flex gap-4 hover:bg-white/5 transition-colors">
                      <div className={`p-2 rounded-lg h-fit ${review.sentiment === 'positive' ? 'bg-green-500/20 text-[#0bda5b]' : 'bg-red-500/20 text-red-500'}`}>
                        {review.sentiment === 'positive' ? <Smile className="w-5 h-5" /> : <Frown className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white text-sm font-bold">{review.user}</p>
                          <span className="text-[#90b2cb] text-xs">• {review.ticket}</span>
                        </div>
                        <p className="text-[#90b2cb] text-sm leading-relaxed">"{review.text}"</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#90b2cb]">
                    <p>No reviews found matching filter: <span className="font-bold capitalize">{reviewFilter}</span></p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

function Header({ onMenuClick, isGenerating, onGenerate }) {
  return (
    <header className="flex-shrink-0 border-b border-[#2c3b47] px-4 md:px-8 py-6 bg-[#101b22]/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col gap-1 w-full md:w-auto">
          <div className="flex items-center gap-4 mb-2 md:mb-0">
            <button onClick={onMenuClick} className="md:hidden text-[#90b2cb] hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-white text-2xl md:text-3xl font-bold tracking-tight">Summer Music Festival 2023</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#0bda5b]/20 text-[#0bda5b] border border-[#0bda5b]/20">COMPLETED</span>
            </div>
          </div>
          <p className="text-[#90b2cb] text-sm flex items-center gap-2 pl-10 md:pl-0">
            <CalendarDays className="w-4 h-4" />
            September 15, 2023
            <span className="w-1 h-1 rounded-full bg-[#90b2cb]"></span>
            Post-Event Sentiment Analysis
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto pl-10 md:pl-0">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={`
              flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg 
              bg-[#0d93f2] hover:bg-[#0b84db] text-white text-sm font-bold shadow-lg shadow-[#0d93f2]/20 
              transition-all hover:translate-y-[-1px] disabled:opacity-70 disabled:cursor-wait
            `}
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>

          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-[#2c3b47]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0d93f2] to-purple-500 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#101b22] relative overflow-hidden">
                <Image src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" alt="Profile" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function TopicCard({ icon: Icon, title, score, quote, subtext, type }) {
  const borderColor = type === 'positive' ? 'border-[#0d93f2]' : 'border-red-500';
  const textColor = type === 'positive' ? 'text-[#0d93f2]' : 'text-red-500';
  const hoverColor = type === 'positive' ? 'group-hover:text-[#0d93f2]' : 'group-hover:text-red-500';

  return (
    <div className={`bg-[#192734] rounded-xl p-5 border-l-4 ${borderColor} hover:bg-[#202e3b] transition-colors cursor-pointer group`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`flex items-center gap-2 ${textColor}`}>
          <Icon className="w-5 h-5" />
          <span className="font-bold text-sm">{title}</span>
        </div>
        <span className="text-white font-bold text-lg">{score}</span>
      </div>
      <p className={`text-white text-base font-medium mb-1 ${hoverColor} transition-colors`}>"{quote}"</p>
      <p className="text-[#90b2cb] text-sm">{subtext}</p>
    </div>
  );
}