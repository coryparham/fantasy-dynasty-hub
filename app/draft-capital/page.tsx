// app/draft-capital/page.tsx
import { getDraftPicks, getLeagueData } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

export default async function DraftCapitalPage() {
  const { teams, league } = await getLeagueData();
  const rawTradedPicks = await getDraftPicks();
  const tradedPicks = Array.isArray(rawTradedPicks) ? rawTradedPicks : [];

  const currentSeason = parseInt(league.season || "2026", 10);
  
  // If the league is active, completed, or post-season, the current year's draft has passed
  const isDraftCompleted =
    league.status !== "pre_draft" && league.status !== "drafting";
  const startYear = isDraftCompleted ? currentSeason + 1 : currentSeason;
  const draftYears = [startYear, startYear + 1, startYear + 2];

  const rounds = [1, 2, 3, 4];

  const getTeam = (rosterId: number) =>
    teams.find((t) => t.rosterId === rosterId);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            Draft Capital Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Upcoming draft pick stashes, acquired assets, and traded draft capital across the league
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            // Outgoing: original picks owned by this team that were traded to someone else
            const tradedAway = tradedPicks.filter(
              (p: any) =>
                p.roster_id === team.rosterId &&
                draftYears.includes(parseInt(p.season, 10))
            );

            // Incoming: picks acquired from other teams
            const acquired = tradedPicks.filter(
              (p: any) =>
                p.owner_id === team.rosterId &&
                p.roster_id !== team.rosterId &&
                draftYears.includes(parseInt(p.season, 10))
            );

            return (
              <div
                key={team.rosterId}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Team Header */}
                  <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
                    <img
                      src={team.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full border border-amber-500/50 object-cover"
                    />
                    <div>
                      <h2 className="font-bold text-slate-100">{team.name}</h2>
                      <p className="text-xs text-slate-400">Roster #{team.rosterId}</p>
                    </div>
                  </div>

                  {/* Section 1: All Currently Held Picks */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                      Current Pick Stash
                    </h3>
                    <div className="space-y-3">
                      {draftYears.map((year) => {
                        // Own picks retained
                        const ownPicksHeld = rounds
                          .filter(
                            (r) =>
                              !tradedAway.some(
                                (p: any) =>
                                  parseInt(p.season, 10) === year &&
                                  p.round === r
                              )
                          )
                          .map((r) => ({
                            year,
                            round: r,
                            isOwn: true,
                            originalOwner: team,
                          }));

                        // Acquired picks for this year
                        const acquiredForYear = acquired
                          .filter((p: any) => parseInt(p.season, 10) === year)
                          .map((p: any) => ({
                            year,
                            round: p.round,
                            isOwn: false,
                            originalOwner: getTeam(p.roster_id),
                          }));

                        const allHeldPicks = [...ownPicksHeld, ...acquiredForYear].sort(
                          (a, b) => a.round - b.round
                        );

                        return (
                          <div
                            key={year}
                            className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-amber-400">
                                {year} Draft
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {allHeldPicks.length} {allHeldPicks.length === 1 ? "Pick" : "Picks"}
                              </span>
                            </div>

                            {allHeldPicks.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No picks in this draft</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {allHeldPicks.map((pick, i) => (
                                  <span
                                    key={i}
                                    className={`text-xs px-2.5 py-1 rounded-md font-semibold border ${
                                      pick.isOwn
                                        ? "bg-slate-800 border-slate-700 text-slate-200"
                                        : "bg-emerald-950/60 border-emerald-700/60 text-emerald-300"
                                    }`}
                                  >
                                    R{pick.round}
                                    {!pick.isOwn && (
                                      <span className="text-[10px] opacity-80 ml-1">
                                        (via {pick.originalOwner?.name.split(" ")[0] || `Team ${pick.originalOwner?.rosterId}`})
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section 2: Trade Movement Summary */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Pick Movement
                    </h3>

                    {/* Acquired Picks */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                        + Acquired ({acquired.length})
                      </span>
                      {acquired.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">No incoming picks</p>
                      ) : (
                        <div className="space-y-1">
                          {acquired.map((p: any, idx: number) => {
                            const origTeam = getTeam(p.roster_id);
                            return (
                              <div
                                key={idx}
                                className="text-xs bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 px-2.5 py-1.5 rounded flex justify-between items-center"
                              >
                                <span className="font-semibold">
                                  {p.season} Round {p.round}
                                </span>
                                <span className="text-[10px] text-emerald-400/80">
                                  from {origTeam?.name || `Team ${p.roster_id}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Traded Away Picks */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                        - Traded Away ({tradedAway.length})
                      </span>
                      {tradedAway.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">No outgoing picks</p>
                      ) : (
                        <div className="space-y-1">
                          {tradedAway.map((p: any, idx: number) => {
                            const newOwner = getTeam(p.owner_id);
                            return (
                              <div
                                key={idx}
                                className="text-xs bg-rose-950/30 border border-rose-900/40 text-rose-300 px-2.5 py-1.5 rounded flex justify-between items-center"
                              >
                                <span className="font-semibold">
                                  {p.season} Round {p.round}
                                </span>
                                <span className="text-[10px] text-rose-400/80">
                                  to {newOwner?.name || `Team ${p.owner_id}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}