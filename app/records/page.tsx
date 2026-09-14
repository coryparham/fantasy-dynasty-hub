// app/records/page.tsx
import { getLeagueData } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const { teams, league } = await getLeagueData();

  // Sort benchmarks for current season highlights
  const mostWins = [...teams].sort((a, b) => b.wins - a.wins)[0];
  const highestPoints = [...teams].sort((a, b) => b.pointsFor - a.pointsFor)[0];
  const lowestPoints = [...teams].sort((a, b) => a.pointsFor - b.pointsFor)[0];
  const mostLosses = [...teams].sort((a, b) => b.losses - a.losses)[0];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            League Records & Milestones
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Season leaderboards and standings highlights for {league.season || "Current Season"}
          </p>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <span className="text-xs font-bold uppercase text-amber-400">Most Wins</span>
            {mostWins && (
              <div className="flex items-center space-x-3 pt-2">
                <img src={mostWins.avatar} alt="" className="w-10 h-10 rounded-full border border-amber-500/50 object-cover" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{mostWins.name}</h3>
                  <p className="text-xs text-slate-400">{mostWins.wins} - {mostWins.losses} ({mostWins.wins > 0 ? ((mostWins.wins / (mostWins.wins + mostWins.losses)) * 100).toFixed(1) : 0}%)</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <span className="text-xs font-bold uppercase text-amber-400">Highest Scoring</span>
            {highestPoints && (
              <div className="flex items-center space-x-3 pt-2">
                <img src={highestPoints.avatar} alt="" className="w-10 h-10 rounded-full border border-amber-500/50 object-cover" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{highestPoints.name}</h3>
                  <p className="text-xs text-slate-400">{highestPoints.pointsFor.toFixed(2)} pts</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <span className="text-xs font-bold uppercase text-amber-400">Lowest Scoring</span>
            {lowestPoints && (
              <div className="flex items-center space-x-3 pt-2">
                <img src={lowestPoints.avatar} alt="" className="w-10 h-10 rounded-full border border-amber-500/50 object-cover" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{lowestPoints.name}</h3>
                  <p className="text-xs text-slate-400">{lowestPoints.pointsFor.toFixed(2)} pts</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <span className="text-xs font-bold uppercase text-amber-400">Most Losses</span>
            {mostLosses && (
              <div className="flex items-center space-x-3 pt-2">
                <img src={mostLosses.avatar} alt="" className="w-10 h-10 rounded-full border border-amber-500/50 object-cover" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{mostLosses.name}</h3>
                  <p className="text-xs text-slate-400">{mostLosses.losses} Losses</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Complete Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-100">All Teams Ranking</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4 text-center">W - L - T</th>
                  <th className="py-3 px-4 text-right">Points For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[...teams]
                  .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor)
                  .map((team, idx) => (
                    <tr key={team.rosterId} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 flex items-center space-x-3">
                        <span className="text-xs font-mono text-slate-500 w-4">#{idx + 1}</span>
                        <img src={team.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <span className="font-semibold text-slate-100">{team.name}</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {team.wins} - {team.losses} - {team.ties}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                        {team.pointsFor.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}