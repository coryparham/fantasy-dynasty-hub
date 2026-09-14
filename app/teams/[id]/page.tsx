// app/teams/[id]/page.tsx
import { getLeagueData, getPlayerMap, Player } from "@/lib/sleeper";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const rosterId = parseInt(id, 10);

  const [{ teams }, playerMap] = await Promise.all([
    getLeagueData(),
    getPlayerMap(),
  ]);

  const team = teams.find((t) => t.rosterId === rosterId);
  if (!team) notFound();

  // Map roster player IDs to full player details
  const rosterPlayers: Player[] = team.players
    .map((pid) => playerMap[pid])
    .filter(Boolean);

  // Group by position
  const positions = ["QB", "RB", "WR", "TE", "K", "DEF"];
  const depthChart: Record<string, Player[]> = {};
  positions.forEach((pos) => {
    depthChart[pos] = rosterPlayers.filter((p) => p.position === pos);
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <Link href="/teams" className="text-xs text-amber-500 hover:underline">
          ← Back to All Teams
        </Link>

        {/* Team Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center space-x-5">
          <img
            src={team.avatar}
            alt=""
            className="w-20 h-20 rounded-full border-2 border-amber-500 object-cover"
          />
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100">{team.name}</h1>
            <p className="text-sm text-slate-400">Roster #{team.rosterId}</p>
            <div className="flex space-x-4 mt-2 text-xs font-mono">
              <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                W-L: <strong className="text-amber-400">{team.wins}-{team.losses}</strong>
              </span>
              <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                Points: <strong className="text-amber-400">{team.pointsFor.toFixed(2)}</strong>
              </span>
              <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                Players: <strong className="text-amber-400">{rosterPlayers.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Positional Depth Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {positions.map((pos) => {
            const players = depthChart[pos] || [];
            return (
              <div key={pos} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <h2 className="font-extrabold text-amber-400 text-sm tracking-wider">{pos}</h2>
                  <span className="text-xs text-slate-500 font-mono">{players.length} Players</span>
                </div>

                {players.length === 0 ? (
                  <p className="text-xs text-slate-600 italic">No players at this position</p>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {players.map((player) => (
                      <div key={player.id} className="py-2 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-slate-200">{player.name}</span>
                          <span className="text-slate-500 ml-2 font-mono">{player.team}</span>
                        </div>
                        {player.age > 0 && (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded">
                            {player.age} yrs
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}