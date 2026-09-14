// app/press-conference/page.tsx
import { getLeagueData } from "@/lib/sleeper";
import { supabase, PressPost } from "@/lib/supabase";
import PressConferenceClient from "./PressConferenceClient";

// Disable Next.js static caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PressConferencePage() {
  const { teams } = await getLeagueData();

  // Fetch past posts from Supabase
  const { data: posts, error } = await supabase
    .from("press_conferences")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch error:", error);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-amber-500">
            Manager Press Conferences
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Official post-game quotes, trade block announcements, and unfiltered league banter
          </p>
        </div>

        <PressConferenceClient
          teams={teams}
          initialPosts={(posts as PressPost[]) || []}
        />
      </div>
    </main>
  );
}