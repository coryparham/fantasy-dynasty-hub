"use client";

import { useState, useEffect } from "react";
import { getWeeklyMatchups, WeeklyMatchupPair } from "@/lib/sleeper";
import { getWeeklyReportFromDb, saveWeeklyReportToDb, getManagerProfiles } from "@/lib/supabase";

export default function WeeklyReportPage() {
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [reportType, setReportType] = useState<"recap" | "preview">("recap");
  const [matchups, setMatchups] = useState<WeeklyMatchupPair[]>([]);
  const [reportContent, setReportContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    async function loadWeekData() {
      setIsLoading(true);
      setErrorMsg("");
      setReportContent("");

      try {
        // 1. Check Supabase DB for an existing saved report
        const existingReport = await getWeeklyReportFromDb(selectedWeek, reportType);
        if (existingReport && existingReport.content) {
          setReportContent(existingReport.content);
        }

        // 2. Fetch live Sleeper matchup data for context
        const weeklyData = await getWeeklyMatchups(selectedWeek);
        setMatchups(weeklyData);
      } catch (err) {
        console.error("Error loading week data:", err);
        setErrorMsg("Failed to load matchup data for this week.");
      } finally {
        setIsLoading(false);
      }
    }

    loadWeekData();
  }, [selectedWeek, reportType]);

  const handleGenerateReport = async () => {
    if (matchups.length === 0) {
      setErrorMsg("No matchup data available for this week to generate a report.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg("");

    try {
      // Fetch custom manager personality traits from Supabase
      const managerPersonalities = await getManagerProfiles();

      const response = await fetch("/api/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week: selectedWeek,
          reportType,
          matchups,
          managerPersonalities,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to generate AI report.");
      }

      const generatedHtml = data.content || data.recap;
      setReportContent(generatedHtml);

      // Save generated report to Supabase for future fast loading
      await saveWeeklyReportToDb({
        week: selectedWeek,
        report_type: reportType,
        content: generatedHtml,
      });
    } catch (err: any) {
      console.error("Error generating report:", err);
      setErrorMsg(err.message || "An unexpected error occurred while contacting AI.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>🎙️</span> League AI Breakdown
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Automated banter, awards, and strategic insights powered by Gemini.
          </p>
        </div>

        {/* Mode Switcher: Recap vs Preview */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setReportType("recap")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              reportType === "recap"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🏆 Weekly Recap
          </button>
          <button
            onClick={() => setReportType("preview")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              reportType === "preview"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            🔮 Matchup Preview
          </button>
        </div>
      </div>

      {/* Controls Bar: Week Selector & Action Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <label htmlFor="week-select" className="text-sm font-medium text-slate-300">
            Select Week:
          </label>
          <select
            id="week-select"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 text-amber-400 font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 text-sm"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>
                Week {w}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing League Data...
            </>
          ) : (
            <>
              <span>⚡</span> {reportContent ? "Regenerate AI Report" : "Generate AI Report"}
            </>
          )}
        </button>
      </div>

      {/* Error Notification */}
      {errorMsg && (
        <div className="bg-red-950/50 border border-red-800/80 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <span>⚠️</span> {errorMsg}
        </div>
      )}

      {/* Content Display Area */}
      {isLoading ? (
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center text-slate-400">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-6 w-48 bg-slate-800 rounded"></div>
            <div className="h-4 w-64 bg-slate-800/60 rounded"></div>
          </div>
          <p className="mt-4 text-xs text-slate-500">Loading Week {selectedWeek} matchups...</p>
        </div>
      ) : reportContent ? (
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-xl">
          {/* Render AI Raw HTML */}
          <div
            className="prose prose-invert max-w-none 
              prose-h2:text-2xl prose-h2:font-bold prose-h2:text-amber-400 prose-h2:border-b prose-h2:border-slate-800 prose-h2:pb-2 prose-h2:mt-6 prose-h2:mb-3
              prose-h3:text-lg prose-h3:font-semibold prose-h3:text-slate-200 prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
              prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-1 prose-li:text-slate-300"
            dangerouslySetInnerHTML={{ __html: reportContent }}
          />
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-12 text-center space-y-4">
          <div className="text-4xl">🤖</div>
          <h3 className="text-xl font-bold text-slate-200">No report generated for Week {selectedWeek}</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Click the <strong className="text-amber-400">"Generate AI Report"</strong> button above to have Gemini craft a detailed {reportType} for this week.
          </p>
        </div>
      )}

      {/* Quick Matchups Context Bar */}
      {matchups.length > 0 && (
        <div className="space-y-3 pt-4">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-400">
            Week {selectedWeek} Matchups Context ({reportType === "preview" ? "Official Sleeper Projections" : "Actual Scores"})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchups.map((m) => (
              <div
                key={m.matchupId}
                className="bg-slate-900/50 border border-slate-800/80 p-3 rounded-xl text-xs flex justify-between items-center"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-200">{m.homeTeam.teamName}</p>
                  <p className="text-slate-400">
                    {reportType === "preview" && m.homeTeam.projectedPoints !== undefined
                      ? `${m.homeTeam.projectedPoints.toFixed(2)} proj pts`
                      : `${m.homeTeam.points.toFixed(2)} pts`}
                  </p>
                </div>
                <span className="text-slate-600 font-bold px-2">VS</span>
                <div className="space-y-1 text-right">
                  <p className="font-semibold text-slate-200">{m.awayTeam.teamName}</p>
                  <p className="text-slate-400">
                    {reportType === "preview" && m.awayTeam.projectedPoints !== undefined
                      ? `${m.awayTeam.projectedPoints.toFixed(2)} proj pts`
                      : `${m.awayTeam.points.toFixed(2)} pts`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}