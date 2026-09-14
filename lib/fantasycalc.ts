// lib/fantasycalc.ts
export async function getDynastyValues() {
  const res = await fetch(
    "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&numTeams=12&ppr=1",
    { next: { revalidate: 86400 } } // Cache for 24 hours
  );
  const data = await res.json();
  
  // Map sleeperId -> trade value
  const valueMap: Record<string, number> = {};
  data.forEach((item: any) => {
    if (item.player?.sleeperId) {
      valueMap[item.player.sleeperId] = item.value;
    }
  });

  return valueMap;
}