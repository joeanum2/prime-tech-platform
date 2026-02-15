import { makeBookingTrackUrl } from "./siteUrl";

const BRAND = {
  name: "Prime Tech Services",
  logoUrl: "https://joetechx.co.uk/branding/logo.png"
};

export type BookingEmailInput = {
  bkgRef: string;
  fullName: string;
  email: string;
  serviceName: string;
  preferredDate: string;
  notes?: string | null;
};

type ContactCustomerEmailInput = {
  fullName: string;
  subject: string;
  message: string;
};

type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

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

function wrapEmail(title: string, body: string) {
  return (
    `<div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; padding: 25px; border: 1px solid #eee; border-radius: 10px; background: #ffffff;">` +
    `<div style="text-align:center; margin-bottom:20px;">` +
    `<img src="${BRAND.logoUrl}" alt="${BRAND.name}" style="max-width:180px; height:auto;" />` +
    `</div>` +
    `<h2 style="color:#0f172a; text-align:center;">${title}</h2>` +
    `<div style="font-size:15px; color:#333; line-height:1.6;">${body}</div>` +
    `<hr style="margin:25px 0;" />` +
    `<p style="font-size:13px; color:#666; text-align:center;">` +
    `&#169; ${new Date().getFullYear()} ${BRAND.name}<br/>` +
    `Professional Repairs | Software | Support` +
    `</p>` +
    `</div>`
  );
}

export function bookingCustomerEmail(input: {
  bkgRef: string;
  fullName: string;
  serviceName: string;
  preferredDate: string;
  notes?: string | null;
  trackUrl?: string | null;
}) {
  const notesBlock = input.notes
    ? `<p><strong>Notes:</strong><br/>${escapeHtml(input.notes).replace(/\n/g, "<br/>")}</p>`
    : "";
  const trackBlock = input.trackUrl
    ? `<p><strong>Track Booking:</strong><br/><a href="${input.trackUrl}">Open booking tracker</a></p>`
    : "";

  return wrapEmail(
    "Booking Confirmation",
    `<p>Hello <strong>${escapeHtml(input.fullName)}</strong>,</p>` +
      `<p>Your booking request has been received successfully.</p>` +
      `<p><strong>Reference:</strong> ${escapeHtml(input.bkgRef)}<br/>` +
      `<strong>Service:</strong> ${escapeHtml(input.serviceName)}<br/>` +
      `<strong>Preferred Date:</strong> ${escapeHtml(input.preferredDate)}</p>` +
      `${notesBlock}` +
      `${trackBlock}` +
      `<p>We will confirm availability within <strong>24 hours</strong>.</p>` +
      `<p>Thank you for choosing Prime Tech Services.</p>`
  );
}

export function contactCustomerEmail(input: ContactCustomerEmailInput) {
  return wrapEmail(
    "Message Received",
    `<p>Hello <strong>${escapeHtml(input.fullName)}</strong>,</p>` +
      `<p>Thank you for contacting Prime Tech Services.</p>` +
      `<p><strong>Subject:</strong> ${escapeHtml(input.subject)}</p>` +
      `<p style="padding:12px; background:#f8fafc; border-radius:8px;">` +
      `${escapeHtml(input.message).replace(/\n/g, "<br/>")}` +
      `</p>` +
      `<p>Our team will respond within <strong>24 hours</strong>.</p>` +
      `<p>Kind regards,<br/>Prime Tech Services Support Team</p>`
  );
}

export function renderBookingCustomerEmail(booking: BookingEmailInput): EmailContent {
  const subject = `Booking received: ${booking.bkgRef}`;
  const preferredDate = formatDate(booking.preferredDate);
  const trackUrl = makeBookingTrackUrl(booking.bkgRef, booking.email);

  const text =
    `Hello ${booking.fullName},\n\n` +
    `Your booking request has been received successfully.\n\n` +
    `Reference: ${booking.bkgRef}\n` +
    `Service: ${booking.serviceName}\n` +
    `Preferred date: ${preferredDate}\n` +
    `${booking.notes ? `Notes: ${booking.notes}\n` : ""}` +
    `${trackUrl ? `Track booking: ${trackUrl}\n` : ""}\n` +
    `We will confirm availability within 24 hours.\n\n` +
    `Thank you for choosing Prime Tech Services.\n`;

  const html = bookingCustomerEmail({
    bkgRef: booking.bkgRef,
    fullName: booking.fullName,
    serviceName: booking.serviceName,
    preferredDate,
    notes: booking.notes,
    trackUrl
  });

  return { subject, text, html };
}

export function renderBookingAdminEmail(booking: BookingEmailInput): EmailContent {
  const subject = `New booking: ${booking.bkgRef}`;
  const trackUrl = makeBookingTrackUrl(booking.bkgRef, booking.email);
  const preferredDate = formatDate(booking.preferredDate);
  const notesText = booking.notes ? booking.notes : "";
  const notesBlockText = notesText ? `Notes: ${notesText}\n` : "";
  const trackBlockText = trackUrl ? `Track your booking:\n${trackUrl}\n` : "";

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
  const trackHtml = trackUrl
    ? `<p><strong>Track your booking:</strong><br><a href="${trackUrl}">Track your booking</a><br>${escapeHtml(trackUrl)}</p>`
    : "";

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

