// app/records/page.tsx
import { getHistoricalData } from "@/lib/history";

interface ManagerStat {
  ownerId: string;
  name: string;
  avatar: string;
  seasonsCount: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
}

export default async function RecordsPage() {
  const historicalSeasons = await getHistoricalData();

  // Aggregate stats across all seasons by manager owner ID
  const managerStatsMap: Record<string, ManagerStat> = {};
  let topSingleSeasonPoints = { name: "N/A", year: "N/A", points: 0 };
  let topSingleSeasonWins = { name: "N/A", year: "N/A", wins: 0 };

  historicalSeasons.forEach((seasonData) => {
    const { season, users, rosters } = seasonData;

    rosters.forEach((roster: any) => {
      const ownerId = roster.owner_id;
      if (!ownerId) return;

      const user = users.find((u: any) => u.user_id === ownerId);
      const name = user?.metadata?.team_name || user?.display_name || `Manager ${ownerId}`;
      const avatar = user?.avatar
        ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
        : "https://sleepercdn.com/images/v2/owners/guy_select.png";

      const wins = roster.settings.wins || 0;
      const losses = roster.settings.losses || 0;
      const ties = roster.settings.ties || 0;
      const fpts = (roster.settings.fpts || 0) + (roster.settings.fpts_decimal || 0) / 100;

      // Track single-season high records
      if (fpts > topSingleSeasonPoints.points) {
        topSingleSeasonPoints = { name, year: season, points: fpts };
      }
      if (wins > topSingleSeasonWins.wins) {
        topSingleSeasonWins = { name, year: season, wins };
      }

      // Aggregate all-time career totals
      if (!managerStatsMap[ownerId]) {
        managerStatsMap[ownerId] = {
          ownerId,
          name,
          avatar,
          seasonsCount: 1,
          wins,
          losses,
          ties,
          pointsFor: fpts,
        };
      } else {
        managerStatsMap[ownerId].seasonsCount += 1;
        managerStatsMap[ownerId].wins += wins;
        managerStatsMap[ownerId].losses += losses;
        managerStatsMap[ownerId].ties += ties;
        managerStatsMap[ownerId].pointsFor += fpts;
        // Keep name and avatar updated to latest season
        managerStatsMap[ownerId].name = name;
        managerStatsMap[ownerId].avatar = avatar;
      }
    });
  });

  const allTimeManagers = Object.values(managerStatsMap).sort(
    (a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Page Header */}
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            All-Time League Record Book
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Aggregated career totals across {historicalSeasons.length} tracked season(s)
          </p>
        </div>

        {/* Single-Season Record Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Single-Season Scoring Record
              </span>
              <h3 className="text-2xl font-bold mt-1 text-slate-100">
                {topSingleSeasonPoints.name}
              </h3>
              <p className="text-sm text-slate-400 font-mono">
                {topSingleSeasonPoints.year} Season
              </p>
            </div>
            <div className="text-right font-mono text-3xl font-extrabold text-amber-400">
              {topSingleSeasonPoints.points.toFixed(2)} pts
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Single-Season Win Record
              </span>
              <h3 className="text-2xl font-bold mt-1 text-slate-100">
                {topSingleSeasonWins.name}
              </h3>
              <p className="text-sm text-slate-400 font-mono">
                {topSingleSeasonWins.year} Season
              </p>
            </div>
            <div className="text-right font-mono text-3xl font-extrabold text-emerald-400">
              {topSingleSeasonWins.wins} Wins
            </div>
          </div>
        </div>

        {/* All-Time Career Standings Table */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-slate-200">
            Career Leaderboard
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4 text-center">Seasons</th>
                  <th className="py-3 px-4 text-center">All-Time Record</th>
                  <th className="py-3 px-4 text-center">Win %</th>
                  <th className="py-3 px-4 text-right">Career Points For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {allTimeManagers.map((m, idx) => {
                  const totalGames = m.wins + m.losses + m.ties;
                  const winPct = totalGames > 0 ? ((m.wins / totalGames) * 100).toFixed(1) : "0.0";

                  return (
                    <tr key={m.ownerId} className="hover:bg-slate-800/40 transition">
                      <td className="py-4 px-4 font-mono text-slate-500">#{idx + 1}</td>
                      <td className="py-4 px-4 flex items-center space-x-3">
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                        />
                        <span className="font-semibold text-slate-100">{m.name}</span>
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-slate-400">
                        {m.seasonsCount}
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-semibold">
                        {m.wins}-{m.losses}{m.ties > 0 ? `-${m.ties}` : ""}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-amber-400">
                        {winPct}%
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-amber-400">
                        {m.pointsFor.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}