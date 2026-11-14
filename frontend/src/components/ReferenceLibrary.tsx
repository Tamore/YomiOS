import { FileText, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { referenceRequest } from '../api';
type Doc = { id: string; name: string; selected: boolean; size: number; characters: number };
export default function ReferenceLibrary() {
  const picker = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const reload = async () => setDocs(await referenceRequest());
  useEffect(() => { reload().catch(() => setMessage('Unable to load documents.')); }, []);
  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    const batch = Array.from(files);
    setBusy(true);
    setMessage('');
    try {
      for (const file of batch) {
        if (file.size > 20 * 1024 * 1024) throw new Error('Maximum file size is 20 MB.');
        await referenceRequest('', { method: 'POST', headers: { 'X-File-Name': encodeURIComponent(file.name) }, body: file });
      }
      await reload();
      setMessage('Uploaded. Select a document to use it in chat and voice answers.');
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  async function select(doc: Doc) {
    setBusy(true);
    try {
      await referenceRequest('/' + doc.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected: !doc.selected }) });
      await reload();
    } catch (error) { setMessage(String(error)); }
    finally { setBusy(false); }
  }
  return <section className="library" aria-labelledby="library-title">
    <header className="library-heading">
      <h1 id="library-title">Reference library</h1>
      <p>Choose the documents Yomi can reference in chat and voice.</p>
    </header>
    <div className="library-drop" data-dragging={dragging}
      onDragOver={event => { event.preventDefault(); setDragging(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files); }}>
      <Upload size={22} aria-hidden="true" />
      <div><h2>Drop documents here</h2><p>PDF, DOCX, TXT or Markdown · 20 MB per file · 300 pages per PDF</p></div>
      <button type="button" className="bklit-btn bklit-btn-default" disabled={busy} onClick={() => picker.current?.click()}>Choose files</button>
      <input ref={picker} hidden type="file" multiple accept=".pdf,.docx,.txt,.md"
        onChange={event => { void upload(event.target.files); event.target.value = ''; }} />
    </div>
    <div className="library-list"><h2>Your documents</h2>
      <p>Selected excerpts may be sent to your configured AI provider.</p>
      {message && <p role="status">{message}</p>}
      {docs.map(doc => <label key={doc.id} className="library-item">
        <FileText size={20} aria-hidden="true" />
        <span>{doc.name}<small>{Math.ceil(doc.size / 1024)} KB · {doc.characters.toLocaleString()} characters</small></span>
        <input type="checkbox" checked={Boolean(doc.selected)} disabled={busy} onChange={() => void select(doc)} />
      </label>)}
      {!docs.length && <p>No documents added yet.</p>}
    </div>
  </section>;
}
