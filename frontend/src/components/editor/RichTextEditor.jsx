import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Node, mergeAttributes } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import {
  Bold,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link2,
  List,
  ListOrdered,
  Megaphone,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Undo2,
} from "lucide-react";
import {
  canonicalizeRichDoc,
  normalizeHref,
  safeHref,
  sanitizePastedHtml,
} from "@/lib/richText";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const Lead = Node.create({
  name: "lead",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: "p[data-lead]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, { "data-lead": "true" }),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.editor.state.selection.$from.parent.type.name !== "lead") {
          return false;
        }
        return this.editor.chain().splitBlock().setParagraph().run();
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, _oldState, newState) => {
          const paragraph = newState.schema.nodes.paragraph;
          if (!paragraph) return null;

          const leads = [];
          newState.doc.descendants((node, pos) => {
            if (node.type.name === "lead") leads.push(pos);
            return true;
          });

          const invalid = leads.filter((pos) => pos !== 0);
          if (!invalid.length) return null;

          const tr = newState.tr;
          invalid
            .slice()
            .sort((a, b) => b - a)
            .forEach((pos) => tr.setNodeMarkup(pos, paragraph));
          return tr;
        },
      }),
    ];
  },
});

const ToolbarButton = ({ label, active, disabled, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active || undefined}
    disabled={disabled}
    onClick={onClick}
    className={[
      "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-2 text-xs transition-colors",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      disabled ? "cursor-not-allowed opacity-40" : "",
    ]
      .filter(Boolean)
      .join(" ")}
  >
    {children}
  </button>
);

const ToolbarDivider = () => (
  <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
);

function LinkControl({ editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const currentHref = editor.getAttributes("link")?.href || "";
  const linkActive = editor.isActive("link");

  const openPopover = () => {
    setUrl(currentHref);
    setError("");
    setOpen(true);
  };

  const apply = () => {
    if (editor.state.selection.empty && !linkActive) {
      setError("Select the text you want to link first.");
      return;
    }
    const href = safeHref(normalizeHref(url));
    if (!href) {
      setError("Use https, http, mailto, or a path beginning with /.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setOpen(false);
    setError("");
  };

  const remove = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
    setError("");
  };

  return (
    <Popover open={open} onOpenChange={(next) => (next ? openPopover() : setOpen(false))}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Link"
          aria-label="Link"
          aria-pressed={linkActive || undefined}
          className={[
            "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs transition-colors",
            linkActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          ].join(" ")}
        >
          <Link2 size={15} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply();
          }}
        >
          <label className="text-[11px] font-medium" htmlFor="editor-link-url">
            Link URL
          </label>
          <input
            id="editor-link-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com or /typing-test/"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={!linkActive}
              className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-40"
            >
              Remove link
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Apply
            </button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
  onError,
}) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          isAllowedUri: (url) => Boolean(safeHref(normalizeHref(url))),
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      Placeholder.configure({
        placeholder: "Write the article. Use the toolbar for headings, lists, quotes and links.",
      }),
      Lead,
    ],
    [],
  );

  const editor = useEditor({
    extensions,
    content: value,
    editable: !readOnly,
    shouldRerenderOnTransaction: true,
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        "aria-label": "Article body",
      },
      transformPastedHTML: sanitizePastedHtml,
      transformPasted: (slice) => {
        // ProseMirror normally merges the first pasted block into the current
        // paragraph.  That is fine for prose, but it would silently turn a
        // pasted heading, list, quote or rule into plain text.  Keep the block
        // boundary when the clipboard starts with structured content.
        const first = slice.content.firstChild;
        const structured = new Set([
          "heading",
          "bulletList",
          "orderedList",
          "blockquote",
          "horizontalRule",
        ]);
        if (first && structured.has(first.type.name) && slice.openStart > 0) {
          return new Slice(slice.content, 0, slice.openEnd);
        }
        return slice;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(canonicalizeRichDoc(current.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || !value) return;
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(value)) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  const selection = editor.state.selection;
  const topLevelIndex =
    selection.$from.depth >= 1 ? selection.$from.index(0) : 0;
  const canMakeLead =
    editor.isActive("lead") ||
    (topLevelIndex === 0 && editor.isActive("paragraph"));

  const toggleLead = () => {
    if (editor.isActive("lead")) {
      editor.chain().focus().setParagraph().run();
      return;
    }
    if (!canMakeLead) {
      onError?.(
        "The lead paragraph must be the first body block. Move this paragraph to the top first.",
      );
      return;
    }
    editor.chain().focus().setNode("lead").run();
  };

  const setHeading = (level) => {
    if (editor.isActive("heading", { level })) {
      editor.chain().focus().setParagraph().run();
    } else {
      editor.chain().focus().setHeading({ level }).run();
    }
  };

  if (readOnly) {
    return (
      <div className="rich-editor rounded-xl border bg-muted/10" data-testid="rich-editor-readonly">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="rich-editor overflow-hidden rounded-xl border bg-background" data-testid="rich-editor">
      <div
        role="toolbar"
        aria-label="Article formatting"
        className="flex flex-wrap items-center gap-0.5 border-b bg-muted/40 p-2"
      >
        <ToolbarButton
          label="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Lead paragraph"
          active={editor.isActive("lead")}
          disabled={!canMakeLead && !editor.isActive("lead")}
          onClick={toggleLead}
        >
          <Megaphone size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        {[2, 3, 4].map((level) => {
          const Icon = level === 2 ? Heading2 : level === 3 ? Heading3 : Heading4;
          return (
            <ToolbarButton
              key={level}
              label={`Heading ${level}`}
              active={editor.isActive("heading", { level })}
              onClick={() => setHeading(level)}
            >
              <Icon size={15} />
            </ToolbarButton>
          );
        })}

        <ToolbarDivider />

        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={15} />
        </ToolbarButton>
        <LinkControl editor={editor} />

        <ToolbarDivider />

        <ToolbarButton
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={15} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Clear formatting"
          onClick={() =>
            editor.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          <RemoveFormatting size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Undo"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={15} />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={15} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        <span>Formatting is saved with the article.</span>
        <span>H2–H4 only · H1 is the article title</span>
      </div>
    </div>
  );
}
