// app/constitution/page.tsx
const RULES = [
  { category: "Dues & Payouts", content: "$100/year due prior to rookie draft. 1st: $800, 2nd: $300, 3rd: $100." },
  { category: "Rookie Draft", content: "3-round linear draft based on Optimum Points Possible (Max PF) for non-playoff teams." },
  { category: "Trade Deadline", content: "Week 11 kickoff. No offseason trade restrictions once dues are paid." },
];

export default function ConstitutionPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-amber-500">League Constitution</h1>
        <div className="space-y-4">
          {RULES.map((rule) => (
            <div key={rule.category} className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <h2 className="text-xl font-bold text-amber-400 mb-2">{rule.category}</h2>
              <p className="text-slate-300 leading-relaxed">{rule.content}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}