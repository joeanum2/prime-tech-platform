import Link from "next/link";
import { LayoutShell } from "@/components/layout/LayoutShell";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/Card";
import { buildMetadata } from "@/lib/metadata";
import { articles } from "@/data/articles";

export const metadata = buildMetadata({
  title: "Articles",
  description: "Insights and operational guidance from Prime Tech Services.",
  path: "/articles"
});

export default function ArticlesPage() {
  return (
    <LayoutShell title="Articles" description="Guides, checklists, and release insights.">
      <div className="grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
          <Card key={article.slug}>
            <p className="caption">{article.category}</p>
            <CardTitle className="mt-2">{article.title}</CardTitle>
            <CardDescription className="mt-2">{article.excerpt}</CardDescription>
            <CardFooter>
              <span className="text-xs text-muted">{article.readTime}</span>
              <Link href={`/articles/${article.slug}`} className="text-sm font-semibold">
                Read article
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </LayoutShell>
  );
}
