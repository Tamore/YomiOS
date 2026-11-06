import os
import subprocess
import psutil
from typing import Dict, Any, List

APP_REGISTRY = {
    "chrome": "chrome",
    "google chrome": "chrome",
    "vs code": "code",
    "code": "code",
    "vscode": "code",
    "spotify": "spotify",
    "notepad": "notepad",
    "calculator": "calc",
    "calc": "calc",
    "cmd": "cmd",
    "terminal": "wt",
    "powershell": "powershell",
    "explorer": "explorer"
}

def get_system_telemetry() -> Dict[str, Any]:
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count = psutil.cpu_count(logical=True)
    memory = psutil.virtual_memory()
    
    # Root drive info
    try:
        disk = psutil.disk_usage("C:\\" if os.name == "nt" else "/")
        disk_total_gb = round(disk.total / (1024**3), 1)
        disk_used_gb = round(disk.used / (1024**3), 1)
        disk_free_gb = round(disk.free / (1024**3), 1)
        disk_percent = round(disk.percent, 1)
    except Exception:
        disk_total_gb, disk_used_gb, disk_free_gb, disk_percent = 512.0, 250.0, 262.0, 48.8
    
    battery = psutil.sensors_battery()
    battery_percent = round(battery.percent, 1) if battery else 100.0
    is_charging = battery.power_plugged if battery else True

    # Net I/O
    try:
        net = psutil.net_io_counters()
        bytes_sent_mb = round(net.bytes_sent / (1024**2), 1)
        bytes_recv_mb = round(net.bytes_recv / (1024**2), 1)
    except Exception:
        bytes_sent_mb, bytes_recv_mb = 0.0, 0.0

    return {
        "cpu_percent": round(cpu_percent, 1),
        "cpu_cores": cpu_count,
        "ram_percent": round(memory.percent, 1),
        "ram_used_gb": round(memory.used / (1024**3), 2),
        "ram_total_gb": round(memory.total / (1024**3), 2),
        "ram_free_gb": round(memory.available / (1024**3), 2),
        "disk_percent": disk_percent,
        "disk_used_gb": disk_used_gb,
        "disk_free_gb": disk_free_gb,
        "disk_total_gb": disk_total_gb,
        "battery_percent": battery_percent,
        "is_charging": is_charging,
        "bytes_sent_mb": bytes_sent_mb,
        "bytes_recv_mb": bytes_recv_mb
    }

def get_top_processes(limit: int = 5) -> List[Dict[str, Any]]:
    procs = []
    for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
        try:
            info = p.info
            procs.append({
                "pid": info['pid'],
                "name": info['name'],
                "cpu": round(info['cpu_percent'] or 0.0, 1),
                "ram": round(info['memory_percent'] or 0.0, 1)
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    # Sort by memory usage
    procs.sort(key=lambda x: x["ram"], reverse=True)
    return procs[:limit]

def launch_app(app_name: str) -> str:
    key = app_name.lower().strip()
    executable = APP_REGISTRY.get(key, key)
    try:
        subprocess.Popen(executable, shell=True)
        return f"Launched {app_name} successfully."
    except Exception as e:
        return f"Failed to launch {app_name}: {str(e)}"
