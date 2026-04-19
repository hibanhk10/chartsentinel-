import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';

// Thin wrapper over TipTap. Serialises to HTML so we can store the result
// in the existing `content` varchar column without a schema change — the
// Reports and News read paths already render their fields as plain text
// fallback, so the upgrade is backwards-compatible with older rows.

const TOOLBAR_BUTTONS = [
  { cmd: (e) => e.chain().focus().toggleBold().run(), key: 'bold', label: 'B', title: 'Bold', bold: true },
  { cmd: (e) => e.chain().focus().toggleItalic().run(), key: 'italic', label: 'I', title: 'Italic', italic: true },
  { cmd: (e) => e.chain().focus().toggleStrike().run(), key: 'strike', label: 'S', title: 'Strikethrough', strike: true },
  { cmd: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), key: 'heading-2', label: 'H2', title: 'Heading 2' },
  { cmd: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), key: 'heading-3', label: 'H3', title: 'Heading 3' },
  { cmd: (e) => e.chain().focus().toggleBulletList().run(), key: 'bulletList', label: '•', title: 'Bullet list' },
  { cmd: (e) => e.chain().focus().toggleOrderedList().run(), key: 'orderedList', label: '1.', title: 'Numbered list' },
  { cmd: (e) => e.chain().focus().toggleBlockquote().run(), key: 'blockquote', label: '❝', title: 'Blockquote' },
  { cmd: (e) => e.chain().focus().toggleCode().run(), key: 'code', label: '<>', title: 'Inline code' },
];

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 200 }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary underline' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg my-3 max-w-full h-auto' } }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // TipTap always emits <p></p> on empty — treat that as real empty so
      // admins can distinguish "not filled in" from "has whitespace content".
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none px-4 py-3 focus:outline-none text-white',
        style: `min-height:${minHeight}px`,
        'data-placeholder': placeholder || '',
      },
    },
  });

  // Sync external changes (e.g. after a successful submit that resets the
  // field) without wiping the editor's cursor position during normal typing.
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML() && (value === '' || !editor.isFocused)) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) {
    return <div style={{ minHeight }} className="bg-background-dark/50 border border-white/10 rounded-xl" />;
  }

  const setLink = () => {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="bg-background-dark/50 border border-white/10 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2 border-b border-white/10 bg-white/[0.03]">
        {TOOLBAR_BUTTONS.map((b) => (
          <ToolbarButton
            key={b.key}
            title={b.title}
            active={editor.isActive(b.key.includes('heading') ? { name: 'heading', level: Number(b.key.slice(-1)) } : b.key)}
            onClick={() => b.cmd(editor)}
          >
            <span className={b.bold ? 'font-bold' : b.italic ? 'italic' : b.strike ? 'line-through' : ''}>
              {b.label}
            </span>
          </ToolbarButton>
        ))}
        <span className="mx-1 h-5 w-px bg-white/10" />
        <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
          <span className="material-icons text-base">link</span>
        </ToolbarButton>
        <ToolbarButton title="Image" onClick={addImage}>
          <span className="material-icons text-base">image</span>
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`min-w-[2rem] h-8 px-2 rounded-md text-xs flex items-center justify-center transition-colors ${
        active
          ? 'bg-primary/20 text-primary border border-primary/30'
          : 'text-text-secondary hover:bg-white/10 border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
