// app/records/page.tsx
import { getAllTimeRecords } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const {
    leaderboard,
    highestSingleGameScore,
    lowestSingleGameScore,
    biggestBlowout,
    closestMatchup,
    highestSeasonPoints,
    highestSeasonWins,
  } = await getAllTimeRecords();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            All-Time League Records
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Historical single-game benchmarks, season records, and complete all-time standings
          </p>
        </div>

        {/* Game & Season Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Highest Single Game Score */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold uppercase text-amber-400 tracking-wide block">
              Highest Single-Week Score
            </span>
            <div className="flex items-center space-x-3">
              <img src={highestSingleGameScore.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-amber-500/60 object-cover" />
              <div>
                <h3 className="font-bold text-slate-100">{highestSingleGameScore.name}</h3>
                <p className="text-xl font-extrabold text-amber-400">{highestSingleGameScore.points.toFixed(2)} pts</p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {highestSingleGameScore.season} • Week {highestSingleGameScore.week}
                </p>
              </div>
            </div>
          </div>

          {/* Biggest Blowout */}
          {biggestBlowout && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-xs font-bold uppercase text-red-400 tracking-wide block">
                Largest Blowout
              </span>
              <div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-100">
                  <span>{biggestBlowout.winnerName}</span>
                  <span className="text-amber-400">{biggestBlowout.winnerPoints.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                  <span>def. {biggestBlowout.loserName}</span>
                  <span>{biggestBlowout.loserPoints.toFixed(2)}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-red-400">+{biggestBlowout.margin} pt margin</span>
                  <span className="text-[11px] text-slate-500 font-mono">{biggestBlowout.season} • Wk {biggestBlowout.week}</span>
                </div>
              </div>
            </div>
          )}

          {/* Closest Matchup */}
          {closestMatchup && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-xs font-bold uppercase text-purple-400 tracking-wide block">
                Narrowest Victory
              </span>
              <div>
                <div className="flex justify-between items-center text-sm font-bold text-slate-100">
                  <span>{closestMatchup.winnerName}</span>
                  <span className="text-amber-400">{closestMatchup.winnerPoints.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                  <span>def. {closestMatchup.loserName}</span>
                  <span>{closestMatchup.loserPoints.toFixed(2)}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-400">+{closestMatchup.margin} pt margin</span>
                  <span className="text-[11px] text-slate-500 font-mono">{closestMatchup.season} • Wk {closestMatchup.week}</span>
                </div>
              </div>
            </div>
          )}

          {/* Most Points Single Season */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold uppercase text-emerald-400 tracking-wide block">
              Most Points in a Season
            </span>
            <div className="flex items-center space-x-3">
              <img src={highestSeasonPoints.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-emerald-500/60 object-cover" />
              <div>
                <h3 className="font-bold text-slate-100">{highestSeasonPoints.name}</h3>
                <p className="text-xl font-extrabold text-emerald-400">{highestSeasonPoints.points.toFixed(2)} pts</p>
                <p className="text-[11px] text-slate-500 font-mono">{highestSeasonPoints.season} Season</p>
              </div>
            </div>
          </div>

          {/* Most Wins Single Season */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <span className="text-xs font-bold uppercase text-blue-400 tracking-wide block">
              Most Wins in a Season
            </span>
            <div className="flex items-center space-x-3">
              <img src={highestSeasonWins.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-blue-500/60 object-cover" />
              <div>
                <h3 className="font-bold text-slate-100">{highestSeasonWins.name}</h3>
                <p className="text-xl font-extrabold text-blue-400">{highestSeasonWins.wins} Wins</p>
                <p className="text-[11px] text-slate-500 font-mono">{highestSeasonWins.season} Season</p>
              </div>
            </div>
          </div>

          {/* Lowest Single Game Score */}
          {lowestSingleGameScore && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wide block">
                Lowest Single-Week Score
              </span>
              <div className="flex items-center space-x-3">
                <img src={lowestSingleGameScore.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-slate-700 object-cover" />
                <div>
                  <h3 className="font-bold text-slate-100">{lowestSingleGameScore.name}</h3>
                  <p className="text-xl font-extrabold text-slate-400">{lowestSingleGameScore.points.toFixed(2)} pts</p>
                  <p className="text-[11px] text-slate-500 font-mono">{lowestSingleGameScore.season} • Week {lowestSingleGameScore.week}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* All-Time Leaderboard */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-extrabold text-slate-100">All-Time Standings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4 text-center">Seasons</th>
                  <th className="py-3 px-4 text-center">All-Time W - L - T</th>
                  <th className="py-3 px-4 text-center">Win %</th>
                  <th className="py-3 px-4 text-right">All-Time Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaderboard.map((m, idx) => (
                  <tr key={m.ownerId} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 flex items-center space-x-3">
                      <span className="text-xs font-mono text-slate-500 w-5">#{idx + 1}</span>
                      <img src={m.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                      <span className="font-semibold text-slate-100">{m.name}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{m.seasons}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      {m.wins} - {m.losses} - {m.ties}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-amber-400 font-bold">
                      {m.winPct.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                      {m.pointsFor.toFixed(2)}
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