"""Local, in-memory transcription of 16 kHz mono PCM."""
import asyncio
import os
import re
from array import array
from pathlib import Path
from threading import Lock

from fastapi import APIRouter, HTTPException, Request

router = APIRouter()
model_dir = Path(os.environ.get("YOMI_SPEECH_MODEL_DIR") or
                 Path(__file__).resolve().parents[1] / "cache/voice/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17")
lock = Lock()
recognizer = None


def transcribe(data):
    global recognizer
    import sherpa_onnx
    with lock:
        if recognizer is None:
            recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
                model=str(model_dir / "model.int8.onnx"), tokens=str(model_dir / "tokens.txt"),
                language="auto", use_itn=True, num_threads=2)
        stream = recognizer.create_stream()
        stream.accept_waveform(16000, [v / 32768 for v in array("h", data)])
        recognizer.decode_stream(stream)
        return re.sub(r"<\|[^|]*\|>", "", stream.result.text).strip()


@router.post("/api/voice/transcribe")
async def recognize(request: Request):
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > 16000 * 2 * 31:
            raise HTTPException(413, "Recording exceeds 30 seconds.")
        data.extend(chunk)
    if not data or len(data) % 2:
        raise HTTPException(400, "Expected 16 kHz mono PCM.")
    try:
        return {"text": await asyncio.to_thread(transcribe, data)}
    except (ImportError, RuntimeError, OSError) as exc:
        raise HTTPException(503, "Local speech model unavailable.") from exc
