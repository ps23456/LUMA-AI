import type { NewsletterProps } from "@/types/blocks";

export function NewsletterBlock({
  heading,
  subheading,
  placeholder,
  buttonText,
}: NewsletterProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] p-10 sm:p-14">
          <div className="mx-auto max-w-xl">
            <h2 className="text-2xl font-black uppercase text-white sm:text-3xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
              {heading}
            </h2>
            <p className="mt-3 text-sm text-white/70">{subheading}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                placeholder={placeholder}
                className="flex-1 rounded-full bg-white/10 px-5 py-3 text-sm text-white placeholder-white/50 outline-none ring-1 ring-white/20 transition-all focus:ring-white/50"
                readOnly
              />
              <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform hover:scale-105">
                {buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
