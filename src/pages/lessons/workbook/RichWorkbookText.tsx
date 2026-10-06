import { Fragment, type ReactNode } from 'react';

const INLINE = /(\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;

function safeLink(value: string) {
  if (value.startsWith('/') || value.startsWith('#')) return true;
  try { return ['http:', 'https:', 'mailto:'].includes(new URL(value, 'https://turkishmock.local').protocol); } catch { return false; }
}

function inline(text: string): ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((part, index) => {
    const key = `${index}-${part.slice(0, 8)}`;
    const link = part.match(/^\[([^\]]+)\]\(([^\s)]+)\)$/);
    if (link) return safeLink(link[2]) ? <a key={key} href={link[2]} target="_blank" rel="noreferrer noopener">{link[1]}</a> : <Fragment key={key}>{link[1]}</Fragment>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={key}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={key}>{part.slice(1, -1)}</code>;
    return <Fragment key={key}>{part}</Fragment>;
  });
}

export default function RichWorkbookText({ value }: { value: string }) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? '';
    if (!line.trim()) { index += 1; continue; }
    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      nodes.push(heading[1].length === 2 ? <h2 key={`h-${index}`}>{inline(heading[2])}</h2> : <h3 key={`h-${index}`}>{inline(heading[2])}</h3>);
      index += 1;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index] ?? '')) items.push((lines[index++] ?? '').replace(/^[-*]\s+/, ''));
      nodes.push(<ul key={`ul-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index] ?? '')) items.push((lines[index++] ?? '').replace(/^\d+[.)]\s+/, ''));
      nodes.push(<ol key={`ol-${index}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ol>);
      continue;
    }
    nodes.push(<p key={`p-${index}`}>{inline(line)}</p>);
    index += 1;
  }
  return <>{nodes}</>;
}
