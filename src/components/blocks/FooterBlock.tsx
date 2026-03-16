import Link from "next/link";
import type { FooterProps } from "@/types/blocks";

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "𝕏",
  linkedin: "in",
  instagram: "📷",
  github: "⌨",
  facebook: "f",
  youtube: "▶",
};

export function FooterBlock({
  brand,
  links,
  columns,
  copyright,
  socials,
}: FooterProps) {
  const hasColumns = columns && columns.length > 0;

  return (
    <footer className="border-t border-current/10">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {hasColumns ? (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            {/* Brand column */}
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
                  {brand.charAt(0).toUpperCase()}
                </div>
                <span
                  className="text-lg font-bold uppercase tracking-wide"
                  style={{ fontFamily: "var(--font-theme, inherit)" }}
                >
                  {brand}
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed opacity-40">
                Building the future, one product at a time.
              </p>
              {socials && socials.length > 0 && (
                <div className="mt-6 flex gap-3">
                  {socials.map((s) => (
                    <a
                      key={s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-current/10 text-xs font-bold opacity-40 transition-all hover:border-[var(--accent)]/30 hover:opacity-80"
                    >
                      {SOCIAL_ICONS[s.platform.toLowerCase()] ??
                        s.platform.charAt(0)}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Link columns */}
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold uppercase tracking-wider opacity-50">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm opacity-40 transition-opacity hover:opacity-80"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-white">
                {brand.charAt(0).toUpperCase()}
              </div>
              <span className="text-lg font-bold uppercase tracking-wide">
                {brand}
              </span>
            </Link>
            <div className="flex flex-wrap justify-center gap-6">
              {links.map((link, i) => (
                <Link
                  key={`${link.label}-${link.href}-${i}`}
                  href={link.href}
                  className="text-sm opacity-60 transition-opacity hover:opacity-100"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 border-t border-current/10 pt-8 text-center">
          <p className="text-xs opacity-30">{copyright}</p>
        </div>
      </div>
    </footer>
  );
}
