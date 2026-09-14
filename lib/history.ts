// lib/history.ts
const BASE_URL = "https://api.sleeper.app/v1";

export interface SeasonHistory {
  leagueId: string;
  season: string;
  name: string;
  users: any[];
  rosters: any[];
}

export async function getHistoricalData(): Promise<SeasonHistory[]> {
  const currentLeagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!currentLeagueId) return [];

  const seasons: SeasonHistory[] = [];
  let leagueId: string | null = currentLeagueId;
  let depth = 0;

  // Walk backward through past seasons up to 10 years
  while (leagueId && depth < 10) {
    try {
      const leagueRes: Response = await fetch(`${BASE_URL}/league/${leagueId}`, { next: { revalidate: 86400 } });
      const usersRes: Response = await fetch(`${BASE_URL}/league/${leagueId}/users`, { next: { revalidate: 86400 } });
      const rostersRes: Response = await fetch(`${BASE_URL}/league/${leagueId}/rosters`, { next: { revalidate: 86400 } });

      const league: any = await leagueRes.json();
      if (!league || league === "null" || !league.season) break;

      const users: any = await usersRes.json();
      const rosters: any = await rostersRes.json();

      seasons.push({
        leagueId,
        season: league.season,
        name: league.name,
        users: Array.isArray(users) ? users : [],
        rosters: Array.isArray(rosters) ? rosters : [],
      });

      leagueId = league.previous_league_id || null;
      depth++;
    } catch (error) {
      console.error("Error fetching historical season:", error);
      break;
    }
  }

  return seasons;
}