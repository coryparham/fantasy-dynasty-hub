export interface Team {
  rosterId: number;
  ownerId: string;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  players: string[];
}

export interface HistoricalSeason {
  season: string;
  leagueId: string;
  champion: {
    name: string;
    avatar: string;
  } | null;
  runnerUp: {
    name: string;
    avatar: string;
  } | null;
}

export interface GameRecord {
  winnerName: string;
  winnerAvatar: string;
  loserName: string;
  loserAvatar: string;
  winnerPoints: number;
  loserPoints: number;
  margin: number;
  season: string;
  week: number;
}

export interface AllTimeManagerStats {
  ownerId: string;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  winPct: number;
  seasons: number;
}

export interface AllTimeRecordsResult {
  leaderboard: AllTimeManagerStats[];
  highestSingleGameScore: { name: string; avatar: string; points: number; season: string; week: number };
  lowestSingleGameScore: { name: string; avatar: string; points: number; season: string; week: number } | null;
  biggestBlowout: GameRecord | null;
  closestMatchup: GameRecord | null;
  highestSeasonPoints: { name: string; avatar: string; points: number; season: string };
  highestSeasonWins: { name: string; avatar: string; wins: number; season: string };
}

export interface Player {
  id: string;
  name: string;
  position: string;
  team: string;
  age: number;
}

// lib/sleeper.ts

export interface TradedPick {
  season: string;
  round: number;
  roster_id: number;
  owner_id: number;
  previous_owner_id?: number;
  originalOwnerName?: string;
}

export interface TradeTransaction {
  id: string;
  timestamp: number;
  rosterIds: number[];
  adds: Record<string, number>;
  drops: Record<string, number>;
  draftPicks: {
    season: string;
    round: number;
    roster_id: number;
    owner_id: number;
    previous_owner_id: number;
  }[];
  waiverBudget: {
    sender: number;
    receiver: number;
    amount: number;
  }[];
}

export interface WaiverTransaction {
  id: string;
  timestamp: number;
  rosterId: number;
  addedPlayerId: string | null;
  droppedPlayerId: string | null;
  bid: number;
  status: string;
}

export interface TeamMatchupDetail {
  rosterId: number;
  teamName: string;
  ownerName?: string;
  points: number;
  projectedPoints?: number;
  starterPoints: number;
  benchPoints: number;
  starters: string[];
  bench: string[];
  optimalLineupPoints?: number;
  dynastyValueRank?: number;
  personalityTrait?: string;
}

export interface WeeklyMatchupPair {
  matchupId: number;
  homeTeam: TeamMatchupDetail;
  awayTeam: TeamMatchupDetail;
  margin: number;
}

export async function getLeagueData() {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId) throw new Error("NEXT_PUBLIC_SLEEPER_LEAGUE_ID is not set");

  const [leagueRes, usersRes, rostersRes] = await Promise.all([
    fetch("https://api.sleeper.app/v1/league/" + leagueId, { next: { revalidate: 3600 } }),
    fetch("https://api.sleeper.app/v1/league/" + leagueId + "/users", { next: { revalidate: 3600 } }),
    fetch("https://api.sleeper.app/v1/league/" + leagueId + "/rosters", { next: { revalidate: 3600 } }),
  ]);

  if (!leagueRes.ok || !usersRes.ok || !rostersRes.ok) {
    throw new Error("Failed to fetch league data from Sleeper API");
  }

  const league = await leagueRes.json();
  const users = await usersRes.json();
  const rosters = await rostersRes.json();

  const userMap: Record<string, { name: string; avatar: string }> = {};
  users.forEach((u: any) => {
    const teamName = u.metadata?.team_name || u.display_name || "Unknown Team";
    const avatar = u.avatar
      ? "https://sleepercdn.com/avatars/thumbs/" + u.avatar
      : "https://sleepercdn.com/images/v2/owners/guy_select.png";
    userMap[u.user_id] = { name: teamName, avatar };
  });

  const teams: Team[] = rosters.map((r: any) => {
    const owner = userMap[r.owner_id] || {
      name: "Team " + r.roster_id,
      avatar: "https://sleepercdn.com/images/v2/owners/guy_select.png",
    };

    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      name: owner.name,
      avatar: owner.avatar,
      wins: r.settings?.wins || 0,
      losses: r.settings?.losses || 0,
      ties: r.settings?.ties || 0,
      pointsFor: Number((r.settings?.fpts || 0) + "." + (r.settings?.fpts_decimal || 0)),
      players: r.players || [],
    };
  });

  return { league, teams };
}

export async function getWeeklyMatchups(week: number): Promise<WeeklyMatchupPair[]> {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId) return [];

  try {
    const [matchupsRes, { league, teams }] = await Promise.all([
      fetch("https://api.sleeper.app/v1/league/" + leagueId + "/matchups/" + week, {
        next: { revalidate: 300 },
      }),
      getLeagueData(),
    ]);

    if (!matchupsRes.ok) return [];
    const matchupsRaw = await matchupsRes.json();
    const season = league?.season || "2026";

    let projectionsMap: Record<string, number> = {};
    try {
      const projRes = await fetch(
        `https://api.sleeper.app/v1/projections/nfl/regular/${season}/${week}`,
        { next: { revalidate: 3600 } }
      );
      if (projRes.ok) {
        const projData = await projRes.json();
        if (Array.isArray(projData)) {
          projData.forEach((p: any) => {
            if (p?.player_id && p?.stats) {
              const pts = p.stats.pts_ppr ?? p.stats.pts_half_ppr ?? p.stats.pts_std ?? 0;
              projectionsMap[p.player_id] = pts;
            }
          });
        } else if (typeof projData === "object" && projData !== null) {
          Object.entries(projData).forEach(([pid, p]: [string, any]) => {
            if (p?.stats) {
              const pts = p.stats.pts_ppr ?? p.stats.pts_half_ppr ?? p.stats.pts_std ?? 0;
              projectionsMap[pid] = pts;
            }
          });
        }
      }
    } catch (projErr) {
      console.warn("Could not fetch Sleeper projections:", projErr);
    }

    const teamMap = new Map(teams.map((t) => [t.rosterId, t]));
    const matchupGroups: Record<number, any[]> = {};

    matchupsRaw.forEach((m: any) => {
      if (m.matchup_id) {
        if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
        matchupGroups[m.matchup_id].push(m);
      }
    });

    const matchupPairs: WeeklyMatchupPair[] = [];

    Object.entries(matchupGroups).forEach(([matchupIdStr, pair]) => {
      if (pair.length < 2) return;

      const formatTeamDetail = (m: any): TeamMatchupDetail => {
        const team = teamMap.get(m.roster_id);
        const starters: string[] = m.starters || [];
        const starterPoints = (m.starters_points || []).reduce((a: number, b: number) => a + (b || 0), 0);
        
        const allPlayers: string[] = m.players || [];
        const bench = allPlayers.filter((p: string) => !starters.includes(p));
        
        const playersPointsMap: Record<string, number> = m.players_points || {};
        const benchPoints = bench.reduce((sum, pId) => sum + (playersPointsMap[pId] || 0), 0);

        let projectedPoints = starters.reduce((sum, pid) => sum + (projectionsMap[pid] || 0), 0);

        if (projectedPoints === 0 && starterPoints > 0) {
          projectedPoints = starterPoints;
        }

        return {
          rosterId: m.roster_id,
          teamName: team?.name || "Team " + m.roster_id,
          ownerName: team?.name,
          points: m.points || 0,
          projectedPoints: Number(projectedPoints.toFixed(2)),
          starterPoints: Number(starterPoints.toFixed(2)),
          benchPoints: Number(benchPoints.toFixed(2)),
          starters,
          bench,
        };
      };

      const home = formatTeamDetail(pair[0]);
      const away = formatTeamDetail(pair[1]);
      const margin = Number(Math.abs(home.points - away.points).toFixed(2));

      matchupPairs.push({
        matchupId: Number(matchupIdStr),
        homeTeam: home,
        awayTeam: away,
        margin,
      });
    });

    return matchupPairs;
  } catch (err) {
    console.error("Error fetching matchups for week " + week + ":", err);
    return [];
  }
}

export async function getDraftPicks(): Promise<TradedPick[]> {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId) return [];

  try {
    const [picksRes, { teams }] = await Promise.all([
      fetch("https://api.sleeper.app/v1/league/" + leagueId + "/traded_picks", {
        next: { revalidate: 3600 },
      }),
      getLeagueData(),
    ]);

    if (!picksRes.ok) return [];
    const rawPicks = await picksRes.json();

    const teamMap = new Map<number, string>();
    teams.forEach((team) => teamMap.set(team.rosterId, team.name));

    return rawPicks.map((pick: any) => ({
      ...pick,
      originalOwnerName: teamMap.get(pick.roster_id) || `Team ${pick.roster_id}`,
      ownerName: teamMap.get(pick.owner_id) || `Team ${pick.owner_id}`,
      previousOwnerName: teamMap.get(pick.previous_owner_id) || `Team ${pick.previous_owner_id}`,
    }));
  } catch (err) {
    console.error("Error fetching draft picks:", err);
    return [];
  }
}

