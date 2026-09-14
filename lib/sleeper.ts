// lib/sleeper.ts

const LEAGUE_ID = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
const BASE_URL = "https://api.sleeper.app/v1";

export interface Team {
  rosterId: number;
  ownerId: string;
  name: string;
  avatar: string;
  wins: number;
  losses: number;
  pointsFor: number;
  players: string[];
}

export async function getLeagueData() {
  const [leagueRes, usersRes, rostersRes] = await Promise.all([
    fetch(`${BASE_URL}/league/${LEAGUE_ID}`, { next: { revalidate: 3600 } }),
    fetch(`${BASE_URL}/league/${LEAGUE_ID}/users`, { next: { revalidate: 3600 } }),
    fetch(`${BASE_URL}/league/${LEAGUE_ID}/rosters`, { next: { revalidate: 3600 } })
  ]);

  const league = await leagueRes.json();
  const users = await usersRes.json();
  const rosters = await rostersRes.json();

  const teams: Team[] = rosters.map((roster: any) => {
    const user = users.find((u: any) => u.user_id === roster.owner_id);
    const avatar = user?.avatar 
      ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}`
      : "https://sleepercdn.com/images/v2/owners/guy_select.png";

    return {
      rosterId: roster.roster_id,
      ownerId: roster.owner_id,
      name: user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`,
      avatar,
      wins: roster.settings.wins,
      losses: roster.settings.losses,
      pointsFor: roster.settings.fpts + (roster.settings.fpts_decimal || 0) / 100,
      players: roster.players || [],
    };
  });

  return { league, teams };
}

export async function getDraftPicks() {
  const [rostersRes, usersRes, picksRes] = await Promise.all([
    fetch(`${BASE_URL}/league/${LEAGUE_ID}/rosters`, { next: { revalidate: 3600 } }),
    fetch(`${BASE_URL}/league/${LEAGUE_ID}/users`, { next: { revalidate: 3600 } }),
    fetch(`${BASE_URL}/league/${LEAGUE_ID}/traded_picks`, { next: { revalidate: 3600 } })
  ]);

  const rosters = await rostersRes.json();
  const users = await usersRes.json();
  const tradedPicks = await picksRes.json();

  return { rosters, users, tradedPicks };
}