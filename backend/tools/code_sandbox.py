import sys
import subprocess
import tempfile
import os
from typing import Dict, Any

def execute_python_code(code: str, timeout_seconds: float = 6.0) -> Dict[str, Any]:
    """
    Safely executes arbitrary Python computation code in an isolated subprocess.
    Captures stdout, stderr, execution time, and return code.
    Ideal for rapid algorithms, math proofs, distributed consensus benchmarks, and data formatting.
    """
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as temp_file:
        temp_file.write(code)
        temp_path = temp_file.name

    try:
        import time
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