export async function getLeagueHistory(): Promise<HistoricalSeason[]> {
  const history: HistoricalSeason[] = [];
  let currentLeagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;

  while (currentLeagueId) {
    try {
      const leagueRes = await fetch("https://api.sleeper.app/v1/league/" + currentLeagueId, {
        next: { revalidate: 86400 },
      });
      if (!leagueRes.ok) break;
      const league = await leagueRes.json();

      const [usersRes, rostersRes, winnersRes] = await Promise.all([
        fetch("https://api.sleeper.app/v1/league/" + currentLeagueId + "/users", { next: { revalidate: 86400 } }),
        fetch("https://api.sleeper.app/v1/league/" + currentLeagueId + "/rosters", { next: { revalidate: 86400 } }),
        fetch("https://api.sleeper.app/v1/league/" + currentLeagueId + "/winners_bracket", { next: { revalidate: 86400 } }),
      ]);

      if (!usersRes.ok || !rostersRes.ok || !winnersRes.ok) break;

      const users = await usersRes.json();
      const rosters = await rostersRes.json();
      const winnersBracket = await winnersRes.json();

      const userMap: Record<string, { name: string; avatar: string }> = {};
      users.forEach((u: any) => {
        const teamName = u.metadata?.team_name || u.display_name || "Unknown Team";
        const avatar = u.avatar
          ? "https://sleepercdn.com/avatars/thumbs/" + u.avatar
          : "https://sleepercdn.com/images/v2/owners/guy_select.png";
        userMap[u.user_id] = { name: teamName, avatar };
      });

      const rosterMap: Record<number, { name: string; avatar: string }> = {};
      rosters.forEach((r: any) => {
        if (r.owner_id && userMap[r.owner_id]) {
          rosterMap[r.roster_id] = userMap[r.owner_id];
        }
      });

      let champion = null;
      let runnerUp = null;
      if (Array.isArray(winnersBracket) && winnersBracket.length > 0) {
        const championshipGame = winnersBracket.find((m: any) => m.p === 1 || m.r === 3);
        if (championshipGame) {
          const champRosterId = championshipGame.w;
          const runnerRosterId = championshipGame.l;

          if (champRosterId && rosterMap[champRosterId]) champion = rosterMap[champRosterId];
          if (runnerRosterId && rosterMap[runnerRosterId]) runnerUp = rosterMap[runnerRosterId];
        }
      }

      history.push({
        season: league.season,
        leagueId: currentLeagueId,
        champion,
        runnerUp,
      });

      currentLeagueId = league.previous_league_id || null;
    } catch (err) {
      console.error("Error resolving historical season " + currentLeagueId + ":", err);
      break;
    }
  }

  return history;
}

