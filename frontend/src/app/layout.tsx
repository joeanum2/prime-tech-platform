import "@/styles/globals.css";
import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { SiteHeaderServer } from "@/components/layout/SiteHeaderServer";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { ReactNode } from "react";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"]
});

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"]
});

export const metadata: Metadata = {
  title: {
    default: "Prime Tech Services",
    template: "%s | Prime Tech Services"
  },
  description: "Prime Tech Services – professional software services and managed releases."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">
        <SiteHeaderServer />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
