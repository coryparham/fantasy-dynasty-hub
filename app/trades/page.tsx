// app/trades/page.tsx
import { getLeagueData } from "@/lib/sleeper";

export default async function TradesPage() {
  const { league, teams } = await getLeagueData();
  const currentWeek = league.settings.leg || 1;

  // Fetch transactions across recent weeks
  const transactionPromises = Array.from({ length: currentWeek }, (_, i) =>
    fetch(`https://api.sleeper.app/v1/league/${process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID}/transactions/${i + 1}`).then((res) => res.json())
  );

  const allWeeksTransactions = await Promise.all(transactionPromises);
  const trades = allWeeksTransactions
    .flat()
    .filter((t) => t.type === "trade" && t.status === "complete");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-amber-500">League Trade Log</h1>

        {trades.length === 0 ? (
          <p className="text-slate-400">No trades completed yet this season.</p>
        ) : (
          trades.map((trade) => (
            <div key={trade.transaction_id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                Week {trade.leg} Trade
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trade.roster_ids.map((rId: number) => {
                  const team = teams.find((t) => t.rosterId === rId);
                  const adds = Object.keys(trade.adds || {}).filter((p) => trade.adds[p] === rId);
                  const draftPicks = trade.draft_picks.filter((p: any) => p.owner_id === rId);

                  return (
                    <div key={rId} className="bg-slate-950 p-4 rounded-lg border border-slate-800/80">
                      <p className="font-bold text-amber-400 mb-2">{team?.name} Received:</p>
                      <ul className="text-sm space-y-1 text-slate-300">
                        {adds.map((p) => (
                          <li key={p}>• Player ID: {p}</li>
                        ))}
                        {draftPicks.map((pick: any) => (
                          <li key={`${pick.season}-${pick.round}`}>
                            • {pick.season} Round {pick.round} Pick
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}