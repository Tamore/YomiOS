import os, sys, tempfile, unittest, asyncio
from pathlib import Path
from unittest.mock import patch, AsyncMock
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
_tmp = tempfile.TemporaryDirectory()
os.environ['YOMI_WORKSPACE_ROOT'] = _tmp.name
import brain, memory

class IntentRoutingTests(unittest.TestCase):
    def test_link_and_followup_read_context_without_export_or_paper_search(self):
        url='https://github.com/example/recommended-reading'
        with patch.object(brain,'scrape_webpage_markdown',new=AsyncMock(return_value={'success':True,'title':'Reading list','content_preview':'ML foundations'})) as read, patch.object(brain,'summarize_and_export_pdf',new=AsyncMock()) as export, patch.object(brain,'conduct_academic_research',new=AsyncMock()) as research, patch.object(brain.llm_client,'generate_response',new=AsyncMock(return_value={'success':True,'content':'Useful background, not direct coordination research.'})) as model:
            first=asyncio.run(brain.process_intent(url,'link-route'))
            second=asyncio.run(brain.process_intent('i was asking if this is imp for our research or no','link-route'))
            self.assertEqual(first['tool_used'],'web_read')
            self.assertEqual(second['tool_used'],'web_read')
            self.assertEqual(read.await_count,2)
            export.assert_not_awaited(); research.assert_not_awaited()
            self.assertIn('i was asking',model.call_args.kwargs['prompt'])
            self.assertIn(url,model.call_args.kwargs['system_prompt'])

    def test_mentioning_research_is_not_search(self):
        with patch.object(brain,'conduct_academic_research',new=AsyncMock()) as search, patch.object(brain.llm_client,'generate_response',new=AsyncMock(return_value={'success':True,'content':'Could you clarify the source?','provider':'test','model':'test'})):
            result=asyncio.run(brain.process_intent('is this important for our research or no','no-link'))
            search.assert_not_awaited()
            self.assertEqual(result['tool_used'],'llm_test')

    def test_explicit_search_does_not_export(self):
        with patch.object(brain,'search_arxiv',new=AsyncMock(return_value=[{'title':'Example paper','url':'https://arxiv.org/abs/test'}])) as search, patch.object(brain,'conduct_academic_research',new=AsyncMock()) as export:
            result=asyncio.run(brain.process_intent('find papers on distributed coordination','search-route'))
            search.assert_awaited_once_with('distributed coordination',max_results=3)
            export.assert_not_awaited()
            self.assertEqual(result['tool_used'],'academic_search')

    def test_failed_fetch_does_not_invent_analysis(self):
        with patch.object(brain,'scrape_webpage_markdown',new=AsyncMock(return_value={'success':False,'error':'HTTP 403'})), patch.object(brain.llm_client,'generate_response',new=AsyncMock()) as model:
            result=asyncio.run(brain.process_intent('https://example.org/reading','failed-read'))
            self.assertTrue(result['error']); model.assert_not_awaited()

    def test_explicit_url_export_still_works(self):
        with patch.object(brain,'validate_safe_url',return_value=True), patch.object(brain,'summarize_and_export_pdf',new=AsyncMock(return_value={'filename':'synthetic.pdf'})) as export:
            result=asyncio.run(brain.process_intent('export https://example.org/article as PDF','explicit-export'))
            export.assert_awaited_once_with('https://example.org/article')
            self.assertEqual(result['tool_used'],'web_summarizer')

if __name__=='__main__': unittest.main()
