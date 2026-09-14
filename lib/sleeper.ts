// Add to lib/sleeper.ts

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

export async function getLeagueHistory(): Promise<HistoricalSeason[]> {
  const history: HistoricalSeason[] = [];
  let currentLeagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;

  while (currentLeagueId) {
    try {
      // 1. Fetch league details
      const leagueRes = await fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}`, {
        next: { revalidate: 86400 },
      });
      if (!leagueRes.ok) break;
      const league = await leagueRes.json();

      // 2. Fetch users and rosters for this historical season
      const [usersRes, rostersRes, winnersRes] = await Promise.all([
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/users`, { next: { revalidate: 86400 } }),
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/rosters`, { next: { revalidate: 86400 } }),
        fetch(`https://api.sleeper.app/v1/league/${currentLeagueId}/winners_bracket`, { next: { revalidate: 86400 } }),
      ]);

      const users = await usersRes.json();
      const rosters = await rostersRes.json();
      const winnersBracket = await winnersRes.json();

      // Map owner_id -> team display name & avatar
      const userMap: Record<string, { name: string; avatar: string }> = {};
      users.forEach((u: any) => {
        const teamName = u.metadata?.team_name || u.display_name || "Unknown Team";
        const avatar = u.avatar
          ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}`
          : "https://sleepercdn.com/images/v2/owners/guy_select.png";
        userMap[u.user_id] = { name: teamName, avatar };
      });

      // Map roster_id -> owner details
      const rosterMap: Record<number, { name: string; avatar: string }> = {};
      rosters.forEach((r: any) => {
        if (r.owner_id && userMap[r.owner_id]) {
          rosterMap[r.roster_id] = userMap[r.owner_id];
        }
      });

      // Identify Champion (#1 match winner) and Runner-up
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

      // Trace back to the prior year's league ID
      currentLeagueId = league.previous_league_id || null;
    } catch (err) {
      console.error(`Error resolving historical season ${currentLeagueId}:`, err);
      break;
    }
  }

  return history;
}