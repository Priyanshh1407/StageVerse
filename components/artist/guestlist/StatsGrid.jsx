'use client';

export default function StatsGrid({ stats, isLoading }) {  const display = (val) => isLoading ? '-' : val;

  const cards = [
    { label: 'Total Guests', value: display(stats?.total), change: '+12%', isPositive: true },
    { label: 'All Access', value: display(stats?.allAccess), change: '+2%', isPositive: true },
    { label: 'VIP', value: display(stats?.vip), change: '0%', isPositive: null },
    { label: 'Afterparty', value: display(stats?.afterparty), change: '+8%', isPositive: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((stat, index) => (
        <div key={index} className="flex flex-col p-4 rounded-xl border border-slate-200 dark:border-[#315168] bg-white dark:bg-[#182934] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-slate-500 dark:text-[#90b2cb] text-sm font-medium mb-1">{stat.label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold text-slate-900 dark:text-white font-sans">{stat.value}</p>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              stat.isPositive === true ? 'text-emerald-500 bg-emerald-500/10' :
              stat.isPositive === false ? 'text-red-500 bg-red-500/10' :
              'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'
            }`}>
              {stat.change}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}