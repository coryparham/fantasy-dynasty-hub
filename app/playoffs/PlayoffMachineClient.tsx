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
  hasMedianMatch: boolean;
}

export default function PlayoffMachineClient({
  teams,
  remainingMatchups,
  playoffTeamsCount,
  playoffStartWeek,
  currentWeek,
  hasMedianMatch,
}: Props) {
  // Store H2H simulated picks: key = "week-matchupId", value = winning rosterId
  const initialH2HPicks: Record<string, number> = {};
  remainingMatchups.forEach((m) => {
    initialH2HPicks[`${m.week}-${m.matchupId}`] = m.team1RosterId;
  });

  const [h2hPicks, setH2HPicks] = useState<Record<string, number>>(initialH2HPicks);

  // Store Median simulated picks: key = "week-rosterId", value = boolean
  const [medianPicks, setMedianPicks] = useState<Record<string, boolean>>({});

  const remainingWeeksCount = Math.max(0, playoffStartWeek - currentWeek);
  const totalGamesPerWeek = hasMedianMatch ? 2 : 1;
  const totalRemainingGames = remainingWeeksCount * totalGamesPerWeek;

  // Calculate total simulated wins
  const simWins: Record<number, number> = {};
  teams.forEach((t) => (simWins[t.rosterId] = t.wins));

  // Add H2H Wins
  remainingMatchups.forEach((m) => {
    const winnerId = h2hPicks[`${m.week}-${m.matchupId}`];
    if (winnerId && simWins[winnerId] !== undefined) {
      simWins[winnerId] += 1;
    }
  });

  // Add Median Wins
  if (hasMedianMatch) {
    Object.entries(medianPicks).forEach(([key, wonMedian]) => {
      if (wonMedian) {
        const [, rosterIdStr] = key.split("-");
        const rosterId = Number(rosterIdStr);
        if (simWins[rosterId] !== undefined) {
          simWins[rosterId] += 1;
        }
      }
    });
  }

  // Rank teams based on total simulated wins
  const simulatedStandings = [...teams]
    .map((team) => {
      const currentSimWins = simWins[team.rosterId] || team.wins;
      const simLosses =
        team.losses +
        totalRemainingGames -
        (currentSimWins - team.wins);

      return {
        ...team,
        simWins: currentSimWins,
        simLosses: Math.max(0, simLosses),
      };
    })
    .sort((a, b) => b.simWins - a.simWins || b.pointsFor - a.pointsFor);

  const toggleH2HWinner = (week: number, matchupId: number, rosterId: number) => {
    setH2HPicks((prev) => ({ ...prev, [`${week}-${matchupId}`]: rosterId }));
  };

  const toggleMedianWin = (week: number, rosterId: number) => {
    const key = `${week}-${rosterId}`;
    setMedianPicks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getTeam = (rosterId: number) => teams.find((t) => t.rosterId === rosterId);

  const weeksList = Array.from(
    new Set(remainingMatchups.map((m) => m.week))
  ).sort((a, b) => a - b);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Standings */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-100">Simulated Playoff Standings</h2>
              {hasMedianMatch && (
                <p className="text-xs text-amber-400 mt-0.5">
                  ⚡ League Median Enabled: 2 games per team each week
                </p>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-3 px-4">Seed</th>
                  <th className="py-3 px-4">Manager</th>
                  <th className="py-3 px-4 text-center">Current Record</th>
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

      {/* Interactive Schedule Selector */}
      <div className="space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-amber-500 border-b border-slate-800 pb-3">
            Simulate Matchups
          </h2>

          <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
            {weeksList.map((week) => (
              <div key={week} className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-950 px-3 py-1 rounded">
                  Week {week}
                </h3>
                {remainingMatchups
                  .filter((m) => m.week === week)
                  .map((m) => {
                    const t1 = getTeam(m.team1RosterId);
                    const t2 = getTeam(m.team2RosterId);
                    const currentH2H = h2hPicks[`${m.week}-${m.matchupId}`];

                    if (!t1 || !t2) return null;

                    const t1Median = !!medianPicks[`${week}-${t1.rosterId}`];
                    const t2Median = !!medianPicks[`${week}-${t2.rosterId}`];

                    return (
                      <div
                        key={`${m.week}-${m.matchupId}`}
                        className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2"
                      >
                        {/* Team 1 */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleH2HWinner(m.week, m.matchupId, t1.rosterId)}
                            className={`flex-1 flex justify-between items-center px-3 py-1.5 rounded text-xs font-semibold transition ${
                              currentH2H === t1.rosterId
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                                : "bg-slate-900 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <span className="truncate">{t1.name}</span>
                            {currentH2H === t1.rosterId && <span>✓ H2H</span>}
                          </button>
                          {hasMedianMatch && (
                            <button
                              type="button"
                              onClick={() => toggleMedianWin(week, t1.rosterId)}
                              className={`px-2 py-1.5 rounded text-[10px] font-bold border transition ${
                                t1Median
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                  : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}
                            >
                              +1 Med
                            </button>
                          )}
                        </div>

                        {/* Team 2 */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleH2HWinner(m.week, m.matchupId, t2.rosterId)}
                            className={`flex-1 flex justify-between items-center px-3 py-1.5 rounded text-xs font-semibold transition ${
                              currentH2H === t2.rosterId
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/50"
                                : "bg-slate-900 text-slate-400 hover:text-slate-200"
                            }`}
                          >
                            <span className="truncate">{t2.name}</span>
                            {currentH2H === t2.rosterId && <span>✓ H2H</span>}
                          </button>
                          {hasMedianMatch && (
                            <button
                              type="button"
                              onClick={() => toggleMedianWin(week, t2.rosterId)}
                              className={`px-2 py-1.5 rounded text-[10px] font-bold border transition ${
                                t2Median
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                                  : "bg-slate-900 text-slate-500 border-slate-800"
                              }`}
                            >
                              +1 Med
                            </button>
                          )}
                        </div>
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