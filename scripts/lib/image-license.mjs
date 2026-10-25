/** Conservative automatic acceptance. Other licenses remain a manual decision.
 * Commons hosting alone is not evidence of suitable or complete metadata. */
export function reviewImageLicense(meta) {
  const text = (key) => (meta[key]?.value ?? "").replace(/<[^>]*>/g, "").trim();
  const license = text("LicenseShortName");
  const artist = text("Artist");
  const licenseUrl = text("LicenseUrl");
  const name = license.toLowerCase();
  const url = licenseUrl.replace(/^\/\//, "https://");
  if (!artist || artist.toLowerCase() === "unknown") return null;
  if (/\b(?:nc|nd)\b|non.?commercial|no.?derivatives/i.test(name)) return null;
  const isCC = /^cc by(?:-sa)? \d\.\d(?: [a-z-]+)?$/i.test(license);
  const isCC0 = /^cc0(?: 1\.0)?$/i.test(license);
  const isPD = /^(?:public domain|pd(?:-[a-z0-9-]+)?)$/i.test(license);
  if (isCC || isCC0) {
    let parsed;
    try { parsed = new URL(url); } catch { return null; }
    if (parsed.hostname !== "creativecommons.org" || !["http:", "https:"].includes(parsed.protocol)) return null;
    const slug = isCC0 ? "/publicdomain/zero/1.0" : `/licenses/${name.startsWith("cc by-sa") ? "by-sa" : "by"}/${license.match(/\d\.\d/)[0]}`;
    if (!(parsed.pathname === slug || parsed.pathname.startsWith(`${slug}/`))) return null;
    return { license, artist, licenseUrl: url };
  }
  if (isPD) return { license, artist, licenseUrl: url || "https://creativecommons.org/publicdomain/mark/1.0/" };
  return null;
}
