import { useCallback, useEffect, useRef, useState } from 'react';
import MinimalLessonPlayer from '../MinimalLessonPlayer';
import WorkbookDocument from './WorkbookDocument';
import WorkbookEditor, { type PendingImageInsert } from './WorkbookEditor';
import { replaceBlock } from './document-utils';
import { acceptEditorMessage, configuredAdminOrigin, EDITOR_CHANNEL, EDITOR_VERSION, readyEditorMessage } from './editor-protocol';
import type { WorkbookDocument as WorkbookDocumentType } from './types';
import '../lesson-catalog.css';
import './workbook-editor.css';

type EditorMode = 'edit' | 'preview';
type PendingMedia = { requestId: string; blockId: string; pendingInsert?: PendingImageInsert };

export default function LessonEditorPage() {
  const trustedOrigin = configuredAdminOrigin(import.meta.env.VITE_ADMIN_APP_URL);
  const [document, setDocument] = useState<WorkbookDocumentType | null>(null);
  const documentRef = useRef<WorkbookDocumentType | null>(null);
  const [mode, setMode] = useState<EditorMode>('edit');
  const [sessionId, setSessionId] = useState('');
  const sessionRef = useRef('');
  const pendingMedia = useRef(new Map<string, PendingMedia>());
  const [error, setError] = useState('');
  const embedded = typeof window !== 'undefined' && window.parent !== window;
  const post = useCallback((payload: Record<string, unknown>) => {
    if (trustedOrigin && embedded) window.parent.postMessage({ channel: EDITOR_CHANNEL, version: EDITOR_VERSION, ...payload }, trustedOrigin);
  }, [embedded, trustedOrigin]);

  useEffect(() => {
    if (!trustedOrigin || !embedded) return;
    const handler = (event: MessageEvent) => {
      const message = acceptEditorMessage(event, trustedOrigin, window.parent, sessionRef.current || undefined);
      if (!message) return;
      if (message.type === 'load') {
        documentRef.current = message.document; setDocument(message.document); sessionRef.current = message.sessionId; setSessionId(message.sessionId); setMode(message.mode); setError(''); pendingMedia.current.clear(); return;
      }
      if (message.type === 'mode') { setMode(message.mode); return; }
      const pending = pendingMedia.current.get(message.requestId);
      if (!pending) return;
      pendingMedia.current.delete(message.requestId);
      if (message.error) { setError(message.error); return; }
      const current = documentRef.current;
      if (!current || !message.url) return;
      const block = current.blocks.find(item => item.id === pending.blockId);
      if ((!block || block.kind !== 'image') && !pending.pendingInsert) return;
      const blocks = block?.kind === 'image'
        ? replaceBlock(current.blocks, { ...block, url: message.url })
        : [...current.blocks.slice(0, pending.pendingInsert!.index), { ...pending.pendingInsert!.block, url: message.url }, ...current.blocks.slice(pending.pendingInsert!.index)];
      const next = { ...current, blocks };
      documentRef.current = next; setDocument(next); post({ type: 'change', sessionId: sessionRef.current, document: next });
    };
    window.addEventListener('message', handler);
    window.parent.postMessage(readyEditorMessage(), trustedOrigin);
    return () => window.removeEventListener('message', handler);
  }, [embedded, post, trustedOrigin]);

  const changeBlocks = (blocks: WorkbookDocumentType['blocks']) => {
    const current = documentRef.current;
    if (!current || mode !== 'edit' || !sessionRef.current) return;
    const next = { ...current, blocks };
    documentRef.current = next; setDocument(next); setError(''); post({ type: 'change', sessionId: sessionRef.current, document: next });
  };
  const requestMedia = (blockId: string, pendingInsert?: PendingImageInsert) => {
    if (!sessionRef.current || mode !== 'edit') return;
    const requestId = crypto.randomUUID();
    pendingMedia.current.set(requestId, { requestId, blockId, pendingInsert }); setError(''); post({ type: 'request-media', sessionId: sessionRef.current, requestId, blockId });
  };

  if (!trustedOrigin) return <main className="lesson-editor-state" role="alert"><h1>Düzenleyici yapılandırılmamış</h1><p>Güvenilir admin adresi tanımlanmadığı için ders verisi alınmadı.</p></main>;
  if (!embedded) return <main className="lesson-editor-state" role="alert"><h1>Bu sayfa admin içinde açılmalıdır</h1><p>Ders taslakları doğrudan bu sayfadan yüklenmez.</p></main>;
  if (!document) return <main className="lesson-editor-state" role="status"><h1>Çalışma sayfası bekleniyor</h1><p>Güvenilir admin bağlantısından ders gönderildiğinde düzenleyici açılacak.</p></main>;

  return <main className="lesson-editor-page" lang="tr" data-mode={mode} data-session-ready={Boolean(sessionId)}>
    {error ? <div className="lesson-editor-error" role="alert">{error}</div> : null}
    <div className="lesson-catalog lesson-video-page lesson-editor-canvas">
      <header className="lesson-catalog-heading lesson-video-heading"><h1>{document.title}</h1>{document.summary ? <p>{document.summary}</p> : null}</header>
      {document.video ? <MinimalLessonPlayer key={document.id} source={document.video} title={document.title} /> : null}
      {mode === 'preview' ? <WorkbookDocument document={document} answerMode="preview" /> : <WorkbookEditor document={document} onChange={changeBlocks} onRequestMedia={requestMedia} />}
    </div>
  </main>;
}
