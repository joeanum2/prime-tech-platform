export function getSiteUrl() {
  const explicit = (process.env.SITE_URL ?? "").trim().replace(/\/$/, "");
  if (explicit) return explicit;

  if ((process.env.NODE_ENV ?? "development") !== "production") {
    return "http://localhost:3000";
  }

  return "";
}

export function makeBookingTrackUrl(bookingRef: string, email: string) {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return "";
  return `${siteUrl}/track?booking=${encodeURIComponent(bookingRef)}&email=${encodeURIComponent(email)}`;
}
