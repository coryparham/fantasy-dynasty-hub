import { NextResponse } from "next/server";
import { getHeadToHeadMatrix, getPlayerMap } from "@/lib/sleeper";

export interface PlayerScoreDetail {
  name: string;
  points: number;
  position?: string;
}

export interface PositionalBattle {
  position: string;
  homePoints: number;
  awayPoints: number;
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
  topScorer?: PlayerScoreDetail | string;
  biggestDud?: PlayerScoreDetail | string;
  playersPointsMap?: Record<string, number>;
  playerNamesMap?: Record<string, string>;
  positionalBreakdown?: Record<string, number>;
}

export interface MatchupPair {
  matchupId: number;
  homeTeam: TeamMatchupDetail;
  awayTeam: TeamMatchupDetail;
  margin?: number;
  h2hSummary?: string;
  positionalBattles?: PositionalBattle[];
}

export interface ReportRequestBody {
  week: number;
  leagueId?: string;
  reportType?: "recap" | "preview";
  matchups: MatchupPair[];
  managerPersonalities?: Record<string, string>;
  playerNamesMap?: Record<string, string>;
  forceRefresh?: boolean;
}

function cleanGeminiHtmlOutput(rawText: string): string {
  if (!rawText) return "";
  let cleaned = rawText
    .replace(/^```html\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  cleaned = cleaned
    .replace(/^(HTML tags\?|Checklist|Verification|Notes:).*$/gim, "")
    .trim();

  return cleaned;
}

interface ComputedHighlights {
  fraudWinner: TeamMatchupDetail;
  fraudPts: number;
  heartbreakLoser: TeamMatchupDetail;
  heartbreakPts: number;
  benchBlunderTeam: TeamMatchupDetail;
  benchBlunderPts: number;
  gotwHome: TeamMatchupDetail;
  gotwAway: TeamMatchupDetail;
  gotwMargin: number;
}

function computeWeeklyHighlights(matchups: MatchupPair[]): ComputedHighlights | null {
  if (!matchups || !Array.isArray(matchups) || matchups.length === 0) return null;

  let fraudWinner: TeamMatchupDetail | null = null;
  let lowestWinnerPts = Infinity;

  let heartbreakLoser: TeamMatchupDetail | null = null;
  let highestLoserPts = -1;

  let benchBlunderTeam: TeamMatchupDetail | null = null;
  let highestBenchPts = -1;

  let gotwMatchup: MatchupPair | null = null;
  let smallestMargin = Infinity;

  matchups.forEach((m) => {
    if (!m || !m.homeTeam || !m.awayTeam) return;

    const homePts = Number(m.homeTeam.points) || 0;
    const awayPts = Number(m.awayTeam.points) || 0;

    const winner = homePts >= awayPts ? m.homeTeam : m.awayTeam;
    const loser = homePts < awayPts ? m.homeTeam : m.awayTeam;
    const winnerPts = Math.max(homePts, awayPts);
    const loserPts = Math.min(homePts, awayPts);
    const margin = Math.abs(homePts - awayPts);

    if (winnerPts < lowestWinnerPts) {
      lowestWinnerPts = winnerPts;
      fraudWinner = winner;
    }

    if (loserPts > highestLoserPts) {
      highestLoserPts = loserPts;
      heartbreakLoser = loser;
    }

    const homeMissed = m.homeTeam.optimalLineupPoints && m.homeTeam.optimalLineupPoints > homePts
      ? m.homeTeam.optimalLineupPoints - homePts
      : Number(m.homeTeam.benchPoints) || 0;

    const awayMissed = m.awayTeam.optimalLineupPoints && m.awayTeam.optimalLineupPoints > awayPts
      ? m.awayTeam.optimalLineupPoints - awayPts
      : Number(m.awayTeam.benchPoints) || 0;

    if (homeMissed > highestBenchPts) {
      highestBenchPts = homeMissed;
      benchBlunderTeam = m.homeTeam;
    }
    if (awayMissed > highestBenchPts) {
      highestBenchPts = awayMissed;
      benchBlunderTeam = m.awayTeam;
    }

    if (margin < smallestMargin) {
      smallestMargin = margin;
      gotwMatchup = m;
    }
  });

  if (!fraudWinner || !heartbreakLoser || !benchBlunderTeam || !gotwMatchup) {
    return null;
  }

  return {
    fraudWinner,
    fraudPts: (fraudWinner as TeamMatchupDetail).points || 0,
    heartbreakLoser,
    heartbreakPts: (heartbreakLoser as TeamMatchupDetail).points || 0,
    benchBlunderTeam,
    benchBlunderPts: highestBenchPts,
    gotwHome: (gotwMatchup as MatchupPair).homeTeam,
    gotwAway: (gotwMatchup as MatchupPair).awayTeam,
    gotwMargin: Number(smallestMargin.toFixed(2)),
  };
}

function resolvePlayerDetail(
  player?: PlayerScoreDetail | string,
  playersMap?: Record<string, number>,
  starters?: string[],
  type: "top" | "dud" = "top",
  playerNamesMap?: Record<string, string>
): string {
  // Normalize playerNamesMap keys (e.g., "11646" -> "Jalen Coker")
  const normalizedNames: Record<string, string> = {};
  if (playerNamesMap) {
    Object.entries(playerNamesMap).forEach(([k, v]) => {
      normalizedNames[String(k).trim()] = String(v);
    });
  }

  // Normalize playersPointsMap keys
  const normalizedPoints: Record<string, number> = {};
  if (playersMap) {
    Object.entries(playersMap).forEach(([k, v]) => {
      normalizedPoints[String(k).trim()] = Number(v) || 0;
    });
  }

  // Check if player object already has a valid name
  if (player && typeof player === "object" && player.name && !player.name.startsWith("Player ")) {
    return player.name + " (" + player.points.toFixed(2) + " pts)";
  }

  // Find top scorer or biggest dud from starters array
  if (starters && starters.length > 0) {
    const normalizedStarters = starters.map((id) => String(id).trim());
    let targetId = normalizedStarters[0];
    let targetPts = normalizedPoints[targetId] ?? -999;

    normalizedStarters.forEach((pid) => {
      const pts = normalizedPoints[pid] ?? 0;
      if (type === "top" ? pts > targetPts : pts < targetPts) {
        targetPts = pts;
        targetId = pid;
      }
    });

    const matchedName = normalizedNames[targetId];
    if (matchedName && !matchedName.startsWith("Player ")) {
      return matchedName + " (" + targetPts.toFixed(2) + " pts)";
    }
  }

  if (typeof player === "string" && !player.startsWith("Player ")) {
    return player;
  }

  return "N/A";
}

function buildRecapPrompt(
  week: number,
  matchups: MatchupPair[],
  personalities?: Record<string, string>,
  globalPlayerNames?: Record<string, string>
): string {
  const highlights = computeWeeklyHighlights(matchups);
  const validMatchups = matchups.filter((m) => m && m.homeTeam && m.awayTeam);
  const totalMatchups = validMatchups.length;

  const formattedMatchups = validMatchups
    .map((m, idx) => {
      const home = m.homeTeam;
      const away = m.awayTeam;

      const homePts = Number(home.points) || 0;
      const awayPts = Number(away.points) || 0;
      const margin = Math.abs(homePts - awayPts).toFixed(2);
      const winner = homePts >= awayPts ? home : away;
      const loser = homePts < awayPts ? home : away;

      const winnerPts = Number(winner.points) || 0;
      const winnerOpt = winner.optimalLineupPoints || winnerPts;
      const winnerEff = winnerOpt > 0 ? Math.min(100, (winnerPts / winnerOpt) * 100).toFixed(1) : "100.0";
      const winnerMissedPts = Math.max(0, Number((winnerOpt - winnerPts).toFixed(2)));

      const loserPts = Number(loser.points) || 0;
      const loserOpt = loser.optimalLineupPoints || loserPts;
      const loserEff = loserOpt > 0 ? Math.min(100, (loserPts / loserOpt) * 100).toFixed(1) : "100.0";
      const loserMissedPts = Math.max(0, Number((loserOpt - loserPts).toFixed(2)));

      const winnerPersona = personalities?.[winner.teamName] || winner.personalityTrait || "Competitor";
      const loserPersona = personalities?.[loser.teamName] || loser.personalityTrait || "Competitor";

      const winnerNames = { ...(globalPlayerNames || {}), ...(winner.playerNamesMap || {}) };
      const loserNames = { ...(globalPlayerNames || {}), ...(loser.playerNamesMap || {}) };

      const winnerTop = resolvePlayerDetail(winner.topScorer, winner.playersPointsMap, winner.starters, "top", winnerNames);
      const winnerDud = resolvePlayerDetail(winner.biggestDud, winner.playersPointsMap, winner.starters, "dud", winnerNames);
      const loserTop = resolvePlayerDetail(loser.topScorer, loser.playersPointsMap, loser.starters, "top", loserNames);
      const loserDud = resolvePlayerDetail(loser.biggestDud, loser.playersPointsMap, loser.starters, "dud", loserNames);

      const h2hNote = m.h2hSummary ? " | All-Time H2H Series: " + m.h2hSummary : "";

      return "Matchup " + (idx + 1) + " of " + totalMatchups + ":\n" +
        "- Winner: " + winner.teamName + " (" + winnerPts.toFixed(2) + " pts | Optimal: " + winnerOpt.toFixed(2) + " | Lineup Efficiency: " + winnerEff + "% | Bench Pts Left Behind: " + winnerMissedPts + " | Top Scorer: " + winnerTop + " | Biggest Dud: " + winnerDud + ")" + h2hNote + " [Persona: " + winnerPersona + "]\n" +
        "- Loser: " + loser.teamName + " (" + loserPts.toFixed(2) + " pts | Optimal: " + loserOpt.toFixed(2) + " | Lineup Efficiency: " + loserEff + "% | Bench Pts Left Behind: " + loserMissedPts + " | Top Scorer: " + loserTop + " | Biggest Dud: " + loserDud + ") [Persona: " + loserPersona + "]\n" +
        "- Margin: " + margin + " points";
    })
    .join("\n\n");

  const highlightsSection = highlights
    ? "PRE-CALCULATED AWARD WINNERS FOR WEEK " + week + ":\n" +
      "- Fraud of the Week: " + highlights.fraudWinner.teamName + " (" + highlights.fraudPts.toFixed(2) + " pts in a win)\n" +
      "- Heartbreak Award: " + highlights.heartbreakLoser.teamName + " (" + highlights.heartbreakPts.toFixed(2) + " pts in a loss)\n" +
      "- Bench Blunder: " + highlights.benchBlunderTeam.teamName + " (" + highlights.benchBlunderPts.toFixed(2) + " pts left unstarted)\n" +
      "- Game of the Week: " + highlights.gotwHome.teamName + " vs " + highlights.gotwAway.teamName + " (Margin: " + highlights.gotwMargin + " pts)"
    : "";

  return "Write the official Week " + week + " Dynasty Fantasy Football League Recap.\n\n" +
    highlightsSection + "\n\n" +
    "DATA FOR ALL " + totalMatchups + " WEEK " + week + " MATCHUPS:\n" +
    formattedMatchups + "\n\n" +
    "BROADCAST TONE & FORMAT INSTRUCTIONS:\n" +
    "- **Tone:** High-energy ESPN broadcast style injected with witty fantasy trash-talk and clever manager banter.\n" +
    "- **One-Liner Requirement:** The sub-headline italic quote MUST be a hilarious, sharp, witty one-liner delivering prime trash-talk or a clever jab summarizing the outcome.\n" +
    "- **Length Requirement:** Write EXACTLY 8 to 10 rich, detailed sentences per matchup card breakdown. Deeply analyze top scorers, duds, positional showdowns, bench blunders, lineup efficiency, and historical head-to-head rivalry context.\n" +
    "- **Completeness:** You MUST generate all " + totalMatchups + " matchup cards completely without stopping mid-sentence.\n\n" +
    "MANDATORY OUTPUT STRUCTURE (MUST OUTPUT ONLY CLEAN HTML WITH TAILWIND CSS):\n\n" +
    "SECTION 1: HERO HEADER\n" +
    '<div class="mb-6 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 shadow-md">\n' +
    '  <h2 class="text-2xl font-black text-white tracking-tight mb-2">🏈 Week ' + week + ' Breakdown: [Witty, Spicy Broadcast Headline]</h2>\n' +
    '  <p class="text-slate-300 text-sm leading-relaxed">[2 sharp, banter-heavy sentences setting up the week\'s carnage and league storylines]</p>\n' +
    '</div>\n\n' +
    "SECTION 2: WEEKLY HONORS & BADGES GRID\n" +
    '<div class="mb-8">\n' +
    '  <h3 class="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">🏆 Weekly Honors & Badges</h3>\n' +
    '  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">\n\n' +
    '    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">\n' +
    '      <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">\n' +
    '        <span>🤡</span> <span>Fraud of the Week</span>\n' +
    '      </div>\n' +
    '      <h4 class="text-base font-semibold text-white mb-1">' + (highlights ? highlights.fraudWinner.teamName : "[Fraud Winner]") + '</h4>\n' +
    '      <p class="text-xs text-slate-300 leading-relaxed">[2 sharp, funny sentences roasting how they stumbled into an unearned victory]</p>\n' +
    '    </div>\n\n' +
    '    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">\n' +
    '      <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">\n' +
    '        <span>💔</span> <span>Heartbreak Award</span>\n' +
    '      </div>\n' +
    '      <h4 class="text-base font-semibold text-white mb-1">' + (highlights ? highlights.heartbreakLoser.teamName : "[Heartbreak Loser]") + '</h4>\n' +
    '      <p class="text-xs text-slate-300 leading-relaxed">[2 sympathetic yet witty sentences lamenting their brutal, high-scoring loss]</p>\n' +
    '    </div>\n\n' +
    '    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">\n' +
    '      <div class="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-1">\n' +
    '        <span>🪵</span> <span>Bench Blunder of the Week</span>\n' +
    '      </div>\n' +
    '      <h4 class="text-base font-semibold text-white mb-1">' + (highlights ? highlights.benchBlunderTeam.teamName : "[Bench Blunder Team]") + '</h4>\n' +
    '      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences mercilessly calling out the manager for sitting huge points on the bench]</p>\n' +
    '    </div>\n\n' +
    '    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">\n' +
    '      <div class="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-1">\n' +
    '        <span>⚔️</span> <span>Game of the Week</span>\n' +
    '      </div>\n' +
    '      <h4 class="text-base font-semibold text-white mb-1">' + (highlights ? (highlights.gotwHome.teamName + " vs " + highlights.gotwAway.teamName) : "[Winner vs Loser]") + '</h4>\n' +
    '      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences breaking down the most nail-biting, dramatic thriller on the slate]</p>\n' +
    '    </div>\n\n' +
    '  </div>\n' +
    '</div>\n\n' +
    "SECTION 3: MATCHUP CARDS\n" +
    "Render ALL " + totalMatchups + " matchups in order. Wrap them in a single container:\n\n" +
    '<h3 class="text-xl font-bold text-indigo-400 mb-4 flex items-center gap-2">⚔️ Matchup Breakdown (' + totalMatchups + ' Games)</h3>\n' +
    '<div class="space-y-4">\n' +
    '  <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">\n' +
    '    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">\n' +
    '      <div class="flex items-center gap-2 text-sm font-semibold">\n' +
    '        <span class="text-emerald-400 font-bold">[Winner Name]</span>\n' +
    '        <span class="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 rounded">[Winner Points]</span>\n' +
    '        <span class="text-xs text-slate-500 font-normal">def.</span>\n' +
    '        <span class="text-slate-300">[Loser Name]</span>\n' +
    '        <span class="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-400 rounded">[Loser Points]</span>\n' +
    '      </div>\n' +
    '      <span class="text-xs font-semibold uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Margin: [Margin] pts</span>\n' +
    '    </div>\n' +
    '    <p class="text-amber-300 font-medium italic text-xs mb-1.5">"[Exceptionally witty one-liner delivering prime trash-talk or a sharp punchline]"</p>\n' +
    '    <p class="text-slate-300 text-xs leading-relaxed">[8 to 10 engaging, banter-filled broadcast sentences blending top scorers, duds, positional battles, head-to-head history, efficiency, and light managerial roasts into a comprehensive game story.]</p>\n' +
    '  </div>\n' +
    '</div>';
}

function buildPreviewPrompt(
  week: number,
  matchups: MatchupPair[],
  personalities?: Record<string, string>
): string {
  const validMatchups = matchups.filter((m) => m && m.homeTeam && m.awayTeam);
  const totalMatchups = validMatchups.length;

  const formattedMatchups = validMatchups
    .map((m, idx) => {
      const home = m.homeTeam;
      const away = m.awayTeam;
      const homePersona = personalities?.[home.teamName] || home.personalityTrait || "Contender";
      const awayPersona = personalities?.[away.teamName] || away.personalityTrait || "Rebuilder";

      const homeProj = home.projectedPoints != null ? Number(home.projectedPoints).toFixed(2) : "N/A";
      const awayProj = away.projectedPoints != null ? Number(away.projectedPoints).toFixed(2) : "N/A";
      const h2hNote = m.h2hSummary ? " | All-Time H2H Series: " + m.h2hSummary : "";

      return "Matchup " + (idx + 1) + " of " + totalMatchups + ":\n" +
        "- Home: " + home.teamName + " (" + homePersona + ") | Sleeper Projected: " + homeProj + " pts\n" +
        "- Away: " + away.teamName + " (" + awayPersona + ") | Sleeper Projected: " + awayProj + " pts" + h2hNote;
    })
    .join("\n\n");

  return "Write the official Week " + week + " Dynasty Fantasy Football League Matchup Preview.\n\n" +
    formattedMatchups + "\n\n" +
    "BROADCAST TONE & FORMAT INSTRUCTIONS:\n" +
    "- **Tone:** ESPN Sunday Countdown preview style mixed with witty rivalry banter and trash-talk.\n" +
    "- **One-Liner Requirement:** The italicized sub-headline MUST be a witty, punchy trash-talk one-liner setting up the impending duel.\n" +
    "- **Length Requirement:** Write EXACTLY 8 to 10 detailed sentences per matchup lookahead card. Complete ALL " + totalMatchups + " matchups fully without truncating.\n\n" +
    "MANDATORY OUTPUT STRUCTURE (MUST OUTPUT ONLY CLEAN HTML WITH TAILWIND CSS):\n\n" +
    "SECTION 1: HERO HEADER\n" +
    '<div class="mb-6 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 border border-slate-700/80 shadow-md">\n' +
    '  <h2 class="text-2xl font-black text-white tracking-tight mb-2">🔮 Week ' + week + ' Matchup Preview: [Catchy, Banter-Filled Headline]</h2>\n' +
    '  <p class="text-slate-300 text-sm leading-relaxed">[2 sharp sentences setting up the upcoming week\'s high-stakes rivalries]</p>\n' +
    '</div>\n\n' +
    "SECTION 2: SPOTLIGHT & PREDICTIONS GRID\n" +
    '<div class="mb-8">\n' +
    '  <h3 class="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">⭐ Week ' + week + ' Spotlight & Predictions</h3>\n' +
    '  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">\n\n' +
    '    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">\n' +
    '      <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">\n' +
    '        <span>🔥</span> <span>Headliner Clash</span>\n' +
    '      </div>\n' +
    '      <h4 class="text-base font-semibold text-white mb-1">[Team A vs Team B]</h4>\n' +
    '      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences setting up the premier grudge match of the slate]</p>\n' +
    '    </div>\n\n' +
    '    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">\n' +
    '      <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">\n' +
    '        <span>🔒</span> <span>Lock of the Week</span>\n' +
    '      </div>\n' +
    '      <h4 class="text-base font-semibold text-white mb-1">[Projected Winner Name]</h4>\n' +
    '      <p class="text-xs text-slate-300 leading-relaxed">[2 witty sentences explaining why this favorite should walk away victorious]</p>\n' +
    '    </div>\n\n' +
    '    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">\n' +
    '      <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">\n' +
    '        <span>⚠️</span> <span>Upset Alert</span>\n' +
    '      </div>\n' +
    '      <h4 class="text-base font-semibold text-white mb-1">[Underdog Team Name]</h4>\n' +
    '      <p class="text-xs text-slate-300 leading-relaxed">[2 spicy sentences predicting how the underdog could shock their rival]</p>\n' +
    '    </div>\n\n' +
    '  </div>\n' +
    '</div>\n\n' +
    "SECTION 3: MATCHUP LOOKAHEAD CARDS\n" +
    "Render ALL " + totalMatchups + " matchups in order. Wrap them in a single container:\n\n" +
    '<h3 class="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">🔮 Matchup Lookaheads (' + totalMatchups + ' Games)</h3>\n' +
    '<div class="space-y-4">\n' +
    '  <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">\n' +
    '    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">\n' +
    '      <div class="flex items-center gap-2 text-sm font-semibold">\n' +
    '        <span class="text-white font-bold">[Home Team Name]</span>\n' +
    '        <span class="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/10 text-amber-400 rounded">[Home Projected Pts] proj</span>\n' +
    '        <span class="text-xs text-slate-500 font-normal">VS</span>\n' +
    '        <span class="text-slate-300">[Away Team Name]</span>\n' +
    '        <span class="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-400 rounded">[Away Projected Pts] proj</span>\n' +
    '      </div>\n' +
    '      <span class="text-xs font-semibold uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">Proj Margin: [Margin] pts</span>\n' +
    '    </div>\n' +
    '    <p class="text-amber-300 font-medium italic text-xs mb-1.5">"[Witty, punchy trash-talk one-liner setting up the impending duel]"</p>\n' +
    '    <p class="text-slate-300 text-xs leading-relaxed">[8 to 10 sharp, energetic lookahead sentences analyzing positional match-ups, projected x-factors, key sleeper/bust risks, head-to-head rivalry history, manager personas, and predicted outcomes.]</p>\n' +
    '  </div>\n' +
    '</div>';
}

export function GET() {
  return NextResponse.json({
    message: "Recap API endpoint active. Send a POST request with week and matchups data.",
  });
}

export async function POST(req: Request) {
  try {
    const body: ReportRequestBody = await req.json();
    const { week, reportType = "recap", matchups, managerPersonalities, playerNamesMap } = body;

    if (!week || !matchups || !Array.isArray(matchups) || matchups.length === 0) {
      return NextResponse.json(
        { error: "Invalid request payload. 'week' and non-empty 'matchups' array are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured in environment variables." },
        { status: 500 }
      );
    }

    // 1. Fetch Head-to-Head matrix and global player database
    const [h2hMatrix, playerMap] = await Promise.all([
      getHeadToHeadMatrix().catch(() => ({})),
      getPlayerMap().catch(() => ({})),
    ]);

    // 2. Enrich matchups with positional starter details and historical H2H records
    const enrichedMatchups = matchups.map((m: any) => {
      const homeOwnerId = m.homeTeam?.ownerId || m.homeTeam?.rosterId;
      const awayOwnerId = m.awayTeam?.ownerId || m.awayTeam?.rosterId;

      const h2h = h2hMatrix[homeOwnerId]?.[awayOwnerId];
      const headToHeadHistory = h2h
        ? `${m.homeTeam.teamName} leads series ${h2h.wins}-${h2h.losses}${h2h.ties ? `-${h2h.ties}` : ""}`
        : "No prior head-to-head match-ups on record";

      const mapStartersWithPositions = (team: any) => {
        if (!team?.starters || !Array.isArray(team.starters)) return [];
        return team.starters.map((id: string) => {
          const cleanId = String(id).trim();
          const pData = playerMap[cleanId];
          const name = team.playerNamesMap?.[cleanId] || playerNamesMap?.[cleanId] || pData?.name || `Player ${cleanId}`;
          const pos = pData?.position || "FLEX";
          const points = team.playersPointsMap?.[cleanId] ?? 0;
          return { position: pos, name, points };
        });
      };

      return {
        ...m,
        headToHeadHistory,
        homeTeam: {
          ...m.homeTeam,
          positionalStarters: mapStartersWithPositions(m.homeTeam),
        },
        awayTeam: {
          ...m.awayTeam,
          positionalStarters: mapStartersWithPositions(m.awayTeam),
        },
      };
    });

    const prompt =
      reportType === "preview"
        ? buildPreviewPrompt(week, enrichedMatchups, managerPersonalities)
        : buildRecapPrompt(week, enrichedMatchups, managerPersonalities, playerNamesMap);

    const validCount = enrichedMatchups.filter((m) => m && m.homeTeam && m.awayTeam).length;

// Define the general ESPN Sports Anchor broadcast persona
const espnAnchorPersona = 
  "You are an elite, high-octane ESPN SportsCenter anchor with a razor-sharp tongue covering a high-stakes dynasty fantasy league. " +
  "Your style mixes professional sports broadcast polish with ruthless league banter, witty roasting, and authentic fantasy trash-talk. " +
  "Treat each game like a main-stage televised highlight reel: call out bench blunders, roast managerial missteps, celebrate dominant flexes, and stir up historical rivalry tensions. " +
  "Output ONLY raw HTML with Tailwind CSS. Never output markdown code blocks. " +
  "STRICT RULE: Use ONLY exact player names provided in prompt data (e.g., 'Jalen Coker'). NEVER substitute or hallucinate player names.";

const systemInstructionText =
  reportType === "preview"
    ? `${espnAnchorPersona} You MUST complete ALL ${validCount} Matchup Lookahead Cards (8–10 rich, banter-filled sentences per card) without truncating. Always close all HTML tags.`
    : `${espnAnchorPersona} You MUST complete ALL ${validCount} Matchup Breakdown Cards (8–10 rich, banter-filled sentences per card) without truncating. Always close all HTML tags.`;
  
    const cleanApiKey = apiKey.replace(/[\r\n\s\t\f\v\u200B\u00A0'"]/g, "");

    const candidateModels = [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3-flash-preview",
      "gemini-1.5-flash",
    ];

    const apiVersions = ["v1beta", "v1"];
    const attemptedErrors: string[] = [];
    let isQuotaError = false;
    let rawContent = "";

    modelLoop: for (const model of candidateModels) {
      for (const apiVer of apiVersions) {
        try {
          const url = new URL(
            `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent`
          );
          url.searchParams.set("key", cleanApiKey);

          const response = await fetch(url.toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              systemInstruction: {
                parts: [
                  {
                    text: systemInstructionText,
                  },
                ],
              },
              contents: [
                {
                  parts: [{ text: prompt }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 32768,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (rawContent) {
              break modelLoop;
            }
          } else {
            const errorText = await response.text();
            let parsedMessage = errorText;
            try {
              const errObj = JSON.parse(errorText);
              parsedMessage = errObj.error?.message || errorText;
            } catch {}

            if (response.status === 429 || parsedMessage.toLowerCase().includes("quota exceeded")) {
              isQuotaError = true;
            }

            attemptedErrors.push(`[${model}/${apiVer}]: ${parsedMessage}`);
          }
        } catch (fetchErr: any) {
          attemptedErrors.push(`[${model}/${apiVer}]: ${fetchErr.message || "Network request failed"}`);
        }
      }
    }

    if (!rawContent) {
      if (isQuotaError) {
        return NextResponse.json(
          { error: "Gemini API rate limit or quota exceeded. Please wait 10–15 seconds and try again." },
          { status: 429 }
        );
      }

      const combinedErrorSummary = attemptedErrors.slice(0, 2).join(" | ");
      return NextResponse.json(
        { error: "Gemini API request failed: " + combinedErrorSummary },
        { status: 502 }
      );
    }

    const sanitizedHtml = cleanGeminiHtmlOutput(rawContent);

    return NextResponse.json({
      success: true,
      reportType,
      week,
      recap: sanitizedHtml,
      content: sanitizedHtml,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Error in recap API route:", error);
    return NextResponse.json(
      { error: "Internal server error generating report: " + (error.message || error) },
      { status: 500 }
    );
  }
}