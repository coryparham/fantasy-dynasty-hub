// app/playoffs/page.tsx
import { getLeagueData } from "@/lib/sleeper";
import PlayoffMachineClient from "./PlayoffMachineClient";

export default async function PlayoffMachinePage() {
  const { league, teams } = await getLeagueData();

  const playoffTeamsCount = league.settings?.playoff_teams || 6;
  const playoffStartWeek = league.settings?.playoff_week_start || 15;
  const currentWeek = league.settings?.leg || 1;
  const hasMedianMatch = league.settings?.league_average_match === 1;
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;

  const remainingMatchups: any[] = [];

  for (let w = currentWeek; w < playoffStartWeek; w++) {
    try {
      const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${w}`, {
        next: { revalidate: 3600 },
      });
      const matchups = await res.json();

      if (Array.isArray(matchups)) {
        const grouped: Record<number, number[]> = {};
        matchups.forEach((m: any) => {
          if (!grouped[m.matchup_id]) grouped[m.matchup_id] = [];
          grouped[m.matchup_id].push(m.roster_id);
        });

        Object.entries(grouped).forEach(([mId, rosterIds]) => {
          if (rosterIds.length === 2) {
            remainingMatchups.push({
              week: w,
              matchupId: Number(mId),
              team1RosterId: rosterIds[0],
              team2RosterId: rosterIds[1],
            });
          }
        });
      }
    } catch (e) {
      console.error(`Error fetching matchups for week ${w}:`, e);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            Interactive Playoff Machine
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Toggle game winners and median points bonuses to simulate playoff seeding outcomes
          </p>
        </div>

        <PlayoffMachineClient
          teams={teams}
          remainingMatchups={remainingMatchups}
          playoffTeamsCount={playoffTeamsCount}
          playoffStartWeek={playoffStartWeek}
          currentWeek={currentWeek}
          hasMedianMatch={hasMedianMatch}
        />
      </div>
    </main>
  );
}