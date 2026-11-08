import { useEffect, useRef, useState, useCallback } from 'react';
import './voice-home.css';
import TrailGrid from './TrailGrid';
import { sendChat, synthesizeVoice } from './api';

type Props = { panel: boolean; setPanel: (value: boolean) => void; openDashboard: () => void };
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'quiet';

function Orb({ phase, audioLevel = 0 }: { phase: Phase; audioLevel?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || phase === 'idle') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function draw(now: number) {
      if (!ctx) return;
      const t = reduced.matches ? 0 : now / 1000;
      // Pulse beat combines audio frequency level and harmonic waves when speaking
      const reactiveBoost = audioLevel * 25;
      const beat = phase === 'speaking' 
        ? Math.abs(Math.sin(t * 7) * Math.cos(t * 2.7)) * 12 + reactiveBoost
        : phase === 'listening'
        ? Math.abs(Math.sin(t * 3.5)) * 6
        : 0;
      const radius = 139 + 4 * Math.sin(t * 1.4) + beat;
      ctx.clearRect(0, 0, 880, 440);
      ctx.save();
      ctx.translate(440, 220);
      const halo = ctx.createRadialGradient(0, 0, 62, 0, 0, 215);
      halo.addColorStop(0, 'transparent');
      halo.addColorStop(0.56, 'rgba(244,65,141,.13)');
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.fillRect(-220, -220, 440, 440);
      ctx.globalCompositeOperation = 'lighter';
      // Offset closed curves form a folded ribbon; the moving highlight reveals its depth.
      const angle = t * 0.7;
      const ink = ctx.createLinearGradient(-160 * Math.cos(angle), -160 * Math.sin(angle), 160 * Math.cos(angle), 160 * Math.sin(angle));
      ink.addColorStop(0, '#923262');
      ink.addColorStop(0.42, '#f168a1');
      ink.addColorStop(0.72, '#ffd3d9');
      ink.addColorStop(1, '#df5488');
      ctx.strokeStyle = ink;
      for (let strand = 0; strand < 44; strand++) {
        const v = strand / 43;
        ctx.globalAlpha = 0.18 + 0.36 * Math.pow(Math.abs(2 * v - 1), 4);
        ctx.lineWidth = strand === 43 ? 2 : 1.15;
        ctx.beginPath();
        for (let point = 0; point <= 144; point++) {
          const a = (point * Math.PI) / 72;
          const fold = Math.sin(3 * a - t + 2.1 * v);
          const r = radius + 16 * fold + 8 * Math.cos(2 * a + t * 0.64) + 19 * (v - 0.5);
          const x = r * Math.cos(a) + 10 * Math.sin(2 * a + t * 0.6);
          const y = r * Math.sin(a) * (0.63 + 0.35 * v) + 25 * (1 - v) * Math.sin(2 * a + t * 0.85);
          if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
      if (!reduced.matches) frame = requestAnimationFrame(draw);
    }
    draw(performance.now());
    return () => cancelAnimationFrame(frame);
  }, [phase, audioLevel]);
  return <canvas ref={ref} width={880} height={440} aria-hidden="true" />;
}

