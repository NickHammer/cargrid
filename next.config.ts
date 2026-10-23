import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The whole game is static: no server actions, API routes, or middleware.
  // Exporting to plain files means Netlify serves it from the CDN with no
  // serverless runtime involved, and the same build works on any static host.
  output: "export",

  // Car images are already hand-optimised to 640px WebP (~48KB each) and render
  // in ~300px tiles, so Next's optimiser buys almost nothing — and skipping it
  // keeps the export host-agnostic.
  images: { unoptimized: true },

  // Emit every route as <path>/index.html rather than <path>.html. Without it
  // the export produces BOTH archive/2026-10-22.html and a directory
  // archive/2026-10-22/ (holding RSC payloads), and static hosts disagree about
  // which one wins for /archive/2026-10-22. Directory + index.html is
  // unambiguous everywhere.
  trailingSlash: true,
};

export default nextConfig;
