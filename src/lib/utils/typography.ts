/**
 * Maps typography tokens to CSS values for font-weight and letter-spacing.
 * Used by DynamicPage to set CSS variables that blocks consume.
 */

export type TypographyWeight =
  | "light"
  | "normal"
  | "medium"
  | "semibold"
  | "bold"
  | "black";

export type TypographyLetterSpacing =
  | "tight"
  | "normal"
  | "wide"
  | "wider"
  | "widest";

const WEIGHT_MAP: Record<TypographyWeight, string> = {
  light: "300",
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  black: "900",
};

const LETTER_SPACING_MAP: Record<TypographyLetterSpacing, string> = {
  tight: "-0.025em",
  normal: "0",
  wide: "0.025em",
  wider: "0.05em",
  widest: "0.15em",
};

export function weightToCss(weight?: TypographyWeight): string {
  return weight ? WEIGHT_MAP[weight] ?? "400" : "400";
}

export function letterSpacingToCss(
  spacing?: TypographyLetterSpacing,
): string {
  return spacing ? LETTER_SPACING_MAP[spacing] ?? "0" : "0";
}
