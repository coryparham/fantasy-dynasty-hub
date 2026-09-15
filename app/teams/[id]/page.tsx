import { 
  getLeagueData, 
  getPlayerMap, 
  getDraftPicks, 
  getLeagueHistory, 
  getAllTimeRecords,
  Player,
  TradedPick
} from "@/lib/sleeper";
import { getDynastyValues } from "@/lib/fantasycalc";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const rosterId = parseInt(id, 10);

  const [{ league, teams }, playerMap, tradedPicks, history, allTime, dynastyValues] =
    await Promise.all([
      getLeagueData(),
      getPlayerMap(),
      getDraftPicks(),
      getLeagueHistory(),
      getAllTimeRecords(),
      getDynastyValues(),
    ]);

  const team = teams.find((t) => t.rosterId === rosterId);
  if (!team) notFound();

  // All-Time Manager Stats
  const managerStats = allTime.leaderboard?.find((m: any) => m.ownerId === team.ownerId);

  // League Championships / History
  const teamChampionships = history.filter((h: any) => h.champion?.name === team.name);
  const teamRunnerUps = history.filter((h: any) => h.runnerUp?.name === team.name);

  // Baseline SuperFlex pick values used if FantasyCalc hasn't published specific future pick tiers yet
  const defaultPickValues: Record<number, number> = { 1: 4200, 2: 1800, 3: 800, 4: 300 };

  const getPickValue = (season: number, round: number): number => {
    const ordinal = round === 1 ? "1st" : round === 2 ? "2nd" : round === 3 ? "3rd" : `${round}th`;
    
    const keysToTry = [
      `${season}_${round}`,
      `${season} ${ordinal}`,
      `${season} mid ${ordinal}`,
      `${season} early ${ordinal}`,
      `${season} late ${ordinal}`,
      `${season} ${ordinal} (mid)`,
      `${season} round ${round}`,
    ];

    for (const key of keysToTry) {
      const val = dynastyValues[key.toLowerCase().trim()];
      if (val && val > 0) return val;
    }

    return defaultPickValues[round] || 200;
  };

  // Dynamic Draft Seasons Calculation
  const currentYear = parseInt(league.season || "2026", 10);
  const startDraftYear = currentYear + 1;
  const tradedSeasons = tradedPicks
    .map((p: TradedPick) => parseInt(p.season, 10))
    .filter((s: number) => !isNaN(s) && s >= startDraftYear);

  const draftYears = Array.from(
    new Set([startDraftYear, startDraftYear + 1, startDraftYear + 2, ...tradedSeasons])
  ).sort((a, b) => a - b);

  const rounds = [1, 2, 3, 4];
  const draftAssets: { season: number; round: number; originalOwner: string; value: number }[] = [];

  draftYears.forEach((year) => {
    rounds.forEach((rd) => {
      const val = getPickValue(year, rd);

      const tradedAway = tradedPicks.find(
        (p: TradedPick) => p.season === String(year) && p.round === rd && p.roster_id === rosterId
      );

      if (!tradedAway) {
        draftAssets.push({ season: year, round: rd, originalOwner: "Own", value: val });
      }

      const acquired = tradedPicks.filter(
        (p: TradedPick) => p.season === String(year) && p.round === rd && p.owner_id === rosterId
      );
      acquired.forEach((p: TradedPick) => {
        draftAssets.push({
          season: year,
          round: rd,
          originalOwner: p.originalOwnerName || `Team #${p.roster_id}`,
          value: val,
        });
      });
    });
  });

  // Map Sleeper roster IDs directly to player details + Dynasty Value
  const rosterPlayers: (Player & { value: number })[] = (team.players || []).map((rawPid) => {
    const pid = String(rawPid).trim();
    const val = dynastyValues[pid] || 0;

    if (playerMap[pid]) {
      return { ...playerMap[pid], value: val };
    }
    return {
      id: pid,
      name: `Player #${pid}`,
      position: "UNKNOWN",
      team: "FA",
      age: 0,
      value: val,
    };
  });

  // Skill positions depth chart (Sorted by Dynasty Value Descending)
  const positions = ["QB", "RB", "WR", "TE"];
  const depthChart: Record<string, (Player & { value: number })[]> = {};
  positions.forEach((pos) => {
    depthChart[pos] = rosterPlayers
      .filter((p) => p.position === pos)
      .sort((a, b) => b.value - a.value);
  });

  // Total Valuations
  const totalPlayerValue = rosterPlayers.reduce((sum, p) => sum + p.value, 0);
  const totalPickValue = draftAssets.reduce((sum, p) => sum + p.value, 0);
  const totalTeamValue = totalPlayerValue + totalPickValue;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <Link href="/" className="text-xs text-amber-500 hover:underline">
          ← Back to Standings
        </Link>

        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <img
              src={team.avatar}
              alt=""
              className="w-20 h-20 rounded-full border-2 border-amber-500 object-cover"
            />
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-slate-100">{team.name}</h1>
              <p className="text-sm text-slate-400">Roster #{team.rosterId}</p>
              <div className="flex flex-wrap gap-2 mt-2 text-xs font-mono">
                <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                  Record: <strong className="text-amber-400">{team.wins}-{team.losses}</strong>
                </span>
                {managerStats && (
                  <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                    All-Time: <strong className="text-amber-400">{managerStats.wins}-{managerStats.losses} ({managerStats.winPct.toFixed(1)}%)</strong>
                  </span>
                )}
                <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                  Championships: <strong className="text-amber-400">{teamChampionships.length}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Total Dynasty Value Header Badge */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-start md:items-end min-w-[220px]">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Dynasty Value</span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {totalTeamValue.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">
              Players: {totalPlayerValue.toLocaleString()} | Picks: {totalPickValue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Manager Profile & Accolades */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <strong className="text-sm font-bold text-amber-400 uppercase tracking-wider block">Manager Profile</strong>
            <div className="text-xs space-y-1.5 text-slate-300 font-mono">
              <div>Total Seasons: <span className="text-slate-100 font-bold">{managerStats?.seasons || 1}</span></div>
              <div>Points For: <span className="text-slate-100 font-bold">{team.pointsFor.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <strong className="text-sm font-bold text-amber-400 uppercase tracking-wider block">Trophies & Honors</strong>
            <div className="text-xs space-y-1 text-slate-300">
              {teamChampionships.length === 0 && teamRunnerUps.length === 0 ? (
                <span className="text-slate-500 italic">No historical titles yet</span>
              ) : (
                <>
                  {teamChampionships.map((c: any) => (
                    <div key={c.season} className="text-emerald-400 font-semibold">🏆 {c.season} League Champion</div>
                  ))}
                  {teamRunnerUps.map((r: any) => (
                    <div key={r.season} className="text-slate-400">🥈 {r.season} Runner-Up</div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
            <strong className="text-sm font-bold text-amber-400 uppercase tracking-wider block">Draft Capital Summary</strong>
            <div className="text-xs text-slate-300 font-mono">
              <div>Total Future Picks: <span className="text-amber-400 font-bold">{draftAssets.length}</span></div>
              <div>Pick Portfolio Value: <span className="text-emerald-400 font-bold">{totalPickValue.toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        {/* Draft Assets */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <strong className="text-lg font-bold text-slate-100 block">Future Draft Assets</strong>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {draftYears.map((year) => {
              const picksForYear = draftAssets.filter((a) => a.season === year);
              return (
                <div key={year} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                  <strong className="text-sm font-bold text-amber-400 block">{year} Picks</strong>
                  {picksForYear.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No picks owned</p>
                  ) : (
                    <ul className="text-xs space-y-1.5 font-mono">
                      {picksForYear.map((pick, i) => (
                        <li key={i} className="flex justify-between items-center text-slate-300">
                          <span>
                            Round {pick.round} <span className="text-slate-500 text-[11px]">({pick.originalOwner})</span>
                          </span>
                          <span className="text-emerald-400 text-xs font-bold">
                            {pick.value.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Positional Depth Charts */}
        <div className="space-y-4">
          <strong className="text-lg font-bold text-slate-100 block">Current Roster Depth Chart</strong>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {positions.map((pos) => {
              const players = depthChart[pos] || [];
              const posValue = players.reduce((sum, p) => sum + p.value, 0);

              return (
                <div key={pos} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <strong className="font-extrabold text-amber-400 text-sm tracking-wider uppercase">{pos}</strong>
                    <div className="text-xs font-mono space-x-2">
                      <span className="text-slate-500">{players.length} Players</span>
                      {posValue > 0 && (
                        <span className="text-emerald-400 font-bold">({posValue.toLocaleString()} pts)</span>
                      )}
                    </div>
                  </div>

                  {players.length === 0 ? (
                    <p className="text-xs text-slate-600 italic">No players at this position</p>
                  ) : (
                    <div className="divide-y divide-slate-800/60">
                      {players.map((player) => (
                        <div key={player.id} className="py-2 flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-200">{player.name}</span>
                            <span className="text-slate-500 font-mono">{player.team}</span>
                            {player.age > 0 && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">
                                {player.age}y
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                            {player.value > 0 ? player.value.toLocaleString() : "-"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}