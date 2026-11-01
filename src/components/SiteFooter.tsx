import Link from "next/link";
import { FEEDBACK_EMAIL } from "@/lib/site";

/**
 * Shared footer nav. One place to change the links, rather than the three
 * slightly different copies the pages had before.
 *
 * The feedback link is a plain `mailto:` with the subject pre-filled, so it
 * needs no backend — which suits a site that is a static export with no
 * serverless functions at all. The address itself lives in `lib/site.ts` so it
 * can be set from the build environment.
 */

// Load-bearing: the inbox has a Gmail filter keyed on this subject that stops
// feedback being junked (a new account with no history sends almost everything
// to Spam at first). Reword it and the filter silently stops matching, so
// update the filter too if this ever changes.
const SUBJECT = encodeURIComponent("CarGrid feedback");
const BODY = encodeURIComponent(
  "What happened (or what you'd like to see):\n\n\n" +
    "If it's a bug, which grid date and which square?\n\n",
);

export default function SiteFooter({ current }: { current?: "today" | "archive" | "credits" }) {
  const link = "text-ink-faint transition-colors hover:text-hazard-400";
  const here = "text-hazard-400";

  return (
    <footer className="mt-10 w-full">
      <div className="checker-rule mx-auto max-w-md" />
      <nav className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-8 text-xs font-medium">
        <Link href="/" className={current === "today" ? here : link}>
          Today&apos;s grid
        </Link>
        <Link href="/archive" className={current === "archive" ? here : link}>
          Archive
        </Link>
        <Link href="/credits" className={current === "credits" ? here : link}>
          Image credits
        </Link>
        <a
          href={`mailto:${FEEDBACK_EMAIL}?subject=${SUBJECT}&body=${BODY}`}
          className={link}
        >
          Report a bug / Send feedback
        </a>
      </nav>
    </footer>
  );
}
