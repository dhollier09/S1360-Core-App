"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
};

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 120 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3, 4] } }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "rte-content",
        "data-placeholder": placeholder ?? "",
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // TipTap represents empty as "<p></p>" — treat that as empty string
      onChange(html === "<p></p>" ? "" : html);
    },
    // Avoid SSR hydration issues
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. switching steps)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || "";
    if (current !== next && current !== "<p></p>") {
      // Only update if truly different and editor isn't focused
      if (!editor.isFocused) editor.commands.setContent(next, { emitUpdate: false });
    } else if (current === "<p></p>" && next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return <div className="rte-loading" style={{ minHeight }} />;

  return (
    <div className="rte">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean, onClick: () => void, label: string, title: string) => (
    <button
      type="button"
      className={`rte-btn ${active ? "active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  );

  return (
    <div className="rte-toolbar">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Bold (Ctrl+B)")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Italic (Ctrl+I)")}
      {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "S", "Strikethrough")}
      <div className="rte-divider" />
      {btn(
        editor.isActive("heading", { level: 3 }),
        () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        "H",
        "Heading"
      )}
      {btn(
        editor.isActive("bulletList"),
        () => editor.chain().focus().toggleBulletList().run(),
        "•",
        "Bullet list"
      )}
      {btn(
        editor.isActive("orderedList"),
        () => editor.chain().focus().toggleOrderedList().run(),
        "1.",
        "Numbered list"
      )}
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "❝", "Quote")}
      {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "</>", "Inline code")}
      <div className="rte-divider" />
      <button
        type="button"
        className={`rte-btn ${editor.isActive("link") ? "active" : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = prompt("Link URL (leave blank to remove):", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        }}
        title="Link"
      >
        🔗
      </button>
    </div>
  );
}

/**
 * Render arbitrary description content safely.
 * - If the content contains HTML tags, treat it as rich text (TipTap output is trusted since only admins write it)
 * - Otherwise wrap plain text to preserve line breaks
 */
export function RenderedContent({ html, className = "" }: { html: string; className?: string }) {
  if (!html) return null;
  const looksLikeHtml = /<\/?[a-z][^>]*>/i.test(html);
  if (looksLikeHtml) {
    return <div className={`rte-rendered ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className={`rte-rendered ${className}`} style={{ whiteSpace: "pre-wrap" }}>{html}</div>;
}
