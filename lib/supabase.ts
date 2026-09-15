import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface PressPost {
  id: string;
  created_at: string;
  roster_id: number;
  manager_name: string;
  category: "Post-Game" | "Trash Talk" | "Trade Block";
  headline: string;
  content: string;
}

export interface WeeklyReport {
  id: string;
  created_at: string;
  league_id: string;
  week: number;
  report_type: "recap" | "preview";
  content: string;
}

export interface ManagerProfile {
  id?: string;
  roster_id: number;
  owner_id: string;
  manager_name: string;
  personality_trait?: string;
  bio?: string;
  rival_roster_id?: number;
}

/**
 * Retrieves an archived AI weekly recap or preview from Supabase.
 */
export async function getWeeklyReportFromDb(
  week: number,
  reportType: "recap" | "preview" = "recap"
): Promise<WeeklyReport | null> {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId || !supabaseUrl) return null;

  try {
    const { data, error } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("league_id", leagueId)
      .eq("week", week)
      .eq("report_type", reportType)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn("Supabase query error for weekly report:", error.message);
      return null;
    }

    return data as WeeklyReport | null;
  } catch (err) {
    console.error("Error fetching weekly report from DB:", err);
    return null;
  }
}

/**
 * Saves or updates a generated AI weekly recap/preview in Supabase.
 */
export async function saveWeeklyReportToDb(report: {
  week: number;
  report_type: "recap" | "preview";
  content: string;
}): Promise<WeeklyReport | null> {
  const leagueId = process.env.NEXT_PUBLIC_SLEEPER_LEAGUE_ID;
  if (!leagueId || !supabaseUrl) return null;

  try {
    const payload = {
      league_id: leagueId,
      week: report.week,
      report_type: report.report_type,
      content: report.content,
    };

    const { data, error } = await supabase
      .from("weekly_reports")
      .upsert(payload, { onConflict: "league_id,week,report_type" })
      .select()
      .single();

    if (error) {
      console.error("Failed to save weekly report to Supabase:", error.message);
      return null;
    }

    return data as WeeklyReport;
  } catch (err) {
    console.error("Error saving weekly report:", err);
    return null;
  }
}

/**
 * Fetches all custom manager profiles and personality traits.
 */
export async function getManagerProfiles(): Promise<Record<string, string>> {
  if (!supabaseUrl) return {};

  try {
    const { data, error } = await supabase
      .from("manager_profiles")
      .select("manager_name, personality_trait");

    if (error || !data) return {};

    const personalityMap: Record<string, string> = {};
    data.forEach((row) => {
      if (row.manager_name && row.personality_trait) {
        personalityMap[row.manager_name] = row.personality_trait;
      }
    });

    return personalityMap;
  } catch (err) {
    console.error("Error loading manager profiles:", err);
    return {};
  }
}

/**
 * Fetches press conference posts.
 */
export async function getPressPosts(): Promise<PressPost[]> {
  if (!supabaseUrl) return [];

  try {
    const { data, error } = await supabase
      .from("press_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching press posts:", error.message);
      return [];
    }

    return data as PressPost[];
  } catch (err) {
    console.error("Error in getPressPosts:", err);
    return [];
  }
}

/**
 * Saves a new press conference post.
 */
export async function createPressPost(
  post: Omit<PressPost, "id" | "created_at">
): Promise<PressPost | null> {
  if (!supabaseUrl) return null;

  try {
    const { data, error } = await supabase
      .from("press_posts")
      .insert([post])
      .select()
      .single();

    if (error) {
      console.error("Error creating press post:", error.message);
      return null;
    }

    return data as PressPost;
  } catch (err) {
    console.error("Error in createPressPost:", err);
    return null;
  }
}