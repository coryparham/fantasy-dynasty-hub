import { getLeagueData } from "@/lib/sleeper";
import Link from "next/link";

export default async function HomePage() {
  const { league, teams } = await getLeagueData();

  // Standings sorted by wins descending, then points for descending
  const standings = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });

  // Draft order calculation based on lowest Max PF (Pick 1.01 goes to lowest Max PF)
  const maxPfSorted = [...teams].sort(
    (a, b) => (a.maxPointsFor ?? a.pointsFor) - (b.maxPointsFor ?? b.pointsFor)
  );
  const draftPickMap = new Map(
    maxPfSorted.map((team, idx) => [
      team.rosterId,
      `1.${(idx + 1).toString().padStart(2, "0")}`,
    ])
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-amber-500">
              {league.name}
            </h1>
            <p className="text-slate-400 mt-1">
              Season {league.season} • Dynasty League
            </p>
          </div>
        </header>

        <section className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-slate-200">
            League Standings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-mono uppercase tracking-wider">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Record</th>
                  <th className="py-3 px-4 text-right">PF</th>
                  <th className="py-3 px-4 text-right">Max PF</th>
                  <th className="py-3 px-4 text-right">PA</th>
                  <th className="py-3 px-4 text-center">Proj. Pick</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {standings.map((team, index) => {
                  const projectedPick = draftPickMap.get(team.rosterId);
                  return (
                    <tr
                      key={team.rosterId}
                      className="hover:bg-slate-800/40 transition"
                    >
                      <td className="py-4 px-4 font-mono text-slate-500 font-bold">
                        #{index + 1}
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          href={`/teams/${team.rosterId}`}
                          className="flex items-center space-x-3 group"
                        >
                          <img
                            src={team.avatar}
                            alt={team.name}
                            className="w-8 h-8 rounded-full border border-slate-700 group-hover:border-amber-500 transition"
                          />
                          <span className="font-semibold text-slate-100 group-hover:text-amber-400 transition">
                            {team.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        {team.wins}-{team.losses}
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-bold text-amber-400">
                        {team.pointsFor.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-300">
                        {(team.maxPointsFor ?? team.pointsFor).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-400">
                        {(team.pointsAgainst ?? 0).toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        <span className="bg-slate-800 text-amber-400 text-xs px-2.5 py-1 rounded border border-slate-700 font-semibold">
                          {projectedPick}
                        </span>
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