"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { getCanonicalError, type CanonicalError } from "@/lib/api";
import { trackSchema, type TrackInput } from "@/lib/validation";

export function TrackForm() {
  const router = useRouter();

  const [values, setValues] = useState<TrackInput>({
    bkgRef: "",
    email: ""
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<CanonicalError | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(name: keyof TrackInput, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validateField(name: keyof TrackInput) {
    const result = trackSchema.safeParse(values);
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

    const parsed = trackSchema.safeParse(values);
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
      // Canonical tracking URL (same behaviour as clicking the email link)
      const booking = parsed.data.bkgRef.trim();
      const email = parsed.data.email.trim();

      router.push(
        `/track?booking=${encodeURIComponent(booking)}&email=${encodeURIComponent(email)}`
      );
    } catch (err) {
      setServerError(getCanonicalError(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Booking reference"
        name="bkgRef"
        value={values.bkgRef}
        onChange={(event) => updateField("bkgRef", event.target.value)}
        onBlur={() => validateField("bkgRef")}
        error={fieldErrors.bkgRef}
        placeholder="BKG-XXXXXXX"
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

      {serverError ? <ErrorPresenter error={serverError} /> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Tracking…" : "Track booking"}
      </Button>
    </form>
  );
}
