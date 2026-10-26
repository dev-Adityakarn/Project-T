import { SITE, SITE_URL, absUrl } from "@/seo";

export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  legalName: SITE.legalName,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}${SITE.logo}`,
  ...(SITE.email ? { email: SITE.email } : {}),
  ...(SITE.founded ? { foundingDate: SITE.founded } : {}),
  ...(SITE.sameAs?.length ? { sameAs: SITE.sameAs } : {}),
});

export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: `${SITE_URL}/`,
  description: SITE.description,
  inLanguage: "en",
  publisher: { "@type": "Organization", name: SITE.name, url: `${SITE_URL}/` },
});

export const webAppSchema = (page) => ({
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: page.title,
  url: absUrl(page.path),
  description: page.description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and a physical keyboard",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: SITE.name, url: `${SITE_URL}/` },
});

export const faqSchema = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

export const breadcrumbSchema = (crumbs) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [{ name: "Home", path: "/" }, ...crumbs].map((c, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: c.name,
    item: absUrl(c.path || c.current || "/"),
  })),
});

export const articleSchema = (post) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: post.title,
  description: post.description,
  datePublished: post.datePublished,
  dateModified: post.dateModified || post.datePublished,
  author: { "@type": "Organization", name: post.author || SITE.name },
  publisher: { "@type": "Organization", name: SITE.name, logo: { "@type": "ImageObject", url: `${SITE_URL}${SITE.logo}` } },
  image: `${SITE_URL}${post.image || SITE.ogImage}`,
  mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(`/blog/${post.slug}`) },
  inLanguage: "en",
});
