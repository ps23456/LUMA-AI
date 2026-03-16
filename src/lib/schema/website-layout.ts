import { z } from "zod/v4";

const TypographyWeight = z.enum([
  "light",
  "normal",
  "medium",
  "semibold",
  "bold",
  "black",
]);
const TypographyLetterSpacing = z.enum([
  "tight",
  "normal",
  "wide",
  "wider",
  "widest",
]);

const ThemeSchema = z.object({
  mode: z.enum(["light", "dark"]),
  primaryColor: z.string(),
  accentColor: z.string(),
  textColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  headingFontSize: z.string().optional(),
  bodyFontSize: z.string().optional(),
  fontFamily: z.string().optional(),
  logoFontFamily: z.string().optional(),
  logoWeight: TypographyWeight.optional(),
  logoLetterSpacing: TypographyLetterSpacing.optional(),
  headingWeight: TypographyWeight.optional(),
  headingLetterSpacing: TypographyLetterSpacing.optional(),
  navWeight: TypographyWeight.optional(),
  navLetterSpacing: TypographyLetterSpacing.optional(),
});

const NavLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  children: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
});

const NavbarSectionSchema = z.object({
  type: z.literal("navbar"),
  props: z.object({
    brand: z.string(),
    links: z.array(NavLinkSchema),
    ctaText: z.string().optional(),
    ctaHref: z.string().optional(),
    navStyle: z.enum(["default", "centered", "sidebar"]).optional(),
    logoStyle: z.enum(["text", "icon_only", "icon", "image"]).optional(),
    logoImage: z.string().optional(),
    logoImageQuery: z.string().optional(),
    logoHeight: z.number().optional(),
    logoWidth: z.number().optional(),
    hasCart: z.boolean().optional(),
    hasSearch: z.boolean().optional(),
    hasAccount: z.boolean().optional(),
    currencySelector: z.string().optional(),
    showBorder: z.boolean().optional(),
    showLogoDivider: z.boolean().optional(),
    headerOrder: z.array(z.enum(["logo", "nav", "sidebar", "cta"])).optional(),
    sidebarPosition: z.enum(["left", "right"]).optional(),
    logoPosition: z.enum(["left", "center", "right"]).optional(),
    sidebarIcon: z.enum(["hamburger", "dots", "grid", "menu", "list", "kebab", "plus"]).optional(),
  }),
});

const HeroSlideSchema = z.object({
  badge: z.string().optional(),
  heading: z.string(),
  subheading: z.string(),
  ctaText: z.string(),
  ctaHref: z.string(),
  secondaryCtaText: z.string().optional(),
  secondaryCtaHref: z.string().optional(),
  backgroundImage: z.string().optional(),
  imageQuery: z.string().optional(),
});

const HeroSectionSchema = z.object({
  type: z.literal("hero"),
  props: z.object({
    badge: z.string().optional(),
    heading: z.string().optional(),
    subheading: z.string().optional(),
    ctaText: z.string().optional(),
    ctaHref: z.string().optional(),
    secondaryCtaText: z.string().optional(),
    secondaryCtaHref: z.string().optional(),
    stats: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .optional(),
    backgroundImage: z.string().optional(),
    imageQuery: z.string().optional(),
    slides: z.array(HeroSlideSchema).optional(),
    autoPlayInterval: z.number().optional(),
    heroLayout: z
      .enum(["carousel", "overlay", "split", "centered", "multi-panel"])
      .optional(),
    ctaVariant: z.enum(["accent", "outlined"]).optional(),
  }),
});

const FeaturesSectionSchema = z.object({
  type: z.literal("features"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    backgroundColor: z.string().optional(),
    hoverAnimation: z.enum(["lift", "scale", "glow", "bounce", "tilt", "none"]).optional(),
    features: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        icon: z.string().optional(),
        backgroundColor: z.string().optional(),
      }),
    ),
  }),
});

const PricingSectionSchema = z.object({
  type: z.literal("pricing"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    backgroundColor: z.string().optional(),
    tiers: z.array(
      z.object({
        name: z.string(),
        price: z.string(),
        description: z.string(),
        features: z.array(z.string()),
        ctaText: z.string(),
        highlighted: z.boolean(),
      }),
    ),
  }),
});

const TestimonialsSectionSchema = z.object({
  type: z.literal("testimonials"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    testimonials: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        quote: z.string(),
        avatar: z.string(),
      }),
    ),
  }),
});

const CTASectionSchema = z.object({
  type: z.literal("cta"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    ctaText: z.string(),
    ctaHref: z.string(),
  }),
});

const ProductGridSectionSchema = z.object({
  type: z.literal("product-grid"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    backgroundColor: z.string().optional(),
    products: z.array(
      z.object({
        name: z.string(),
        category: z.string(),
        price: z.string(),
        originalPrice: z.string().optional(),
        badge: z.string().nullish(),
        image: z.string().optional(),
        imageQuery: z.string().optional(),
        colors: z.array(z.string()).optional(),
      }),
    ),
  }),
});

