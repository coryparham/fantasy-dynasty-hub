// lib/fantasycalc.ts
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
      if (item.player?.sleeperId) {
        valueMap[item.player.sleeperId] = item.value || 0;
      }
    });

    return valueMap;
  } catch (error) {
    console.error("Error fetching dynasty values:", error);
    return {};
  }
}