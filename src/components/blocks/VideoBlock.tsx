import type { VideoProps } from "@/types/blocks";

function getEmbedUrl(url: string): string {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return url;
}

export function VideoBlock({ heading, subheading, videoUrl }: VideoProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
              {heading}
            </h2>
            {subheading && (
              <p className="mt-4 text-base opacity-60">{subheading}</p>
            )}
          </div>
        )}
        <div className="mt-10 overflow-hidden rounded-2xl border border-current/10 bg-black shadow-2xl">
          <div className="relative aspect-video">
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={heading ?? "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
