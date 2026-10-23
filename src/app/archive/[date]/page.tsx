import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GameClient from "@/components/GameClient";
import { allGrids, getGridForDate } from "@/lib/grids";
import { formatDisplayDate } from "@/lib/date";

interface Props {
  params: Promise<{ date: string }>;
}

export function generateStaticParams() {
  return allGrids.map((g) => ({ date: g.date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `${formatDisplayDate(date)} · CarGrid.io`,
    description: `Replay the CarGrid puzzle from ${formatDisplayDate(date)}.`,
  };
}

export default async function ArchiveGridPage({ params }: Props) {
  const { date } = await params;
  // Whether the date is in the future depends on the player's local clock, so
  // the game component makes that call; the server only rejects unknown dates.
  if (!getGridForDate(date)) notFound();

  return <GameClient date={date} isArchive />;
}
