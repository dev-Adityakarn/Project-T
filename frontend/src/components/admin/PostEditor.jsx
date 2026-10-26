import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Eye, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi, formatAdminError } from "@/lib/adminApi";
import {
  CONTENT_FORMAT_LEGACY,
  CONTENT_FORMAT_RICH,
  canonicalizeRichDoc,
  docToText,
  emptyRichDoc,
  isRichDoc,
  leadTextFromDoc,
  legacyTextToBlocks,
  legacyTextToDoc,
  readingTimeFromText,
  validateRichDoc,
} from "@/lib/richText";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { ArticleHeader } from "@/components/ArticleHeader";
import { RichArticle } from "@/components/RichArticle";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { SeoArticle } from "@/components/SeoArticle";
import { ConfirmDialog } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const formFromPost = (post) => {
  if (!post) {
    return {
      title: "",
      slug: "",
      excerpt: "",
      meta_title: "",
      meta_description: "",
      author: "Typinger Team",
      published: false,
      content: "",
      content_format: CONTENT_FORMAT_RICH,
      content_json: emptyRichDoc(),
    };
  }
  const rich =
    post.content_format === CONTENT_FORMAT_RICH && isRichDoc(post.content_json);
  return {
    title: post.title || "",
    slug: post.slug || "",
    excerpt: post.excerpt || "",
    meta_title: post.meta_title || "",
    meta_description: post.meta_description || "",
    author: post.author || "Typinger Team",
    published: Boolean(post.published),
    content: post.content || "",
    content_format: rich ? CONTENT_FORMAT_RICH : CONTENT_FORMAT_LEGACY,
    content_json: rich ? canonicalizeRichDoc(post.content_json) : emptyRichDoc(),
  };
};

const metadataKeys = [
  "title",
  "slug",
  "excerpt",
  "meta_title",
  "meta_description",
  "author",
  "published",
];

const bodySnapshot = (form) =>
  JSON.stringify({
    content_format: form.content_format,
    content: form.content,
    content_json: form.content_json,
  });

