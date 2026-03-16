"use client";

export interface ArticleBodyProps {
  blocks: Array<
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "p"; text: string }
  >;
  backgroundColor?: string;
}

export function ArticleBodyBlock({ blocks, backgroundColor }: ArticleBodyProps) {
  return (
    <section
      className="py-12 sm:py-16"
      style={backgroundColor ? { backgroundColor } : undefined}
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="prose prose-invert max-w-none space-y-6">
          {blocks.map((block, i) => {
            if (block.type === "h2") {
              return (
                <h2
                  key={i}
                  className="mt-10 border-b border-current/10 pb-2 text-2xl font-bold sm:text-3xl"
                  style={{
                    fontFamily: "var(--font-theme, inherit)",
                    fontWeight: "var(--heading-weight, 700)",
                  }}
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === "h3") {
              return (
                <h3
                  key={i}
                  className="mt-8 text-xl font-semibold sm:text-2xl"
                  style={{
                    fontFamily: "var(--font-theme, inherit)",
                    fontWeight: "var(--heading-weight, 600)",
                  }}
                >
                  {block.text}
                </h3>
              );
            }
            return (
              <p
                key={i}
                className="leading-relaxed opacity-90"
                style={{
                  fontSize: "var(--body-size, 1rem)",
                  fontFamily: "var(--font-theme, inherit)",
                }}
              >
                {block.text}
              </p>
            );
          })}
        </div>
      </div>
    </section>
  );
}
