// app/analytics/age-production/page.tsx
import { getLeagueData } from "@/lib/sleeper";

interface TeamMetrics {
  rosterId: number;
  name: string;
  avatar: string;
  pointsFor: number;
  avgAge: number;
  quadrant: "Contend Now" | "Golden Window" | "Rebuilding" | "Danger Zone";
}

export default async function AgeProductionPage() {
  const { teams } = await getLeagueData();

  // Fetch full Sleeper player database to extract ages
  const playersRes = await fetch("https://api.sleeper.app/v1/players/nfl", {
    next: { revalidate: 86400 }, // Cache player dictionary for 24 hours
  });
  const allPlayers = await playersRes.json();

  const currentYear = new Date().getFullYear();

  // Process roster ages and points
  const teamMetrics: TeamMetrics[] = teams.map((team) => {
    let totalAge = 0;
    let playerCount = 0;

    team.players.forEach((playerId) => {
      const player = allPlayers[playerId];
      if (player && player.age) {
        totalAge += player.age;
        playerCount++;
      }
    });

    const avgAge = playerCount > 0 ? totalAge / playerCount : 25;
    const pointsFor = team.pointsFor || 0;

    return {
      rosterId: team.rosterId,
      name: team.name,
      avatar: team.avatar,
      pointsFor,
      avgAge: Number(avgAge.toFixed(1)),
      quadrant: "Contend Now", // Placeholder, calculated below
    };
  });

  // Calculate league median age and median points for quadrant boundaries
  const sortedAges = [...teamMetrics].map((t) => t.avgAge).sort((a, b) => a - b);
  const sortedPoints = [...teamMetrics].map((t) => t.pointsFor).sort((a, b) => a - b);
  
  const midIndex = Math.floor(teamMetrics.length / 2);
  const medianAge = sortedAges[midIndex] || 25.5;
  const medianPoints = sortedPoints[midIndex] || 1000;

  // Assign quadrants
  teamMetrics.forEach((t) => {
    const isHighPoints = t.pointsFor >= medianPoints;
    const isYoung = t.avgAge < medianAge;

    if (isHighPoints && !isYoung) t.quadrant = "Contend Now";
    else if (isHighPoints && isYoung) t.quadrant = "Golden Window";
    else if (!isHighPoints && isYoung) t.quadrant = "Rebuilding";
    else t.quadrant = "Danger Zone";
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            Age vs. Production Matrix
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyzing roster longevity against current season scoring outputs
          </p>
        </div>

        {/* 2x2 Quadrant Display Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top Left: Golden Window */}
          <div className="bg-slate-900/90 border-2 border-emerald-500/40 p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-lg font-bold text-emerald-400">🏆 Golden Window</h2>
              <span className="text-xs text-slate-400">High Points / Low Age</span>
            </div>
            <div className="space-y-3">
              {teamMetrics
                .filter((t) => t.quadrant === "Golden Window")
                .map((t) => (
                  <TeamCard key={t.rosterId} team={t} />
                ))}
            </div>
          </div>

          {/* Top Right: Contend Now */}
          <div className="bg-slate-900/90 border-2 border-amber-500/40 p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-lg font-bold text-amber-400">⚡ Contend Now</h2>
              <span className="text-xs text-slate-400">High Points / High Age</span>
            </div>
            <div className="space-y-3">
              {teamMetrics
                .filter((t) => t.quadrant === "Contend Now")
                .map((t) => (
                  <TeamCard key={t.rosterId} team={t} />
                ))}
            </div>
          </div>

          {/* Bottom Left: Rebuilding */}
          <div className="bg-slate-900/90 border-2 border-blue-500/40 p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-lg font-bold text-blue-400">🌱 Rebuilding</h2>
              <span className="text-xs text-slate-400">Low Points / Low Age</span>
            </div>
            <div className="space-y-3">
              {teamMetrics
                .filter((t) => t.quadrant === "Rebuilding")
                .map((t) => (
                  <TeamCard key={t.rosterId} team={t} />
                ))}
            </div>
          </div>

          {/* Bottom Right: Danger Zone */}
          <div className="bg-slate-900/90 border-2 border-red-500/40 p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h2 className="text-lg font-bold text-red-400">⚠️ Danger Zone</h2>
              <span className="text-xs text-slate-400">Low Points / High Age</span>
            </div>
            <div className="space-y-3">
              {teamMetrics
                .filter((t) => t.quadrant === "Danger Zone")
                .map((t) => (
                  <TeamCard key={t.rosterId} team={t} />
                ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TeamCard({ team }: { team: TeamMetrics }) {
  return (
    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
      <div className="flex items-center space-x-3">
        <img
          src={team.avatar}
          alt={team.name}
          className="w-8 h-8 rounded-full border border-slate-700 object-cover"
        />
        <span className="font-semibold text-sm">{team.name}</span>
      </div>
      <div className="text-right text-xs font-mono space-x-3">
        <span className="text-slate-400">Avg Age: <strong className="text-slate-200">{team.avgAge}</strong></span>
        <span className="text-amber-400 font-bold">{team.pointsFor.toFixed(1)} pts</span>
      </div>
    </div>
  );
}