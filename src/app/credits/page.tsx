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
  // how that condition is met.
  const rows = allCars
    .filter((car) => car.image_url && credits[car.id])
    .map((car) => ({ car, credit: credits[car.id] }))
    .sort((a, b) => `${a.car.make} ${a.car.model}`.localeCompare(`${b.car.make} ${b.car.model}`));

  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-950 px-4 py-8">
      <div className="mb-6 max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Image credits</h1>
        <p className="mt-2 text-sm text-gray-400">
          Every car photo comes from Wikimedia Commons under a free license. Each row links to
          the original file, which carries the full license text.
        </p>
      </div>

      <div className="w-full max-w-2xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <th className="py-2 pr-4 font-medium">Car</th>
              <th className="py-2 pr-4 font-medium">Photographer</th>
              <th className="py-2 font-medium">License</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ car, credit }) => (
              <tr key={car.id} className="border-b border-gray-900 align-top">
                <td className="py-2 pr-4 text-gray-200">
                  <a
                    href={credit.source}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-amber-400"
                  >
                    {car.make} {car.model}
                  </a>
                  <span className="ml-1 text-xs text-gray-600">
                    ({car.production_start}–{car.production_end ?? "now"})
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-400">{credit.artist}</td>
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
