// components/Navbar.tsx
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
        <Link href="/" className="text-xl font-extrabold text-amber-500">
          Dynasty Hub
        </Link>
        <div className="flex flex-wrap items-center space-x-6 text-sm font-medium text-slate-300">
          <Link href="/" className="hover:text-amber-400 transition">Standings</Link>
          <Link href="/matchups" className="hover:text-amber-400 transition">Matchups</Link>
          <Link href="/playoffs" className="hover:text-amber-400 transition">Playoffs</Link>
          <Link href="/press-conference" className="hover:text-amber-400 transition">Press Room</Link>
          <Link href="/draft-capital" className="hover:text-amber-400 transition">Draft Capital</Link>
          <Link href="/trades" className="hover:text-amber-400 transition">Trade Feed</Link>
          <Link href="/managers" className="hover:text-amber-400 transition">Managers</Link>
          <Link href="/records" className="hover:text-amber-400 transition">Record Book</Link>
          <Link href="/trophies" className="hover:text-amber-400 transition">Trophy Case</Link>
          <Link href="/analytics/age-production" className="hover:text-amber-400 transition">Age Matrix</Link>
          <Link href="/constitution" className="hover:text-amber-400 transition">Constitution</Link>
        </div>
      </div>
    </nav>
  );
}