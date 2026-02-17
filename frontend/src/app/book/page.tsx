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
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200/90 bg-white p-5 shadow-card sm:p-7">
        <BookForm />
      </div>
    </LayoutShell>
  );
}
