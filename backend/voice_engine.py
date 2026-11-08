import asyncio
import os
import io
import re
import edge_tts

from config import WORKSPACE_ROOT
AUDIO_CACHE_DIR = WORKSPACE_ROOT / "cache" / "audio"
os.makedirs(AUDIO_CACHE_DIR, exist_ok=True)

DEFAULT_VOICE = "en-US-AriaNeural"

def build_ssml(text: str, voice: str = DEFAULT_VOICE, rate: str = "+0%", pitch: str = "+0Hz") -> str:
    # Clean code blocks & special characters before synthesis
    clean = re.sub(r'```[\s\S]*?```', ' [code block] ', text)
    clean = re.sub(r'`([^`]+)`', r'\1', clean)
    clean = re.sub(r'https?://\S+', ' link ', clean)
    clean = re.sub(r'[\*\_#\[\]]', '', clean)
    
    # Add human breath pauses (450ms at sentence ends, 200ms at commas)
    clean = re.sub(r'\.\s+', '.<break time="400ms"/> ', clean)
    clean = re.sub(r'!\s+', '!<break time="450ms"/> ', clean)
    clean = re.sub(r'\?\s+', '?<break time="450ms"/> ', clean)
    clean = re.sub(r',\s+', ',<break time="200ms"/> ', clean)
    clean = re.sub(r';\s+', ';<break time="250ms"/> ', clean)
    
    # XML escaping
    clean = clean.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # Restore break tags
    clean = clean.replace('&lt;break time="400ms"/&gt;', '<break time="400ms"/>')
    clean = clean.replace('&lt;break time="450ms"/&gt;', '<break time="450ms"/>')
    clean = clean.replace('&lt;break time="200ms"/&gt;', '<break time="200ms"/>')
    clean = clean.replace('&lt;break time="250ms"/&gt;', '<break time="250ms"/>')
    
    ssml = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="{voice}">
        <prosody rate="{rate}" pitch="{pitch}">
            {clean}
        </prosody>
    </voice>
</speak>"""
    return ssml

async def synthesize_speech(text: str, voice: str = DEFAULT_VOICE) -> str:
    filename = f"speech_{abs(hash(text)) % 1000000}.mp3"
    filepath = os.path.join(AUDIO_CACHE_DIR, filename)
    
    # Don't synthesize huge walls of text
    speech_text = text[:400] if len(text) > 400 else text
    
    communicate = edge_tts.Communicate(speech_text, voice=voice)
    await communicate.save(filepath)
    return filepath
