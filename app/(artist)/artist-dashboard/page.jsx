'use client';
import ArtistNavbar from '@/components/artist/ArtistNavbar';
import { 
  LiveShowCard, 
  TicketStatsCard, 
  MerchAlert, 
  StatGrid, 
  UpcomingStops 
} from '@/components/artist/dashboard/dashboard-parts';

// This object mimics exactly what your Database/API should return
const MOCK_DATA = {
  tourName: "Asia Leg 2024",
  systemStatus: "Online",
  
  currentShow: {
    city: "Mumbai, IN",
    venue: "Jio World Garden",
    doorsOpen: "18:00 PM",
    showStart: "20:00 PM",
    localTime: "20:15",
    statusLabel: "Live Tonight",
    isLive: true,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBfb9PuDv96ogpYImHXpexg0rFzsdNIr8tFbhqgvrF_4GmSzuKTmyfkXrLlSLtx8Js2o9Eadg4BD_ca1DTrh1CRCaiAIu73D1OwXkzwP2qljqmslV8v_TU1sGT1l1nre6B9FIquCwhXocec8PLmp-_RDtj5580rIP04kun3LZZOhyzSpgiJ_uW18PfrTdAIZqlzoM0JRj8nzyM8P7HLb8bn8Pb7bSDOAad-GrORRTFj44fdYMTvUaMeczDbix3cQoR1SQcqRTT1YnmR"
  },

  ticketStats: {
    sold: 5000,
    capacity: 5100,
    percentage: 98,
    vipPercent: 100,
    gaPercent: 97,
    soldOut: true
  },

  alert: {
    active: true,
    title: "Merch Alert",
    message: "Low stock on",
    highlight: "Size M Hoodies at Main Booth"
  },

  quickStats: [
    { label: "Fan Pulse", value: "High Eng.", sub: "+12% vs last show", iconName: "Heart", trend: true },
    { label: "Weather", value: "29°C Clear", sub: "Humidity: 65%", iconName: "Sun", trend: false },
    { label: "Gross Rev", value: "$124.5k", sub: "Est. Final", iconName: "DollarSign", trend: false },
    { label: "Streams", value: "2.4M", sub: "Top City: Mumbai", iconName: "BarChart3", trend: false, success: true },
  ],

  stops: [
    { date: "24", month: "OCT", city: "New Delhi, IN", venue: "JLN Stadium" },
    { date: "26", month: "OCT", city: "Bangalore, IN", venue: "Palace Grounds" },
    { date: "29", month: "OCT", city: "Singapore, SG", venue: "Indoor Stadium" },
  ]
};

export default async function ArtistDashboard() {
  // In the future: const data = await fetch('api/dashboard').then(res => res.json())
  const data = MOCK_DATA;

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-[#101b22] text-slate-900 dark:text-white font-sans">
      <ArtistNavbar />
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-slate-900 dark:text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight">
              Tour Hub: {data.tourName}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Overview of today's logistics and tour status.</p>
          </div>
          <div className="flex items-center gap-3 bg-white dark:bg-[#223949] px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-bold text-slate-700 dark:text-white">System {data.systemStatus}</span>
          </div>
        </div>

        {/* Hero & Logistics Grid */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* Pass specific data objects to components */}
             <LiveShowCard data={data.currentShow} />
             
             <div className="flex flex-col gap-6">
                <TicketStatsCard data={data.ticketStats} />
                <MerchAlert data={data.alert} />
             </div>
          </div>
        </div>

        {/* Stats Grid */}
        <StatGrid data={data.quickStats} />

        {/* Upcoming Route */}
        <UpcomingStops data={data.stops} />
        
      </main>
    </div>
  );
}