// app/trophies/page.tsx

interface HistoryItem {
  year: number;
  champion: string;
  runnerUp: string;
  sacko: string;
  punishment: string;
}

// Edit your historical league winners & punishments here
const LEAGUE_HISTORY: HistoryItem[] = [
  {
    year: 2025,
    champion: "Team Alpha",
    runnerUp: "Team Bravo",
    sacko: "Team Charlie",
    punishment: "24 Hours in Waffle House",
  },
];

export default function TrophyPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <h1 className="text-3xl font-extrabold text-amber-500">Hall of Fame & Trophy Case</h1>

        <div className="grid grid-cols-1 gap-6">
          {LEAGUE_HISTORY.map((item) => (
            <div key={item.year} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-2xl font-bold text-amber-400">{item.year} Season</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-amber-500/30">
                  <span className="text-xs uppercase text-amber-500 font-bold">Champion</span>
                  <p className="text-lg font-bold text-slate-100">{item.champion}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                  <span className="text-xs uppercase text-slate-400 font-bold">Runner-Up</span>
                  <p className="text-lg font-bold text-slate-300">{item.runnerUp}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-red-500/30">
                  <span className="text-xs uppercase text-red-400 font-bold">Sacko Winner</span>
                  <p className="text-lg font-bold text-red-300">{item.sacko}</p>
                  <p className="text-xs text-slate-400 mt-1">Punishment: {item.punishment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}