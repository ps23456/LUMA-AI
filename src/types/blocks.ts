export interface SiteTheme {
  mode: "light" | "dark";
  primaryColor: string;
  accentColor: string;
  fontFamily?: "sans-serif" | "serif" | "mono";
}

export interface NavLink {
  label: string;
  href: string;
  children?: Array<{ label: string; href: string }>;
}

export interface NavbarProps {
  brand: string;
  links: NavLink[];
  ctaText?: string;
  ctaHref?: string;
  navStyle?: "default" | "centered" | "sidebar";
  logoStyle?: "text" | "icon_only" | "icon" | "image";
  logoImage?: string;
  logoImageQuery?: string;
  logoHeight?: number;
  logoWidth?: number;
  hasCart?: boolean;
  hasSearch?: boolean;
  hasAccount?: boolean;
  currencySelector?: string;
  showBorder?: boolean;
  showLogoDivider?: boolean;
  headerOrder?: ("logo" | "nav" | "sidebar" | "cta")[];
  sidebarPosition?: "left" | "right";
  logoPosition?: "left" | "center" | "right";
  sidebarIcon?: "hamburger" | "dots" | "grid" | "menu" | "list";
}

export interface StatItem {
  value: string;
  label: string;
}

export interface HeroSlide {
  badge?: string;
  heading: string;
  subheading: string;
  ctaText: string;
  ctaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  backgroundImage?: string;
  imageQuery?: string;
}

export interface HeroProps {
  badge?: string;
  heading?: string;
  subheading?: string;
  ctaText?: string;
  ctaHref?: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  stats?: StatItem[];
  backgroundImage?: string;
  imageQuery?: string;
  slides?: HeroSlide[];
  autoPlayInterval?: number;
  heroLayout?: "carousel" | "overlay" | "split" | "centered" | "multi-panel";
  ctaVariant?: "accent" | "outlined";
}

export interface FeatureItem {
  title: string;
  description: string;
  icon?: string;
  backgroundColor?: string;
}

export interface FeaturesProps {
  heading: string;
  subheading: string;
  features: FeatureItem[];
  hoverAnimation?: "lift" | "scale" | "glow" | "bounce" | "tilt" | "none";
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  ctaText: string;
  highlighted: boolean;
}

export interface PricingProps {
  heading: string;
  subheading: string;
  tiers: PricingTier[];
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar: string;
}

export interface TestimonialsProps {
  heading: string;
  subheading: string;
  testimonials: Testimonial[];
}

export interface CTASectionProps {
  heading: string;
  subheading: string;
  ctaText: string;
  ctaHref: string;
}

export interface Product {
  name: string;
  category: string;
  price: string;
  originalPrice?: string;
  badge?: string;
  image?: string;
  imageQuery?: string;
  colors?: string[];
}

export interface ProductGridProps {
  heading: string;
  subheading: string;
  products: Product[];
}

export interface NewsletterProps {
  heading: string;
  subheading: string;
  placeholder: string;
  buttonText: string;
}

export interface StatsProps {
  stats: StatItem[];
}

export interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string }>;
}

export interface FooterProps {
  brand: string;
  links: Array<{ label: string; href: string }>;
  columns?: FooterColumn[];
  copyright: string;
  socials?: Array<{ platform: string; url: string }>;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQProps {
  heading: string;
  subheading: string;
  items: FAQItem[];
}

export interface LogoItem {
  name: string;
  icon?: string;
  image?: string;
  imageQuery?: string;
}

export interface LogoCloudProps {
  heading?: string;
  subheading?: string;
  logos: LogoItem[];
}

export interface GalleryImage {
  src?: string;
  alt: string;
  imageQuery?: string;
}

export interface GalleryProps {
  heading: string;
  subheading: string;
  images: GalleryImage[];
}

export interface TeamMember {
  name: string;
  role: string;
  bio?: string;
  socials?: Array<{ platform: string; url: string }>;
}

export interface TeamProps {
  heading: string;
  subheading: string;
  members: TeamMember[];
}

export interface BannerProps {
  text: string;
  ctaText?: string;
  ctaHref?: string;
  dismissible?: boolean;
}

export interface ContactProps {
  heading: string;
  subheading: string;
  email?: string;
  phone?: string;
  address?: string;
  formFields?: string[];
}

export interface TimelineStep {
  title: string;
  description: string;
}

export interface TimelineProps {
  heading: string;
  subheading: string;
  steps: TimelineStep[];
}

export interface VideoProps {
  heading?: string;
  subheading?: string;
  videoUrl: string;
}

export interface CustomImage {
  id: string;
  imageQuery: string;
  url?: string;
}

export interface CustomProps {
  heading?: string;
  subheading?: string;
  html: string;
  images?: CustomImage[];
}
