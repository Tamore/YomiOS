import sounddevice as sd
import vosk
import sys
import queue
import requests
from playsound import playsound
import os
import winsound
import speech_recognition as sr
import json
from dotenv import load_dotenv

# Load environment variables from the Next.js .env file
load_dotenv(dotenv_path='../.env')

API_URL = "http://localhost:3000/api/brain"
MODEL_DIR = "model"

def speak(text):
    print(f"\n[Yomi] {text}\n")
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("ELEVENLABS_API_KEY not found in .env file.")
        return
        
    try:
        # We use a direct REST API call to bypass any Python SDK version errors
        # 'N2lVS1w4EtoT3dr4eOWO' is the Voice ID for Callum (Premium Male Voice)
        url = "https://api.elevenlabs.io/v1/text-to-speech/N2lVS1w4EtoT3dr4eOWO"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code == 200:
            with open("response.mp3", "wb") as f:
                f.write(response.content)
                
            playsound("response.mp3")
            
            try: os.remove("response.mp3")
            except: pass
        else:
            print(f"ElevenLabs API Error: {response.text}")
            
    except Exception as e:
        print(f"System Error while playing audio: {e}")

def listen_for_command():
    recognizer = sr.Recognizer()
    fs = 16000
    duration = 6
    import wave
    
    # Record exactly 6 seconds after the beep
    recording = sd.rec(int(duration * fs), samplerate=fs, channels=1, dtype='int16')
    sd.wait()
    
    with wave.open('temp.wav', 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(fs)
        wf.writeframes(recording.tobytes())
        
    with sr.AudioFile('temp.wav') as source:
        audio = recognizer.record(source)
    try:
        # Use Google's highly accurate STT for the actual command
        return recognizer.recognize_google(audio).lower()
    except:
        return ""

def main():
    print("\n==============================================")
    print("🎙️ Yomi Ear is Active (Hybrid Engine)")
    print("==============================================\n")
    speak("System online. I am listening.")
    
    q = queue.Queue()
    def callback(indata, frames, time, status):
        if status: print(status, file=sys.stderr)
        q.put(bytes(indata))

    vosk.SetLogLevel(-1)
    model = vosk.Model(MODEL_DIR)
    
    # I added what he thought he heard to the wake word list!
    wake_words = ["yomi", "you me", "yummy", "yo me", "hear me", "dummy", "jarvis", "system", "you owe me", "you or me", "your me", "you're me", "hey you"]
    
    with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16', channels=1, callback=callback):
        rec = vosk.KaldiRecognizer(model, 16000)
        
        while True:
            data = q.get()
            if rec.AcceptWaveform(data):
                res = json.loads(rec.Result())
                text = res.get('text', '')
                
                if text:
                    print(f"[Offline Ear Heard]: {text}")
                
                if any(word in text for word in wake_words):
                    winsound.Beep(800, 200)
                    print("\n>>> WAKE WORD DETECTED! SPEAK COMMAND NOW (You have 6 seconds) <<<")
                    
                    command_text = listen_for_command()
                    
                    if command_text:
                        print(f"> Command transcribed perfectly: '{command_text}'")
                        print("Sending to Brain...")
                        try:
                            response = requests.post(API_URL, json={"command": command_text})
                            if response.status_code == 200:
                                reply = response.json().get("reply", "Task completed.")
                                speak(reply)
                            else:
                                speak("API connection failed.")
                        except:
                            speak("The brain server is offline.")
                    else:
                        print("I didn't hear a command.")
                    
                    rec.Reset()
                    print("\n[Returning to background listening...]")
                    while not q.empty():
                        q.get()

if __name__ == "__main__":
    main()