export async function getAllTimeRecords(): Promise<AllTimeRecordsResult> {
  let currentLeagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;

  const allTimeStats: Record<string, AllTimeManagerStats> = {};
  
  let highestSingleGameScore = { name: "", avatar: "", points: 0, season: "", week: 0 };
  let lowestSingleGameScore = { name: "", avatar: "", points: 9999, season: "", week: 0 };
  let biggestBlowout: GameRecord | null = null;
  let closestMatchup: GameRecord | null = null;
  
  let highestSeasonPoints = { name: "", avatar: "", points: 0, season: "" };
  let highestSeasonWins = { name: "", avatar: "", wins: 0, season: "" };

  while (currentLeagueId) {
    try {
      const leagueRes = await fetch("https://api.sleeper.app/v1/league/" + currentLeagueId, {
        next: { revalidate: 86400 },
      });
      if (!leagueRes.ok) break;
      const league = await leagueRes.json();

      const [usersRes, rostersRes] = await Promise.all([
        fetch("https://api.sleeper.app/v1/league/" + currentLeagueId + "/users", { next: { revalidate: 86400 } }),
        fetch("https://api.sleeper.app/v1/league/" + currentLeagueId + "/rosters", { next: { revalidate: 86400 } }),
      ]);

      if (!usersRes.ok || !rostersRes.ok) break;

      const users = await usersRes.json();
      const rosters = await rostersRes.json();

      const userMap: Record<string, { name: string; avatar: string }> = {};
      users.forEach((u: any) => {
        const name = u.metadata?.team_name || u.display_name || "Unknown";
        const avatar = u.avatar
          ? "https://sleepercdn.com/avatars/thumbs/" + u.avatar
          : "https://sleepercdn.com/images/v2/owners/guy_select.png";
        userMap[u.user_id] = { name, avatar };
      });

      const rosterMap: Record<number, { ownerId: string; name: string; avatar: string }> = {};
      
      rosters.forEach((r: any) => {
        const ownerId = r.owner_id || "roster_" + r.roster_id;
        const ownerInfo = userMap[r.owner_id] || { name: "Team " + r.roster_id, avatar: "https://sleepercdn.com/images/v2/owners/guy_select.png" };
        
        rosterMap[r.roster_id] = { ownerId, name: ownerInfo.name, avatar: ownerInfo.avatar };

        const wins = r.settings?.wins || 0;
        const losses = r.settings?.losses || 0;
        const ties = r.settings?.ties || 0;
        const pointsFor = Number((r.settings?.fpts || 0) + "." + (r.settings?.fpts_decimal || 0));

        if (pointsFor > highestSeasonPoints.points) {
          highestSeasonPoints = { name: ownerInfo.name, avatar: ownerInfo.avatar, points: pointsFor, season: league.season };
        }
        if (wins > highestSeasonWins.wins) {
          highestSeasonWins = { name: ownerInfo.name, avatar: ownerInfo.avatar, wins, season: league.season };
        }

        if (!allTimeStats[ownerId]) {
          allTimeStats[ownerId] = {
            ownerId,
            name: ownerInfo.name,
            avatar: ownerInfo.avatar,
            wins: 0,
            losses: 0,
            ties: 0,
            pointsFor: 0,
            winPct: 0,
            seasons: 0,
          };
        }
        allTimeStats[ownerId].wins += wins;
        allTimeStats[ownerId].losses += losses;
        allTimeStats[ownerId].ties += ties;
        allTimeStats[ownerId].pointsFor += pointsFor;
        allTimeStats[ownerId].seasons += 1;
        allTimeStats[ownerId].name = ownerInfo.name;
        allTimeStats[ownerId].avatar = ownerInfo.avatar;
      });

      const playStartWeek = league.settings?.playoff_week_start || 15;
      const weekPromises = [];
      for (let w = 1; w < playStartWeek; w++) {
        weekPromises.push(
          fetch("https://api.sleeper.app/v1/league/" + currentLeagueId + "/matchups/" + w, { next: { revalidate: 86400 } }).then((res) =>
            res.ok ? res.json().then((data) => ({ week: w, data })) : null
          )
        );
      }

      const weekResults = await Promise.all(weekPromises);

      weekResults.forEach((weekObj) => {
        if (!weekObj || !Array.isArray(weekObj.data)) return;
        const { week, data: matchups } = weekObj;

        const matchupGroups: Record<number, any[]> = {};
        matchups.forEach((m: any) => {
          if (m.matchup_id) {
            if (!matchupGroups[m.matchup_id]) matchupGroups[m.matchup_id] = [];
            matchupGroups[m.matchup_id].push(m);
          }

          const owner = rosterMap[m.roster_id];
          if (owner && m.points > 0) {
            if (m.points > highestSingleGameScore.points) {
              highestSingleGameScore = { name: owner.name, avatar: owner.avatar, points: m.points, season: league.season, week };
            }
            if (m.points < lowestSingleGameScore.points) {
              lowestSingleGameScore = { name: owner.name, avatar: owner.avatar, points: m.points, season: league.season, week };
            }
          }
        });

        Object.values(matchupGroups).forEach((pair) => {
          if (pair.length === 2) {
            const [teamA, teamB] = pair;
            const ownerA = rosterMap[teamA.roster_id];
            const ownerB = rosterMap[teamB.roster_id];

            if (ownerA && ownerB && teamA.points > 0 && teamB.points > 0) {
              const diff = Math.abs(teamA.points - teamB.points);
              const winner = teamA.points >= teamB.points ? { owner: ownerA, pts: teamA.points } : { owner: ownerB, pts: teamB.points };
              const loser = teamA.points < teamB.points ? { owner: ownerA, pts: teamA.points } : { owner: ownerB, pts: teamB.points };

              const gameRec: GameRecord = {
                winnerName: winner.owner.name,
                winnerAvatar: winner.owner.avatar,
                loserName: loser.owner.name,
                loserAvatar: loser.owner.avatar,
                winnerPoints: winner.pts,
                loserPoints: loser.pts,
                margin: Number(diff.toFixed(2)),
                season: league.season,
                week,
              };

              if (!biggestBlowout || gameRec.margin > biggestBlowout.margin) {
                biggestBlowout = gameRec;
              }
              if (!closestMatchup || (gameRec.margin < closestMatchup.margin && gameRec.margin > 0)) {
                closestMatchup = gameRec;
              }
            }
          }
        });
      });

      currentLeagueId = league.previous_league_id || null;
    } catch (err) {
      console.error("Error processing records for league " + currentLeagueId + ":", err);
      break;
    }
  }

  const leaderboard = Object.values(allTimeStats).map((m) => {
    const totalGames = m.wins + m.losses + m.ties;
    const winPct = totalGames > 0 ? (m.wins / totalGames) * 100 : 0;
    return { ...m, winPct };
  });

  return {
    leaderboard: leaderboard.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor),
    highestSingleGameScore,
    lowestSingleGameScore: lowestSingleGameScore.points === 9999 ? null : lowestSingleGameScore,
    biggestBlowout,
    closestMatchup,
    highestSeasonPoints,
    highestSeasonWins,
  };
}

