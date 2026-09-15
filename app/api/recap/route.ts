import { NextResponse } from "next/server";

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
}

export interface MatchupPair {
  matchupId: number;
  homeTeam: TeamMatchupDetail;
  awayTeam: TeamMatchupDetail;
  margin?: number;
}

export interface ReportRequestBody {
  week: number;
  leagueId?: string;
  reportType?: "recap" | "preview";
  matchups: MatchupPair[];
  managerPersonalities?: Record<string, string>;
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

    // Fraud of the week: Winner with lowest score
    if (winnerPts < lowestWinnerPts) {
      lowestWinnerPts = winnerPts;
      fraudWinner = winner;
    }

    // Heartbreak award: Loser with highest score
    if (loserPts > highestLoserPts) {
      highestLoserPts = loserPts;
      heartbreakLoser = loser;
    }

    // Bench blunder: Highest bench points left unstarted
    const homeBench = Number(m.homeTeam.benchPoints) || 0;
    const awayBench = Number(m.awayTeam.benchPoints) || 0;

    if (homeBench > highestBenchPts) {
      highestBenchPts = homeBench;
      benchBlunderTeam = m.homeTeam;
    }
    if (awayBench > highestBenchPts) {
      highestBenchPts = awayBench;
      benchBlunderTeam = m.awayTeam;
    }

    // Game of the week: Smallest margin of victory
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
    benchBlunderPts: (benchBlunderTeam as TeamMatchupDetail).benchPoints || 0,
    gotwHome: (gotwMatchup as MatchupPair).homeTeam,
    gotwAway: (gotwMatchup as MatchupPair).awayTeam,
    gotwMargin: Number(smallestMargin.toFixed(2)),
  };
}

