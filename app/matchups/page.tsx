// app/matchups/page.tsx
import { getLeagueData } from "@/lib/sleeper";

export default async function MatchupsPage() {
  const { league, teams } = await getLeagueData();
  const currentWeek = league.settings.leg || 1;

  const res = await fetch(
    `https://api.sleeper.app/v1/league/${process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID}/matchups/${currentWeek}`,
    { next: { revalidate: 300 } }
  );
  const matchupsRaw = await res.json();

  // Group matchups by matchup_id
  const matchupsMap: Record<number, any[]> = {};
  matchupsRaw.forEach((m: any) => {
    if (!matchupsMap[m.matchup_id]) matchupsMap[m.matchup_id] = [];
    matchupsMap[m.matchup_id].push(m);
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-amber-500">
          Week {currentWeek} Matchups
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(matchupsMap).map(([id, pair]) => {
            const teamA = teams.find((t) => t.rosterId === pair[0]?.roster_id);
            const teamB = teams.find((t) => t.rosterId === pair[1]?.roster_id);

            return (
              <div key={id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                {/* Team A */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <img src={teamA?.avatar} className="w-10 h-10 rounded-full border" alt="" />
                    <span className="font-bold">{teamA?.name}</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-amber-400">
                    {pair[0]?.points?.toFixed(2) || "0.00"}
                  </span>
                </div>

                <div className="text-center text-xs font-semibold text-slate-500 uppercase tracking-widest border-y border-slate-800/60 py-1">
                  VS
                </div>

                {/* Team B */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <img src={teamB?.avatar} className="w-10 h-10 rounded-full border" alt="" />
                    <span className="font-bold">{teamB?.name}</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-amber-400">
                    {pair[1]?.points?.toFixed(2) || "0.00"}
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