let cachedPlayers: Record<string, Player> | null = null;

export async function getPlayerMap(): Promise<Record<string, Player>> {
  if (cachedPlayers) return cachedPlayers;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch("https://api.sleeper.app/v1/players/nfl", {
      signal: controller.signal,
      next: { revalidate: 86400 },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.error(`Sleeper Players API returned status: ${res.status}`);
      return {};
    }

    const rawData = await res.json();
    const playerMap: Record<string, Player> = {};

    Object.keys(rawData).forEach((id) => {
      const p = rawData[id];
      const cleanId = String(id).trim();

      const pos = (
        p.position || 
        (p.fantasy_positions && p.fantasy_positions[0]) || 
        ""
      ).toUpperCase();

      const fullName = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();

      if (fullName) {
        playerMap[cleanId] = {
          id: cleanId,
          name: fullName,
          position: pos,
          team: p.team || "FA",
          age: p.age || 0,
        };
      }
    });

    cachedPlayers = playerMap;
    return playerMap;
  } catch (err) {
    console.error("Error fetching Sleeper player database:", err);
    return {};
  }
}

export async function getTransactions(): Promise<{ trades: TradeTransaction[]; waivers: WaiverTransaction[] }> {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId) return { trades: [], waivers: [] };

  const trades: TradeTransaction[] = [];
  const waivers: WaiverTransaction[] = [];

  const weekPromises = [];
  for (let w = 1; w <= 18; w++) {
    weekPromises.push(
      fetch("https://api.sleeper.app/v1/league/" + leagueId + "/transactions/" + w, {
        next: { revalidate: 1800 },
      }).then((res) => (res.ok ? res.json() : []))
    );
  }

  const results = await Promise.all(weekPromises);

  results.flat().forEach((t: any) => {
    if (t.status !== "complete") return;

    if (t.type === "trade") {
      trades.push({
        id: t.transaction_id,
        timestamp: t.status_updated,
        rosterIds: t.roster_ids || [],
        adds: t.adds || {},
        drops: t.drops || {},
        draftPicks: t.draft_picks || [],
        waiverBudget: t.waiver_budget || [],
      });
    } else if (t.type === "waiver") {
      const addedKeys = Object.keys(t.adds || {});
      const droppedKeys = Object.keys(t.drops || {});
      waivers.push({
        id: t.transaction_id,
        timestamp: t.status_updated,
        rosterId: t.roster_ids?.[0],
        addedPlayerId: addedKeys[0] || null,
        droppedPlayerId: droppedKeys[0] || null,
        bid: t.settings?.waiver_bid || 0,
        status: t.status,
      });
    }
  });

  return {
    trades: trades.sort((a, b) => b.timestamp - a.timestamp),
    waivers: waivers.sort((a, b) => b.timestamp - a.timestamp),
  };
}