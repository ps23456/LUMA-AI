"use client";

import { useState } from "react";
import type { ProductGridProps } from "@/types/blocks";
import { EditableField } from "@/components/EditableField";
import { EditableImage } from "@/components/EditableImage";
import { EditableSection } from "@/components/EditableSection";

const DOT_COLORS: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
  black: "bg-gray-900",
  white: "bg-white border border-gray-300",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  grey: "bg-gray-400",
  gray: "bg-gray-400",
  brown: "bg-amber-800",
  navy: "bg-blue-900",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
};

function getColorClass(color: string): string {
  return DOT_COLORS[color.toLowerCase()] ?? "bg-gray-400";
}

function proxyUrl(src: string): string {
  return `/api/image-proxy?url=${encodeURIComponent(src)}`;
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/5 to-white/10 p-4 text-center">
        <span className="text-3xl opacity-30">&#128247;</span>
        <span className="text-xs font-medium opacity-40">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={proxyUrl(src)}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
    />
  );
}

export function ProductGridBlock({
  heading,
  subheading,
  products,
  editIndex,
  backgroundColor,
}: ProductGridProps & { editIndex?: number | null; backgroundColor?: string }) {
  const prefix = editIndex != null ? `sections.${editIndex}.props` : "";
  const content = (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-theme, inherit)" }}>
            {prefix ? (
              <EditableField path={`${prefix}.heading`} value={heading} type="text" label="Heading">
                {heading}
              </EditableField>
            ) : (
              heading
            )}
          </h2>
          <p className="mt-4 text-base opacity-60">
            {prefix && subheading ? (
              <EditableField path={`${prefix}.subheading`} value={subheading} type="text" label="Subheading">
                {subheading}
              </EditableField>
            ) : (
              subheading
            )}
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, i) => (
            <div
              key={product.name}
              className="group overflow-hidden rounded-2xl border border-current/5 bg-white/5 transition-all hover:border-[var(--accent)]/30"
            >
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-white/5 to-white/10">
                {prefix ? (
                  <EditableImage
                    path={`${prefix}.products.${i}`}
                    imageUrl={product.image}
                    imageQuery={product.imageQuery}
                    imageField="image"
                    alt={product.name}
                    className="h-full w-full"
                    imgClassName="h-full w-full"
                    placeholder={
                      <span className="text-4xl opacity-20">&#128722;</span>
                    }
                  />
                ) : product.image ? (
                  <ProductImage src={product.image} alt={product.name} />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl opacity-20">
                    &#128722;
                  </div>
                )}
                {product.badge && (
                  <span className="absolute left-3 top-3 rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-bold uppercase text-white">
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                  {product.category}
                </p>
                <h3 className="mt-1 text-sm font-bold">
                  {prefix ? (
                    <EditableField
                      path={`${prefix}.products.${i}.name`}
                      value={product.name}
                      type="text"
                      label="Product name"
                    >
                      {product.name}
                    </EditableField>
                  ) : (
                    product.name
                  )}
                </h3>
                {product.colors && product.colors.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {product.colors.map((color) => (
                      <span
                        key={color}
                        className={`h-3.5 w-3.5 rounded-full ${getColorClass(color)}`}
                      />
                    ))}
                  </div>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-lg font-black">
                    {prefix ? (
                      <EditableField
                        path={`${prefix}.products.${i}.price`}
                        value={product.price}
                        type="price"
                        label="Price"
                      >
                        {product.price}
                      </EditableField>
                    ) : (
                      product.price
                    )}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm line-through opacity-40">
                      {product.originalPrice}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
  );

  return editIndex != null ? (
    <EditableSection sectionIndex={editIndex} backgroundColor={backgroundColor} className="py-20 sm:py-28">
      {content}
    </EditableSection>
  ) : (
    <section className="py-20 sm:py-28" style={backgroundColor ? { backgroundColor } : undefined}>
      {content}
    </section>
  );
}