function buildRecapPrompt(
  week: number,
  matchups: MatchupPair[],
  personalities?: Record<string, string>
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

      const winnerPersona = personalities?.[winner.teamName] || winner.personalityTrait || "Competitor";
      const loserPersona = personalities?.[loser.teamName] || loser.personalityTrait || "Competitor";

      return `Matchup ${idx + 1} of ${totalMatchups}:
- Winner: ${winner.teamName} (${(winner.points || 0).toFixed(2)} pts | Starters: ${(winner.starterPoints || 0).toFixed(2)} | Bench: ${(winner.benchPoints || 0).toFixed(2)}) [Persona: ${winnerPersona}]
- Loser: ${loser.teamName} (${(loser.points || 0).toFixed(2)} pts | Starters: ${(loser.starterPoints || 0).toFixed(2)} | Bench: ${(loser.benchPoints || 0).toFixed(2)}) [Persona: ${loserPersona}]
- Margin: ${margin} points`;
    })
    .join("\n\n");

  const highlightsSection = highlights
    ? `PRE-CALCULATED AWARD WINNERS FOR WEEK ${week}:
- Fraud of the Week: ${highlights.fraudWinner.teamName} (${highlights.fraudPts.toFixed(2)} pts in a win)
- Heartbreak Award: ${highlights.heartbreakLoser.teamName} (${highlights.heartbreakPts.toFixed(2)} pts in a loss)
- Bench Blunder: ${highlights.benchBlunderTeam.teamName} (${highlights.benchBlunderPts.toFixed(2)} bench pts)
- Game of the Week: ${highlights.gotwHome.teamName} vs ${highlights.gotwAway.teamName} (Margin: ${highlights.gotwMargin} pts)`
    : "";

  return `Write the official Week ${week} Dynasty Fantasy Football League Recap.

${highlightsSection}

DATA FOR ALL ${totalMatchups} WEEK ${week} MATCHUPS:
${formattedMatchups}

CRITICAL: You MUST output all ${totalMatchups} matchups in order. Keep each game write-up to 3 to 4 punchy, analytical sentences so that every game is completed without truncating.

MANDATORY OUTPUT STRUCTURE (MUST OUTPUT ONLY CLEAN HTML WITH TAILWIND CSS):

SECTION 1: HERO HEADER
<div class="mb-6 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 shadow-md">
  <h2 class="text-2xl font-black text-white tracking-tight mb-2">🏈 Week ${week} Breakdown: [Witty Catchy Headline]</h2>
  <p class="text-slate-300 text-sm leading-relaxed">[2 sharp sentences setting up the general league mood and story]</p>
</div>

SECTION 2: WEEKLY HONORS & BADGES GRID
<div class="mb-8">
  <h3 class="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">🏆 Weekly Honors & Badges</h3>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
      <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
        <span>🤡</span> <span>Fraud of the Week</span>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">${highlights ? highlights.fraudWinner.teamName : "[Fraud Winner]"}</h4>
      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences roasting why they got lucky or scored low despite winning]</p>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
      <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
        <span>💔</span> <span>Heartbreak Award</span>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">${highlights ? highlights.heartbreakLoser.teamName : "[Heartbreak Loser]"}</h4>
      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences lamenting their tough-luck loss despite putting up big points]</p>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
      <div class="flex items-center gap-2 text-yellow-400 font-bold text-sm mb-1">
        <span>🪵</span> <span>Bench Blunder of the Week</span>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">${highlights ? highlights.benchBlunderTeam.teamName : "[Bench Blunder Team]"}</h4>
      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences roasting the manager for leaving points on the pine]</p>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
      <div class="flex items-center gap-2 text-indigo-400 font-bold text-sm mb-1">
        <span>⚔️</span> <span>Game of the Week</span>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">${highlights ? `${highlights.gotwHome.teamName} vs ${highlights.gotwAway.teamName}` : "[Winner vs Loser]"}</h4>
      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences recapping the most chaotic or razor-thin matchup]</p>
    </div>

  </div>
</div>

SECTION 3: MATCHUP CARDS
Render ALL ${totalMatchups} matchups in order. Wrap them in a single container:

<h3 class="text-xl font-bold text-indigo-400 mb-4 flex items-center gap-2">⚔️ Matchup Breakdown (${totalMatchups} Games)</h3>
<div class="space-y-4">
  <!-- Repeat EXACTLY ${totalMatchups} times for each game: -->
  <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
      <div class="flex items-center gap-2 text-sm font-semibold">
        <span class="text-emerald-400 font-bold">[Winner Name]</span>
        <span class="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 rounded">[Winner Points]</span>
        <span class="text-xs text-slate-500 font-normal">def.</span>
        <span class="text-slate-300">[Loser Name]</span>
        <span class="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-400 rounded">[Loser Points]</span>
      </div>
      <span class="text-xs font-semibold uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Margin: [Margin] pts</span>
    </div>
    <p class="text-amber-300 font-medium italic text-xs mb-1.5">"[Punchy witty one-liner roasting or praising the result]"</p>
    <p class="text-slate-300 text-xs leading-relaxed">[3 to 4 concise sentences analyzing why the winner prevailed, key starter performances, bench points left unstarted, and managerial lineup decisions.]</p>
  </div>
</div>`;
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

      return `Matchup ${idx + 1} of ${totalMatchups}:
- Home: ${home.teamName} (${homePersona}) | Sleeper Projected: ${homeProj} pts
- Away: ${away.teamName} (${awayPersona}) | Sleeper Projected: ${awayProj} pts`;
    })
    .join("\n\n");

  return `Write the official Week ${week} Dynasty Fantasy Football League Matchup Preview based on these official Sleeper projected scores:

${formattedMatchups}

IMPORTANT: You MUST complete ALL ${totalMatchups} MATCHUPS without truncating. Keep each lookahead to 3 to 4 crisp sentences.

MANDATORY OUTPUT STRUCTURE (MUST OUTPUT ONLY CLEAN HTML WITH TAILWIND CSS):

SECTION 1: HERO HEADER
<div class="mb-6 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 border border-slate-700/80 shadow-md">
  <h2 class="text-2xl font-black text-white tracking-tight mb-2">🔮 Week ${week} Matchup Preview: [Witty Catchy Headline]</h2>
  <p class="text-slate-300 text-sm leading-relaxed">[2 sharp sentences setting up the upcoming week and projection storylines]</p>
</div>

SECTION 2: SPOTLIGHT & LOCK OF THE WEEK GRID
<div class="mb-8">
  <h3 class="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">⭐ Week ${week} Spotlight & Predictions</h3>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
      <div class="flex items-center gap-2 text-amber-400 font-bold text-sm mb-1">
        <span>🔥</span> <span>Headliner Clash</span>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">[Team A vs Team B]</h4>
      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences highlighting the marquee matchup on the slate]</p>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
      <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
        <span>🔒</span> <span>Lock of the Week</span>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">[Projected Winner Name]</h4>
      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences explaining why this team has the safest path to victory]</p>
    </div>

    <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30">
      <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
        <span>⚠️</span> <span>Upset Alert</span>
      </div>
      <h4 class="text-base font-semibold text-white mb-1">[Underdog Team Name]</h4>
      <p class="text-xs text-slate-300 leading-relaxed">[2 sentences analyzing how an underdog could shock their opponent this week]</p>
    </div>

  </div>
</div>

SECTION 3: MATCHUP LOOKAHEAD CARDS
Render ALL ${totalMatchups} matchups in order. Wrap them in a single container:

<h3 class="text-xl font-bold text-amber-400 mb-4 flex items-center gap-2">🔮 Matchup Lookaheads (${totalMatchups} Games)</h3>
<div class="space-y-4">
  <!-- Repeat EXACTLY ${totalMatchups} times for each game: -->
  <div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
    <div class="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
      <div class="flex items-center gap-2 text-sm font-semibold">
        <span class="text-white font-bold">[Home Team Name]</span>
        <span class="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/10 text-amber-400 rounded">[Home Projected Pts] proj</span>
        <span class="text-xs text-slate-500 font-normal">VS</span>
        <span class="text-slate-300">[Away Team Name]</span>
        <span class="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-400 rounded">[Away Projected Pts] proj</span>
      </div>
      <span class="text-xs font-semibold uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">Proj Margin: [Margin] pts</span>
    </div>
    <p class="text-amber-300 font-medium italic text-xs mb-1.5">"[Witty punchy one-liner setting up this upcoming battle]"</p>
    <p class="text-slate-300 text-xs leading-relaxed">[3 to 4 sentence breakdown analyzing positional matchups, projected x-factors, key sleeper/bust risks, line swings, and predicted winner.]</p>
  </div>
</div>`;
}

