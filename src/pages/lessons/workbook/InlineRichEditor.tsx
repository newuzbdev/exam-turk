import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Heading2, Heading3, Italic, Link as LinkIcon, List, ListOrdered, Pilcrow } from 'lucide-react';

type JsonNode = { type?: string; text?: string; attrs?: Record<string, unknown> | null; marks?: Array<{ type?: string; attrs?: Record<string, unknown> | null }>; content?: JsonNode[] };

const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const safeLink = (value: string) => {
  if (value.startsWith('/') || value.startsWith('#')) return true;
  try { return ['http:', 'https:', 'mailto:'].includes(new URL(value, 'https://turkishmock.local').protocol); } catch { return false; }
};
function inlineToHtml(value: string) {
  let html = escapeHtml(value);
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_match, label: string, href: string) => safeLink(href) ? `<a href="${escapeHtml(href)}">${label}</a>` : label);
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return html;
}
function markdownToHtml(value: string) {
  if (!value.trim()) return '<p></p>';
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) { index += 1; continue; }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) { const level = heading[1].length; output.push(`<h${level}>${inlineToHtml(heading[2])}</h${level}>`); index += 1; continue; }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? '')) items.push(`<li><p>${inlineToHtml((lines[index++] ?? '').replace(/^[-*]\s+/, ''))}</p></li>`);
      output.push(`<ul>${items.join('')}</ul>`); continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index] ?? '')) items.push(`<li><p>${inlineToHtml((lines[index++] ?? '').replace(/^\d+[.)]\s+/, ''))}</p></li>`);
      output.push(`<ol>${items.join('')}</ol>`); continue;
    }
    output.push(`<p>${inlineToHtml(line)}</p>`); index += 1;
  }
  return output.join('');
}
function inlineFromNode(node: JsonNode): string {
  let value = node.text ?? (node.content ?? []).map(inlineFromNode).join('');
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') value = `**${value}**`;
    if (mark.type === 'italic') value = `*${value}*`;
    if (mark.type === 'link') value = `[${value}](${String(mark.attrs?.href ?? '')})`;
  }
  return value;
}
function nodeToMarkdown(node: JsonNode): string {
  const content = (node.content ?? []).map(inlineFromNode).join('');
  if (node.type === 'heading') return `${'#'.repeat(Number(node.attrs?.level) || 2)} ${content}`;
  if (node.type === 'bulletList') return (node.content ?? []).map(item => `- ${(item.content ?? []).map(inlineFromNode).join('')}`).join('\n');
  if (node.type === 'orderedList') return (node.content ?? []).map((item, index) => `${index + 1}. ${(item.content ?? []).map(inlineFromNode).join('')}`).join('\n');
  return content;
}
function jsonToMarkdown(json: JsonNode) { return (json.content ?? []).map(nodeToMarkdown).filter(Boolean).join('\n\n'); }

export default function InlineRichEditor({ value, onChange, label, autoFocus = false }: { value: string; onChange: (value: string) => void; label: string; autoFocus?: boolean }) {
  const lastEmitted = useRef(value);
  const [focused, setFocused] = useState(false);
  const extensions = useMemo(() => [
    StarterKit.configure({ codeBlock: false, horizontalRule: false, heading: { levels: [2, 3] }, link: false }),
    Link.configure({ autolink: true, linkOnPaste: true, openOnClick: false, HTMLAttributes: { rel: 'noreferrer noopener', target: '_blank' } }),
  ], []);
  const editor = useEditor({
    extensions,
    content: markdownToHtml(value),
    immediatelyRender: false,
    editorProps: { attributes: { class: 'workbook-inline-editor', 'aria-label': label } },
    onFocus: () => setFocused(true),
    onBlur: ({ event }) => { if (!(event.relatedTarget instanceof Element && event.relatedTarget.closest('.workbook-format-toolbar'))) setFocused(false); },
    onUpdate: ({ editor: current }) => { const next = jsonToMarkdown(current.getJSON() as JsonNode); lastEmitted.current = next; onChange(next); },
  });
  useEffect(() => {
    if (!editor || value === lastEmitted.current) return;
    const current = jsonToMarkdown(editor.getJSON() as JsonNode);
    if (current !== value) editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
    lastEmitted.current = value;
  }, [editor, value]);
  useEffect(() => { if (editor && autoFocus) editor.commands.focus('end'); }, [autoFocus, editor]);
  const run = (command: () => boolean) => { command(); editor?.commands.focus(); };
  const setLink = () => {
    if (!editor) return;
    const current = String(editor.getAttributes('link').href ?? '');
    const next = window.prompt('Bağlantı URL’si', current);
    if (next === null) return;
    if (!next.trim()) { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    if (!safeLink(next.trim())) { window.alert('Güvenli bir bağlantı girin.'); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: next.trim() }).run();
  };
  return <div className={`workbook-rich-field ${focused ? 'is-focused' : ''}`}>
    {focused ? <div className="workbook-format-toolbar" aria-label={`${label} biçimlendirme araçları`} onMouseDown={event => event.preventDefault()}>
      <FormatButton label="Paragraf" active={editor?.isActive('paragraph')} onClick={() => run(() => editor!.chain().focus().setParagraph().run())}><Pilcrow size={14} /></FormatButton>
      <FormatButton label="Başlık 2" active={editor?.isActive('heading', { level: 2 })} onClick={() => run(() => editor!.chain().focus().toggleHeading({ level: 2 }).run())}><Heading2 size={14} /></FormatButton>
      <FormatButton label="Başlık 3" active={editor?.isActive('heading', { level: 3 })} onClick={() => run(() => editor!.chain().focus().toggleHeading({ level: 3 }).run())}><Heading3 size={14} /></FormatButton>
      <FormatButton label="Kalın" active={editor?.isActive('bold')} onClick={() => run(() => editor!.chain().focus().toggleBold().run())}><Bold size={14} /></FormatButton>
      <FormatButton label="İtalik" active={editor?.isActive('italic')} onClick={() => run(() => editor!.chain().focus().toggleItalic().run())}><Italic size={14} /></FormatButton>
      <FormatButton label="Madde listesi" active={editor?.isActive('bulletList')} onClick={() => run(() => editor!.chain().focus().toggleBulletList().run())}><List size={14} /></FormatButton>
      <FormatButton label="Numaralı liste" active={editor?.isActive('orderedList')} onClick={() => run(() => editor!.chain().focus().toggleOrderedList().run())}><ListOrdered size={14} /></FormatButton>
      <FormatButton label="Bağlantı" active={editor?.isActive('link')} onClick={setLink}><LinkIcon size={14} /></FormatButton>
    </div> : null}
    <EditorContent editor={editor} />
  </div>;
}
function FormatButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} aria-pressed={Boolean(active)} title={label} onClick={onClick}>{children}</button>;
}
