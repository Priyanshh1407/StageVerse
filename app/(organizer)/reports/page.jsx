'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { jsPDF } from 'jspdf';
import { toast } from "sonner";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Bell, ChevronDown, Download, RefreshCw,
  TrendingUp, TrendingDown, MoreHorizontal, Filter, Search,
  ChevronLeft, ChevronRight, Menu, FileSpreadsheet, FileText, Check, CalendarDays
} from 'lucide-react';
import OrganizerSidebar from '@/components/organizer/OrganizerSidebar';const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(num);
};

const formatPercentage = (val) => {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(1)}%`; // Rounds 12.1086... -> +12.1%
};

export default function ReportsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);  const [stats, setStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [revenueTypes, setRevenueTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [eventsList, setEventsList] = useState([]);

  const [isGenerating, setIsGenerating] = useState(true); // Start true to trigger initial fetch  const [category, setCategory] = useState("Financial Overview");
  const [eventScope, setEventScope] = useState("");
  const [dateRange, setDateRange] = useState("Aug 01 - Aug 31, 2023");  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;  const fetchData = async () => {
    setIsGenerating(true);

    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery,
        eventId: eventScope,
        category: category
      });

      const res = await fetch(`/api/reports?${params}`);
      const result = await res.json();

      if (result.success) {
        setStats(result.data.kpi);
        setChartData(result.data.chart);
        setRevenueTypes(result.data.revenueTypes);
        setTransactions(result.data.transactions);
        setTotalCount(result.data.pagination?.total);

        if (result.data.eventsList) {
          setEventsList(result.data.eventsList);
        }
      }
    } catch (err) {
      console.error('Failed to fetch reports: ', err);
    } finally {
      setIsGenerating(false);
    }
  };  useEffect(() => {
    fetchData();
  }, [currentPage, searchQuery, eventScope, category]);  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  const handleExportExcel = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("No data to export!");
      return;
    }

    const excelData = transactions.map(t => ({
      "Transaction ID": t.id,
      "Date": t.date,
      "Customer Name": t.customer,
      "Ticket type": t.type,
      "Quantity": t.qty,
      "Amount": t.amount,
      "Status": t.status
    }));

    const workSheet = XLSX.utils.json_to_sheet(excelData);

    const workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Sale Report");

    XLSX.writeFile(workBook, `Event_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const handleExportPDF = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();    doc.setFontSize(18);
    doc.text("Event Sale Report", 14, 22);    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);    autoTable(doc, {
      startY: 40,
      head: [['ID', 'Date', 'Customer', 'Type', 'Qty', 'Amount', 'Status']],
      body: transactions.map(t => [
        t.id,
        t.date,
        t.customer,
        t.type,
        t.qty,
        `₹${t.amount}`,
        t.status
      ]),
      theme: 'grid',
      headStyles: { fillColor: [44, 59, 71] },
      styles: { fontSize: 8 }
    });

    doc.save(`sales_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="flex h-screen w-full bg-[#f5f7f8] dark:bg-[#101b22] font-sans text-white overflow-hidden selection:bg-[#0d93f2]/30">

      {}
      <OrganizerSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#101b22]">

        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-[#2c3b47] scrollbar-track-[#101b22]">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-6">

            {}
            <ReportControls
              category={category} setCategory={setCategory}
              scope={eventScope} setScope={setEventScope}
              eventsList={eventsList}
              onGenerate={fetchData}
              isGenerating={isGenerating}
              onExportExcel={handleExportExcel}
              onExportPDF={handleExportPDF}
            />

            {}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {isGenerating
                ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
                : stats.map((stat) => <StatCard key={stat.id} data={stat} />)
              }
            </div>

            {}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SalesChart data={chartData} />
              <RevenueByType data={revenueTypes} />
            </div>

            {}
            <TransactionsTable
              data={transactions}
              search={searchQuery}
              onSearch={setSearchQuery}
              page={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalCount={totalCount}
            />

          </div>
        </div>
      </main>
    </div>
  );
}

function Header({ onMenuClick }) {
  return (
    <header className="h-20 border-b border-[#2c3b47] flex items-center justify-between px-4 md:px-8 bg-[#101b22]/95 backdrop-blur-sm z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="md:hidden text-[#90b2cb] hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">Reports & Analytics</h2>
          <p className="text-[#90b2cb] text-sm hidden md:block">Deep dive into event performance</p>
        </div>
      </div>
      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#192734] border border-[#2c3b47] text-xs text-[#90b2cb]">
          <CalendarDays className="w-4 h-4" />
          <span>Last updated: Just now</span>
        </div>
        <button className="relative p-2 text-[#90b2cb] hover:text-white">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0d93f2] rounded-full"></span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-[#2c3b47]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0d93f2] to-purple-500 p-[1px] cursor-pointer hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-[#101b22] relative overflow-hidden">
              <Image src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" alt="Profile" fill className="object-cover" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ReportControls({ category, setCategory, scope, setScope, eventsList, date, onGenerate, isGenerating, onExportExcel, onExportPDF }) {
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <div className="bg-[#192734] rounded-xl p-6 border border-[#2c3b47] shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1">
          {}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-[#90b2cb] text-xs font-semibold uppercase tracking-wider">Report Category</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#101b22] border border-[#2c3b47] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2] appearance-none cursor-pointer"
              >
                <option>Financial Overview</option>
                <option>Ticket Sales Trends</option>
                <option>Attendee Demographics</option>
                <option>Marketing ROI</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-[#90b2cb] pointer-events-none" />
            </div>
          </div>

          {}
          <div className="flex flex-col gap-2 w-full md:w-1/4">
            <label className="text-[#90b2cb] text-xs font-semibold uppercase tracking-wider">Event Scope</label>
            <div className="relative">
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full bg-[#101b22] border border-[#2c3b47] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#0d93f2] focus:ring-1 focus:ring-[#0d93f2] appearance-none cursor-pointer"
              >
                <option>All Events</option>
                {eventsList && eventsList.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-[#90b2cb] pointer-events-none" />
            </div>
          </div>

          {}
          {}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0 relative">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#0d93f2] hover:bg-[#0b84db] text-white font-medium px-5 py-2.5 rounded-lg transition-all shadow-[0_0_15px_rgba(13,147,242,0.3)] ${isGenerating ? 'opacity-70 cursor-wait' : ''}`}
          >
            <RefreshCw className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>

          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="flex items-center justify-center gap-2 bg-[#2c3b47] hover:bg-[#3e5060] text-white font-medium px-5 py-2.5 rounded-lg transition-colors border border-transparent hover:border-[#90b2cb]/30"
            >
              <Download className="w-5 h-5" /> Export
            </button>
            {isExportOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#192734] border border-[#2c3b47] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                <button onClick={() => { onExportExcel(); setIsExportOpen(false) }} className="w-full text-left px-4 py-3 text-sm text-[#90b2cb] hover:text-white hover:bg-[#2c3b47] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> Export as Excel File
                </button>
                <button onClick={() => { onExportPDF(); setIsExportOpen(false) }} className="w-full text-left px-4 py-3 text-sm text-[#90b2cb] hover:text-white hover:bg-[#2c3b47] flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ data }) {  const isPositive = data.trend > 0;
  const isNeutral = data.trend === 0 || (data.trend < 0.2 && data.trend > -0.2); // Treat very small numbers as neutral

  let trendColors = isPositive
    ? "text-[#0bda5b] bg-[#0bda5b]/10 border-[#0bda5b]/20"
    : "text-red-400 bg-red-400/10 border-red-400/20";

  let TrendIcon = isPositive ? TrendingUp : TrendingDown;  if (isNeutral) {
    trendColors = "text-[#90b2cb] bg-[#2c3b47]";
    TrendIcon = null; // No icon for neutral
  }  let displayValue;
  if (data.type === 'currency') displayValue = formatCurrency(data.value);
  else if (data.type === 'percentage') displayValue = data.value + '%';
  else displayValue = formatNumber(data.value);

  return (
    <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] hover:border-[#0d93f2]/30 transition-colors">
      <p className="text-[#90b2cb] text-xs font-semibold uppercase mb-1">{data.label}</p>
      <div className="flex items-end justify-between">
        <h3 className="text-2xl font-bold text-white">{displayValue}</h3>
        <span className={`${trendColors} text-xs font-bold flex items-center px-1.5 py-0.5 rounded`}>
          {TrendIcon && <TrendIcon className="w-3.5 h-3.5 mr-1" />}
          {formatPercentage(data.trend)}
        </span>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="bg-[#192734] rounded-xl p-5 border border-[#2c3b47] animate-pulse">
      <div className="h-3 w-24 bg-[#2c3b47] rounded mb-3"></div>
      <div className="flex items-end justify-between">
        <div className="h-8 w-32 bg-[#2c3b47] rounded"></div>
        <div className="h-5 w-16 bg-[#2c3b47] rounded"></div>
      </div>
    </div>
  );
}

