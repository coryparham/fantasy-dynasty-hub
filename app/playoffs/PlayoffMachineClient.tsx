"use client";

import { useState } from "react";

interface Team {
  rosterId: number;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  pointsFor: number;
}

interface UpcomingMatchup {
  week: number;
  matchupId: number;
  team1RosterId: number;
  team2RosterId: number;
}

interface Props {
  teams: Team[];
  remainingMatchups: UpcomingMatchup[];
  playoffTeamsCount: number;
  playoffStartWeek: number;
  currentWeek: number;
}

export default function PlayoffMachineClient({
  teams,
  remainingMatchups,
  playoffTeamsCount,
  playoffStartWeek,
  currentWeek,
}: Props) {
  // Store simulated pick winners: key is "week-matchupId", value is winning rosterId
  // Default picks select Team 1 by default
  const initialPicks: Record<string, number> = {};
  remainingMatchups.forEach((m) => {
    initialPicks[`${m.week}-${m.matchupId}`] = m.team1RosterId;
  });

  const [simulatedPicks, setSimulatedPicks] = useState<Record<string, number>>(initialPicks);

  // Calculate simulated win totals based on user picks
  const simWins: Record<number, number> = {};
  teams.forEach((t) => (simWins[t.rosterId] = t.wins));

  remainingMatchups.forEach((m) => {
    const winnerId = simulatedPicks[`${m.week}-${m.matchupId}`];
    if (winnerId && simWins[winnerId] !== undefined) {
      simWins[winnerId] += 1;
    }
  });

  // Re-rank teams based on simulated win totals
  const simulatedStandings = [...teams]
    .map((team) => ({
      ...team,
      simWins: simWins[team.rosterId] || team.wins,
      simLosses: team.losses + (playoffStartWeek - currentWeek) - ((simWins[team.rosterId] || team.wins) - team.wins),
    }))
    .sort((a, b) => b.simWins - a.simWins || b.pointsFor - a.pointsFor);

  const toggleWinner = (week: number, matchupId: number, selectedRosterId: number) => {
    setSimulatedPicks((prev) => ({
      ...prev,
      [`${week}-${matchupId}`]: selectedRosterId,
    }));
  };

  const getTeam = (rosterId: number) => teams.find((t) => t.rosterId === rosterId);

  // Group matchups by week
  const weeksList = Array.from(
    new Set(remainingMatchups.map((m) => m.week))
  ).sort((a, b) => a - b);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left 2 Columns: Projected Bracket & Standings */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-100">Simulated Playoff Bracket</h2>
            <span className="text-xs text-amber-400 font-mono">
              Live updates as you pick game winners
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-3 px-4">Seed</th>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4 text-center">Base Record</th>
                  <th className="py-3 px-4 text-center">Simulated Record</th>
                  <th className="py-3 px-4 text-right">Points For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {simulatedStandings.map((team, idx) => {
                  const seed = idx + 1;
                  const isBye = seed <= 2;
                  const isPlayoff = seed <= playoffTeamsCount;

                  return (
                    <tr
                      key={team.rosterId}
                      className={`hover:bg-slate-800/40 transition ${
                        isBye
                          ? "bg-amber-500/5"
                          : isPlayoff
                          ? "bg-slate-900"
                          : "bg-slate-950/40"
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            isBye
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : isPlayoff
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          #{seed} {isBye ? "(Bye)" : ""}
                        </span>
                      </td>

                      <td className="py-3 px-4 flex items-center space-x-3">
                        <img
                          src={team.avatar}
                          alt=""
                          className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                        />
                        <span className="font-bold text-slate-100">{team.name}</span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {team.wins}-{team.losses}
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-extrabold text-amber-400">
                        {team.simWins}-{team.simLosses}
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        {team.pointsFor.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Schedule Selector */}
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-amber-500 border-b border-slate-800 pb-3">
            Simulate Remaining Matchups
          </h2>

          <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
            {weeksList.map((week) => (
              <div key={week} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950 px-3 py-1 rounded">
                  Week {week} Matchups
                </h3>
                {remainingMatchups
                  .filter((m) => m.week === week)
                  .map((m) => {
                    const t1 = getTeam(m.team1RosterId);
                    const t2 = getTeam(m.team2RosterId);
                    const currentWinner = simulatedPicks[`${m.week}-${m.matchupId}`];

                    if (!t1 || !t2) return null;

                    return (
                      <div
                        key={`${m.week}-${m.matchupId}`}
                        className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2"
                      >
                        <button
                          type="button"
                          onClick={() => toggleWinner(m.week, m.matchupId, t1.rosterId)}
                          className={`w-full flex justify-between items-center px-3 py-2 rounded text-xs font-semibold transition ${
                            currentWinner === t1.rosterId
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span className="truncate">{t1.name}</span>
                          {currentWinner === t1.rosterId && <span>✓ WIN</span>}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleWinner(m.week, m.matchupId, t2.rosterId)}
                          className={`w-full flex justify-between items-center px-3 py-2 rounded text-xs font-semibold transition ${
                            currentWinner === t2.rosterId
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                              : "bg-slate-900 text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <span className="truncate">{t2.name}</span>
                          {currentWinner === t2.rosterId && <span>✓ WIN</span>}
                        </button>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}