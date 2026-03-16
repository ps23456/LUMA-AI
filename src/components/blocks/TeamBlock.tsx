import type { TeamProps } from "@/types/blocks";

export function TeamBlock({ heading, subheading, members }: TeamProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
            {heading}
          </h2>
          <p className="mt-4 text-base opacity-60">{subheading}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div
              key={member.name}
              className="group text-center"
            >
              <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 ring-4 ring-[var(--accent)]/10 transition-all group-hover:ring-[var(--accent)]/30">
                <span className="text-4xl font-bold text-[var(--accent)]">
                  {member.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-bold">{member.name}</h3>
              <p className="text-sm text-[var(--accent)]">{member.role}</p>
              {member.bio && (
                <p className="mt-2 text-sm leading-relaxed opacity-50">
                  {member.bio}
                </p>
              )}
              {member.socials && member.socials.length > 0 && (
                <div className="mt-3 flex justify-center gap-3">
                  {member.socials.map((s) => (
                    <a
                      key={s.platform}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium opacity-40 transition-opacity hover:opacity-80"
                    >
                      {s.platform}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
