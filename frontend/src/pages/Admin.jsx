import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, Flag, Plus, Save, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { Seo } from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TABS = [
  { id: "passages", label: "Passages" },
  { id: "posts", label: "Blog posts" },
  { id: "results", label: "Moderation" },
];

const EMPTY_PASSAGE = { title: "", text: "", language: "en", difficulty: "medium" };
const EMPTY_POST = { title: "", slug: "", content: "", excerpt: "", meta_title: "", meta_description: "", author: "KeyQuest Team", published: false };

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    <div className="mt-1">{children}</div>
  </label>
);

const AdminLogin = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto mt-24 max-w-sm rounded-2xl border bg-card p-8" data-testid="admin-login-form">
      <h1 className="text-2xl font-bold">Admin sign in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Restricted area. Sign-in attempts are rate limited.</p>
      <div className="mt-6 space-y-4">
        <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="admin-email-input" /></Field>
        <Field label="Password"><Input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="admin-password-input" /></Field>
      </div>
      {error && <p className="mt-4 text-sm text-destructive" data-testid="admin-login-error">{error}</p>}
      <Button type="submit" disabled={busy} className="mt-6 w-full rounded-full font-semibold" data-testid="admin-login-btn">
        {busy ? <Loader2 className="animate-spin" size={16} /> : "Sign in"}
      </Button>
    </form>
  );
};

