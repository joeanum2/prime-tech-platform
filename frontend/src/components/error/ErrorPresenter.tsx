import { CanonicalError } from "@/lib/api";
import { Alert } from "@/components/ui/Alert";

export type ErrorPresenterProps = {
  error: CanonicalError | null | undefined;
  title?: string;
};

export function getErrorMessage(error: CanonicalError | null | undefined) {
  if (!error) return null;
  return error.error.message || "Something went wrong";
}

export function ErrorPresenter({ error, title }: ErrorPresenterProps) {
  if (!error) return null;
  const message = getErrorMessage(error);
  const fieldErrors = error.error.details?.fieldErrors ?? {};
  const fieldEntries = Object.entries(fieldErrors);

  return (
    <Alert variant="error" title={title ?? "We couldn't complete that request"}>
      <p>{message}</p>
      {fieldEntries.length > 0 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {fieldEntries.map(([field, messages]) => (
            <li key={field}>
              <span className="font-semibold">{field}:</span> {messages.join(" ")}
            </li>
          ))}
        </ul>
      ) : null}
    </Alert>
  );
}
