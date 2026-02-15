"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ErrorPresenter } from "@/components/error/ErrorPresenter";
import { clientFetch, getCanonicalError, type CanonicalError } from "@/lib/api";
import { contactSchema, type ContactInput } from "@/lib/validation";

export function ContactForm() {
  const [values, setValues] = useState<ContactInput>({
    fullName: "",
    email: "",
    subject: "",
    message: ""
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<CanonicalError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField(name: keyof ContactInput, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function validateField(name: keyof ContactInput) {
    const result = contactSchema.safeParse(values);
    if (!result.success) {
      const issue = result.error.issues.find((item) => item.path[0] === name);
      if (issue) setFieldErrors((prev) => ({ ...prev, [name]: issue.message }));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setServerError(null);
    setSuccessMessage(null);

    const parsed = contactSchema.safeParse(values);
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
      const res = await clientFetch<{ ok: boolean }>("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data)
      });

      if (res?.ok) {
        setSuccessMessage("Message sent. We will get back to you shortly.");
        setValues({ fullName: "", email: "", subject: "", message: "" });
        setFieldErrors({});
        setServerError(null);
      } else {
        setSuccessMessage("Message sent.");
      }
    } catch (err) {
      setServerError(getCanonicalError(err));
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

      <Input
        label="Subject"
        name="subject"
        value={values.subject}
        onChange={(event) => updateField("subject", event.target.value)}
        onBlur={() => validateField("subject")}
        error={fieldErrors.subject}
        required
      />

      <Textarea
        label="Message"
        name="message"
        value={values.message}
        onChange={(event) => updateField("message", event.target.value)}
        onBlur={() => validateField("message")}
        error={fieldErrors.message}
        required
        rows={6}
        placeholder="Tell us how we can help…"
      />

      {serverError ? <ErrorPresenter error={serverError} /> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