export function GET() {
  return NextResponse.json({
    message: "Recap API endpoint active. Send a POST request with week and matchups data.",
  });
}

export async function POST(req: Request) {
  try {
    const body: ReportRequestBody = await req.json();
    const { week, reportType = "recap", matchups, managerPersonalities } = body;

    // Validate request payload
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

    const prompt =
      reportType === "preview"
        ? buildPreviewPrompt(week, matchups, managerPersonalities)
        : buildRecapPrompt(week, matchups, managerPersonalities);

    const validCount = matchups.filter((m) => m && m.homeTeam && m.awayTeam).length;

    const systemInstructionText =
      reportType === "preview"
        ? `You are an opinionated, hilarious fantasy football analyst. Output ONLY raw HTML with Tailwind CSS. Never output markdown code blocks. You MUST generate Section 1 (Hero Header), Section 2 (Spotlight & Predictions Grid), and Section 3 (All ${validCount} Matchup Lookahead Cards) with concise 3-4 sentence game write-ups without truncating.`
        : `You are an opinionated, hilarious fantasy football analyst. Output ONLY raw HTML with Tailwind CSS. Never output markdown code blocks. You MUST generate Section 1 (Hero Header), Section 2 (Weekly Honors & Badges Grid), and Section 3 (All ${validCount} Matchup Breakdown Cards) with concise 3-4 sentence game recaps without truncating.`;

    // Updated candidate models list with active Gemini 3 Flash models
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
        const geminiEndpoint = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`;

        try {
          const response = await fetch(geminiEndpoint, {
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
                maxOutputTokens: 8192,
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
        { error: `Gemini API request failed: ${combinedErrorSummary}` },
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
      { error: `Internal server error generating report: ${error.message || error}` },
      { status: 500 }
    );
  }
}