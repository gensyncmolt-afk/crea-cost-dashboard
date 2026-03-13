import React from 'react';

type UserCost = {
  name: string;
  cost: number;
};

type DailyData = {
  date: string;
  cost: number;
  sessions: number;
  users: UserCost[];
};

type UserSummary = {
  user: string;
  totalCost: number;
  avgSessionCost: number;
};

type CostData = {
  lastUpdated: string;
  totalCost: number;
  dailyBreakdown: DailyData[];
  userSummary: UserSummary[];
};

async function getCostData(): Promise<CostData> {
  // In a real app, this would be an API call.
  // For this project, we fetch directly from the public file.
  // The cache-busting query parameter is essential for Vercel's static caching.
  const res = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/cost-data.json?cache-bust=${Date.now()}`, {
    cache: 'no-store', // Ensures fresh data on every page load
  });
  if (!res.ok) {
    throw new Error('Failed to fetch cost data');
  }
  return res.json();
}

export default async function CostDashboardPage() {
  const data = await getCostData();
  const lastUpdated = new Date(data.lastUpdated).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

  return (
    <main className="min-h-screen bg-black text-gray-300 font-sans p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="mb-12 border-b border-zinc-800 pb-6">
          <h1 className="text-4xl font-bold text-white tracking-tighter">API Cost Dashboard</h1>
          <p className="text-zinc-500 mt-2">
            Last updated: <span className="text-zinc-300 font-medium">{lastUpdated} IST</span>
          </p>
        </header>

        {/* Totals */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg">
            <h2 className="text-zinc-500 text-sm uppercase tracking-widest">Total Cost</h2>
            <p className="text-4xl font-bold text-white mt-2">${data.totalCost.toFixed(2)}</p>
          </div>
        </section>

        {/* User Summary */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">User Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="p-4 text-sm uppercase tracking-wider text-zinc-400">User</th>
                  <th className="p-4 text-sm uppercase tracking-wider text-zinc-400">Total Cost</th>
                  <th className="p-4 text-sm uppercase tracking-wider text-zinc-400">Avg. Session Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.userSummary.map((user) => (
                  <tr key={user.user} className="border-b border-zinc-900">
                    <td className="p-4 font-medium text-white">{user.user}</td>
                    <td className="p-4 text-zinc-300">${user.totalCost.toFixed(2)}</td>
                    <td className="p-4 text-zinc-300">${user.avgSessionCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Daily Breakdown */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 tracking-tight">Daily Breakdown</h2>
          <div className="space-y-8">
            {data.dailyBreakdown.map((day) => (
              <div key={day.date} className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-lg">
                <div className="flex justify-between items-baseline mb-4">
                  <h3 className="font-bold text-lg text-white">{new Date(day.date).toDateString()}</h3>
                  <p className="text-zinc-400 text-sm">{day.sessions} sessions</p>
                </div>
                <div className="text-2xl font-bold text-white mb-4">${day.cost.toFixed(2)}</div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Top Users</div>
                <ul className="space-y-1 text-sm">
                  {day.users.map(user => (
                    <li key={user.name} className="flex justify-between">
                      <span className="text-zinc-400">{user.name}</span>
                      <span className="font-medium text-zinc-200">${user.cost.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
