import asyncio
import io
import wave
import hashlib
from threading import Lock
import os
import re
from typing import AsyncIterator
import edge_tts

from config import WORKSPACE_ROOT
AUDIO_CACHE_DIR = WORKSPACE_ROOT / "cache" / "audio"
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

DEFAULT_VOICE = "en-US-AriaNeural"

_ja_lock = Lock()


def japanese_reply(text: str) -> bool:
    return bool(re.search(r"[ぁ-ヿ]", text) or
                (re.search(r"[一-龯]", text) and not re.search(r"[a-zA-Z]", text)))


def japanese_audio(text: str) -> bytes:
    import numpy as np
    import pyopenjtalk
    with _ja_lock:
        samples, rate = pyopenjtalk.tts(clean_speech_text(text))
    output = io.BytesIO()
    with wave.open(output, "wb") as wav:
        wav.setparams((1, 2, rate, 0, "NONE", ""))
        wav.writeframes(np.clip(samples, -32768, 32767).astype("<i2").tobytes())
    return output.getvalue()


def clean_speech_text(text: str) -> str:
    """Prepares natural, pronounceable text for speech synthesis by stripping markdown syntax."""
    clean = re.sub(r'```[\s\S]*?```', ' [code block] ', text)
    clean = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', clean)
    clean = re.sub(r'`([^`]+)`', r'\1', clean)
    clean = re.sub(r'https?://\S+', ' link ', clean)
    clean = re.sub(r'[\*\_#]', '', clean)
    clean = re.sub(r'[•\-\–\—]\s*', '', clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def _local_sapi5_synthesize(text: str, out_path: str):
    """Fallback offline TTS using native Windows SAPI5."""
    try:
        import pyttsx3
        engine = pyttsx3.init()
        voices = engine.getProperty('voices')
        for v in voices:
            if 'zira' in v.name.lower() or 'hazel' in v.name.lower():
                engine.setProperty('voice', v.id)
                break
        engine.setProperty('rate', 170)
        engine.save_to_file(text, out_path)
        engine.runAndWait()
    except Exception as e:
        print(f"[VoiceEngine] SAPI5 fallback error: {e}")

async def synthesize_speech(text: str, voice: str = DEFAULT_VOICE) -> str:
    clean = clean_speech_text(text)
    if not clean:
        clean = "I have processed your request."
    
    if japanese_reply(clean) and voice == DEFAULT_VOICE:
        path = AUDIO_CACHE_DIR / ("ja_" + hashlib.sha256(clean.encode()).hexdigest() + ".wav")
        if not path.is_file():
            audio = await asyncio.to_thread(japanese_audio, clean)
            path.write_bytes(audio)
        return str(path)

    # Cap single speech burst
    speech_text = clean[:400] if len(clean) > 400 else clean
    hash_key = abs(hash(speech_text)) % 1000000
    mp3_filename = f"speech_{hash_key}.mp3"
    mp3_filepath = os.path.join(AUDIO_CACHE_DIR, mp3_filename)

    if os.path.exists(mp3_filepath) and os.path.getsize(mp3_filepath) > 0:
        return mp3_filepath

    try:
        communicate = edge_tts.Communicate(speech_text, voice=voice)
        await communicate.save(mp3_filepath)
        if os.path.exists(mp3_filepath) and os.path.getsize(mp3_filepath) > 0:
            return mp3_filepath
    except Exception as err:
        print(f"[VoiceEngine] Edge TTS offline or connection reset ({err}), activating local SAPI5 fallback.")

    # Offline SAPI5 Fallback
    wav_filename = f"speech_{hash_key}.wav"
    wav_filepath = os.path.join(AUDIO_CACHE_DIR, wav_filename)
    await asyncio.to_thread(_local_sapi5_synthesize, speech_text, wav_filepath)
    if not os.path.exists(wav_filepath) or os.path.getsize(wav_filepath) == 0:
        raise RuntimeError("Offline speech synthesis failed")
    return wav_filepath

async def stream_speech_chunks(text: str, voice: str = DEFAULT_VOICE) -> AsyncIterator[bytes]:
    clean = clean_speech_text(text)
    if not clean:
        clean = "I am listening."
    speech_text = clean[:500] if len(clean) > 500 else clean

    communicate = edge_tts.Communicate(speech_text, voice=voice)
    received_audio = False
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            received_audio = True
            yield chunk["data"]
    if not received_audio:
        raise RuntimeError("Speech stream returned no audio")
