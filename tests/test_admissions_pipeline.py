import unittest
from unittest.mock import patch
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from tools.admissions_engine import (
    load_target_universities,
    get_target_universities_summary,
    sync_admissions_pipeline,
    draft_academic_email,
    calculate_lab_match
)

class TestAdmissionsPipeline(unittest.TestCase):
    def test_load_universities(self):
        unis = load_target_universities()
        self.assertIsInstance(unis, dict)
        self.assertIn("sit", unis)
        self.assertIn("waseda_ips", unis)

    def test_summary_format(self):
        summary = get_target_universities_summary()
        self.assertIsInstance(summary, list)
        self.assertGreaterEqual(len(summary), 1)
        for item in summary:
            self.assertIn("id", item)
            self.assertIn("name", item)
            self.assertIn("deadlines", item)

    def test_sync_admissions_pipeline(self):
        res = sync_admissions_pipeline()
        self.assertEqual(res.get("status"), "success")
        self.assertGreater(res.get("synced_universities", 0), 0)

    def test_draft_academic_email(self):
        email_data = draft_academic_email(
            professor_name="Prof. Hiroaki Fukuda",
            university_name="Shibaura Institute of Technology",
            research_topic="Self-Adaptive Software Systems",
            user_name="Nirmiti Tamore"
        )
        self.assertIn("Nirmiti Tamore", email_data["subject"])
        self.assertIn("Dear Professor Hiroaki Fukuda", email_data["body"])
        self.assertNotIn("Professor Prof.", email_data["body"])
        self.assertEqual(email_data["recipient"], "Prof. Hiroaki Fukuda")

if __name__ == "__main__":
    unittest.main()

