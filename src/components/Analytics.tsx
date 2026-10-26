import { provider, siteId, scriptSrc, allowedDomains, analyticsEnabled } from "@/lib/analytics";

/**
 * Injects the configured analytics snippet, or nothing at all.
 *
 * Rendered into <head> from the root layout, which is where every provider's
 * own install instructions put it. These are plain tags rather than
 * `next/script`: the site is a static export, so the provider is fixed at build
 * time and there is nothing to orchestrate at runtime. A literal tag lands in
 * the served HTML — so it shows up in View Source and starts loading during
 * parse, which counts the visitors who leave before React hydrates.
 *
 * `defer` is what keeps it off the critical path: the parser never waits on it
 * and it runs after the document is parsed.
 */
export default function Analytics() {
  if (!analyticsEnabled) return null;

  if (provider === "plausible") {
    return (
      <script
        defer
        data-domain={siteId}
        src={scriptSrc || "https://plausible.io/js/script.tagged-events.js"}
      />
    );
  }

  if (provider === "umami") {
    return (
      <script
        defer
        data-website-id={siteId}
        data-domains={allowedDomains || undefined}
        src={scriptSrc || "https://cloud.umami.is/script.js"}
      />
    );
  }

  if (provider === "ga") {
    // GA4 sets cookies, so this path needs a consent banner in the EU/UK that
    // the cookieless providers above do not.
    return (
      <>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${siteId}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${siteId}');`,
          }}
        />
      </>
    );
  }

  return null;
}
