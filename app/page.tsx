// app/page.tsx
import { getLeagueData } from "@/lib/sleeper";

export default async function HomePage() {
  const { league, teams } = await getLeagueData();

  // Sort teams by wins, then points for
  const standings = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-amber-500">
              {league.name}
            </h1>
            <p className="text-slate-400 mt-1">
              Season {league.season} • Dynasty League
            </p>
          </div>
          <a
            href="/draft-capital"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition"
          >
            Draft Capital Matrix →
          </a>
        </header>

        {/* Standings Table */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl">
          <h2 className="text-2xl font-bold mb-4 text-slate-200">League Standings</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Team</th>
                  <th className="py-3 px-4 text-center">Record</th>
                  <th className="py-3 px-4 text-right">Points For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {standings.map((team, index) => (
                  <tr key={team.rosterId} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 font-mono text-slate-500">#{index + 1}</td>
                    <td className="py-4 px-4 flex items-center space-x-3">
                      <img
                        src={team.avatar}
                        alt={team.name}
                        className="w-8 h-8 rounded-full border border-slate-700"
                      />
                      <span className="font-semibold text-slate-100">{team.name}</span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono">
                      {team.wins}-{team.losses}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-amber-400">
                      {team.pointsFor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}