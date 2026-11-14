"""Private local notes, shared by the dashboard and conversational tools."""
import sqlite3
from contextlib import closing
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from config import WORKSPACE_ROOT

DB_PATH = WORKSPACE_ROOT / "notes.db"
router = APIRouter(prefix="/api/notes", tags=["notes"])

class NoteInput(BaseModel):
    title: str = Field(default="Untitled note", max_length=160)
    content: str = Field(min_length=1, max_length=100000)
    color: Literal["rose", "lavender", "amber"] = "rose"
    pinned: bool = False

def connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL, color TEXT NOT NULL, pinned INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)")
    return conn

def list_notes():
    with closing(connection()) as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC")]

def save_note(payload: NoteInput, note_id=None):
    if not payload.content.strip():
        raise ValueError("Write something before saving the note.")
    now = datetime.now(timezone.utc).isoformat()
    with closing(connection()) as conn, conn:
        if note_id:
            found = conn.execute("SELECT id FROM notes WHERE id=?", (note_id,)).fetchone()
            if not found:
                raise KeyError(note_id)
            conn.execute("UPDATE notes SET title=?,content=?,color=?,pinned=?,updated_at=? WHERE id=?", (payload.title.strip() or "Untitled note",payload.content,payload.color,int(payload.pinned),now,note_id))
        else:
            note_id = uuid4().hex
            conn.execute("INSERT INTO notes VALUES (?,?,?,?,?,?,?)", (note_id,payload.title.strip() or "Untitled note",payload.content,payload.color,int(payload.pinned),now,now))
        return dict(conn.execute("SELECT * FROM notes WHERE id=?", (note_id,)).fetchone())

@router.get("")
def get_notes():
    return {"notes": list_notes()}

@router.post("")
def create_note(payload: NoteInput):
    try:
        return save_note(payload)
    except ValueError as exc:
        raise HTTPException(422, str(exc))

@router.put("/{note_id}")
def update_note(note_id: str, payload: NoteInput):
    try:
        return save_note(payload, note_id)
    except KeyError:
        raise HTTPException(404, "Note not found")
    except ValueError as exc:
        raise HTTPException(422, str(exc))

@router.delete("/{note_id}")
def delete_note(note_id: str):
    with closing(connection()) as conn, conn:
        if not conn.execute("DELETE FROM notes WHERE id=?", (note_id,)).rowcount:
            raise HTTPException(404, "Note not found")
    return {"deleted": True}
