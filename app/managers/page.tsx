// app/managers/page.tsx
import { getLeagueData, getDraftPicks, TradedPick } from "@/lib/sleeper";
import { getDynastyValues } from "@/lib/fantasycalc";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ManagersPage() {
  // Fetch league data, traded draft picks, and fantasy market values in parallel
  const [{ league, teams }, tradedPicks, valueMap] = await Promise.all([
    getLeagueData(),
    getDraftPicks(),
    getDynastyValues(),
  ]);

  // Fallback pick values for SuperFlex leagues if FantasyCalc hasn't published specific tier values
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
      const val = valueMap[key.toLowerCase().trim()];
      if (val && val > 0) return val;
    }

    return defaultPickValues[round] || 200;
  };

  // Determine active draft years based on current season and traded picks
  const currentYear = parseInt(league?.season || "2026", 10);
  const startDraftYear = currentYear + 1;
  const tradedSeasons = (tradedPicks || [])
    .map((p: TradedPick) => parseInt(p.season, 10))
    .filter((s: number) => !isNaN(s) && s >= startDraftYear);

  const draftYears = Array.from(
    new Set([startDraftYear, startDraftYear + 1, startDraftYear + 2, ...tradedSeasons])
  ).sort((a, b) => a - b);
  const rounds = [1, 2, 3, 4];

  // Calculate total player + draft pick values for each manager
  const teamsWithValues = teams.map((team) => {
    // 1. Calculate Player Roster Value
    const playerValue = (team.players || []).reduce((sum, playerId) => {
      return sum + (valueMap[String(playerId).trim()] || 0);
    }, 0);

    // 2. Calculate Owned Draft Pick Portfolio Value
    let pickValue = 0;
    let pickCount = 0;

    draftYears.forEach((year) => {
      rounds.forEach((rd) => {
        const val = getPickValue(year, rd);

        // Deduct pick if traded away by team
        const tradedAway = tradedPicks.find(
          (p: TradedPick) => p.season === String(year) && p.round === rd && p.roster_id === team.rosterId
        );

        if (!tradedAway) {
          pickValue += val;
          pickCount += 1;
        }

        // Add picks acquired via trades
        const acquired = tradedPicks.filter(
          (p: TradedPick) => p.season === String(year) && p.round === rd && p.owner_id === team.rosterId
        );

        acquired.forEach(() => {
          pickValue += val;
          pickCount += 1;
        });
      });
    });

    const totalValue = playerValue + pickValue;

    return {
      ...team,
      playerValue,
      pickValue,
      pickCount,
      totalValue,
    };
  });

  // Calculate average league value to split Contenders vs. Rebuilders
  const avgValue =
    teamsWithValues.reduce((sum, t) => sum + t.totalValue, 0) /
      teamsWithValues.length || 1;

  // Sort managers by total dynasty value descending
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
              Live market valuations calculated from active player values and draft pick portfolios
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTeams.map((team, index) => {
            const isContender = team.totalValue >= avgValue;

            return (
              <div
                key={team.rosterId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4 shadow-lg hover:border-slate-700 transition flex flex-col justify-between"
              >
                <div className="space-y-4">
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
                    <Link
                      href={`/teams/${team.rosterId}`}
                      className="text-xl font-bold hover:text-amber-400 transition"
                    >
                      {team.name}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Record: {team.wins}-{team.losses}
                    </p>
                  </div>

                  {/* Total Roster + Pick Value Box */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                      Total Dynasty Value
                    </span>
                    <span className="text-2xl font-mono font-extrabold text-amber-400 block">
                      {team.totalValue.toLocaleString()} pts
                    </span>
                    <div className="text-[11px] text-slate-500 font-mono flex justify-between border-t border-slate-800/60 pt-1.5 mt-1 px-1">
                      <span>Players: <strong className="text-slate-300">{team.playerValue.toLocaleString()}</strong></span>
                      <span>Picks: <strong className="text-emerald-400">{team.pickValue.toLocaleString()}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Status Badges */}
                <div className="flex flex-wrap justify-center gap-2 pt-2 border-t border-slate-800/50">
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
                  <span className="px-2.5 py-1 bg-slate-800 text-amber-400 border border-slate-700 rounded-full text-xs font-semibold">
                    {team.pickCount} Picks
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