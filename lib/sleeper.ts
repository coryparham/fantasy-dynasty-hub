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