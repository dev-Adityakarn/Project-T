import { getPage } from "@/seo";
import { Seo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SeoArticle } from "@/components/SeoArticle";
import { TypingTool } from "@/components/TypingTool";
import { ContactForm } from "@/components/ContactForm";
import { AD_SLOTS } from "@/config/adsense";
import { buildSchemas } from "@/seo/schema";

const ALTERNATES = {
  "/hindi-typing-test": [
    { hreflang: "en", path: "/typing-test/5-minute" },
    { hreflang: "hi", path: "/hindi-typing-test" },
    { hreflang: "x-default", path: "/typing-test/5-minute" },
  ],
  "/typing-test/5-minute": [
    { hreflang: "en", path: "/typing-test/5-minute" },
    { hreflang: "hi", path: "/hindi-typing-test" },
    { hreflang: "x-default", path: "/typing-test/5-minute" },
  ],
};

export default function ContentPage({ path }) {
  const page = getPage(path);
  const isExamPage =
    page.path === "/hindi-typing-test" ||
    page.path === "/government-exam-typing-test";
  const isPracticePage = page.path.startsWith("/typing-practice");
  const isTypingTestPage = page.path.startsWith("/typing-test");
  const resultAdSlot = isExamPage
    ? AD_SLOTS.examAfterResult
    : isPracticePage
      ? AD_SLOTS.practiceAfterResult
      : isTypingTestPage
        ? AD_SLOTS.typingAfterResult
        : "";
  const schemas = buildSchemas({
    kind: "content",
    path: page.path,
    page,
    faqs: page.faqs || [],
    crumbs: page.breadcrumbs || [],
  });

  return (
    <>
      <Seo path={page.path} title={page.title} description={page.description} lang={page.lang || "en"}
        jsonLd={schemas} alternates={ALTERNATES[page.path] || []} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8" data-testid={`page-${page.key}`}>
        {page.breadcrumbs?.length > 0 && <Breadcrumbs crumbs={page.breadcrumbs} />}
        <header className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl" data-testid="page-h1">{page.h1}</h1>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">{page.lead}</p>
        </header>
        {page.tool && (
          <div className="mx-auto mt-10 max-w-4xl" lang={page.lang || "en"}>
            <TypingTool
              config={page.tool}
              label={page.h1}
              testId={`tool-${page.key}`}
              resultAdSlot={resultAdSlot}
            />
          </div>
        )}
        {page.key === "contact" && <ContactForm />}
        <SeoArticle blocks={page.blocks} faqs={page.faqs} related={page.related} />
      </div>
    </>
  );
}
