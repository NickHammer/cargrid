import type { Metadata } from "next";
import Link from "next/link";
import { allCars } from "@/lib/cars";
import creditsData from "../../../data/image-credits.json";

export const metadata: Metadata = {
  title: "Image credits · CarGrid.fun",
  description: "Photographers and licenses for every car image used in CarGrid.",
};

interface Credit {
  file: string;
  article: string;
  matched: string;
  license: string;
  artist: string;
  source: string;
  verified?: boolean;
}

const credits = creditsData as Record<string, Credit>;

export default function CreditsPage() {
  // Most images are CC BY / CC BY-SA, which require attribution — this page is
  // how that condition is met. Sorted by photographer (not by car, and never
  // showing production years) so it reads as a licence-compliance list rather
  // than a browsable answer key for the grid.
  const rows = allCars
    .filter((car) => car.image_url && credits[car.id])
    .map((car) => ({ car, credit: credits[car.id] }))
    .sort((a, b) => {
      const byArtist = a.credit.artist.localeCompare(b.credit.artist);
      if (byArtist !== 0) return byArtist;
      // Tiebreak within the same photographer so repeat runs are stable.
      return `${a.car.make} ${a.car.model}`.localeCompare(`${b.car.make} ${b.car.model}`);
    });

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-950 px-4 py-8">
      <div className="mb-6 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Image credits</h1>
        <p className="mt-2 text-sm text-gray-400">
          Every car photo comes from Wikimedia Commons under a free license. Each row links to
          the original file, which carries the full license text.
        </p>
        <p className="mt-2 text-xs text-gray-500">
          This page exists solely to satisfy the attribution requirement of those licenses — it
          is not a car index, so it&apos;s sorted by photographer rather than by car.
        </p>
      </div>

      <div className="w-full max-w-2xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="py-2 pr-4 font-medium">Photographer</th>
              <th className="py-2 pr-4 font-medium">Source</th>
              <th className="py-2 font-medium">License</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ car, credit }) => (
              <tr key={car.id} className="border-b border-gray-900 align-top">
                <td className="py-2 pr-4 text-gray-200">{credit.artist}</td>
                <td className="py-2 pr-4 text-gray-400">
                  {/* Link text is the car, not the year — the licence requires identifying
                      the work, not the car's production span. */}
                  <a
                    href={credit.source}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-amber-400"
                  >
                    {car.make} {car.model}
                  </a>
                </td>
                <td className="py-2 text-gray-500">{credit.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-gray-600">{rows.length} images</p>

      <nav className="mt-8 flex gap-4 text-xs text-gray-500">
        <Link href="/" className="hover:text-amber-400">
          Today&apos;s grid
        </Link>
        <Link href="/archive" className="hover:text-amber-400">
          Archive
        </Link>
      </nav>
    </main>
  );
}
