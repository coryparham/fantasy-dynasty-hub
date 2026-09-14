// app/playoffs/page.tsx
import { getLeagueData } from "@/lib/sleeper";

interface PlayoffTeam {
  rosterId: number;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  maxWins: number;
  minWins: number;
  seed: number;
  status: "CLINCHED_BYE" | "CLINCHED" | "CONTENDING" | "ELIMINATED";
}

export default async function PlayoffMachinePage() {
  const { league, teams } = await getLeagueData();

  const playoffTeamsCount = league.settings?.playoff_teams || 6;
  const playoffStartWeek = league.settings?.playoff_week_start || 15;
  const currentWeek = league.settings?.leg || 1;

  // Calculate remaining regular season weeks
  const totalRegSeasonWeeks = playoffStartWeek - 1;
  const remainingWeeks = Math.max(0, totalRegSeasonWeeks - currentWeek + 1);

  // Sort current standings by wins, then points for
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return b.pointsFor - a.pointsFor;
  });

  // Calculate win ranges for every team
  const teamsWithRanges = sortedTeams.map((team, index) => {
    const maxWins = team.wins + remainingWeeks;
    const minWins = team.wins;
    return {
      ...team,
      seed: index + 1,
      maxWins,
      minWins,
    };
  });

  // Threshold wins for playoff boundary and bye seeds
  const lastPlayoffSeedWins = teamsWithRanges[playoffTeamsCount - 1]?.wins || 0;
  const lastPlayoffSeedMaxWins = teamsWithRanges[playoffTeamsCount - 1]?.maxWins || 0;
  const cutoffTeamMaxWins = teamsWithRanges[playoffTeamsCount]?.maxWins || 0;
  const byeCutoffMaxWins = teamsWithRanges[2]?.maxWins || 0;

  // Determine mathematical clinching / elimination status
  const playoffPicture: PlayoffTeam[] = teamsWithRanges.map((team) => {
    let status: PlayoffTeam["status"] = "CONTENDING";

    if (remainingWeeks === 0) {
      if (team.seed <= 2) status = "CLINCHED_BYE";
      else if (team.seed <= playoffTeamsCount) status = "CLINCHED";
      else status = "ELIMINATED";
    } else {
      // Clinched Bye if minimum wins exceed max possible wins of seed #3
      if (team.seed <= 2 && team.minWins > byeCutoffMaxWins) {
        status = "CLINCHED_BYE";
      }
      // Clinched Playoff spot if minimum wins exceed max wins of first team outside playoffs
      else if (team.minWins > cutoffTeamMaxWins) {
        status = "CLINCHED";
      }
      // Eliminated if max possible wins cannot catch current wins of last playoff seed
      else if (team.maxWins < lastPlayoffSeedWins) {
        status = "ELIMINATED";
      }
    }

    return {
      rosterId: team.rosterId,
      name: team.name,
      avatar: team.avatar,
      wins: team.wins,
      losses: team.losses,
      ties: team.ties,
      pointsFor: team.pointsFor,
      maxWins: team.maxWins,
      minWins: team.minWins,
      seed: team.seed,
      status,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-amber-500">
              Playoff Machine & Clinching Scenarios
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Regular Season ends Week {totalRegSeasonWeeks} • {remainingWeeks} week(s) remaining
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg text-xs font-mono text-slate-300">
            Playoff Spots: <span className="text-amber-400 font-bold">{playoffTeamsCount}</span> (Top 2 receive Bye)
          </div>
        </div>

        {/* Playoff Picture Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-xl font-bold text-slate-100">Projected Playoff Bracket</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-3 px-4">Seed</th>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4 text-center">Record</th>
                  <th className="py-3 px-4 text-center">Max / Min Wins</th>
                  <th className="py-3 px-4 text-right">Points For</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {playoffPicture.map((team) => {
                  const isByeSeed = team.seed <= 2;
                  const isPlayoffSeed = team.seed <= playoffTeamsCount;

                  return (
                    <tr
                      key={team.rosterId}
                      className={`hover:bg-slate-800/40 transition ${
                        isByeSeed
                          ? "bg-amber-500/5"
                          : isPlayoffSeed
                          ? "bg-slate-900"
                          : "bg-slate-950/40"
                      }`}
                    >
                      <td className="py-4 px-4 font-mono font-bold">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            isByeSeed
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isPlayoffSeed
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          #{team.seed}
                        </span>
                      </td>

                      <td className="py-4 px-4 flex items-center space-x-3">
                        <img
                          src={team.avatar}
                          alt={team.name}
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                        />
                        <div>
                          <p className="font-bold text-slate-100">{team.name}</p>
                          {isByeSeed && (
                            <span className="text-[10px] text-amber-400 font-semibold uppercase">
                              First-Round Bye
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center font-mono font-bold">
                        {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ""}
                      </td>

                      <td className="py-4 px-4 text-center font-mono text-slate-400 text-xs">
                        <span className="text-emerald-400 font-bold">{team.maxWins}</span> Max /{" "}
                        <span className="text-slate-300">{team.minWins}</span> Min
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-amber-400">
                        {team.pointsFor.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <StatusBadge status={team.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: PlayoffTeam["status"] }) {
  if (status === "CLINCHED_BYE") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
        🔒 Clinched Bye
      </span>
    );
  }
  if (status === "CLINCHED") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
        ✅ Clinched
      </span>
    );
  }
  if (status === "ELIMINATED") {
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
        ❌ Eliminated
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/30">
      ⚖️ In Contention
    </span>
  );
}