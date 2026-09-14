// app/faab/page.tsx
import { getLeagueData, getPlayerMap, getTransactions } from "@/lib/sleeper";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function FaabPage() {
  const [{ teams, league }, playerMap, { waivers }] = await Promise.all([
    getLeagueData(),
    getPlayerMap(),
    getTransactions(),
  ]);

  const totalFaab = league.settings?.waiver_budget || 100;
  const getTeam = (rosterId: number) => teams.find((t) => t.rosterId === rosterId);

  // Compute FAAB spent per team from waivers
  const spentMap: Record<number, number> = {};
  waivers.forEach((w) => {
    if (w.status === "complete" && w.rosterId) {
      spentMap[w.rosterId] = (spentMap[w.rosterId] || 0) + w.bid;
    }
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">FAAB & Waiver Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">Remaining waiver budgets and recent transaction claims</p>
        </div>

        {/* FAAB Balances Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Manager FAAB Balances</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {teams.map((team) => {
              const spent = spentMap[team.rosterId] || 0;
              const remaining = Math.max(0, totalFaab - spent);
              const pct = Math.round((remaining / totalFaab) * 100);

              return (
                <div key={team.rosterId} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <Link href={`/teams/${team.rosterId}`} className="flex items-center space-x-2">
                    <img src={team.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-bold text-xs truncate hover:text-amber-400">{team.name}</span>
                  </Link>
                  <div className="flex justify-between items-baseline text-xs pt-1">
                    <span className="text-slate-400">Remaining:</span>
                    <span className="font-mono font-bold text-amber-400">${remaining} / ${totalFaab}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Waiver Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">Recent Waiver Claims</h2>
          {waivers.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No waiver claims processed yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Manager</th>
                    <th className="py-3 px-4">Added Player</th>
                    <th className="py-3 px-4">Dropped Player</th>
                    <th className="py-3 px-4 text-right">Bid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {waivers.slice(0, 20).map((w) => {
                    const manager = getTeam(w.rosterId);
                    const added = w.addedPlayerId ? playerMap[w.addedPlayerId] : null;
                    const dropped = w.droppedPlayerId ? playerMap[w.droppedPlayerId] : null;

                    return (
                      <tr key={w.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold text-slate-100">
                          {manager ? manager.name : `Team ${w.rosterId}`}
                        </td>
                        <td className="py-3 px-4 text-emerald-400">
                          {added ? `${added.name} (${added.position} - ${added.team})` : "—"}
                        </td>
                        <td className="py-3 px-4 text-rose-400">
                          {dropped ? `${dropped.name} (${dropped.position} - ${dropped.team})` : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          ${w.bid}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}