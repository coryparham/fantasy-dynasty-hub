// lib/history.ts
const BASE_URL = "https://api.sleeper.app/v1";

export async function getAllSeasons(currentLeagueId: string) {
  const seasons = [];
  let leagueId: string | null = currentLeagueId;

  while (leagueId) {
    const res = await fetch(`${BASE_URL}/league/${leagueId}`);
    const data = await res.json();
    if (!data || data === "null") break;

    seasons.push(data);
    leagueId = data.previous_league_id || null; // Move to previous year
  }

  return seasons; // Returns array of all past league objects [2026, 2025, 2024...]
}