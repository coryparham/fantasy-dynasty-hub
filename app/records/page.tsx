// app/history/page.tsx
import { getLeagueHistory } from "@/lib/sleeper";

export default async function HistoryPage() {
  const history = await getLeagueHistory();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            Hall of Fame & Trophy Case
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Historical champions and playoff outcomes across all past Sleeper seasons
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history.map((season) => (
            <div
              key={season.leagueId}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-lg"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-xl font-extrabold text-amber-400">
                  {season.season} Season
                </h2>
                <span className="text-xs font-mono text-slate-400">
                  ID: {season.leagueId.slice(0, 8)}...
                </span>
              </div>

              {/* Champion Card */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-center space-x-4">
                {season.champion ? (
                  <>
                    <img
                      src={season.champion.avatar}
                      alt=""
                      className="w-12 h-12 rounded-full border-2 border-amber-400 object-cover"
                    />
                    <div>
                      <span className="text-xs uppercase tracking-wider font-extrabold text-amber-400 block">
                        🏆 League Champion
                      </span>
                      <h3 className="text-lg font-bold text-slate-100">
                        {season.champion.name}
                      </h3>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400">Playoff bracket data pending or unfinalized</p>
                )}
              </div>

              {/* Runner Up Card */}
              {season.runnerUp && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex items-center space-x-3">
                  <img
                    src={season.runnerUp.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      🥈 Runner-Up
                    </span>
                    <h4 className="text-sm font-semibold text-slate-200">
                      {season.runnerUp.name}
                    </h4>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}