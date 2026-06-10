import { Platform } from "react-native";

export const colors = {
  surface: "#FDFBF7",
  onSurface: "#2A2724",
  surfaceSecondary: "#F4EFE6",
  onSurfaceSecondary: "#4A4540",
  surfaceTertiary: "#EAE3D5",
  onSurfaceTertiary: "#5C5650",
  surfaceInverse: "#2A2724",
  onSurfaceInverse: "#FDFBF7",
  brand: "#C85A32",
  brandPrimary: "#C85A32",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#84937B",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E8D8CA",
  onBrandTertiary: "#6B4F3A",
  success: "#6A825C",
  warning: "#D49A44",
  error: "#B84A43",
  border: "#E8E3DB",
  borderStrong: "#D1C9BE",
  divider: "#E8E3DB",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

// Use system serifs to avoid CDN font dependency. Looks editorial without
// network roundtrip on cold start.
export const fonts = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "serif" })!,
  text: Platform.select({ ios: "System", android: "sans-serif", default: "System" })!,
};

// Kategori resep (Bahasa Indonesia)
export type Category = "Sarapan" | "Makan Siang" | "Makan Malam" | "Pencuci Mulut" | "Camilan";

export const CATEGORIES: Category[] = [
  "Sarapan",
  "Makan Siang",
  "Makan Malam",
  "Pencuci Mulut",
  "Camilan",
];

export const DIFFICULTIES = ["Mudah", "Sedang", "Sulit"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
