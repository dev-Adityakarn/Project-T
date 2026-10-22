import { useMemo, useState } from "react";
import {
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { adminApi, formatAdminError } from "@/lib/adminApi";
import { formatDate } from "@/lib/adminFormat";
import { Seo } from "@/components/Seo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ConfirmDialog,
  EmptyState,
  ErrorPanel,
  PageHeader,
  TableSkeleton,
} from "@/components/admin/AdminUI";

const EMPTY_PASSAGE = { title: "", text: "", language: "en", difficulty: "medium" };
const EMPTY_POST = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  meta_title: "",
  meta_description: "",
  author: "Typinger Team",
  published: false,
};

const slugify = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const Field = ({ label, htmlFor, hint, children }) => (
  <div className="space-y-2">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

function PassagesTab() {
  const { data, loading, error, reload } = useAdminFetch("/passages");
  const [form, setForm] = useState(EMPTY_PASSAGE);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(() => data || [], [data]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.title.toLowerCase().includes(term) || row.text.toLowerCase().includes(term));
  }, [rows, search]);

  const save = async (event) => {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      if (editing) await adminApi.put(`/passages/${editing}`, form);
      else await adminApi.post("/passages", form);
      toast.success(editing ? "Passage updated" : "Passage created");
      setForm(EMPTY_PASSAGE);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(formatAdminError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.delete(`/passages/${deleteTarget.id}`);
      toast.success("Passage deleted");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error("Delete failed", { description: formatAdminError(err) });
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{editing ? "Edit passage" : "New passage"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <Field label="Title" htmlFor="passage-title">
              <Input id="passage-title" required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </Field>
            <Field label="Text" htmlFor="passage-text" hint="Minimum 10 characters. Stored verbatim.">
              <Textarea id="passage-text" required rows={7} maxLength={20000} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Language" htmlFor="passage-language">
                <select id="passage-language" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="code">Code</option>
                </select>
              </Field>
              <Field label="Difficulty" htmlFor="passage-difficulty">
                <select id="passage-difficulty" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.difficulty} onChange={(event) => setForm({ ...form, difficulty: event.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </Field>
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {editing ? <Save size={14} /> : <Plus size={14} />} {busy ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
              {editing && (
                <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(null); setForm(EMPTY_PASSAGE); }}>
                  <X size={14} /> Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Passage library</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search passages…" className="h-8 pl-8 text-xs" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-4"><ErrorPanel message={error} onRetry={reload} /></div>
          ) : loading && !data ? (
            <TableSkeleton rows={5} cols={3} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={FileText} title={search ? "No passages match" : "No passages yet"} description="Create a passage to make it available to the API." />
          ) : (
            <ul className="divide-y">
              {filtered.map((passage) => (
                <li key={passage.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{passage.title}</span>
                      <Badge variant="outline" className="text-[9px] uppercase">{passage.language}</Badge>
                      <Badge variant="secondary" className="text-[9px] uppercase">{passage.difficulty}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{passage.text}</p>
                    <div className="mt-1 text-[10px] text-muted-foreground">{formatDate(passage.created_at)}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditing(passage.id); setForm({ title: passage.title, text: passage.text, language: passage.language, difficulty: passage.difficulty }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(passage)} aria-label={`Delete ${passage.title}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this passage?"
        description={`“${deleteTarget?.title || ""}” will be permanently removed. This action is recorded in the audit log.`}
        confirmLabel="Delete passage"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}

function PostsTab() {
  const { data, loading, error, reload } = useAdminFetch("/posts");
  const [form, setForm] = useState(EMPTY_POST);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const rows = useMemo(() => data || [], [data]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => row.title.toLowerCase().includes(term) || row.slug.includes(term));
  }, [rows, search]);

  const save = async (event) => {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      if (editing) await adminApi.put(`/posts/${editing}`, form);
      else await adminApi.post("/posts", form);
      toast.success(editing ? "Post updated" : "Post created");
      setForm(EMPTY_POST);
      setEditing(null);
      reload();
    } catch (err) {
      setFormError(formatAdminError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.delete(`/posts/${deleteTarget.id}`);
      toast.success("Post deleted");
      setDeleteTarget(null);
      reload();
    } catch (err) {
      toast.error("Delete failed", { description: formatAdminError(err) });
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[460px_1fr]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">{editing ? "Edit post" : "New post"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <Field label="Title" htmlFor="post-title">
              <Input
                id="post-title"
                required
                maxLength={140}
                value={form.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((prev) => ({ ...prev, title, slug: editing ? prev.slug : slugify(title) }));
                }}
              />
            </Field>
            <Field label="Slug" htmlFor="post-slug" hint="Lowercase letters, numbers and hyphens only. Must be unique.">
              <Input id="post-slug" required pattern="[a-z0-9-]+" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
            </Field>
            <Field label="Content" htmlFor="post-content" hint="Blank line between paragraphs; prefix a line with “## ” for a heading.">
              <Textarea id="post-content" required rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Excerpt" htmlFor="post-excerpt">
                <Input id="post-excerpt" value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} />
              </Field>
              <Field label="Author" htmlFor="post-author">
                <Input id="post-author" value={form.author} onChange={(event) => setForm({ ...form, author: event.target.value })} />
              </Field>
              <Field label="Meta title" htmlFor="post-meta-title">
                <Input id="post-meta-title" value={form.meta_title} onChange={(event) => setForm({ ...form, meta_title: event.target.value })} />
              </Field>
              <Field label="Meta description" htmlFor="post-meta-description">
                <Input id="post-meta-description" value={form.meta_description} onChange={(event) => setForm({ ...form, meta_description: event.target.value })} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
              Published (visible on the public blog)
            </label>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {editing ? <Save size={14} /> : <Plus size={14} />} {busy ? "Saving…" : editing ? "Update" : "Create"}
              </Button>
              {editing && (
                <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(null); setForm(EMPTY_POST); }}>
                  <X size={14} /> Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 pb-3">
          <CardTitle className="text-sm font-semibold">Blog posts</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search posts…" className="h-8 pl-8 text-xs" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <div className="p-4"><ErrorPanel message={error} onRetry={reload} /></div>
          ) : loading && !data ? (
            <TableSkeleton rows={5} cols={3} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={FileText} title={search ? "No posts match" : "No posts in the database"} description="Editorial guides shipped in the codebase remain available separately." />
          ) : (
            <ul className="divide-y">
              {filtered.map((post) => (
                <li key={post.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{post.title}</span>
                      <Badge variant={post.published ? "default" : "outline"} className="text-[9px] uppercase">
                        {post.published ? "published" : "draft"}
                      </Badge>
                    </div>
                    <div className="mt-1 font-mono-type text-[11px] text-muted-foreground">/blog/{post.slug}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{post.date_published} · {post.author}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setEditing(post.id); setForm({ title: post.title, slug: post.slug, content: post.content, excerpt: post.excerpt, meta_title: post.meta_title, meta_description: post.meta_description, author: post.author, published: post.published }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(post)} aria-label={`Delete ${post.title}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete this post?"
        description={`“${deleteTarget?.title || ""}” will be permanently removed. This action is recorded in the audit log.`}
        confirmLabel="Delete post"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}

export default function Content() {
  return (
    <>
      <Seo path="/admin/content" title="Content management — Typinger" description="Manage passages and blog posts." noindex />
      <PageHeader
        eyebrow="Application management"
        title="Content"
        description="Curate typing passages and publish editorial posts. Every change is audited."
      />
      <Tabs defaultValue="passages" className="mt-6">
        <TabsList>
          <TabsTrigger value="passages">Passages</TabsTrigger>
          <TabsTrigger value="posts">Blog posts</TabsTrigger>
        </TabsList>
        <TabsContent value="passages" className="mt-4"><PassagesTab /></TabsContent>
        <TabsContent value="posts" className="mt-4"><PostsTab /></TabsContent>
      </Tabs>
    </>
  );
}
