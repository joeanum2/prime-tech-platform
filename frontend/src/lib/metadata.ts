import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function buildMetadata({
  title,
  description,
  path
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
  return {
    title,
    description,
    metadataBase: siteUrl ? new URL(siteUrl) : undefined,
    alternates: path && siteUrl ? { canonical: `${siteUrl}${path}` } : undefined
  };
}
