import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import SiteFooter from "@/components/SiteFooter";
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
    <main className="flex min-h-screen flex-col items-center px-4 py-6">
      <div className="mb-6 w-full max-w-2xl">
        <BackLink fallback="/" label="Back" />
      </div>

      <div className="mb-6 max-w-2xl text-center">
        <h1 className="font-display text-4xl uppercase tracking-tight text-ink">Image credits</h1>
        <div className="checker-rule mx-auto mt-3 w-28" />
        <p className="mt-3 text-sm text-ink-dim">
          Every car photo comes from Wikimedia Commons under a free license. Each row links to
          the original file, which carries the full license text.
        </p>
        <p className="mt-2 text-xs text-ink-faint">
          This page exists solely to satisfy the attribution requirement of those licenses — it
          is not a car index, so it&apos;s sorted by photographer rather than by car.
        </p>
      </div>

      <div className="w-full max-w-2xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-asphalt-600 text-xs uppercase tracking-wider text-ink-faint">
              <th className="py-2 pr-4 font-medium">Photographer</th>
              <th className="py-2 pr-4 font-medium">Source</th>
              <th className="py-2 font-medium">License</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ car, credit }) => (
              <tr key={car.id} className="border-b border-asphalt-800 align-top">
                <td className="py-2 pr-4 text-ink">{credit.artist}</td>
                <td className="py-2 pr-4 text-ink-dim">
                  {/* Link text is the car, not the year — the licence requires identifying
                      the work, not the car's production span. */}
                  <a
                    href={credit.source}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-hazard-400"
                  >
                    {car.make} {car.model}
                  </a>
                </td>
                <td className="py-2 text-ink-faint">{credit.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-ink-faint">{rows.length} images</p>

      <SiteFooter current="credits" />
    </main>
  );
}
