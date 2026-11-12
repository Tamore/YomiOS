import { useEffect, useRef, useState, useCallback } from 'react';
import './voice-home.css';
import Orb from './Orb';

import { sendChat, synthesizeVoice, getStreamingVoiceUrl } from './api';

type Props = { panel: boolean; setPanel: (value: boolean) => void; openDashboard: () => void };
type SpeechResult = { 0: { transcript: string }; isFinal: boolean };
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'quiet';

const rosePalette = ['#e77ca5', '#ffe1db', '#76183c'];

export default function VoiceHome({ panel, setPanel, openDashboard }: Props) {
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

  // Microphone analyser for live animation while listening
  const micGeneration = useRef(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  // Cleanup helper for microphone hardware resources
  const stopMicAnalysis = useCallback(() => {
    micGeneration.current++;
    cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (micSourceRef.current) {
      try { micSourceRef.current.disconnect(); } catch { /* Ignore */ }
      micSourceRef.current = null;
    }
    micAnalyserRef.current = null;
  }, []);

  // Cleanup all audio and recognition on unmount
  useEffect(() => {
    return () => {
      playbackId.current++;
      if (recognitionRef.current) {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        try { recognition.abort(); } catch { /* Ignore */ }
      }
      stopMicAnalysis();
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
  }, [stopMicAnalysis]);

  // Start live microphone stream and FFT analysis for WebGL Orb during listening
  const startMicAnalysis = useCallback(async () => {
    const generation = ++micGeneration.current;
    try {
      const ctx = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      if (generation !== micGeneration.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      micStreamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      micSourceRef.current = source;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const levels = new Uint8Array(analyser.frequencyBinCount);
      const measureMic = () => {
        if (phaseRef.current !== 'listening' || !micAnalyserRef.current) return;
        analyser.getByteFrequencyData(levels);
        let sum = 0;
        for (let i = 0; i < levels.length; i++) sum += levels[i];
        const normalized = sum / levels.length / 255;
        setAudioLevel(normalized);
        animFrameRef.current = requestAnimationFrame(measureMic);
      };
      animFrameRef.current = requestAnimationFrame(measureMic);
    } catch (err) {
      console.warn('Microphone stream access unavailable for live FFT:', err);
    }
  }, []);

  // Forward declarations for voice processing and state management
  const processVoiceQuery = useCallback(async (text: string) => {
    stopMicAnalysis();
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
      const chatRes = await sendChat(text, 'voice-session');
      const reply = chatRes.reply || "I've synchronized your academic and research satellite.";

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
  }, [setPanel, stopMicAnalysis]);

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

    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (Recognition) {
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        if (recognitionRef.current !== recognition) return;
        setPhase('listening');
        setCaption('Listening…');
        void startMicAnalysis();
      };

      recognition.onresult = (event: any) => {
        if (recognitionRef.current !== recognition) return;
        const results = Array.from(event.results) as SpeechResult[];
        const transcript = results.map(result => result[0].transcript).join(' ').trim();
        if (!transcript) return;
        setCaption(`“${transcript}”`);
        if (results.some(result => result.isFinal)) {
          recognitionRef.current = null;
          recognition.stop();
          stopMicAnalysis();
          void processVoiceQuery(transcript);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        stopMicAnalysis();
        setPhase('idle');
        setCaption(event.error === 'no-speech' ? '' : `Speech error: ${event.error}`);
        setAudioLevel(0);
      };

      recognition.onend = () => {
        if (recognitionRef.current !== recognition) return;
        recognitionRef.current = null;
        stopMicAnalysis();
        setCaption('');
        setPhase('idle');
        setAudioLevel(0);
      };

      try {
        recognition.start();
        setPhase('listening');
        return;
      } catch {
        recognitionRef.current = null;
        stopMicAnalysis();
      }
    }

    // Interactive text prompt fallback if SpeechRecognition is blocked or unsupported
    const promptText = window.prompt("Speak to Yomi (or enter query):", "Show my university pipeline and tasks");
    if (promptText) {
      setCaption(`“${promptText}”`);
      void processVoiceQuery(promptText);
    }
  }, [processVoiceQuery, startMicAnalysis, stopMicAnalysis]);

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
      stopMicAnalysis();
      setCaption('');
      setPhase('idle');
      setAudioLevel(0);
      return;
    }

    if (phase === 'thinking') return;

    startListening();
  }, [phase, interruptAndListen, startListening, stopMicAnalysis]);

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
    <section className={`voice-home ${phase === 'idle' ? '' : 'awake'} ${panel ? 'with-panel' : ''}`}>

      <header>
        <img src={import.meta.env.BASE_URL + 'yomi-symbol.svg'} alt="Yomi" width="32" height="32" />
        <nav>
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
        style={{ pointerEvents: 'auto', cursor: 'pointer' }} 
        onClick={handleToggleVoice}
      >
        <div className="voice-stage" data-phase={phase}>
          <img src={import.meta.env.BASE_URL + 'yomi-wordmark.svg'} alt="Yomi" />
          <Orb 
            colors={rosePalette} 
            backgroundColor="#100c0e" 
            speed={phase === 'thinking' ? 1.85 : phase === 'listening' ? 1.1 + audioLevel * 1.2 : 1} 
            trail={phase === 'thinking' ? 2 : 1}
            glow={phase === 'speaking' ? 1.1 + audioLevel * 1.6 : phase === 'listening' ? 1.05 + audioLevel * 1.9 : 1}
            wobble={phase === 'listening' ? 1.0 + audioLevel * 2.2 : 1}
            hoverIntensity={phase === 'listening' ? 0.35 + audioLevel * 0.5 : 0.35}
            forceHoverState={phase === 'listening'} 
          />
          <div className="voice-caption" aria-live="polite">
            <span key={caption || phase}>{caption}</span>
          </div>
        </div>
      </div>

      <footer>
        <button onClick={handleToggleVoice} className="voice-action-btn">
          {phase === 'listening' 
            ? 'Stop listening' 
            : phase === 'speaking' 
            ? 'Interrupt & Speak (Space)' 
            : phase === 'thinking' 
            ? 'Thinking...' 
            : 'Speak to Yomi (Space)'}
        </button>
      </footer>
    </section>
  );
}
