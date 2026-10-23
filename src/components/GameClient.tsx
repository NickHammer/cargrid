"use client";

import dynamic from "next/dynamic";

/**
 * The game reads localStorage and the local clock during its first render, so
 * it must not be server-rendered — `ssr: false` lets the state live in a
 * useState initializer instead of a mount effect, which also rules out a
 * hydration mismatch on the date.
 */
const Game = dynamic(() => import("./Game"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="text-gray-400">Loading…</div>
    </div>
  ),
});

interface Props {
  date?: string;
  isArchive?: boolean;
}

export default function GameClient({ date, isArchive }: Props) {
  // Remount on date change so the archive routes reinitialise their state.
  return <Game key={date ?? "today"} date={date} isArchive={isArchive} />;
}