const NewsletterSectionSchema = z.object({
  type: z.literal("newsletter"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    placeholder: z.string(),
    buttonText: z.string(),
  }),
});

const StatsSectionSchema = z.object({
  type: z.literal("stats"),
  props: z.object({
    stats: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
});

const FooterSectionSchema = z.object({
  type: z.literal("footer"),
  props: z.object({
    brand: z.string(),
    links: z.array(z.object({ label: z.string(), href: z.string() })),
    columns: z
      .array(
        z.object({
          title: z.string(),
          links: z.array(z.object({ label: z.string(), href: z.string() })),
        }),
      )
      .optional(),
    copyright: z.string(),
    socials: z
      .array(z.object({ platform: z.string(), url: z.string() }))
      .optional(),
  }),
});

const FAQSectionSchema = z.object({
  type: z.literal("faq"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    items: z.array(
      z.object({ question: z.string(), answer: z.string() }),
    ),
  }),
});

const LogoCloudSectionSchema = z.object({
  type: z.literal("logo-cloud"),
  props: z.object({
    heading: z.string().optional(),
    subheading: z.string().optional(),
    logos: z.array(
      z.object({
        name: z.string(),
        icon: z.string().optional(),
        image: z.string().optional(),
        imageQuery: z.string().optional(),
      }),
    ),
  }),
});

const GallerySectionSchema = z.object({
  type: z.literal("gallery"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    images: z.array(
      z.object({
        src: z.string().optional(),
        alt: z.string(),
        imageQuery: z.string().optional(),
      }),
    ),
  }),
});

const TeamSectionSchema = z.object({
  type: z.literal("team"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    members: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        bio: z.string().optional(),
        socials: z
          .array(z.object({ platform: z.string(), url: z.string() }))
          .optional(),
      }),
    ),
  }),
});

const BannerSectionSchema = z.object({
  type: z.literal("banner"),
  props: z.object({
    text: z.string(),
    ctaText: z.string().optional(),
    ctaHref: z.string().optional(),
    dismissible: z.boolean().optional(),
  }),
});

const ContactSectionSchema = z.object({
  type: z.literal("contact"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    formFields: z.array(z.string()).optional(),
  }),
});

const TimelineSectionSchema = z.object({
  type: z.literal("timeline"),
  props: z.object({
    heading: z.string(),
    subheading: z.string(),
    steps: z.array(
      z.object({ title: z.string(), description: z.string() }),
    ),
  }),
});

const VideoSectionSchema = z.object({
  type: z.literal("video"),
  props: z.object({
    heading: z.string().optional(),
    subheading: z.string().optional(),
    videoUrl: z.string(),
  }),
});

const SplitContentSectionSchema = z.object({
  type: z.literal("split-content"),
  props: z.object({
    heading: z.string(),
    subheading: z.string().optional(),
    body: z.string(),
    imageQuery: z.string().optional(),
    imageUrl: z.string().optional(),
    imagePosition: z.enum(["left", "right"]).optional(),
    layoutVariant: z.enum(["split", "stacked", "full-width"]).optional(),
    imageWidth: z.number().min(20).max(100).optional(),
    imageHeight: z.number().min(100).max(800).optional(),
    imageMaxWidth: z.number().min(300).max(1400).optional(),
    ctaText: z.string().optional(),
    ctaHref: z.string().optional(),
    backgroundColor: z.string().optional(),
  }),
});

const CustomImageSchema = z.object({
  id: z.string(),
  imageQuery: z.string(),
  url: z.string().optional(),
});

const CustomSectionSchema = z.object({
  type: z.literal("custom"),
  props: z.object({
    heading: z.string().optional(),
    subheading: z.string().optional(),
    html: z.string(),
    images: z.array(CustomImageSchema).optional(),
  }),
});

const SectionSchema = z.discriminatedUnion("type", [
  NavbarSectionSchema,
  HeroSectionSchema,
  SplitContentSectionSchema,
  FeaturesSectionSchema,
  PricingSectionSchema,
  TestimonialsSectionSchema,
  CTASectionSchema,
  ProductGridSectionSchema,
  NewsletterSectionSchema,
  StatsSectionSchema,
  FooterSectionSchema,
  FAQSectionSchema,
  LogoCloudSectionSchema,
  GallerySectionSchema,
  TeamSectionSchema,
  BannerSectionSchema,
  ContactSectionSchema,
  TimelineSectionSchema,
  VideoSectionSchema,
  CustomSectionSchema,
]);

const ElementStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.string().optional(),
  color: z.string().optional(),
});

export const WebsiteLayoutSchema = z.object({
  title: z.string(),
  description: z.string(),
  theme: ThemeSchema,
  sections: z.array(SectionSchema).min(1),
  elementStyles: z.record(z.string(), ElementStyleSchema).optional(),
});

export type WebsiteLayout = z.infer<typeof WebsiteLayoutSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type SectionType = Section["type"];
export type SiteTheme = z.infer<typeof ThemeSchema>;
