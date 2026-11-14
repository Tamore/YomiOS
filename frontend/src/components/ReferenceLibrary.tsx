import { useEffect, useState } from 'react';
import { referenceRequest } from '../api';
type Doc = { id: string; name: string; selected: boolean; size: number; characters: number };
export default function ReferenceLibrary() {
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
  return <section className="bklit-frame" onDragOver={event => event.preventDefault()}
    onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files); }}><div className="bklit-frame-panel space-y-4">
    <h2 className="text-lg font-bold">Reference library</h2>
    <p className="text-sm text-zinc-400">Drop files here or choose PDF, DOCX, TXT or Markdown. Up to 20 MB each, or 300 pages per PDF. Selected documents provide excerpts for chat and voice answers. Their content may be sent to your configured AI provider.</p>
    <input aria-label="Upload reference documents" type="file" multiple accept=".pdf,.docx,.txt,.md" disabled={busy}
      onChange={event => { void upload(event.target.files); event.target.value = ''; }} />
    {message && <p role="status" className="text-sm">{message}</p>}
    {docs.map(doc => <label key={doc.id} className="reference-row">
      <input type="checkbox" checked={Boolean(doc.selected)} disabled={busy} onChange={() => void select(doc)} />
      <span>{doc.name}<small>{Math.ceil(doc.size / 1024)} KB · {doc.characters.toLocaleString()} characters</small></span>
    </label>)}
    {!docs.length && <p className="text-sm text-zinc-400">Your uploaded references will appear here.</p>}
  </div></section>;
}
