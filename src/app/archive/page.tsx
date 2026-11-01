import type { Metadata } from "next";
import ArchiveListClient from "@/components/ArchiveListClient";
import BackLink from "@/components/BackLink";
import SiteFooter from "@/components/SiteFooter";
import { allGrids } from "@/lib/grids";

export const metadata: Metadata = {
  title: "Archive · CarGrid.fun",
  description: "Replay past CarGrid puzzles.",
};

export default function ArchivePage() {
  // Pass only what the list renders — the client filters to past dates.
  const grids = allGrids.map(({ id, date, rows, columns }) => ({ id, date, rows, columns }));

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-6">
      <div className="mb-6 w-full max-w-lg">
        <BackLink fallback="/" label="Back" />
      </div>

      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl uppercase tracking-tight text-ink">Archive</h1>
        <div className="checker-rule mx-auto mt-3 w-28" />
        <p className="mt-3 text-sm text-ink-dim">Every past grid, replayable.</p>
      </div>

      <div className="w-full max-w-lg">
        <ArchiveListClient grids={grids} />
      </div>

      <SiteFooter current="archive" />
    </main>
  );
}
