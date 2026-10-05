import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock } from "lucide-react";
import { getPage, POSTS } from "@/seo";
import { api } from "@/lib/api";
import { Seo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SeoArticle } from "@/components/SeoArticle";
import { organizationSchema, websiteSchema, breadcrumbSchema } from "@/seo/schema";

const Card = ({ p, i }) => (
  <Link to={`/blog/${p.slug}`} data-testid={`blog-card-${p.slug}`} style={{ animationDelay: `${i * 60}ms` }}
    className="rise-in group flex flex-col rounded-2xl border bg-card p-6 transition-transform duration-300 hover:-translate-y-1">
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
      <span className="flex items-center gap-1"><CalendarDays size={12} /> {p.datePublished}</span>
      {p.readingTime && <span className="flex items-center gap-1"><Clock size={12} /> {p.readingTime}</span>}
    </div>
    <h2 className="mt-3 text-xl font-semibold group-hover:text-primary">{p.title}</h2>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.excerpt || p.description}</p>
    <span className="mt-5 text-sm font-medium text-primary">Read the guide →</span>
  </Link>
);

export default function Blog() {
  const page = getPage("/blog");
  const [extra, setExtra] = useState([]);

  useEffect(() => {
    api.get("/posts").then((r) => setExtra(r.data.filter((p) => !POSTS.some((s) => s.slug === p.slug)))).catch(() => setExtra([]));
  }, []);

  const posts = [...POSTS, ...extra].sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1));

  return (
    <>
      <Seo path={page.path} title={page.title} description={page.description}
        jsonLd={[organizationSchema(), websiteSchema(), breadcrumbSchema(page.breadcrumbs)]} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8" data-testid="page-blog">
        <Breadcrumbs crumbs={page.breadcrumbs} />
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl" data-testid="page-h1">{page.h1}</h1>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">{page.lead}</p>
        </header>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="blog-grid">
          {posts.map((p, i) => <Card key={p.slug} p={p} i={i} />)}
        </div>
        <SeoArticle blocks={page.blocks} faqs={page.faqs} related={page.related} />
      </div>
    </>
  );
}
