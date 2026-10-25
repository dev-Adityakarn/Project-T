import { useState } from "react";
import { getPage, LESSONS } from "@/seo";
import { Seo } from "@/components/Seo";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SeoArticle } from "@/components/SeoArticle";
import { TypingTool } from "@/components/TypingTool";
import { AD_SLOTS } from "@/config/adsense";
import { organizationSchema, websiteSchema, webAppSchema, faqSchema, breadcrumbSchema } from "@/seo/schema";

const CONFIG = { kind: "lesson", duration: null };

export default function Lessons() {
  const page = getPage("/typing-lessons");
  const [active, setActive] = useState(LESSONS[0]);

  return (
    <>
      <Seo path={page.path} title={page.title} description={page.description}
        jsonLd={[organizationSchema(), websiteSchema(), webAppSchema(page), faqSchema(page.faqs), breadcrumbSchema(page.breadcrumbs)]} />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8" data-testid="page-typing-lessons">
        <Breadcrumbs crumbs={page.breadcrumbs} />
        <header className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl" data-testid="page-h1">{page.h1}</h1>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">{page.lead}</p>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          <ol className="space-y-2" data-testid="lesson-list">
            {LESSONS.map((l) => (
              <li key={l.id}>
                <button onClick={() => setActive(l)} data-testid={`lesson-btn-${l.id}`}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors duration-200 ${active.id === l.id ? "border-primary bg-primary/10" : "bg-card hover:bg-muted"}`}>
                  <span className="font-pixel text-[10px] text-muted-foreground">{String(l.id).padStart(2, "0")}</span>
                  <span className="mt-1 block text-sm font-semibold">{l.title}</span>
                  <span className="mt-0.5 block font-mono-type text-xs text-muted-foreground">{l.keys}</span>
                </button>
              </li>
            ))}
          </ol>
          <div>
            <div className="mb-4 rounded-xl border bg-card p-4">
              <h2 className="text-lg font-semibold" data-testid="lesson-title">Lesson {active.id}: {active.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Goal: {active.goal} · Keys: <span className="font-mono-type">{active.keys}</span></p>
            </div>
            <TypingTool
              key={active.id}
              config={CONFIG}
              textOverride={active.text}
              label={`Lesson ${active.id}: ${active.title}`}
              testId="tool-lesson"
              resultAdSlot={AD_SLOTS.lessonAfterCompletion}
            />
          </div>
        </div>

        <SeoArticle blocks={page.blocks} faqs={page.faqs} related={page.related} />
      </div>
    </>
  );
}
