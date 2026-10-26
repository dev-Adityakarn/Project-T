import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPost } from "@/seo";
import { api } from "@/lib/api";
import { Seo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleHeader } from "@/components/ArticleHeader";
import { RichArticle } from "@/components/RichArticle";
import { SeoArticle } from "@/components/SeoArticle";
import { AdRailLayout } from "@/components/ads/AdSideRail";
import { AD_SLOTS } from "@/config/adsense";
import NotFound from "@/pages/NotFound";
import { organizationSchema, websiteSchema, articleSchema, faqSchema, breadcrumbSchema } from "@/seo/schema";

export default function BlogPost() {
  const { slug } = useParams();
  const staticPost = getPost(slug);
  const [post, setPost] = useState(staticPost);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (staticPost) { setPost(staticPost); return; }
    api.get(`/posts/${slug}`).then((r) => setPost(r.data)).catch(() => setMissing(true));
  }, [slug, staticPost]);

  if (missing) return <NotFound />;
  if (!post) return <div className="p-20 text-center text-sm text-muted-foreground" data-testid="post-loading">Loading article…</div>;

  const crumbs = [{ name: "Blog", path: "/blog" }, { name: post.title }];
  const schemas = [organizationSchema(), websiteSchema(), articleSchema(post), breadcrumbSchema(crumbs)];
  if (post.faqs?.length) schemas.push(faqSchema(post.faqs));

  const richBody = post.body?.format === "rich-json-v1" && post.body?.doc;
  const lead = richBody ? post.lead : post.excerpt;

  return (
    <>
      <Seo path={`/blog/${post.slug}`} title={post.title} description={post.description} type="article" jsonLd={schemas} />
      <article className="mx-auto max-w-7xl px-4 py-10 sm:px-8" data-testid={`post-${post.slug}`}>
        <AdRailLayout slot={AD_SLOTS.desktopRail}>
          <Breadcrumbs crumbs={crumbs} />
          <ArticleHeader
            title={post.h1 || post.title}
            author={post.author}
            datePublished={post.datePublished}
            dateModified={post.dateModified}
            readingTime={post.readingTime}
            lead={lead}
          />
          {richBody ? (
            <RichArticle
              doc={post.body.doc}
              inArticleAds={[AD_SLOTS.articleMid, AD_SLOTS.articleLower]}
            />
          ) : (
            <SeoArticle
              blocks={post.blocks}
              faqs={post.faqs}
              related={post.related}
              inArticleAds={[AD_SLOTS.articleMid, AD_SLOTS.articleLower]}
            />
          )}
          <div className="mx-auto mt-12 max-w-3xl rounded-2xl border bg-card p-6">
            <h2 className="text-xl font-semibold">Put it into practice</h2>
            <p className="mt-2 text-sm text-muted-foreground">Reading about typing is step one. Take a test, see where you stand, then pick a drill.</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm font-medium">
              <Link to="/typing-test/" className="rounded-full bg-primary px-5 py-2 text-primary-foreground" data-testid="post-cta-test">Take a typing test</Link>
              <Link to="/typing-lessons/" className="rounded-full border px-5 py-2" data-testid="post-cta-lessons">Touch typing lessons</Link>
              <Link to="/blog/" className="rounded-full border px-5 py-2" data-testid="post-cta-blog">All articles</Link>
            </div>
          </div>
        </AdRailLayout>
      </article>
    </>
  );
}
