// app/managers/page.tsx
import { getLeagueData } from "@/lib/sleeper";

export default async function ManagersPage() {
  const { teams } = await getLeagueData();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-amber-500">Manager Profiles & Badges</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.rosterId} className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
              <img src={team.avatar} alt="" className="w-20 h-20 rounded-full mx-auto border-2 border-amber-500" />
              <div>
                <h2 className="text-xl font-bold">{team.name}</h2>
                <p className="text-xs text-slate-400 font-mono">Record: {team.wins}-{team.losses}</p>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                <span className="px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-semibold">
                  Dynasty Contender
                </span>
                <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-semibold">
                  {team.players.length} Players Owned
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}