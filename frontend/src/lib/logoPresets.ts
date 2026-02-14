export type LogoType = "app" | "full" | "business";

export type LogoMakerInput = {
  logoType: LogoType;
  brandName: string;
  tagline: string;
  icon: "chip";
  shape: "rounded";
  primary: string;
  accent: string;
  background: string;
  fontWeight: number;
  exportSize: number;
};

export type LogoPreset = {
  id: "A4" | "A5";
  name: string;
  description: string;
  input: LogoMakerInput;
};

export const A4_CORPORATE_CLEAN: LogoPreset = {
  id: "A4",
  name: "A4 — Corporate Clean",
  description: "Clean corporate badge: light background, strong blue primary, navy text.",
  input: {
    logoType: "app",
    brandName: "Prime Tech Services",
    tagline: "",
    icon: "chip",
    shape: "rounded",
    primary: "#2563EB",
    accent: "#0B1F3B",
    background: "#F5F7FB",
    fontWeight: 800,
    exportSize: 512
  }
};

export const A5_PRIME_TECH_BUSINESS_STANDARD: LogoPreset = {
  id: "A5",
  name: "A5 — Prime Tech Business Standard",
  description: "Horizontal business logo for headers, invoices, and branding.",
  input: {
    logoType: "business",
    brandName: "Prime Tech Services",
    tagline: "Repairs • Software • Support",
    icon: "chip",
    shape: "rounded",
    primary: "#2563EB",
    accent: "#F97316",
    background: "transparent",
    fontWeight: 800,
    exportSize: 800
  }
};
