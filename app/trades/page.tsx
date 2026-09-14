// app/trades/page.tsx
import { getLeagueData, getPlayerMap, getTransactions } from "@/lib/sleeper";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const [{ teams }, playerMap, { trades }] = await Promise.all([
    getLeagueData(),
    getPlayerMap(),
    getTransactions(),
  ]);

  const getTeam = (rosterId: number) => teams.find((t) => t.rosterId === rosterId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">Trade History & Log</h1>
          <p className="text-slate-400 text-sm mt-1">Complete record of trades executed during the season</p>
        </div>

        {trades.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-center text-slate-400 text-sm">
            No trades completed yet this season.
          </div>
        ) : (
          <div className="space-y-6">
            {trades.map((trade) => {
              const involvedTeams = trade.rosterIds.map((rid) => getTeam(rid)).filter(Boolean);
              const dateStr = new Date(trade.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div key={trade.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Completed Trade
                    </span>
                    <span className="text-xs font-mono text-slate-500">{dateStr}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {involvedTeams.map((team) => {
                      if (!team) return null;

                      // Players received by this team
                      const receivedPlayers = Object.entries(trade.adds)
                        .filter(([_, receivingRosterId]) => receivingRosterId === team.rosterId)
                        .map(([pid]) => playerMap[pid])
                        .filter(Boolean);

                      // Draft picks received by this team
                      const receivedPicks = trade.draftPicks.filter(
                        (p) => p.owner_id === team.rosterId
                      );

                      // FAAB received by this team
                      const receivedFaab = trade.waiverBudget.filter(
                        (b) => b.receiver === team.rosterId
                      );

                      return (
                        <div key={team.rosterId} className="bg-slate-950/70 rounded-lg p-4 border border-slate-800 space-y-2">
                          <Link href={`/teams/${team.rosterId}`} className="flex items-center space-x-2">
                            <img src={team.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                            <span className="font-bold text-sm text-slate-100 hover:text-amber-400">
                              {team.name}
                            </span>
                          </Link>

                          <div className="text-xs space-y-1 pt-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Acquired:</span>
                            {receivedPlayers.map((p) => (
                              <div key={p.id} className="text-emerald-400 font-medium">
                                + {p.name} ({p.position} - {p.team})
                              </div>
                            ))}
                            {receivedPicks.map((pick, i) => (
                              <div key={i} className="text-blue-400 font-medium">
                                + {pick.season} Round {pick.round} Pick
                              </div>
                            ))}
                            {receivedFaab.map((f, i) => (
                              <div key={i} className="text-amber-400 font-medium">
                                + ${f.amount} FAAB
                              </div>
                            ))}
                            {receivedPlayers.length === 0 && receivedPicks.length === 0 && receivedFaab.length === 0 && (
                              <div className="text-slate-600 italic">No assets listed</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}