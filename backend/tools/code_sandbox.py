import sys
import subprocess
import tempfile
import os
import time
from typing import Dict, Any
from config import ENABLE_DEV_CODE_RUNNER

def execute_python_code(code: str, timeout_seconds: float = 6.0) -> Dict[str, Any]:
    """
    Executes Python computation code if developer execution runner is explicitly enabled.
    Disabled by default to prevent unauthenticated arbitrary code execution.
    """
    if not ENABLE_DEV_CODE_RUNNER:
        return {
            "success": False,
            "stdout": "",
            "stderr": "Execution disabled by default for security. Set YOMI_ENABLE_DEV_RUNNER=true in .env to enable developer execution runner.",
            "return_code": 403,
            "execution_time_ms": 0
        }

    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as temp_file:
        temp_file.write(code)
        temp_path = temp_file.name

    try:
        start_time = time.time()
        res = subprocess.run(
            [sys.executable, temp_path],
            capture_output=True,
            text=True,
            timeout=timeout_seconds
        )
        duration_ms = round((time.time() - start_time) * 1000, 2)

        return {
            "success": res.returncode == 0,
            "stdout": res.stdout,
            "stderr": res.stderr,
            "return_code": res.returncode,
            "execution_time_ms": duration_ms
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": f"Execution timed out after {timeout_seconds} seconds.",
            "return_code": -1,
            "execution_time_ms": timeout_seconds * 1000
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "return_code": -1,
            "execution_time_ms": 0
        }
    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass
