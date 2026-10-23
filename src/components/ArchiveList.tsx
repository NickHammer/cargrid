"use client";

import { useState } from "react";
import Link from "next/link";
import type { GridLayout } from "@/lib/types";
import { localDateString, formatDisplayDate } from "@/lib/date";
import { peekGameState } from "@/lib/storage";
import { solvedCount } from "@/lib/game";

interface Props {
  /** Whole schedule; the client filters it down to dates already played out. */
  grids: Pick<GridLayout, "id" | "date" | "rows" | "columns">[];
}

interface Entry {
  grid: Props["grids"][number];
  solved: number | null;
}

export default function ArchiveList({ grids }: Props) {
  // Loaded with ssr:false (see ArchiveListClient), so localStorage and the
  // local date are available on first render.
  const [entries] = useState<Entry[]>(() => {
    const today = localDateString();
    return grids
      .filter((g) => g.date < today)
      .reverse()
      .map((grid) => {
        const saved = peekGameState(grid.date, grid.id);
        return { grid, solved: saved ? solvedCount(saved) : null };
      });
  });

  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        No archived grids yet — today&apos;s is the first one.
      </p>
    );
  }

  return (
    <ul className="flex w-full flex-col gap-2">
      {entries.map(({ grid, solved }) => (
        <li key={grid.date}>
          <Link
            href={`/archive/${grid.date}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 transition-colors hover:border-amber-500/60 hover:bg-gray-800"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{formatDisplayDate(grid.date)}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">
                {grid.rows.map((r) => r.label).join(" · ")} ×{" "}
                {grid.columns.map((c) => c.label).join(" · ")}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                solved === null
                  ? "bg-gray-800 text-gray-500"
                  : solved === 9
                  ? "bg-green-500/15 text-green-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {solved === null ? "Unplayed" : `${solved}/9`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
