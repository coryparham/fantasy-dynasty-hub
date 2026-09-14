// app/teams/page.tsx
import Link from "next/link";
import { getLeagueData } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

export default async function TeamsDirectoryPage() {
  const { teams } = await getLeagueData();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">League Franchises</h1>
          <p className="text-slate-400 text-sm mt-1">Select a team to view detailed rosters, depth charts, and assets</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Link
              key={team.rosterId}
              href={`/teams/${team.rosterId}`}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-5 transition-all flex items-center space-x-4 group"
            >
              <img
                src={team.avatar}
                alt=""
                className="w-14 h-14 rounded-full border border-slate-700 group-hover:border-amber-400 object-cover"
              />
              <div className="overflow-hidden">
                <h2 className="font-bold text-slate-100 group-hover:text-amber-400 transition-colors truncate">
                  {team.name}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Record: {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""}
                </p>
                <p className="text-xs text-amber-500/80 font-mono mt-0.5">
                  {team.pointsFor.toFixed(2)} PF
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}