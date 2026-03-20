import fs from "node:fs/promises";
import path from "node:path";

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

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeCostData(input: unknown): CostData {
  const source = typeof input === "object" && input !== null ? input : {};
  const dailyBreakdownSource = Array.isArray((source as { dailyBreakdown?: unknown }).dailyBreakdown)
    ? (source as { dailyBreakdown: unknown[] }).dailyBreakdown
    : [];
  const userSummarySource = Array.isArray((source as { userSummary?: unknown }).userSummary)
    ? (source as { userSummary: unknown[] }).userSummary
    : [];

  return {
    lastUpdated: asString(
      (source as { lastUpdated?: unknown }).lastUpdated,
      new Date(0).toISOString(),
    ),
    totalCost: asNumber((source as { totalCost?: unknown }).totalCost),
    dailyBreakdown: dailyBreakdownSource.map((day) => {
      const item = typeof day === "object" && day !== null ? day : {};
      const usersSource = Array.isArray((item as { users?: unknown }).users)
        ? (item as { users: unknown[] }).users
        : [];

      return {
        date: asString((item as { date?: unknown }).date),
        cost: asNumber((item as { cost?: unknown }).cost),
        sessions: asNumber((item as { sessions?: unknown }).sessions),
        users: usersSource.map((user) => {
          const entry = typeof user === "object" && user !== null ? user : {};
          return {
            name: asString((entry as { name?: unknown }).name, "Unknown"),
            cost: asNumber((entry as { cost?: unknown }).cost),
          };
        }),
      };
    }),
    userSummary: userSummarySource.map((user) => {
      const entry = typeof user === "object" && user !== null ? user : {};
      return {
        user: asString((entry as { user?: unknown }).user, "Unknown"),
        totalCost: asNumber((entry as { totalCost?: unknown }).totalCost),
        avgSessionCost: asNumber((entry as { avgSessionCost?: unknown }).avgSessionCost),
      };
    }),
  };
}

async function getCostData(): Promise<{ data: CostData | null; error: string | null }> {
  try {
    const filePath = path.join(process.cwd(), "cost-data.json");
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);

    return { data: normalizeCostData(parsed), error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error while loading cost data.";
    return { data: null, error: message };
  }
}

export default async function CostDashboardPage() {
  const { data, error } = await getCostData();

  if (error || !data) {
    return (
      <main className="min-h-screen bg-black p-8 font-sans text-gray-300">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-4xl font-bold tracking-tighter text-white">Error</h1>
          <p className="mt-2 text-zinc-500">Could not load cost data.</p>
          {error ? <p className="mt-4 font-mono text-sm text-red-500">{error}</p> : null}
        </div>
      </main>
    );
  }

  const lastUpdatedDate = new Date(data.lastUpdated);
  const lastUpdated = Number.isNaN(lastUpdatedDate.getTime())
    ? "Unknown"
    : lastUpdatedDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  return (
    <main className="min-h-screen bg-black p-8 font-sans text-gray-300">
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 border-b border-zinc-800 pb-6">
          <h1 className="text-4xl font-bold tracking-tighter text-white">API Cost Dashboard</h1>
          <p className="mt-2 text-zinc-500">
            Last updated: <span className="font-medium text-zinc-300">{lastUpdated} IST</span>
          </p>
        </header>

        <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">Total Cost</h2>
            <p className="mt-2 text-4xl font-bold text-white">${data.totalCost.toFixed(2)}</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">User Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-800 bg-zinc-900">
                <tr>
                  <th className="p-4 text-sm uppercase tracking-wider text-zinc-400">User</th>
                  <th className="p-4 text-sm uppercase tracking-wider text-zinc-400">Total Cost</th>
                  <th className="p-4 text-sm uppercase tracking-wider text-zinc-400">
                    Avg. Session Cost
                  </th>
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

        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">Daily Breakdown</h2>
          <div className="space-y-8">
            {data.dailyBreakdown.map((day) => {
              const displayDate = new Date(day.date);
              const formattedDate = Number.isNaN(displayDate.getTime())
                ? day.date || "Unknown date"
                : displayDate.toDateString();

              return (
                <div
                  key={`${day.date}-${day.sessions}`}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6"
                >
                  <div className="mb-4 flex justify-between baseline">
                    <h3 className="text-lg font-bold text-white">{formattedDate}</h3>
                    <p className="text-sm text-zinc-400">{day.sessions} sessions</p>
                  </div>
                  <div className="mb-4 text-2xl font-bold text-white">${day.cost.toFixed(2)}</div>
                  <div className="mb-2 text-xs uppercase tracking-widest text-zinc-500">
                    Top Users
                  </div>
                  <ul className="space-y-1 text-sm">
                    {day.users.map((user) => (
                      <li key={`${day.date}-${user.name}`} className="flex justify-between">
                        <span className="text-zinc-400">{user.name}</span>
                        <span className="font-medium text-zinc-200">${user.cost.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
