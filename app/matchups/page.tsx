// app/matchups/page.tsx
import Link from "next/link";
import {
  getLeagueData,
  getWeeklyMatchups,
  getPlayerMap,
  getHeadToHeadMatrix,
  TeamMatchupDetail,
  Player,
} from "@/lib/sleeper";
import { getDynastyValues } from "@/lib/fantasycalc";

export const dynamic = "force-dynamic";

export default async function MatchupsPage() {
  const { league, teams } = await getLeagueData();
  const currentWeek = league.settings.leg || league.settings.playoff_week_start || 1;

  const [matchupPairs, dynastyValues, playerMap, h2hMatrix] = await Promise.all([
    getWeeklyMatchups(currentWeek),
    getDynastyValues(),
    getPlayerMap(),
    getHeadToHeadMatrix(),
  ]);

  const teamAvatarMap = new Map(teams.map((t) => [t.rosterId, t.avatar]));
  const teamOwnerMap = new Map(teams.map((t) => [t.rosterId, t.ownerId]));

  // Helper to look up individual player dynasty values
const lookupValue = (key: string): number => {
  if (!dynastyValues) return 0;
  if (typeof (dynastyValues as any).get === "function") {
    // FIX: Cast through 'unknown' first to prevent TS2352 overlap error
    return (dynastyValues as unknown as Map<string, number>).get(key) || 0;
  }
  if (Array.isArray(dynastyValues)) {
    const found = dynastyValues.find(
      (item: any) =>
        item.sleeperId === key ||
        item.id === key ||
        item.player?.sleeperId === key ||
        item.name?.toLowerCase() === key.toLowerCase()
    );
    return found?.value || found?.tradeValue || 0;
  }
  return (dynastyValues as Record<string, number>)[key] || 0;
};

// Compute Dynasty Values per team
const teamDynastyMap = new Map<
  number,
  { starterVal: number; benchVal: number; totalVal: number }
>();

matchupPairs.forEach((pair) => {
  [pair.homeTeam, pair.awayTeam].forEach((team) => {
    const starterVal = team.starters.reduce((sum, pid) => sum + lookupValue(pid), 0);
    const benchVal = team.bench.reduce((sum, pid) => sum + lookupValue(pid), 0);
    teamDynastyMap.set(team.rosterId, {
      starterVal,
      benchVal,
      totalVal: starterVal + benchVal,
    });
  });
});

  // Archetype thresholds
  const allValues = Array.from(teamDynastyMap.values()).map((v) => v.totalVal);
  const sortedValues = [...allValues].sort((a, b) => b - a);
  const topThreshold = sortedValues[Math.floor(sortedValues.length * 0.35)] || 0;
  const bottomThreshold = sortedValues[Math.floor(sortedValues.length * 0.65)] || 0;

  const getMatchupArchetype = (homeRosterId: number, awayRosterId: number) => {
    const homeVal = teamDynastyMap.get(homeRosterId)?.totalVal || 0;
    const awayVal = teamDynastyMap.get(awayRosterId)?.totalVal || 0;

    const isHomeTop = homeVal >= topThreshold;
    const isAwayTop = awayVal >= topThreshold;
    const isHomeBottom = homeVal <= bottomThreshold;
    const isAwayBottom = awayVal <= bottomThreshold;

    if (isHomeTop && isAwayTop) {
      return { label: "🔥 Heavyweight Clash", color: "bg-amber-950/60 text-amber-400 border-amber-800/60" };
    }
    if ((isHomeTop && isAwayBottom) || (isAwayTop && isHomeBottom)) {
      return { label: "⚔️ Contender vs Rebuilder", color: "bg-purple-950/60 text-purple-300 border-purple-800/60" };
    }
    if (isHomeBottom && isAwayBottom) {
      return { label: "📉 Tankathon / Toilet Bowl", color: "bg-rose-950/60 text-rose-400 border-rose-800/60" };
    }
    return { label: "🎯 Competitive Battle", color: "bg-slate-800 text-slate-300 border-slate-700" };
  };

  // Compute positional totals and starter counts
  const getPositionalTotals = (
    team: TeamMatchupDetail
  ): Record<string, { pts: number; count: number }> => {
    const totals: Record<string, { pts: number; count: number }> = {
      QB: { pts: 0, count: 0 },
      RB: { pts: 0, count: 0 },
      WR: { pts: 0, count: 0 },
      TE: { pts: 0, count: 0 },
    };

    team.starters.forEach((pid) => {
      const pos = playerMap[pid]?.position || "OTHER";
      if (totals[pos] !== undefined) {
        const pts = team.playersPointsMap?.[pid] || 0;
        totals[pos].pts += pts;
        totals[pos].count += 1;
      }
    });

    return totals;
  };

  const renderTeamCard = (team: TeamMatchupDetail, isWinner: boolean) => {
    const avatar = teamAvatarMap.get(team.rosterId);
    const optimal = team.optimalLineupPoints || team.points;
    const efficiency = optimal > 0 ? Math.min(100, (team.points / optimal) * 100) : 100;
    const pointsBenched = Math.max(0, Number((optimal - team.points).toFixed(2)));
    const dynastyStats = teamDynastyMap.get(team.rosterId) || { starterVal: 0, benchVal: 0, totalVal: 0 };

    return (
      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between">
          {/* Clickable Team Avatar & Name */}
          <Link
            href={`/teams/${team.rosterId}`}
            className="flex items-center space-x-3 group hover:opacity-90 transition"
          >
            <img
              src={avatar || "https://sleepercdn.com/images/v2/owners/guy_select.png"}
              className="w-10 h-10 rounded-full border border-slate-700 group-hover:border-amber-500/60 object-cover transition"
              alt={team.teamName}
            />
            <div>
              <span className="font-bold text-slate-100 group-hover:text-amber-400 group-hover:underline block text-sm sm:text-base transition">
                {team.teamName}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Proj: {team.projectedPoints} pts
              </span>
            </div>
          </Link>

          <div className="text-right">
            <span className={`text-2xl font-mono font-black ${isWinner ? "text-amber-400" : "text-slate-200"}`}>
              {team.points.toFixed(2)}
            </span>
            <span className="text-[10px] block font-mono text-slate-500">Opt: {optimal.toFixed(2)}</span>
          </div>
        </div>

        {/* Dynasty Market Value Badge */}
        <div className="flex justify-between items-center text-[11px] font-mono bg-slate-950/60 px-2.5 py-1.5 rounded border border-slate-800/60">
          <span className="text-slate-400">Dynasty Value</span>
          <span className="text-emerald-400 font-bold">
            {dynastyStats.totalVal > 0 ? dynastyStats.totalVal.toLocaleString() : "N/A"} pts
          </span>
        </div>

        {/* Efficiency Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>Lineup Efficiency</span>
            <span className={efficiency >= 90 ? "text-emerald-400 font-bold" : efficiency >= 75 ? "text-amber-400" : "text-rose-400"}>
              {efficiency.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                efficiency >= 90 ? "bg-emerald-500" : efficiency >= 75 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${efficiency}%` }}
            />
          </div>
        </div>

        {/* Bench Leakage */}
        <div className="flex justify-between items-center text-[11px] font-mono bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800/80">
          <span className="text-slate-400">Bench Points</span>
          <div className="space-x-2">
            <span className="text-slate-300">{team.benchPoints.toFixed(2)}</span>
            {pointsBenched > 0 && (
              <span className="text-rose-400 font-semibold">(-{pointsBenched} left on bench)</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-amber-500">Week {currentWeek} Matchups</h1>
          <p className="text-xs text-slate-400 mt-1">Live scores, optimal lineups, dynasty values, and positional breakdowns</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {matchupPairs.map((pair) => {
            const homeWins = pair.homeTeam.points >= pair.awayTeam.points;
            const awayWins = pair.awayTeam.points > pair.homeTeam.points;
            const archetype = getMatchupArchetype(pair.homeTeam.rosterId, pair.awayTeam.rosterId);

            const homeOwnerId = teamOwnerMap.get(pair.homeTeam.rosterId);
            const awayOwnerId = teamOwnerMap.get(pair.awayTeam.rosterId);
            const h2hRecord = homeOwnerId && awayOwnerId ? h2hMatrix[homeOwnerId]?.[awayOwnerId] : null;

            const homePos = getPositionalTotals(pair.homeTeam);
            const awayPos = getPositionalTotals(pair.awayTeam);
            const positions = ["QB", "RB", "WR", "TE"];

            return (
              <div
                key={pair.matchupId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Archetype & All-Time H2H Badges */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded border ${archetype.color}`}>
                      {archetype.label}
                    </span>
                    {pair.margin > 0 && (
                      <span className="text-[10px] font-mono text-amber-400/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                        Δ {pair.margin.toFixed(2)} pts
                      </span>
                    )}
                  </div>

                  {/* All-Time H2H Series Banner */}
                  <div className="flex justify-between items-center text-[11px] font-mono bg-slate-950/80 px-3 py-1 rounded border border-slate-800/80">
                    <span className="text-slate-400 font-semibold">All-Time Series</span>
                    {h2hRecord ? (
                      <span className="text-slate-200 font-bold">
                        {h2hRecord.wins} - {h2hRecord.losses}
                        {h2hRecord.ties > 0 ? ` - ${h2hRecord.ties}` : ""}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          ({h2hRecord.wins > h2hRecord.losses ? `${pair.homeTeam.teamName.split(' ')[0]} leads` : h2hRecord.losses > h2hRecord.wins ? `${pair.awayTeam.teamName.split(' ')[0]} leads` : "Tied"})
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">First Meeting</span>
                    )}
                  </div>
                </div>

                {renderTeamCard(pair.homeTeam, homeWins)}

                {/* Positional Breakdown Heatmap */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 font-mono text-xs">
                  <span className="text-[10px] uppercase text-slate-500 font-bold block tracking-wider text-center">
                    Positional Battle
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {positions.map((pos) => {
                      const hStats = homePos[pos] || { pts: 0, count: 0 };
                      const aStats = awayPos[pos] || { pts: 0, count: 0 };
                      const homeWinning = hStats.pts > aStats.pts;
                      const awayWinning = aStats.pts > hStats.pts;

                      const hAvg = hStats.count > 0 ? hStats.pts / hStats.count : 0;
                      const aAvg = aStats.count > 0 ? aStats.pts / aStats.count : 0;

                      return (
                        <div key={pos} className="bg-slate-900 p-2 rounded border border-slate-800/80 space-y-1">
                          <span className="text-[10px] text-amber-400 font-bold block">{pos}</span>
                          <div className="flex justify-between items-center text-[11px]">
                            <div className="text-left">
                              <span className={homeWinning ? "text-emerald-400 font-bold block" : "text-slate-400 block"}>
                                {hStats.pts.toFixed(2)}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold block">
                                {hStats.count} {hStats.count === 1 ? "start" : "starts"}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono block">
                                avg {hAvg.toFixed(2)}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-600">vs</span>
                            <div className="text-right">
                              <span className={awayWinning ? "text-emerald-400 font-bold block" : "text-slate-400 block"}>
                                {aStats.pts.toFixed(2)}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold block">
                                {aStats.count} {aStats.count === 1 ? "start" : "starts"}
                              </span>
                              <span className="text-[8px] text-slate-500 font-mono block">
                                avg {aAvg.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {renderTeamCard(pair.awayTeam, awayWins)}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}