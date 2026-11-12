import os, sys, tempfile, unittest, asyncio
from pathlib import Path
from unittest.mock import patch, AsyncMock
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
_tmp = tempfile.TemporaryDirectory()
os.environ['YOMI_WORKSPACE_ROOT'] = _tmp.name
import memory, brain
from tools.text_export import export_text_pdf
from config import EXPORTS_DIR
from pypdf import PdfReader

class ConversationExportTests(unittest.TestCase):
    def test_export_preserves_text_and_escapes_markup(self):
        text = 'Ingredients\n2 eggs\n150 g flour\nSalt & pepper <optional>'
        data = export_text_pdf(text, 'Ingredient list')
        pdf = Path(EXPORTS_DIR) / data['filename']
        result = '\n'.join(p.extract_text() for p in PdfReader(pdf).pages)
        for line in text.splitlines():
            self.assertIn(line, result)
        self.assertEqual(pdf.parent, Path(EXPORTS_DIR))

    def test_limits_and_unique_names(self):
        for invalid in ['', ' ', 'x'*100001]:
            with self.assertRaises(ValueError): export_text_pdf(invalid)
        self.assertNotEqual(export_text_pdf('a')['filename'], export_text_pdf('a')['filename'])

    def test_tool_turns_persist_once_with_download(self):
        session='export-test'
        memory.append_chat(session, 'assistant', 'Ingredients\n2 eggs\n150 g flour')
        result=asyncio.run(brain.process_intent('Export this as PDF',session))
        self.assertEqual(result['tool_used'],'text_pdf_export')
        history=memory.get_session_chat_history(session)
        self.assertEqual(len(history),3)
        self.assertIn(result['data']['filename'],history[-1]['tool_calls'])

    def test_plain_turn_persists_once(self):
        with patch.object(brain.llm_client,'generate_response',new=AsyncMock(return_value={'success':True,'content':'2 eggs','provider':'test','model':'test'})):
            asyncio.run(brain.process_intent('Please list two eggs','shared-test'))
        self.assertEqual([x['role'] for x in memory.get_recent_chat('shared-test')],['user','assistant'])

    def test_empty_context_requests_content(self):
        result=asyncio.run(brain.process_intent('Export this as PDF','empty-test'))
        self.assertNotIn('data',result)

    def test_restore_returns_latest_turns_in_order(self):
        for i in range(5): memory.append_chat('paging-test','user',str(i))
        self.assertEqual([m['content'] for m in memory.get_session_chat_history('paging-test',2)],['3','4'])

if __name__=='__main__': unittest.main()
