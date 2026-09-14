// app/draft-capital/page.tsx
import { getDraftPicks, getLeagueData } from "@/lib/sleeper";

export const dynamic = "force-dynamic";

export default async function DraftCapitalPage() {
  const { teams, league } = await getLeagueData();
  const rawTradedPicks = await getDraftPicks();
  const tradedPicks = Array.isArray(rawTradedPicks) ? rawTradedPicks : [];

  const currentSeason = parseInt(league.season || "2024", 10);
  const draftYears = [currentSeason, currentSeason + 1, currentSeason + 2];
  const rounds = [1, 2, 3, 4];

  // Helper to determine who currently owns a pick
  const getPickOwner = (originalRosterId: number, year: number, round: number) => {
    const traded = tradedPicks.find(
      (p: any) =>
        p.roster_id === originalRosterId &&
        parseInt(p.season, 10) === year &&
        p.round === round
    );

    if (!traded) {
      return teams.find((t) => t.rosterId === originalRosterId);
    }

    return teams.find((t) => t.rosterId === traded.owner_id);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            Draft Capital Tracker
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Future draft pick ownership across the league
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div
              key={team.rosterId}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4"
            >
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

              <div className="space-y-3">
                {draftYears.map((year) => (
                  <div key={year} className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                    <span className="text-xs font-bold text-amber-400 block mb-2">
                      {year} Picks
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {rounds.map((round) => {
                        const owner = getPickOwner(team.rosterId, year, round);
                        const isTraded = owner?.rosterId !== team.rosterId;

                        return (
                          <div
                            key={round}
                            className={`p-2 rounded border ${
                              isTraded
                                ? "bg-purple-950/30 border-purple-800/50 text-purple-300"
                                : "bg-slate-900 border-slate-800 text-slate-300"
                            }`}
                          >
                            <span className="font-bold">R{round}:</span>{" "}
                            {owner ? owner.name : `Team ${team.rosterId}`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}