const Field = ({ label, htmlFor, hint, children }) => (
  <div className="space-y-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export function PostEditor({
  post = null,
  onSaved,
  onCancel,
  onDirtyChange,
}) {
  const [form, setForm] = useState(() => formFromPost(post));
  const [baseline, setBaseline] = useState(() => formFromPost(post));
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewErrors, setPreviewErrors] = useState([]);
  const busyRef = useRef(false);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline],
  );
  const bodyDirty = useMemo(
    () => bodySnapshot(form) !== bodySnapshot(baseline),
    [form, baseline],
  );
  const bodyErrors = useMemo(
    () =>
      form.content_format === CONTENT_FORMAT_RICH
        ? validateRichDoc(form.content_json)
        : [],
    [form.content_format, form.content_json],
  );

  const { open: leaveOpen, proceed: proceedLeave, reset: resetLeave } =
    useUnsavedChanges(dirty);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const openPreview = () => {
    setPreviewErrors(bodyErrors);
    setPreviewOpen(true);
  };

  const convertLegacy = () => {
    setForm((prev) => ({
      ...prev,
      content_format: CONTENT_FORMAT_RICH,
      content_json: legacyTextToDoc(prev.content),
    }));
    setFormError("");
    toast.info("Legacy body converted. Review the preview, then save.");
  };

  const buildPayload = () => {
    if (!post) {
      const payload = {};
      metadataKeys.forEach((key) => {
        payload[key] = form[key];
      });
      payload.content_format = form.content_format;
      if (form.content_format === CONTENT_FORMAT_RICH) {
        payload.content_json = canonicalizeRichDoc(form.content_json);
      } else {
        payload.content = form.content;
      }
      return payload;
    }

    const payload = {};
    metadataKeys.forEach((key) => {
      if (form[key] !== baseline[key]) payload[key] = form[key];
    });
    if (bodyDirty) {
      if (form.content_format === CONTENT_FORMAT_RICH) {
        payload.content_format = CONTENT_FORMAT_RICH;
        payload.content_json = canonicalizeRichDoc(form.content_json);
      } else {
        payload.content_format = CONTENT_FORMAT_LEGACY;
        payload.content = form.content;
      }
    }
    return payload;
  };

  const save = async (event) => {
    event.preventDefault();
    if (busyRef.current) return;

    const errors = [];
    if (form.title.trim().length < 3) {
      errors.push("Title must be at least 3 characters.");
    }
    if (!/^[a-z0-9-]{3,140}$/.test(form.slug)) {
      errors.push(
        "Slug must be 3–140 characters using lowercase letters, numbers and hyphens.",
      );
    }
    if (form.content_format === CONTENT_FORMAT_RICH) {
      errors.push(...bodyErrors);
    } else if (form.content.trim().length < 20) {
      errors.push("Content must contain at least 20 characters of text.");
    }
    if (errors.length) {
      setFormError([...new Set(errors)].join(" "));
      return;
    }

    const payload = buildPayload();
    if (!post && !Object.keys(payload).length) {
      setFormError("There are no changes to save.");
      return;
    }
    if (post && !Object.keys(payload).length) {
      setFormError("There are no changes to save.");
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setFormError("");
    try {
      if (post) {
        await adminApi.put(`/posts/${post.id}`, payload);
        setBaseline(form);
        toast.success("Post updated");
        onSaved?.(null);
      } else {
        const { data } = await adminApi.post("/posts", payload);
        const next = formFromPost(data);
        setForm(next);
        setBaseline(next);
        toast.success("Post created");
        onSaved?.(data);
      }
    } catch (err) {
      // Keep the form intact so a failed save never loses the draft.
      setFormError(formatAdminError(err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const lead =
    form.content_format === CONTENT_FORMAT_RICH
      ? leadTextFromDoc(form.content_json)
      : form.excerpt;
  const readingTime = readingTimeFromText(
    form.content_format === CONTENT_FORMAT_RICH
      ? docToText(form.content_json)
      : form.content,
  );
  const previewTitle = form.title.trim() || "Untitled article";
  const previewDate =
    post?.date_published || new Date().toISOString().slice(0, 10);

  return (
    <>
      <form onSubmit={save} className="space-y-4" data-testid="post-editor">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" htmlFor="post-title">
            <Input
              id="post-title"
              required
              maxLength={140}
              value={form.title}
              disabled={busy}
              onChange={(event) => {
                const title = event.target.value;
                setForm((prev) => ({
                  ...prev,
                  title,
                  slug: post ? prev.slug : slugify(title),
                }));
              }}
            />
          </Field>
          <Field
            label="Slug"
            htmlFor="post-slug"
            hint="Lowercase letters, numbers and hyphens only. Must be unique."
          >
            <Input
              id="post-slug"
              required
              pattern="[a-z0-9-]+"
              maxLength={140}
              value={form.slug}
              disabled={busy}
              onChange={(event) => update({ slug: event.target.value })}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label htmlFor="post-content">Content</Label>
              <p className="text-[11px] text-muted-foreground">
                {form.content_format === CONTENT_FORMAT_RICH
                  ? "Use the toolbar for headings, emphasis, links, lists and quotes. H1 is the article title."
                  : "Legacy plain text is read-only. Convert it to rich text to edit formatting."}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={openPreview}
              disabled={busy}
              data-testid="preview-button"
            >
              <Eye size={14} /> Preview
            </Button>
          </div>

          {form.content_format === CONTENT_FORMAT_RICH ? (
            <RichTextEditor
              value={form.content_json}
              onChange={(content_json) => update({ content_json })}
              onError={setFormError}
            />
          ) : (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {form.content || "This post has no body text."}
              </pre>
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="min-w-0 flex-1 text-xs text-amber-900 dark:text-amber-200">
                  Converting keeps the original plain text stored alongside the
                  rich document. You can review the result before saving.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={convertLegacy}
                  disabled={busy}
                  data-testid="convert-legacy"
                >
                  <ArrowRightLeft size={14} /> Convert to rich text
                </Button>
              </div>
            </div>
          )}
          {bodyErrors.length > 0 && form.content_format === CONTENT_FORMAT_RICH && (
            <p className="text-[11px] text-muted-foreground">
              {bodyErrors[0]}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Excerpt"
            htmlFor="post-excerpt"
            hint="Used on cards and in metadata. Rich articles use the explicit Lead paragraph for the header."
          >
            <Input
              id="post-excerpt"
              value={form.excerpt}
              disabled={busy}
              onChange={(event) => update({ excerpt: event.target.value })}
            />
          </Field>
          <Field label="Author" htmlFor="post-author">
            <Input
              id="post-author"
              value={form.author}
              disabled={busy}
              onChange={(event) => update({ author: event.target.value })}
            />
          </Field>
          <Field label="Meta title" htmlFor="post-meta-title">
            <Input
              id="post-meta-title"
              value={form.meta_title}
              disabled={busy}
              onChange={(event) => update({ meta_title: event.target.value })}
            />
          </Field>
          <Field label="Meta description" htmlFor="post-meta-description">
            <Input
              id="post-meta-description"
              value={form.meta_description}
              disabled={busy}
              onChange={(event) =>
                update({ meta_description: event.target.value })
              }
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.published}
            disabled={busy}
            onChange={(event) => update({ published: event.target.checked })}
          />
          Published (visible on the public blog)
        </label>

        {formError && (
          <p className="text-xs text-destructive" role="alert">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={busy || !dirty}>
            {post ? <Save size={14} /> : <Plus size={14} />}{" "}
            {busy ? "Saving…" : post ? "Update" : "Create"}
          </Button>
          {post && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={busy}
            >
              <X size={14} /> Cancel
            </Button>
          )}
        </div>
      </form>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] max-w-4xl gap-0 overflow-y-auto p-0">
          <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 px-5 py-4 text-left backdrop-blur">
            <DialogTitle>Draft preview</DialogTitle>
            <DialogDescription>
              Current unsaved form values. Nothing is published from this
              preview.
            </DialogDescription>
          </DialogHeader>
          <div className="px-4 py-8 sm:px-8" data-testid="post-preview">
            {previewErrors.length > 0 && (
              <div
                role="alert"
                className="mx-auto mb-6 max-w-3xl rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
              >
                <p className="font-medium">Fix these before saving:</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {previewErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            <ArticleHeader
              title={previewTitle}
              author={form.author}
              datePublished={previewDate}
              readingTime={readingTime}
              lead={lead}
            />
            {form.content_format === CONTENT_FORMAT_RICH ? (
              <RichArticle doc={canonicalizeRichDoc(form.content_json)} />
            ) : (
              <SeoArticle
                blocks={legacyTextToBlocks(form.content)}
                faqs={[]}
                related={[]}
                inArticleAds={[]}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          if (!open) resetLeave();
        }}
        title="Leave without saving?"
        description="This post has unsaved changes. If you leave now, those changes will be lost."
        confirmLabel="Discard and leave"
        destructive
        onConfirm={proceedLeave}
      />
    </>
  );
}
