export const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "DM Sans", label: "DM Sans" },
  { value: "Space Grotesk", label: "Space Grotesk" },
  { value: "Outfit", label: "Outfit" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Lora", label: "Lora" },
  { value: "Libre Baskerville", label: "Libre Baskerville" },
  { value: "Roboto", label: "Roboto" },
  { value: "Courier New", label: "Courier New" },
];

export const FONT_STACKS: Record<string, string> = {
  Inter: '"Inter", system-ui, sans-serif',
  Poppins: '"Poppins", sans-serif',
  Montserrat: '"Montserrat", sans-serif',
  "DM Sans": '"DM Sans", sans-serif',
  "Space Grotesk": '"Space Grotesk", sans-serif',
  Outfit: '"Outfit", sans-serif',
  "Plus Jakarta Sans": '"Plus Jakarta Sans", sans-serif',
  "Playfair Display": '"Playfair Display", Georgia, serif',
  Lora: '"Lora", Georgia, serif',
  "Libre Baskerville": '"Libre Baskerville", Georgia, serif',
  Roboto: '"Roboto", sans-serif',
  "Courier New": '"Courier New", monospace',
  serif: '"Playfair Display", Georgia, serif',
  mono: '"Courier New", Courier, monospace',
  "sans-serif": '"Inter", system-ui, sans-serif',
};

export const FONT_SIZE_PRESETS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48];
export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 120;

/** Map legacy serif/sans-serif/mono to specific font names. */
export const LEGACY_TO_SPECIFIC: Record<string, string> = {
  "sans-serif": "Space Grotesk",
  serif: "Playfair Display",
  mono: "Courier New",
};

export function toSpecificFont(legacy: string | undefined): string {
  if (!legacy) return "Space Grotesk";
  return LEGACY_TO_SPECIFIC[legacy] ?? legacy;
}

export function toFontStack(name: string | undefined): string {
  if (!name) return '"Inter", system-ui, sans-serif';
  return FONT_STACKS[name] ?? FONT_STACKS["sans-serif"];
}

export function parseFontSize(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  if (!Number.isNaN(n)) return `${n}px`;
  const rems: Record<string, string> = {
    small: "0.875rem",
    medium: "1rem",
    large: "1.25rem",
  };
  return rems[v] ?? (v.endsWith("px") || v.endsWith("rem") ? v : undefined);
}
