export async function getDynastyValues(): Promise<Record<string, number>> {
  try {
    // Query parameters: numQbs=2 (SuperFlex), numTeams=12, ppr=1 (Full PPR)
    const res = await fetch(
      "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=12&ppr=1",
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) return {};

    const data = await res.json();
    const valueMap: Record<string, number> = {};

    data.forEach((item: any) => {
      const val = item.value ?? 0;
      const player = item.player;

      if (!player) return;

      // 1. Map NFL players by Sleeper ID
      if (player.sleeperId) {
        valueMap[String(player.sleeperId)] = val;
      }

      // 2. Map draft picks by FantasyCalc draft info ({ year: 2027, round: 1 })
      if (player.maybeDraftInfo) {
        const { year, round } = player.maybeDraftInfo;
        if (year && round) {
          valueMap[`${year}_${round}`] = val;
        }
      }

      // 3. Map draft picks and players by lowercased name string ("2027 1st", "2027 mid 1st", etc.)
      if (player.name) {
        valueMap[player.name.toLowerCase().trim()] = val;
      }
    });

    return valueMap;
  } catch (error) {
    console.error("Error fetching dynasty values:", error);
    return {};
  }
}