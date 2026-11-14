import { useEffect, useState } from 'react';
import './notes.css';
type Note = { id: string; title: string; content: string; color: string; pinned: boolean | number; updated_at: string };
const blank = { title: '', content: '', color: 'rose', pinned: false };
async function request(path = '', init?: RequestInit) {
  const response = await fetch('http://127.0.0.1:8765/api/notes' + path, init);
  if (!response.ok) throw new Error('Could not save or load notes. Please check the backend and retry.');
  return response.json();
}
export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<typeof blank | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  async function reload() { const result = await request(); setNotes(result.notes); }
  useEffect(() => { reload().catch(e => setError(String(e))).finally(() => setLoading(false)); }, []);
  async function save() {
    if (!editor?.content.trim()) return;
    setBusy(true); setError('');
    try {
      await request(editing ? '/' + editing : '', {method: editing ? 'PUT' : 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(editor)});
      await reload(); setEditor(null); setEditing(null);
    } catch(e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function remove(id:string) {
    setBusy(true); setError('');
    try { await request('/'+id,{method:'DELETE'}); await reload(); setDeleting(null); }
    catch(e) {setError(String(e));} finally {setBusy(false);}
  }
  const visible = notes.filter(n => (n.title+' '+n.content).toLowerCase().includes(query.toLowerCase()));
  return <section className="notes-page">
    <div className="notes-heading"><div><h1>Notes</h1><p>Ideas, reading lists, reminders—saved on this device.</p></div>
      <button disabled={busy || !!editor} onClick={() => {setEditing(null);setEditor({...blank});}}>+ New note</button></div>
    <input className="notes-search" aria-label="Search notes" placeholder="Search your notes…" value={query} onChange={e=>setQuery(e.target.value)}/>
    {error && <div role="alert">{error} <button onClick={()=>{setError('');void reload().catch(e=>setError(String(e)));}}>Retry</button></div>}
    {editor && <form className="note-editor" onSubmit={e=>{e.preventDefault();void save();}}>
      <input aria-label="Note title" placeholder="Title" maxLength={160} value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})}/>
      <textarea aria-label="Note content" placeholder="Write anything here…" maxLength={100000} required value={editor.content} onChange={e=>setEditor({...editor,content:e.target.value})}/>
      <div className="note-editor-actions"><label>Colour <select aria-label="Note colour" value={editor.color} onChange={e=>setEditor({...editor,color:e.target.value})}><option value="rose">Rose</option><option value="lavender">Lavender</option><option value="amber">Amber</option></select></label>
        <label><input type="checkbox" checked={editor.pinned} onChange={e=>setEditor({...editor,pinned:e.target.checked})}/> Pin note</label>
        <button type="button" disabled={busy} onClick={()=>setEditor(null)}>Cancel</button><button disabled={busy || !editor.content.trim()}>{busy?'Saving…':'Save note'}</button></div>
    </form>}
    {loading ? <p role="status">Loading notes…</p> : <div className="notes-grid">{visible.map(note=><article className={'sticky-note note-'+note.color} key={note.id}>
      <header><h2>{note.title}</h2>{!!note.pinned && <span aria-label="Pinned">Pinned</span>}</header>
      <p className="note-content">{note.content}</p>
      <footer><small>{new Date(note.updated_at).toLocaleDateString()}</small><button disabled={busy || !!editor} onClick={()=>{setEditing(note.id);setEditor({title:note.title,content:note.content,color:note.color,pinned:!!note.pinned});window.scrollTo({top:0,behavior:'smooth'});}}>Edit</button>
        {deleting===note.id ? <><button disabled={busy} onClick={()=>void remove(note.id)}>Confirm delete</button><button disabled={busy} onClick={()=>setDeleting(null)}>Keep</button></> : <button disabled={busy} onClick={()=>setDeleting(note.id)}>Delete</button>}</footer>
    </article>)}</div>}
    {!loading && !visible.length && !error && <p className="notes-empty">{query?'No matching notes.':'No notes yet. Create one here, or tell Yomi “save this to notes” after a reply.'}</p>}
  </section>;
}
