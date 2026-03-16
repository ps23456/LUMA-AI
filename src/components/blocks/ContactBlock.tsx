import type { ContactProps } from "@/types/blocks";

export function ContactBlock({
  heading,
  subheading,
  email,
  phone,
  address,
  formFields,
}: ContactProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
            {heading}
          </h2>
          <p className="mt-4 text-base opacity-60">{subheading}</p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-12 lg:grid-cols-5">
          {/* Info sidebar */}
          <div className="space-y-8 lg:col-span-2">
            {email && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider opacity-40">
                  <span>&#9993;</span> Email
                </h3>
                <p className="mt-2 text-base">{email}</p>
              </div>
            )}
            {phone && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider opacity-40">
                  <span>&#9742;</span> Phone
                </h3>
                <p className="mt-2 text-base">{phone}</p>
              </div>
            )}
            {address && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider opacity-40">
                  <span>&#128205;</span> Address
                </h3>
                <p className="mt-2 text-base">{address}</p>
              </div>
            )}
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-5 lg:col-span-3"
          >
            {(formFields ?? ["name", "email", "message"]).map((field) =>
              field === "message" ? (
                <div key={field}>
                  <label className="mb-1.5 block text-sm font-medium capitalize opacity-70">
                    {field}
                  </label>
                  <textarea
                    rows={4}
                    placeholder={`Your ${field}...`}
                    className="w-full rounded-xl border border-current/10 bg-white/5 px-4 py-3 text-sm outline-none transition-colors placeholder:opacity-30 focus:border-[var(--accent)]"
                  />
                </div>
              ) : (
                <div key={field}>
                  <label className="mb-1.5 block text-sm font-medium capitalize opacity-70">
                    {field}
                  </label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    placeholder={`Your ${field}...`}
                    className="w-full rounded-xl border border-current/10 bg-white/5 px-4 py-3 text-sm outline-none transition-colors placeholder:opacity-30 focus:border-[var(--accent)]"
                  />
                </div>
              ),
            )}
            <button
              type="submit"
              className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--accent)]/25"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
