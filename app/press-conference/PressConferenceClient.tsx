"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, PressPost } from "@/lib/supabase";

interface Team {
  rosterId: number;
  name: string;
  avatar: string;
}

interface Props {
  teams: Team[];
  initialPosts: PressPost[];
}

export default function PressConferenceClient({ teams, initialPosts }: Props) {
  const router = useRouter();
  const [posts, setPosts] = useState<PressPost[]>(initialPosts);
  const [selectedRosterId, setSelectedRosterId] = useState<number>(teams[0]?.rosterId || 1);
  const [category, setCategory] = useState<"Post-Game" | "Trash Talk" | "Trade Block">("Post-Game");
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTeam = teams.find((t) => t.rosterId === selectedRosterId) || teams[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headline.trim() || !content.trim()) return;

    setIsSubmitting(true);

    const newPost = {
      roster_id: selectedRosterId,
      manager_name: selectedTeam.name,
      category,
      headline,
      content,
    };

    const { data, error } = await supabase
      .from("press_conferences")
      .insert([newPost])
      .select();

    if (error) {
      console.error("Error submitting post to Supabase:", error);
      alert(`Submission failed: ${error.message}`);
    } else if (data) {
      setPosts([data[0] as PressPost, ...posts]);
      setHeadline("");
      setContent("");
      router.refresh(); // Refresh Next.js server state
    }

    setIsSubmitting(false);
  };

  const getCategoryBadge = (cat: string) => {
    if (cat === "Trade Block") {
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    }
    if (cat === "Trash Talk") {
      return "bg-red-500/20 text-red-300 border-red-500/40";
    }
    return "bg-amber-500/20 text-amber-300 border-amber-500/40";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 h-fit">
        <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-3">
          Take the Podium
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Select Manager
            </label>
            <select
              value={selectedRosterId}
              onChange={(e) => setSelectedRosterId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {teams.map((t) => (
                <option key={t.rosterId} value={t.rosterId}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="Post-Game">Post-Game Quote</option>
              <option value="Trash Talk">Trash Talk</option>
              <option value="Trade Block">Trade Block Alert</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Headline
            </label>
            <input
              type="text"
              placeholder="e.g., 'We executed our gameplan perfectly'"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
              Statement
            </label>
            <textarea
              rows={4}
              placeholder="Type statement here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded transition disabled:opacity-50"
          >
            {isSubmitting ? "Publishing..." : "Publish Statement"}
          </button>
        </form>
      </div>

      {/* Feed */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Recent Press Releases</h2>

        {posts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
            No press releases published yet. Be the first manager to speak to the media!
          </div>
        ) : (
          posts.map((post) => {
            const authorTeam = teams.find((t) => t.rosterId === post.roster_id);

            return (
              <div
                key={post.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 shadow-md"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center space-x-3">
                    {authorTeam && (
                      <img
                        src={authorTeam.avatar}
                        alt=""
                        className="w-10 h-10 rounded-full border border-amber-500 object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-slate-100">{post.manager_name}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${getCategoryBadge(
                      post.category
                    )}`}
                  >
                    {post.category}
                  </span>
                </div>

                <div className="pt-2">
                  <h4 className="text-lg font-extrabold text-amber-400">"{post.headline}"</h4>
                  <p className="text-slate-300 text-sm mt-2 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}