const PassagesTab = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_PASSAGE);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => { api.get("/admin/passages").then((r) => setRows(r.data)).catch((e) => setError(formatApiError(e))); }, []);
  useEffect(load, [load]);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) await api.put(`/admin/passages/${editing}`, form);
      else await api.post("/admin/passages", form);
      setForm(EMPTY_PASSAGE);
      setEditing(null);
      load();
    } catch (err) { setError(formatApiError(err)); }
  };

  const remove = async (id) => { await api.delete(`/admin/passages/${id}`).catch((e) => setError(formatApiError(e))); load(); };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]" data-testid="admin-passages">
      <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">{editing ? "Edit passage" : "New passage"}</h2>
        <Field label="Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="passage-title-input" /></Field>
        <Field label="Text"><Textarea required rows={6} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} data-testid="passage-text-input" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Language">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} data-testid="passage-language-select">
              <option value="en">en</option><option value="hi">hi</option><option value="code">code</option>
            </select>
          </Field>
          <Field label="Difficulty">
            <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} data-testid="passage-difficulty-select">
              <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
            </select>
          </Field>
        </div>
        {error && <p className="text-sm text-destructive" data-testid="admin-passage-error">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" className="rounded-full font-semibold" data-testid="passage-save-btn">{editing ? <Save size={16} /> : <Plus size={16} />} {editing ? "Update" : "Create"}</Button>
          {editing && <Button type="button" variant="outline" className="rounded-full" onClick={() => { setEditing(null); setForm(EMPTY_PASSAGE); }} data-testid="passage-cancel-btn"><X size={16} /> Cancel</Button>}
        </div>
      </form>
      <div className="space-y-2" data-testid="admin-passage-list">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No passages yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4" data-testid={`passage-row-${r.id}`}>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{r.title}</div>
              <div className="mt-1 truncate font-mono-type text-xs text-muted-foreground">{r.text}</div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{r.language} · {r.difficulty}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setEditing(r.id); setForm({ title: r.title, text: r.text, language: r.language, difficulty: r.difficulty }); }} data-testid={`passage-edit-${r.id}`}>Edit</Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => remove(r.id)} data-testid={`passage-delete-${r.id}`}><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PostsTab = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_POST);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => { api.get("/admin/posts").then((r) => setRows(r.data)).catch((e) => setError(formatApiError(e))); }, []);
  useEffect(load, [load]);

  const save = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editing) await api.put(`/admin/posts/${editing}`, form);
      else await api.post("/admin/posts", form);
      setForm(EMPTY_POST);
      setEditing(null);
      load();
    } catch (err) { setError(formatApiError(err)); }
  };

  const remove = async (id) => { await api.delete(`/admin/posts/${id}`).catch((e) => setError(formatApiError(e))); load(); };

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]" data-testid="admin-posts">
      <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-lg font-semibold">{editing ? "Edit post" : "New post"}</h2>
        <Field label="Title"><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} data-testid="post-title-input" /></Field>
        <Field label="Slug"><Input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} data-testid="post-slug-input" /></Field>
        <Field label="Content (blank line between paragraphs, '## ' for headings)"><Textarea required rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} data-testid="post-content-input" /></Field>
        <Field label="Excerpt"><Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} data-testid="post-excerpt-input" /></Field>
        <Field label="Meta title"><Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} data-testid="post-meta-title-input" /></Field>
        <Field label="Meta description"><Input value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} data-testid="post-meta-description-input" /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} data-testid="post-published-checkbox" /> Published
        </label>
        {error && <p className="text-sm text-destructive" data-testid="admin-post-error">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" className="rounded-full font-semibold" data-testid="post-save-btn">{editing ? <Save size={16} /> : <Plus size={16} />} {editing ? "Update" : "Create"}</Button>
          {editing && <Button type="button" variant="outline" className="rounded-full" onClick={() => { setEditing(null); setForm(EMPTY_POST); }} data-testid="post-cancel-btn"><X size={16} /> Cancel</Button>}
        </div>
      </form>
      <div className="space-y-2" data-testid="admin-post-list">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No posts in the database yet. The five editorial guides are shipped in the codebase.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4" data-testid={`post-row-${r.slug}`}>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{r.title}</div>
              <div className="mt-1 font-mono-type text-xs text-muted-foreground">/blog/{r.slug}</div>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">{r.published ? "published" : "draft"} · {r.date_published}</div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setEditing(r.id); setForm({ title: r.title, slug: r.slug, content: r.content, excerpt: r.excerpt, meta_title: r.meta_title, meta_description: r.meta_description, author: r.author, published: r.published }); }} data-testid={`post-edit-${r.slug}`}>Edit</Button>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => remove(r.id)} data-testid={`post-delete-${r.slug}`}><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ResultsTab = () => {
  const [rows, setRows] = useState([]);
  const load = useCallback(() => { api.get("/admin/results", { params: { limit: 100 } }).then((r) => setRows(r.data)).catch(() => setRows([])); }, []);
  useEffect(load, [load]);

  const flag = async (id, flagged) => { await api.post(`/admin/results/${id}/flag`, { flagged }).catch(() => {}); load(); };
  const remove = async (id) => { await api.delete(`/admin/results/${id}`).catch(() => {}); load(); };

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card" data-testid="admin-results">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left text-[10px] uppercase tracking-widest text-muted-foreground">
          <tr><th className="p-3">Player</th><th className="p-3">Game</th><th className="p-3">Diff</th><th className="p-3">Score</th><th className="p-3">WPM</th><th className="p-3">Acc</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t" data-testid={`result-row-${r.id}`}>
              <td className="p-3">{r.user_name}</td>
              <td className="p-3 font-mono-type text-xs">{r.game_id}</td>
              <td className="p-3">{r.difficulty}</td>
              <td className="p-3 font-mono-type">{r.score}</td>
              <td className="p-3 font-mono-type">{r.wpm}</td>
              <td className="p-3 font-mono-type">{r.accuracy}%</td>
              <td className="p-3">{r.flagged ? <span className="text-destructive" data-testid={`result-flagged-${r.id}`}>flagged</span> : "ok"}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => flag(r.id, !r.flagged)} data-testid={`result-flag-${r.id}`}><Flag size={14} /> {r.flagged ? "Unflag" : "Flag"}</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => remove(r.id)} data-testid={`result-delete-${r.id}`}><Trash2 size={14} /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-5 text-sm text-muted-foreground">No results recorded yet.</p>}
    </div>
  );
};

export default function Admin() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("passages");

  const head = <Seo path="/admin" title="KeyQuest admin" description="Restricted administration area for KeyQuest content and leaderboard moderation." noindex />;

  if (user === null) return <>{head}<div className="p-24 text-center text-sm text-muted-foreground" data-testid="admin-loading">Checking session…</div></>;
  if (!user) return <>{head}<AdminLogin /></>;
  if (user.role !== "admin") {
    return <>{head}<div className="p-24 text-center" data-testid="admin-forbidden"><h1 className="text-2xl font-bold">Admin access required</h1><p className="mt-2 text-sm text-muted-foreground">This account does not have administrator rights.</p></div></>;
  }

  return (
    <>
      {head}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8" data-testid="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">KeyQuest admin</h1>
          <Button variant="outline" className="rounded-full" onClick={logout} data-testid="admin-logout-btn">Sign out</Button>
        </div>
        <div className="mt-6 flex gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors duration-200 ${tab === t.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-8">
          {tab === "passages" && <PassagesTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "results" && <ResultsTab />}
        </div>
      </div>
    </>
  );
}
