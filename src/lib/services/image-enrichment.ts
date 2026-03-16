import { searchSingleImage } from "./image-search";
import type { WebsiteLayout, Section } from "@/lib/schema/website-layout";
import type { ScrapedImages } from "@/lib/pipeline/url-pipeline";

export interface EnrichmentContext {
  scrapedImages?: ScrapedImages;
}

export async function enrichLayoutWithImages(
  layout: WebsiteLayout,
  context?: EnrichmentContext,
): Promise<WebsiteLayout> {
  const scraped = context?.scrapedImages;
  const enrichedSections = await Promise.all(
    layout.sections.map((section, idx) => enrichSection(section, scraped, idx)),
  );

  return { ...layout, sections: enrichedSections };
}

async function enrichSection(
  section: Section,
  scraped?: ScrapedImages,
  _sectionIdx?: number,
): Promise<Section> {
  switch (section.type) {
    case "navbar": {
      const props = { ...section.props };
      if (!props.logoImage) {
        if (scraped?.logo) {
          props.logoImage = scraped.logo;
        } else if (props.logoImageQuery) {
          props.logoImage = await searchSingleImage(props.logoImageQuery);
        }
      }
      return { ...section, props };
    }

    case "hero": {
      const props = { ...section.props };

      // 1. Hero background: scraped first, then Serper/image search, then fallback — NEVER leave empty
      if (!props.backgroundImage) {
        if (scraped?.hero?.length) {
          props.backgroundImage = scraped.hero[0];
        } else {
          const heroQuery =
            props.imageQuery ||
            (props.heading ? `${props.heading} hero banner` : null) ||
            "elegant hero banner";
          props.backgroundImage = await searchSingleImage(heroQuery);
        }
      }

      // 2. Carousel slides: each slide MUST have an image — use Serper when scraping fails
      if (props.slides && props.slides.length > 0) {
        props.slides = await Promise.all(
          props.slides.map(async (slide, i) => {
            if (slide.backgroundImage) return slide;
            const scrapedSlide = scraped?.hero?.[i];
            if (scrapedSlide) {
              return { ...slide, backgroundImage: scrapedSlide };
            }
            const slideQuery =
              slide.imageQuery ||
              props.imageQuery ||
              (slide.heading ? `${slide.heading} hero image` : null) ||
              "hero banner";
            const imageUrl = await searchSingleImage(slideQuery);
            return { ...slide, backgroundImage: imageUrl };
          }),
        );
      }

      return { ...section, props };
    }

    case "split-content": {
      const props = { ...section.props };
      if (!props.imageUrl) {
        if (scraped?.products?.length) {
          props.imageUrl = scraped.products[0];
        } else if (props.imageQuery) {
          const url = await searchSingleImage(props.imageQuery);
          if (url) props.imageUrl = url;
        }
      }
      return { ...section, props };
    }

    case "product-grid": {
      const products = section.props.products ?? [];
      const enrichedProducts = await Promise.all(
        products.map(async (product, i) => {
          if (!product.image) {
            const scrapedImg = scraped?.products?.[i];
            if (scrapedImg) {
              return { ...product, image: scrapedImg };
            }
            if (product.imageQuery) {
              const imageUrl = await searchSingleImage(product.imageQuery);
              return { ...product, image: imageUrl || undefined };
            }
          }
          return product;
        }),
      );
      return {
        ...section,
        props: { ...section.props, products: enrichedProducts },
      };
    }

    case "gallery": {
      const enrichedImages = await Promise.all(
        section.props.images.map(async (img, i) => {
          if (!img.src) {
            const scrapedImg = scraped?.products?.[i];
            if (scrapedImg) {
              return { ...img, src: scrapedImg };
            }
            if (img.imageQuery) {
              const imageUrl = await searchSingleImage(img.imageQuery);
              return { ...img, src: imageUrl || undefined };
            }
          }
          return img;
        }),
      );
      return {
        ...section,
        props: { ...section.props, images: enrichedImages },
      };
    }

    case "logo-cloud": {
      const logos = section.props.logos ?? [];
      const enrichedLogos = await Promise.all(
        logos.map(async (logo) => {
          if (logo.imageQuery && !logo.image) {
            const imageUrl = await searchSingleImage(logo.imageQuery);
            return { ...logo, image: imageUrl || undefined };
          }
          return logo;
        }),
      );
      return {
        ...section,
        props: { ...section.props, logos: enrichedLogos },
      };
    }

    case "custom": {
      if (!section.props.images || section.props.images.length === 0) {
        return section;
      }

      const enrichedImages = await Promise.all(
        section.props.images.map(async (img, i) => {
          if (!img.url) {
            const scrapedImg = scraped?.products?.[i];
            if (scrapedImg) {
              return { ...img, url: scrapedImg };
            }
            if (img.imageQuery) {
              const imageUrl = await searchSingleImage(img.imageQuery);
              return { ...img, url: imageUrl || undefined };
            }
          }
          return img;
        }),
      );

      return {
        ...section,
        props: { ...section.props, images: enrichedImages },
      };
    }

    default:
      return section;
  }
}
