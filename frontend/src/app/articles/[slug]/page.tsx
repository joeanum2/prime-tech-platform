import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { buildMetadata } from "@/lib/metadata";
import { articles } from "@/data/articles";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const article = articles.find((item) => item.slug === params.slug);
  if (!article) {
    return buildMetadata({ title: "Article", description: "Article detail." });
  }
  return buildMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/articles/${article.slug}`
  });
}

export default function ArticleDetailPage({ params }: { params: { slug: string } }) {
  const article = articles.find((item) => item.slug === params.slug);
  if (!article) return notFound();

  const related = articles.filter((item) => item.slug !== article.slug).slice(0, 2);

  return (
    <LayoutShell title={article.title} description={article.excerpt}>
      <article className="space-y-4">
        <p className="caption">{article.category} • {article.readTime}</p>
        {article.content.map((paragraph) => (
          <p key={paragraph} className="text-sm text-muted">
            {paragraph}
          </p>
        ))}
      </article>

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="section-title">Related articles</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.slug}
                href={`/articles/${item.slug}`}
                className="card p-5 hover:border-primary"
              >
                <p className="caption">{item.category}</p>
                <h3 className="mt-2 text-lg font-semibold text-text">{item.title}</h3>
                <p className="mt-2 text-sm text-muted">{item.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </LayoutShell>
  );
}
