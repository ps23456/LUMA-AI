"use client";

import { useMemo } from "react";
import type { CustomProps } from "@/types/blocks";

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

export function CustomBlock({ heading, subheading, html, images }: CustomProps) {
  const processedHtml = useMemo(() => {
    let result = html;

    if (images && images.length > 0) {
      for (const img of images) {
        const placeholder = `{{img:${img.id}}}`;
        const url = img.url ? proxyUrl(img.url) : "";
        result = result.replaceAll(placeholder, url);
      }
    }

    // Handle any remaining IMAGEQUERY: patterns
    result = result.replace(
      /IMAGEQUERY:([^'"&<>]+)/g,
      (_match, query: string) => {
        return proxyUrl(
          `https://source.unsplash.com/800x600/?${encodeURIComponent(query.trim())}`,
        );
      },
    );

    return result;
  }, [html, images]);

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {(heading || subheading) && (
          <div className="mx-auto mb-12 max-w-2xl text-center">
            {heading && (
              <h2
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ fontFamily: "var(--font-theme, inherit)" }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p className="mt-4 text-base opacity-60">{subheading}</p>
            )}
          </div>
        )}
        <div dangerouslySetInnerHTML={{ __html: processedHtml }} />
      </div>
    </section>
  );
}
