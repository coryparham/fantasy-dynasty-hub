// lib/sleeper.ts

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

export async function getLeagueData() {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId) throw new Error("NEXT_PUBLIC_SLEEPER_LEAGUE_ID is not set");

  const [leagueRes, usersRes, rostersRes] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { next: { revalidate: 3600 } }),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { next: { revalidate: 3600 } }),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { next: { revalidate: 3600 } }),
  ]);

  const league = await leagueRes.json();
  const users = await usersRes.json();
  const rosters = await rostersRes.json();

  const userMap: Record<string, { name: string; avatar: string }> = {};
  users.forEach((u: any) => {
    const teamName = u.metadata?.team_name || u.display_name || "Unknown Team";
    const avatar = u.avatar
      ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}`
      : "https://sleepercdn.com/images/v2/owners/guy_select.png";
    userMap[u.user_id] = { name: teamName, avatar };
  });

  const teams: Team[] = rosters.map((r: any) => {
    const owner = userMap[r.owner_id] || {
      name: `Team ${r.roster_id}`,
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
      pointsFor: Number(`${r.settings?.fpts || 0}.${r.settings?.fpts_decimal || 0}`),
      players: r.players || [],
    };
  });

  return { league, teams };
}

export async function getDraftPicks() {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId) return [];

  try {
    const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/traded_picks`, {
      next: { revalidate: 3600 },
    });
    return await res.json();
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
      const leagueRes = await fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}`, {
        next: { revalidate: 86400 },
      });
      if (!leagueRes.ok) break;
      const league = await leagueRes.json();

      const [usersRes, rostersRes, winnersRes] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/users`, { next: { revalidate: 86400 } }),
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/rosters`, { next: { revalidate: 86400 } }),
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/winners_bracket`, { next: { revalidate: 86400 } }),
      ]);

      const users = await usersRes.json();
      const rosters = await rostersRes.json();
      const winnersBracket = await winnersRes.json();

      const userMap: Record<string, { name: string; avatar: string }> = {};
      users.forEach((u: any) => {
        const teamName = u.metadata?.team_name || u.display_name || "Unknown Team";
        const avatar = u.avatar
          ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}`
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
      console.error(`Error resolving historical season ${currentLeagueId}:`, err);
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
      const leagueRes = await fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}`, {
        next: { revalidate: 86400 },
      });
      if (!leagueRes.ok) break;
      const league = await leagueRes.json();

      const [usersRes, rostersRes] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/users`, { next: { revalidate: 86400 } }),
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/rosters`, { next: { revalidate: 86400 } }),
      ]);

      const users = await usersRes.json();
      const rosters = await rostersRes.json();

      const userMap: Record<string, { name: string; avatar: string }> = {};
      users.forEach((u: any) => {
        const name = u.metadata?.team_name || u.display_name || "Unknown";
        const avatar = u.avatar
          ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}`
          : "https://sleepercdn.com/images/v2/owners/guy_select.png";
        userMap[u.user_id] = { name, avatar };
      });

      const rosterMap: Record<number, { ownerId: string; name: string; avatar: string }> = {};
      
      rosters.forEach((r: any) => {
        const ownerId = r.owner_id || `roster_${r.roster_id}`;
        const ownerInfo = userMap[r.owner_id] || { name: `Team ${r.roster_id}`, avatar: "https://sleepercdn.com/images/v2/owners/guy_select.png" };
        
        rosterMap[r.roster_id] = { ownerId, name: ownerInfo.name, avatar: ownerInfo.avatar };

        const wins = r.settings?.wins || 0;
        const losses = r.settings?.losses || 0;
        const ties = r.settings?.ties || 0;
        const pointsFor = Number(`${r.settings?.fpts || 0}.${r.settings?.fpts_decimal || 0}`);

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
          fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/matchups/${w}`, { next: { revalidate: 86400 } }).then((res) =>
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
      console.error(`Error processing records for league ${currentLeagueId}:`, err);
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