// backend/src/lib/emailTemplates.ts

export type BookingEmailInput = {
  bkgRef: string;
  fullName: string;
  email: string;
  serviceName: string;
  preferredDate: string;
  notes?: string | null;
};

type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

function makeTrackUrl(bkgRef: string, email: string) {
  const base = (process.env.SITE_URL || "").trim().replace(/\/$/, "");
  if (!base) return "";
  const qs = `booking=${encodeURIComponent(bkgRef)}&email=${encodeURIComponent(email)}`;
  return `${base}/track?${qs}`;
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderBookingCustomerEmail(booking: BookingEmailInput): EmailContent {
  const subject = `Booking received: ${booking.bkgRef}`;
  const trackUrl = makeTrackUrl(booking.bkgRef, booking.email);

  const preferredDate = formatDate(booking.preferredDate);
  const notesText = booking.notes ? booking.notes : "";
  const notesBlockText = notesText ? `Notes: ${notesText}\n` : "";
  const trackBlockText = trackUrl ? `Track your booking: ${trackUrl}\n` : "";

  const text =
    `Hello ${booking.fullName},\n\n` +
    `Thank you for your booking request. We have received your details.\n\n` +
    `Booking reference: ${booking.bkgRef}\n` +
    `Service: ${booking.serviceName}\n` +
    `Preferred date: ${preferredDate}\n` +
    `${notesBlockText}` +
    `${trackBlockText}\n` +
    `We will contact you shortly to confirm the appointment.\n\n` +
    `Kind regards,\n` +
    `Prime Tech Services\n`;

  const notesHtml = notesText
    ? `<p><strong>Notes:</strong><br>${escapeHtml(notesText).replace(/\n/g, "<br>")}</p>`
    : "";

  const trackHtml = trackUrl ? `<p><a href="${trackUrl}">Track your booking</a></p>` : "";

  const html =
    `<div style="font-family: Arial, sans-serif; line-height: 1.5;">` +
    `<p>Hello ${escapeHtml(booking.fullName)},</p>` +
    `<p>Thank you for your booking request. We have received your details.</p>` +
    `<p>` +
    `<strong>Booking reference:</strong> ${escapeHtml(booking.bkgRef)}<br>` +
    `<strong>Service:</strong> ${escapeHtml(booking.serviceName)}<br>` +
    `<strong>Preferred date:</strong> ${escapeHtml(preferredDate)}` +
    `</p>` +
    `${notesHtml}` +
    `${trackHtml}` +
    `<p>We will contact you shortly to confirm the appointment.</p>` +
    `<p>Kind regards,<br>Prime Tech Services</p>` +
    `</div>`;

  return { subject, text, html };
}

export function renderBookingAdminEmail(booking: BookingEmailInput): EmailContent {
  const subject = `New booking: ${booking.bkgRef}`;
  const trackUrl = makeTrackUrl(booking.bkgRef, booking.email);

  const preferredDate = formatDate(booking.preferredDate);
  const notesText = booking.notes ? booking.notes : "";
  const notesBlockText = notesText ? `Notes: ${notesText}\n` : "";
  const trackBlockText = trackUrl ? `Track: ${trackUrl}\n` : "";

  const text =
    `New booking received.\n\n` +
    `Booking reference: ${booking.bkgRef}\n` +
    `Customer: ${booking.fullName}\n` +
    `Email: ${booking.email}\n` +
    `Service: ${booking.serviceName}\n` +
    `Preferred date: ${preferredDate}\n` +
    `${notesBlockText}` +
    `${trackBlockText}`;

  const notesHtml = notesText
    ? `<p><strong>Notes:</strong><br>${escapeHtml(notesText).replace(/\n/g, "<br>")}</p>`
    : "";

  const trackHtml = trackUrl ? `<p><a href="${trackUrl}">Track booking</a></p>` : "";

  const html =
    `<div style="font-family: Arial, sans-serif; line-height: 1.5;">` +
    `<p><strong>New booking received</strong></p>` +
    `<p>` +
    `<strong>Booking reference:</strong> ${escapeHtml(booking.bkgRef)}<br>` +
    `<strong>Customer:</strong> ${escapeHtml(booking.fullName)}<br>` +
    `<strong>Email:</strong> ${escapeHtml(booking.email)}<br>` +
    `<strong>Service:</strong> ${escapeHtml(booking.serviceName)}<br>` +
    `<strong>Preferred date:</strong> ${escapeHtml(preferredDate)}` +
    `</p>` +
    `${notesHtml}` +
    `${trackHtml}` +
    `</div>`;

  return { subject, text, html };
}
