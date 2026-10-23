import type { Metadata } from "next";
import Link from "next/link";
import ArchiveListClient from "@/components/ArchiveListClient";
import { allGrids } from "@/lib/grids";

export const metadata: Metadata = {
  title: "Archive · CarGrid.fun",
  description: "Replay past CarGrid puzzles.",
};

export default function ArchivePage() {
  // Pass only what the list renders — the client filters to past dates.
  const grids = allGrids.map(({ id, date, rows, columns }) => ({ id, date, rows, columns }));

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-950 px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Archive</h1>
        <p className="mt-1 text-sm text-gray-400">Every past grid, replayable.</p>
      </div>

      <div className="w-full max-w-lg">
        <ArchiveListClient grids={grids} />
      </div>

      <nav className="mt-8 flex gap-4 text-xs text-gray-500">
        <Link href="/" className="hover:text-amber-400">
          Today&apos;s grid
        </Link>
        <Link href="/credits" className="hover:text-amber-400">
          Image credits
        </Link>
      </nav>
    </main>
  );
}
