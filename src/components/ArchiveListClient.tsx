"use client";

import dynamic from "next/dynamic";
import type { GridLayout } from "@/lib/types";

/** Client-only: the list reads localStorage and the local date on first render. */
const ArchiveList = dynamic(() => import("./ArchiveList"), {
  ssr: false,
  loading: () => <p className="py-12 text-center text-sm text-gray-500">Loading…</p>,
});

export default function ArchiveListClient({
  grids,
}: {
  grids: Pick<GridLayout, "id" | "date" | "rows" | "columns">[];
}) {
  return <ArchiveList grids={grids} />;
}
