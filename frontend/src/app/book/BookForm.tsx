"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { clientFetch, getCanonicalError, type CanonicalError } from "@/lib/api";
import { bookingSchema } from "@/lib/validation";
import { services } from "@/data/services";

type BookingFormValues = {
  fullName: string;
  email: string;
  serviceSlug: string;
  preferredDate: string; // YYYY-MM-DD
  notes?: string;
};

export function BookForm() {
  const searchParams = useSearchParams();
  const servicePreset = searchParams.get("service") ?? "";

  const serviceOptions = useMemo(() => services, []);

  const initialValues: BookingFormValues = {
    fullName: "",
    email: "",
    serviceSlug: servicePreset,
    preferredDate: "",
    notes: ""
  };

  const [values, setValues] = useState<BookingFormValues>(initialValues);

  // Keep serviceSlug in sync with URL preset (without setState during render)
  useEffect(() => {
    setValues((prev) => ({
      ...prev,
      serviceSlug: servicePreset || prev.serviceSlug
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicePreset]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<CanonicalError | null>(null);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => setSuccessMessage(null), 12000);
    return () => window.clearTimeout(timeout);
  }, [successMessage]);

  function updateField(name: keyof BookingFormValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validateField(name: keyof BookingFormValues) {
    const mapped = {
      fullName: values.fullName,
      email: values.email,
      serviceSlug: values.serviceSlug,
      preferredDate: values.preferredDate,
      notes: values.notes
    };

    const result = bookingSchema.safeParse(mapped);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === name);
      if (issue) {
        setFieldErrors((prev) => ({ ...prev, [name]: issue.message }));
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    setFallbackError(null);
    setSuccessMessage(null);

    const payload = {
      fullName: values.fullName,
      email: values.email,
      serviceSlug: values.serviceSlug,
      preferredDate: values.preferredDate,
      notes: values.notes
    };

    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = String(issue.path[0]);
        errors[key] = issue.message;
      });

      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await clientFetch<{ booking?: { bkgRef?: string }; bkgRef?: string }>(
        "/api/bookings",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed.data)
        }
      );

      const ref = res?.booking?.bkgRef ?? res?.bkgRef;
      const referenceLine = ref ? `Booking received. Reference: ${ref}.` : "Booking received.";
      setSuccessMessage(
        `${referenceLine}
We will confirm availability within 24 hours.
A confirmation email has been sent to your inbox.`
      );

      // ✅ Reset form after success (keep service preset)
      setValues({ ...initialValues, serviceSlug: servicePreset });
      setFieldErrors({});
      setServerError(null);
      setFallbackError(null);
    } catch (err) {
      const canon = getCanonicalError(err);
      setServerError(canon);
      if (!canon?.error?.message) {
        setFallbackError("We could not submit your booking. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Full name"
        name="fullName"
        value={values.fullName}
        onChange={(event) => updateField("fullName", event.target.value)}
        onBlur={() => validateField("fullName")}
        error={fieldErrors.fullName}
        required
      />

      <Input
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={(event) => updateField("email", event.target.value)}
        onBlur={() => validateField("email")}
        error={fieldErrors.email}
        required
      />

      <Select
        label="Service"
        name="serviceSlug"
        value={values.serviceSlug}
        onChange={(event) => updateField("serviceSlug", event.target.value)}
        onBlur={() => validateField("serviceSlug")}
        error={fieldErrors.serviceSlug}
        required
      >
        <option value="">Select a service</option>
        {serviceOptions.map((service) => (
          <option key={service.slug} value={service.slug}>
            {service.name}
          </option>
        ))}
      </Select>

      <Input
        label="Preferred date"
        name="preferredDate"
        type="date"
        value={values.preferredDate}
        onChange={(event) => updateField("preferredDate", event.target.value)}
        onBlur={() => validateField("preferredDate")}
        error={fieldErrors.preferredDate}
        required
      />

      <Textarea
        label="Notes"
        name="notes"
        rows={4}
        value={values.notes ?? ""}
        onChange={(event) => updateField("notes", event.target.value)}
        description="Share key details or constraints."
      />

      {serverError ? <ErrorPresenter error={serverError} /> : null}
      {fallbackError ? <Alert variant="error">{fallbackError}</Alert> : null}
      {successMessage ? (
        <Alert variant="success" className="font-medium text-base whitespace-pre-line">
          {successMessage}
        </Alert>
      ) : null}

      <Button
        type="submit"
        disabled={submitting}
        className="pt-btn-neon w-full flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          "Submit booking"
        )}
      </Button>
    </form>
  );
}
