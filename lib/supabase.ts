// lib/supabase.ts
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