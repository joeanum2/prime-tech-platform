import { z } from "zod";

export const identifierPatterns = {
  ORD: /^ORD-[0-9]{8}-[A-Z0-9]{4}$/,
  INV: /^INV-[0-9]{4}-[0-9]{6}$/,
  RCP: /^RCP-[0-9]{4}-[0-9]{6}$/,
  LIC: /^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/,
  BKG: /^BKG-[A-Z0-9]{8}$/
};

export const bookingSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  serviceSlug: z.string().min(1, "Select a service"),
  preferredDate: z.string().min(1, "Select a preferred date"),
  notes: z.string().max(1000).optional()
});

export const trackSchema = z.object({
  bkgRef: z
    .string()
    .regex(identifierPatterns.BKG, "Enter a valid booking reference (BKG-XXXXXXXX)"),
  email: z.string().email("Enter a valid email")
});

export const contactSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Enter a valid email"),
  subject: z.string().min(3, "Subject is required"),
  message: z.string().min(10, "Tell us a little more").max(4000, "Message is too long")
});

export const identifierSchemas = {
  ordId: z.string().regex(identifierPatterns.ORD, "Invalid order ID"),
  invNumber: z.string().regex(identifierPatterns.INV, "Invalid invoice number"),
  rcpNumber: z.string().regex(identifierPatterns.RCP, "Invalid receipt number"),
  licKey: z.string().regex(identifierPatterns.LIC, "Invalid licence key"),
  bkgRef: z.string().regex(identifierPatterns.BKG, "Invalid booking reference")
};

export type BookingInput = z.infer<typeof bookingSchema>;
export type TrackInput = z.infer<typeof trackSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
