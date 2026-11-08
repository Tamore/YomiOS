import unittest
import os
import sys
import asyncio
from pathlib import Path

# Setup paths
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import tempfile
from unittest.mock import patch

_test_data = tempfile.TemporaryDirectory()
os.environ["YOMI_WORKSPACE_ROOT"] = _test_data.name
import config
import database as db
import memory
from tools.code_sandbox import execute_python_code
from tools.academic_researcher import generate_research_brief_pdf, generate_bibtex
from tools.admissions_engine import calculate_lab_match
import mcp_server

class TestYomiAuditRepairs(unittest.TestCase):

    def test_code_runner_disabled_by_default(self):
        """Verify arbitrary Python execution is disabled by default."""
        res = execute_python_code("import os; print(os.getcwd())")
        self.assertFalse(res["success"])
        self.assertEqual(res["return_code"], 403)
        self.assertIn("disabled by default", res["stderr"])

    def test_database_id_collision_resistance(self):
        """Verify consecutive log/task insertions in the same loop do not collide."""
        for i in range(10):
            db.add_log(f"Test Log {i}", f"Description {i}")
        logs = db.get_activity_logs(limit=10)
        self.assertEqual(len(logs), 10)
        ids = [l["id"] for l in logs]
        self.assertEqual(len(ids), len(set(ids)), "IDs must be strictly unique")

    @patch.dict("tools.admissions_engine.TARGET_UNIVERSITIES", {"example": {"name": "Example University", "advisors": [{"name": "Example advisor", "lab": "Networks", "topics": ["IoT"]}]}})
    def test_admissions_fit_score_not_inflated(self):
        """Verify empty input produces 0% match, not 40%."""
        res = calculate_lab_match([], "example")
        for adv in res["advisors_match"]:
            self.assertEqual(adv["match_score"], 0, "Empty proposal keywords must score 0%")
            self.assertEqual(adv["overlap_topics"], [])

    @patch.dict("tools.admissions_engine.TARGET_UNIVERSITIES", {"example": {"name": "Example University", "advisors": [{"name": "Example advisor", "lab": "Networks", "topics": ["IoT"]}]}})
    def test_admissions_fit_score_deduplication(self):
        """Verify duplicate keywords do not inflate score."""
        res1 = calculate_lab_match(["IoT"], "example")
        res2 = calculate_lab_match(["IoT"] * 10, "example")
        adv1 = res1["advisors_match"][0]
        adv2 = res2["advisors_match"][0]
        self.assertEqual(adv1["match_score"], adv2["match_score"], "Duplicate keywords must not inflate score")

    def test_academic_research_pdf_escaping_and_uniqueness(self):
        """Verify research brief PDF generates with unique filenames and escapes HTML entities."""
        paper = {
            "title": "Observation of <rare> decay & precision measurements",
            "authors": ["A. Author", "B. Scientist <test>"],
            "published": "2026-10-15",
            "source": "arXiv",
            "id": "2410.99999",
            "abstract": "Test abstract with special characters: 1 < 2 and A & B.",
            "url": "https://arxiv.org/abs/2410.99999",
            "pdf_url": "https://arxiv.org/pdf/2410.99999"
        }
        filename1 = generate_research_brief_pdf(paper)
        filename2 = generate_research_brief_pdf(paper)
        self.assertNotEqual(filename1, filename2, "Consecutive briefs must not overwrite each other")
        self.assertTrue(os.path.exists(os.path.join(config.EXPORTS_DIR, filename1)))
        self.assertTrue(os.path.exists(os.path.join(config.EXPORTS_DIR, filename2)))

    def test_mcp_unknown_tool_returns_is_error(self):
        """Verify MCP server returns isError=True on unknown tool."""
        req = {
            "jsonrpc": "2.0",
            "id": "123",
            "method": "tools/call",
            "params": {
                "name": "non_existent_tool",
                "arguments": {}
            }
        }
        res = asyncio.run(mcp_server.handle_request(req))
        self.assertIsNotNone(res)
        self.assertTrue(res["result"]["isError"])
        self.assertIn("Error: Unknown tool", res["result"]["content"][0]["text"])

    def test_safe_url_validation(self):
        """Verify URL validator blocks private/loopback/cloud metadata targets."""
        self.assertFalse(config.validate_safe_url("http://127.0.0.1/admin"))
        self.assertFalse(config.validate_safe_url("http://localhost:8000"))
        self.assertFalse(config.validate_safe_url("http://169.254.169.254/latest/meta-data/"))
        self.assertFalse(config.validate_safe_url("http://10.0.0.1/internal"))
        self.assertFalse(config.validate_safe_url("http://192.168.1.1/router"))
        self.assertFalse(config.validate_safe_url("http://172.16.0.1/secret"))
        self.assertTrue(config.validate_safe_url("https://arxiv.org/abs/2410.18942"))

    def test_workspace_path_traversal_prevention(self):
        """Verify path validator prevents directory traversal outside workspace root."""
        with self.assertRaises(PermissionError):
            config.validate_workspace_path("../../windows/system32/cmd.exe")
        with self.assertRaises(PermissionError):
            config.validate_workspace_path("..\\..\\secret.txt")
        with self.assertRaises(PermissionError):
            config.validate_workspace_path("C:\\Windows\\System32")
        
        # Safe path inside workspace root
        valid_path = config.validate_workspace_path("exports")
        self.assertIsNotNone(valid_path)
        self.assertTrue(str(valid_path).startswith(str(config.WORKSPACE_ROOT)))

    def test_safe_subfolder_traversal_prevention(self):
        """Verify subfolder validator blocks path escapes."""
        with self.assertRaises(PermissionError):
            config.validate_safe_subfolder("../../escape")
        with self.assertRaises(PermissionError):
            config.validate_safe_subfolder("..\\escape")
        with self.assertRaises(PermissionError):
            config.validate_safe_subfolder("C:\\Windows")
        self.assertEqual(config.validate_safe_subfolder("Research_Notes_2026"), "Research_Notes_2026")

    def test_chat_history_persistence_and_retrieval(self):
        """Verify chat history stores and returns messages with correct column names."""
        import uuid
        test_session = f"test_session_{uuid.uuid4().hex}"
        memory.append_chat(test_session, "user", "Hello audit test", tool_calls=None)
        memory.append_chat(test_session, "assistant", "Verified response", tool_calls=None)
        
        history = memory.get_session_chat_history(test_session, limit=10)
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["role"], "user")
        self.assertEqual(history[0]["content"], "Hello audit test")
        self.assertEqual(history[1]["role"], "assistant")
        self.assertEqual(history[1]["content"], "Verified response")
        self.assertTrue("timestamp" in history[0])

    def test_task_operations_persistence(self):
        """Verify tasks can be created, retrieved, and toggled reliably."""
        task = db.create_task(
            title="Audit verification test task",
            priority="P1",
            due_date="2026-11-30"
        )
        self.assertIsNotNone(task)
        task_id = task["id"]
        
        tasks = db.get_all_tasks()
        target = next((t for t in tasks if t["id"] == task_id), None)
        self.assertIsNotNone(target)
        self.assertEqual(target["is_completed"], 0)
        
        # Toggle to completed
        updated = db.toggle_task(task_id)
        self.assertEqual(updated["is_completed"], 1)
        
        # Toggle back to pending
        updated2 = db.toggle_task(task_id)
        self.assertEqual(updated2["is_completed"], 0)

if __name__ == "__main__":
    unittest.main()
