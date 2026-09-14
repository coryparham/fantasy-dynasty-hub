// app/managers/page.tsx
import { getLeagueData } from "@/lib/sleeper";
import { getDynastyValues } from "@/lib/fantasycalc";

export default async function ManagersPage() {
  // Fetch league rosters and fantasy values in parallel
  const [{ teams }, valueMap] = await Promise.all([
    getLeagueData(),
    getDynastyValues(),
  ]);

  // Calculate total roster value for each manager
  const teamsWithValues = teams.map((team) => {
    const totalValue = team.players.reduce((sum, playerId) => {
      return sum + (valueMap[playerId] || 0);
    }, 0);

    return {
      ...team,
      totalValue,
    };
  });

  // Calculate average league value to split Contenders vs. Rebuilders
  const avgValue =
    teamsWithValues.reduce((sum, t) => sum + t.totalValue, 0) /
      teamsWithValues.length || 1;

  // Sort managers by total roster value descending
  const sortedTeams = [...teamsWithValues].sort(
    (a, b) => b.totalValue - a.totalValue
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-amber-500">
              Manager Profiles & Dynasty Rankings
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Live market valuations calculated from real trade database activity
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTeams.map((team, index) => {
            const isContender = team.totalValue >= avgValue;

            return (
              <div
                key={team.rosterId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-lg hover:border-slate-700 transition"
              >
                <div className="relative w-20 h-20 mx-auto">
                  <img
                    src={team.avatar}
                    alt={team.name}
                    className="w-20 h-20 rounded-full border-2 border-amber-500 object-cover"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-slate-900 text-amber-400 border border-amber-500/40 text-xs font-mono font-extrabold px-2 py-0.5 rounded-full">
                    #{index + 1}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl font-bold">{team.name}</h2>
                  <p className="text-xs text-slate-400 font-mono mt-1">
                    Record: {team.wins}-{team.losses}
                  </p>
                </div>

                {/* Total Roster Value Box */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                    Dynasty Trade Value
                  </span>
                  <span className="text-2xl font-mono font-extrabold text-amber-400">
                    {team.totalValue.toLocaleString()} pts
                  </span>
                </div>

                {/* Dynamic Status Badges */}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      isContender
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                    }`}
                  >
                    {isContender ? "🔥 Contender" : "🌱 Rebuilder"}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-semibold">
                    {team.players.length} Players
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}