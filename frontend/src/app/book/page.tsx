import { LayoutShell } from "@/components/layout/LayoutShell";
import { buildMetadata } from "@/lib/metadata";
import { BookForm } from "@/app/book/BookForm";

export const metadata = buildMetadata({
  title: "Book",
  description: "Request a service booking with Prime Tech Services.",
  path: "/book"
});

export default function BookPage() {
  return (
    <LayoutShell
      title="Book a service"
      description="Tell us what you need and we will confirm availability."
    >
      <BookForm />
    </LayoutShell>
  );
}
