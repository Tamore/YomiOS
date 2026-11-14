import os, sys, tempfile, unittest, asyncio
from pathlib import Path
from contextlib import closing
from unittest.mock import patch, AsyncMock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
_tmp=tempfile.TemporaryDirectory()
os.environ['YOMI_WORKSPACE_ROOT']=_tmp.name
import notes, brain, memory
from fastapi import HTTPException
from pydantic import ValidationError

class NotesTests(unittest.TestCase):
    def setUp(self):
        with closing(notes.connection()) as conn, conn: conn.execute('DELETE FROM notes')
    def test_create_update_reopen_and_delete(self):
        first=notes.create_note(notes.NoteInput(title='Reading',content='Paper A\nPaper B'))
        self.assertEqual(notes.list_notes()[0]['content'],'Paper A\nPaper B')
        revised=notes.update_note(first['id'],notes.NoteInput(title='Updated',content='Paper C',pinned=True,color='lavender'))
        self.assertEqual(revised['created_at'],first['created_at'])
        self.assertEqual(notes.list_notes()[0]['title'],'Updated')
        notes.delete_note(first['id']);self.assertEqual(notes.list_notes(),[])
        with self.assertRaises(HTTPException):notes.update_note(first['id'],notes.NoteInput(content='x'))
    def test_pin_order_and_duplicate_titles(self):
        a=notes.create_note(notes.NoteInput(title='Same',content='one',pinned=True))
        b=notes.create_note(notes.NoteInput(title='Same',content='two'))
        self.assertNotEqual(a['id'],b['id']);self.assertEqual(notes.list_notes()[0]['id'],a['id'])
    def test_validation(self):
        with self.assertRaises(HTTPException): notes.create_note(notes.NoteInput(content=' '))
        with self.assertRaises(ValidationError): notes.NoteInput(content='x',color='invalid')
        with self.assertRaises(ValidationError): notes.NoteInput(content='x'*100001)
    def test_reference_saves_exact_last_reply(self):
        memory.append_chat('note-ref','assistant','1. Paper A\n2. Paper B')
        result=asyncio.run(brain.process_intent('save this to notes','note-ref'))
        self.assertEqual(result['tool_used'],'notes')
        self.assertEqual(notes.list_notes()[0]['content'],'1. Paper A\n2. Paper B')
    def test_inline_link_note_does_not_browse(self):
        with patch.object(brain,'scrape_webpage_markdown',new=AsyncMock()) as scrape:
            asyncio.run(brain.process_intent('save note Reading: https://example.org/paper','note-url'))
            scrape.assert_not_awaited()
        self.assertEqual(notes.list_notes()[0]['content'],'https://example.org/paper')
    def test_empty_reference_does_not_create_note(self):
        result=asyncio.run(brain.process_intent('save this to notes','empty-note'))
        self.assertNotIn('data',result);self.assertEqual(notes.list_notes(),[])

if __name__=='__main__':unittest.main()
