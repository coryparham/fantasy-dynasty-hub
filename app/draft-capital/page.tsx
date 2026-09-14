// app/draft-capital/page.tsx
import { getDraftPicks, getLeagueData } from "@/lib/sleeper";

export default async function DraftCapitalPage() {
  const { teams, league } = await getLeagueData();
  const { tradedPicks } = await getDraftPicks();

  // Future draft years (e.g. 2027, 2028, 2029)
  const currentYear = parseInt(league.season);
  const futureYears = [currentYear + 1, currentYear + 2, currentYear + 3];
  const rounds = [1, 2, 3];

  // Helper to determine who owns a pick
  const getPickOwner = (originalRosterId: number, year: number, round: number) => {
    const traded = tradedPicks.find(
      (p: any) =>
        p.roster_id === originalRosterId &&
        parseInt(p.season) === year &&
        p.round === round
    );

    if (traded) {
      const ownerTeam = teams.find((t) => t.rosterId === traded.owner_id);
      return ownerTeam?.name || `Team ${traded.owner_id}`;
    }

    const origTeam = teams.find((t) => t.rosterId === originalRosterId);
    return origTeam?.name || `Team ${originalRosterId}`;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-extrabold text-amber-500">Draft Capital Matrix</h1>
          <a href="/" className="text-sm text-slate-400 hover:text-white">← Back to Dashboard</a>
        </div>

        {futureYears.map((year) => (
          <div key={year} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-amber-400">{year} Rookie Draft Picks</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3">Original Owner</th>
                    {rounds.map((r) => (
                      <th key={r} className="p-3">Round {r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {teams.map((team) => (
                    <tr key={team.rosterId}>
                      <td className="p-3 font-semibold text-slate-200">{team.name}</td>
                      {rounds.map((round) => {
                        const currentOwner = getPickOwner(team.rosterId, year, round);
                        const isTraded = currentOwner !== team.name;
                        return (
                          <td key={round} className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-mono ${
                              isTraded ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-slate-800 text-slate-400"
                            }`}>
                              {currentOwner}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}