export default function VoiceHome({ panel, setPanel, openDashboard }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [caption, setCaption] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const manuallyToggled = useRef(false);

  // Initialize SpeechRecognition once if available in the browser
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setPhase('listening');
        setCaption('Listening to your voice...');
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setCaption(`“${transcript.trim()}”`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setCaption(`Speech error: ${event.error}`);
        }
        setPhase('idle');
      };

      recognition.onend = () => {
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Process voice query through AI Brain and synthesize response
  const processVoiceQuery = useCallback(async (text: string) => {
    if (!text.trim()) {
      setPhase('idle');
      setCaption('');
      return;
    }

    setPhase('thinking');
    setCaption('Yomi is thinking...');

    // If query asks for pipeline/tasks, open the pipeline panel
    const lower = text.toLowerCase();
    if (lower.includes('pipeline') || lower.includes('task') || lower.includes('show') || lower.includes('status')) {
      if (!manuallyToggled.current) {
        setPanel(true);
      }
    }

    try {
      // 1. Send query to Yomi Brain
      const chatRes = await sendChat(text, 'voice-session');
      const reply = chatRes.reply || "I've synchronized your academic and research satellite.";

      setCaption(`“${reply}”`);
      setPhase('speaking');

      // 2. Synthesize speech using edge-tts
      const audioUrl = await synthesizeVoice(reply);

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        // Setup AudioContext frequency analysis to drive orb pulsing
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const actx = new AudioContextClass();
            audioContextRef.current = actx;
            const source = actx.createMediaElementSource(audio);
            const analyser = actx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyser.connect(actx.destination);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const checkVolume = () => {
              if (analyserRef.current && phase === 'speaking') {
                analyserRef.current.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length / 255;
                setAudioLevel(avg);
                animFrameRef.current = requestAnimationFrame(checkVolume);
              }
            };
            animFrameRef.current = requestAnimationFrame(checkVolume);
          }
        } catch {
          // AudioContext restrictions fallback
        }

        audio.onended = () => {
          setPhase('quiet');
          setAudioLevel(0);
          setTimeout(() => {
            setPhase('idle');
            setCaption('');
          }, 2000);
        };

        await audio.play();
      } else {
        // Fallback browser speech synthesis if offline
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.onend = () => {
            setPhase('idle');
            setCaption('');
          };
          window.speechSynthesis.speak(utterance);
        } else {
          setTimeout(() => {
            setPhase('idle');
            setCaption('');
          }, 3500);
        }
      }
    } catch (err: any) {
      setCaption(`Connection error: ${err.message || 'Brain offline'}`);
      setPhase('idle');
    }
  }, [setPanel, phase]);

  // Activate microphone or start simulated demo
  const handleToggleVoice = useCallback(() => {
    // If audio is currently speaking, stop it
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setPhase('idle');
      setCaption('');
      setAudioLevel(0);
      return;
    }

    if (phase === 'listening') {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            finalTranscript += event.results[i][0].transcript;
          }
          if (finalTranscript.trim()) {
            setCaption(`“${finalTranscript.trim()}”`);
            if (event.results[0].isFinal) {
              processVoiceQuery(finalTranscript.trim());
            }
          }
        };

        recognitionRef.current.start();
        return;
      } catch (err) {
        console.warn('Recognition start failed, falling back to simulated prompt:', err);
      }
    }

    // Fallback: prompt for user input or run interactive demo
    const promptText = window.prompt("Speak to Yomi (or enter query):", "Show my university pipeline and tasks");
    if (promptText) {
      setCaption(`“${promptText}”`);
      processVoiceQuery(promptText);
    }
  }, [phase, processVoiceQuery]);

  return (
    <section className={`voice-home ${phase === 'idle' ? '' : 'awake'} ${panel ? 'with-panel' : ''}`}>
      <TrailGrid />
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

      <div className="voice-center" style={{ pointerEvents: 'auto', cursor: 'pointer' }} onClick={handleToggleVoice} title="Click to speak with Yomi">
        <div className="voice-stage">
          <img src={import.meta.env.BASE_URL + 'yomi-wordmark.svg'} alt="Yomi" />
          <Orb phase={phase} audioLevel={audioLevel} />
          <div className="voice-caption" aria-live="polite">
            <span key={caption || phase}>{caption || (phase === 'idle' ? 'Click orb or button to speak' : '')}</span>
          </div>
        </div>
      </div>

      <footer>
        <button onClick={handleToggleVoice} className="voice-action-btn">
          {phase === 'listening' ? 'Listening... (Click to cancel)' : phase === 'speaking' ? 'Stop speaking' : phase === 'thinking' ? 'Thinking...' : 'Speak to Yomi'}
        </button>
      </footer>
    </section>
  );
}