function SalesChart({ data }) {
  return (
    <div className="lg:col-span-2 bg-[#192734] rounded-xl border border-[#2c3b47] p-6 relative flex flex-col h-[350px]">
      <div className="flex justify-between items-center mb-2 z-10">
        <div>
          <h3 className="text-lg font-bold text-white">Sales Trends</h3>
          <p className="text-[#90b2cb] text-xs">Revenue velocity over selected period</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 text-xs text-white bg-[#101b22] border border-[#2c3b47] px-2 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-[#0d93f2]"></span> Revenue
          </span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d93f2" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0d93f2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2c3b47" />
            <XAxis
              dataKey="name"
              hide={true}
            />
            <YAxis
              tick={{ fill: '#90b2cb', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#101b22', borderColor: '#2c3b47', color: '#fff' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [`$${value.toLocaleString()}`, "Revenue"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0d93f2"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorVal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RevenueByType({ data }) {
  const [activeMenu, setActiveMenu] = useState(false);
  const items = data && data.length > 0 ? data : [];
  const colors = ["bg-[#0d93f2]", "bg-[#3b82f6]", "bg-[#60a5fa]", "bg-[#93c5fd]"];

  return (
    <div className="lg:col-span-1 bg-[#192734] rounded-xl border border-[#2c3b47] p-6 flex flex-col h-[350px]">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">Revenue by Type</h3>
        <div className="relative">
          <button onClick={() => setActiveMenu(!activeMenu)} className="text-[#90b2cb] hover:text-white p-1 rounded hover:bg-[#2c3b47]">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {activeMenu && (
            <div className="absolute right-0 top-full mt-2 w-32 bg-[#101b22] border border-[#2c3b47] rounded shadow-lg z-20">
              <button className="w-full text-left px-3 py-2 text-xs text-[#90b2cb] hover:text-white hover:bg-[#2c3b47]">View Details</button>
              <button className="w-full text-left px-3 py-2 text-xs text-[#90b2cb] hover:text-white hover:bg-[#2c3b47]">Edit Goals</button>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center space-y-6">
        {items.map((type, i) => (
          <div key={i} className="group cursor-default">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-white font-medium group-hover:text-[#0d93f2] transition-colors">{type.label}</span>
              <span className="text-white font-bold">${type.value.toLocaleString()} <span className="text-[#90b2cb] font-normal">({type.percent}%)</span></span>
            </div>
            <div className="w-full bg-[#101b22] h-2.5 rounded-full overflow-hidden">
              <div
                className={`${colors[i % colors.length]} h-full rounded-full transition-all duration-1000 ease-out`}
                style={{ width: `${type.percent}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TransactionsTable({ data, search, onSearch, page, totalPages, onPageChange, totalCount }) {
  return (
    <div className="bg-[#192734] rounded-xl border border-[#2c3b47] overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-[#2c3b47] flex flex-col md:flex-row justify-between items-center bg-[#101b22]/30 gap-4">
        <h3 className="text-lg font-bold text-white">Transaction Details</h3>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input
              value={search}
              onChange={(e) => {
                onSearch(e.target.value);
                onPageChange(1);
              }}
              className="bg-[#101b22] border border-[#2c3b47] text-white text-xs rounded px-3 py-2 pl-9 focus:outline-none focus:border-[#0d93f2] w-full placeholder-[#90b2cb]/50"
              placeholder="Search ID or Customer..."
              type="text"
            />
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-[#90b2cb]" />
          </div>
          <button className="text-[#90b2cb] hover:text-white px-2 bg-[#101b22] border border-[#2c3b47] rounded hover:border-[#0d93f2] transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#90b2cb]">
          <thead className="bg-[#101b22] text-xs uppercase font-medium text-white border-b border-[#2c3b47]">
            <tr>
              <th className="px-6 py-4">Transaction ID</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Ticket Type</th>
              <th className="px-6 py-4">Qty</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2c3b47]">
            {data.length > 0 ? (
              data.map((trx, i) => (
                <tr key={i} className="hover:bg-[#2c3b47]/30 transition-colors group">
                  <td className="px-6 py-3 font-mono text-xs text-[#90b2cb] group-hover:text-[#0d93f2] transition-colors">{trx.id}</td>
                  <td className="px-6 py-3">{trx.date}</td>
                  <td className="px-6 py-3 text-white font-medium">{trx.customer}</td>
                  <td className="px-6 py-3">{trx.type}</td>
                  <td className="px-6 py-3">{trx.qty}</td>
                  <td className="px-6 py-3 text-right font-medium text-white">${trx.amount.toFixed(2)}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${trx.status === 'Paid'
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                      {trx.status === 'Paid' && <Check className="w-3 h-3" />}
                      {trx.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-[#90b2cb]">
                  No transactions found matching "{search}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {}
      <div className="px-6 py-3 border-t border-[#2c3b47] flex flex-col sm:flex-row justify-between items-center text-xs text-[#90b2cb] gap-4">
        <span>Showing {data.length} of {totalCount} transactions</span>
        <div className="flex gap-1 items-center">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-2 py-1 rounded hover:bg-[#2c3b47] disabled:opacity-30 disabled:hover:bg-transparent flex items-center transition-colors"
          >
            <ChevronLeft className="w-3 h-3 mr-1" /> Prev
          </button>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${page === p ? 'bg-[#0d93f2] text-white font-bold' : 'hover:bg-[#2c3b47]'}`}
              >
                {p}
              </button>
            )
          })}

          {totalPages > 5 && <span className="px-2">...</span>}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages || totalPages === 0}
            className="px-2 py-1 rounded hover:bg-[#2c3b47] disabled:opacity-30 disabled:hover:bg-transparent flex items-center transition-colors"
          >
            Next <ChevronRight className="w-3 h-3 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}