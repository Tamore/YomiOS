import { Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import './voice-home.css';
import Orb from './Orb';
import { listenLocally } from './localListening';

import { synthesizeVoice, getStreamingVoiceUrl } from './api';

type Props = { onSend: (text: string) => Promise<any>; renderChat: (microphone: ReactNode) => ReactNode; panel: boolean; setPanel: (value: boolean) => void; openDashboard: () => void };
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'quiet';

const rosePalette = ['#e77ca5', '#ffe1db', '#76183c'];

export default function VoiceHome({ onSend, renderChat, panel, setPanel, openDashboard }: Props) {
  const sendRef = useRef(onSend);
  sendRef.current = onSend;
  const [chatting, setChatting] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [caption, setCaption] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackId = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const manuallyToggled = useRef(false);

  // Cleanup all audio and recognition on unmount
  useEffect(() => {
    return () => {
      playbackId.current++;
      if (recognitionRef.current) {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        try { recognition.abort(); } catch { /* Ignore */ }
      }
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      void audioContextRef.current?.close();
    };
  }, []);

  // Forward declarations for voice processing and state management
  const processVoiceQuery = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPhase('idle');
      setCaption('');
      setAudioLevel(0);
      return;
    }

    const id = ++playbackId.current;
    setPhase('thinking');
    setCaption('Yomi is thinking...');
    setAudioLevel(0);

    // If query asks for pipeline or tasks, reveal the drawer
    const lower = text.toLowerCase();
    if (lower.includes('pipeline') || lower.includes('task') || lower.includes('show') || lower.includes('status')) {
      if (!manuallyToggled.current) {
        setPanel(true);
      }
    }

    try {
      // 1. Process intent with Yomi Brain
      const chatRes = await sendRef.current(text);
      const reply = chatRes.reply || "No reply was returned.";

      if (id !== playbackId.current) return;
      setCaption(`“${reply}”`);

      const finishSpeech = () => {
        if (id !== playbackId.current) return;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        audioRef.current = null;
        setAudioLevel(0);
        setPhase('idle');
      };

      // Local synthesis fallback using browser SpeechSynthesis
      const speakLocally = () => {
        if (id !== playbackId.current) return;
        if (!window.speechSynthesis) {
          finishSpeech();
          setCaption(`“${reply}”`);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(reply);
        utterance.lang = /[ぁ-ヿ]/u.test(reply) || (/[一-龯]/u.test(reply) && !/[a-z]/i.test(reply)) ? 'ja-JP' : 'en-US';
        utterance.onstart = () => { if (id === playbackId.current) setPhase('speaking'); };
        utterance.onend = finishSpeech;
        utterance.onerror = () => {
          if (id !== playbackId.current) return;
          finishSpeech();
        };
        window.speechSynthesis.speak(utterance);
      };

      // 2. Play speech using streaming audio endpoint with real-time FFT
      const streamUrl = getStreamingVoiceUrl(reply);
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.src = streamUrl;
      audioRef.current = audio;

      const context = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = context;
      if (context.state === 'suspended') {
        void context.resume().catch(() => {});
      }

      if (context.state === 'running') {
        try {
          const analyser = context.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.65;
          const source = context.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(context.destination);

          const levels = new Uint8Array(analyser.frequencyBinCount);
          const measureSpeaker = () => {
            if (id !== playbackId.current || audio.paused) return;
            analyser.getByteFrequencyData(levels);
            let sum = 0;
            for (let i = 0; i < levels.length; i++) sum += levels[i];
            setAudioLevel(sum / levels.length / 255);
            animFrameRef.current = requestAnimationFrame(measureSpeaker);
          };
          audio.onplaying = () => {
            if (id === playbackId.current) {
              setPhase('speaking');
              measureSpeaker();
            }
          };
        } catch {
          // If media element source attachment fails, continue with standard playback
          audio.onplaying = () => { if (id === playbackId.current) setPhase('speaking'); };
        }
      } else {
        audio.onplaying = () => { if (id === playbackId.current) setPhase('speaking'); };
      }

      audio.onended = finishSpeech;

      let fallbackAttempted = false;
      const handleAudioError = async () => {
        if (fallbackAttempted || id !== playbackId.current) return;
        fallbackAttempted = true;
        audio.pause();
        audioRef.current = null;
        // Attempt static file synthesis fallback
        try {
          const staticUrl = await synthesizeVoice(reply);
          if (staticUrl && id === playbackId.current) {
            const fallbackAudio = new Audio(staticUrl);
            fallbackAudio.onended = finishSpeech;
            fallbackAudio.onplaying = () => { if (id === playbackId.current) setPhase('speaking'); };
            audioRef.current = fallbackAudio;
            await fallbackAudio.play();
            return;
          }
        } catch { /* Continue to local synthesis */ }
        speakLocally();
      };

      audio.onerror = handleAudioError;

      try {
        await audio.play();
        if (id === playbackId.current) setPhase('speaking');
      } catch {
        void handleAudioError();
      }
    } catch (err: any) {
      if (id !== playbackId.current) return;
      setCaption(`Connection error: ${err.message || 'Brain offline'}`);
      setPhase('idle');
      setAudioLevel(0);
    }
  }, [setPanel]);

  // Activate microphone listening with SpeechRecognition & live FFT
  const startListening = useCallback(() => {
    // Cancel any active audio playback immediately
    playbackId.current++;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);

    setPhase('listening');
    setCaption('Listening…');
    recognitionRef.current = listenLocally(setAudioLevel,
      () => setCaption('Transcribing…'),
      text => {
        recognitionRef.current = null;
        // Auto-detection can turn a clipped utterance into an isolated Korean syllable.
        if (!text.trim() || /^[\s\p{P}\p{Script=Hangul}]+$/u.test(text)) {
          setPhase('idle');
          setAudioLevel(0);
          setCaption('I couldn’t catch that. Tap the mic and try again in English or Japanese.');
          return;
        }
        void processVoiceQuery(text);
      },
      message => {
        recognitionRef.current = null;
        setPhase('idle');
        setAudioLevel(0);
        setCaption(message);
      });
  }, [processVoiceQuery]);

  // Click or keyboard interruption: interrupts speech playback and immediately begins listening
  const interruptAndListen = useCallback(() => {
    playbackId.current++;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setAudioLevel(0);
    setCaption('');
    startListening();
  }, [startListening]);

  // Toggle voice button and stage click handler
  const handleToggleVoice = useCallback(() => {
    // If speaking: barge-in interrupt and immediately listen
    if (phase === 'speaking') {
      interruptAndListen();
      return;
    }

    // If already listening: cancel and reset to idle
    if (phase === 'listening') {
      const current = recognitionRef.current;
      if (current) {
        recognitionRef.current = null;
        try { current.abort(); } catch { /* Ignore */ }
      }
        setCaption('');
      setPhase('idle');
      setAudioLevel(0);
      return;
    }

    if (phase === 'thinking') return;

    startListening();
  }, [phase, interruptAndListen, startListening]);

  // Spacebar hotkey for hands-free voice toggle & barge-in
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && !(e.target instanceof HTMLElement && e.target.closest('input, textarea, button, a, [contenteditable]'))) {
        e.preventDefault();
        handleToggleVoice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleVoice]);

  return (
    <section className={`voice-home ${chatting ? 'is-chatting' : ''} ${phase === 'idle' ? '' : 'awake'} ${panel ? 'with-panel' : ''}`}>

      <header>
        <img src={import.meta.env.BASE_URL + 'yomi-symbol.svg'} alt="Yomi" width="32" height="32" />
        <nav>
          {chatting && <button onClick={() => setChatting(false)}>Voice view</button>}
          <button onClick={openDashboard}>Dashboard</button>
          <button
            data-pipeline-toggle
            aria-expanded={panel}
            onClick={() => {
              manuallyToggled.current = true;
              setPanel(!panel);
            }}
          >
            {panel ? 'Hide pipeline' : 'Show pipeline'}
          </button>
        </nav>
      </header>

      <div 
        className="voice-center" 
        style={{ pointerEvents: 'none' }}
      >
        <div className="voice-stage" data-phase={phase}>
          <img src={import.meta.env.BASE_URL + 'yomi-wordmark.svg'} alt="Yomi" />
          <button className="orb-activation" aria-label="Toggle voice listening" onClick={handleToggleVoice}><Orb
            colors={rosePalette} 
            backgroundColor="#100c0e" 
            speed={phase === 'thinking' ? 1.85 : phase === 'listening' ? 1.1 + audioLevel * 1.2 : 1} 
            trail={phase === 'thinking' ? 2 : 1}
            glow={phase === 'speaking' ? 1.1 + audioLevel * 1.6 : phase === 'listening' ? 1.05 + audioLevel * 1.9 : 1}
            wobble={phase === 'listening' ? 1.0 + audioLevel * 2.2 : 1}
            hoverIntensity={phase === 'listening' ? 0.35 + audioLevel * 0.5 : 0.35}
            forceHoverState={phase === 'listening'} 
          /></button>
          <div className="voice-caption" aria-live="polite">
            <span key={caption || phase}>{caption}</span>
          </div>
        </div>
      </div>

      <div className="home-chat" onFocusCapture={(e) => { if (e.target instanceof HTMLInputElement) setChatting(true); }}>

        {renderChat(<button aria-label={phase === 'listening' ? 'Stop microphone' : 'Speak to Yomi'}
          aria-pressed={phase === 'listening'} disabled={phase === 'thinking'}
          onClick={handleToggleVoice} className="chat-microphone">
          {phase === 'listening' ? <Square size={18} /> : <Mic size={18} />}
        </button>)}
      </div>

    </section>
  );
}
