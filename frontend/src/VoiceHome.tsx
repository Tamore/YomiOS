import { useEffect, useRef, useState } from 'react';
import './voice-home.css';

type Props = { panel: boolean; setPanel: (value: boolean) => void; openDashboard: () => void };
type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'quiet';

function Orb({ phase }: { phase: Phase }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx || phase === 'idle') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const start = performance.now();
    function draw(now: number) {
      if (!ctx) return;
      const t = reduced.matches ? 0 : (now - start) / 1000;
      const r = 144 + (phase === 'thinking' ? -7 : phase === 'speaking' ? 14 * Math.abs(Math.sin(7*t)*Math.cos(2.7*t)) : 0);
      ctx.clearRect(0, 0, 880, 440);
      ctx.lineWidth = 1.35;
      for (let j = 0; j < 64; j++) {
        const v = (j - 31.5) / 32;
        ctx.beginPath();
        for (let i = 0; i <= 96; i++) {
          const u = i / 48 - 1;
          const x = 440 + u*r;
          const y = 220 + Math.sqrt(1-u*u)*r*(v + .27*(1-v*v)*Math.sin(u*5 + v*2 + t*(phase === 'thinking' ? .45 : 1.9)));
          if (i === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.strokeStyle = `rgba(255,134,177,${.35+.5*(1-Math.abs(v))})`;
        ctx.stroke();
      }
      if (!reduced.matches && phase !== 'quiet') frame = requestAnimationFrame(draw);
    }
    draw(start);
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  return <canvas ref={ref} width={880} height={440} aria-hidden="true" />;
}

export default function VoiceHome({ panel, setPanel, openDashboard }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const timers = useRef<number[]>([]);
  const manuallyToggled = useRef(false);
  const grid = useRef<HTMLDivElement>(null);
  const cell = useRef<HTMLDivElement>(null);
  function clearTimers() { timers.current.forEach(window.clearTimeout); timers.current = []; }
  useEffect(() => clearTimers, []);
  function play() {
    clearTimers();
    if (phase !== 'idle') { setPhase('idle'); setPanel(false); return; }
    manuallyToggled.current = false;
    setPanel(false);
    setPhase('listening');
    timers.current = [
      window.setTimeout(() => setPhase('thinking'), 2500),
      window.setTimeout(() => { setPhase('speaking'); if (!manuallyToggled.current) setPanel(true); }, 3500),
      window.setTimeout(() => setPhase('quiet'), 6000)
    ];
  }
  const caption = phase === 'speaking' ? '“Here’s your pipeline.”' : phase === 'thinking' || phase === 'listening' ? '“Hey Yomi, show my pipeline.”' : '';
  return <section className={`voice-home ${phase === 'idle' ? '' : 'awake'} ${panel ? 'with-panel' : ''}`}
    onPointerMove={e => {
      if (!grid.current || !cell.current || e.pointerType === 'touch') return;
      const { left, top } = grid.current.getBoundingClientRect();
      cell.current.style.transform = `translate(${left+48*Math.floor((e.clientX-left)/48)}px,${top+48*Math.floor((e.clientY-top)/48)}px)`;
    }}>
    <div ref={grid} className="voice-grid" /><div ref={cell} className="voice-cell" />
    <header><span>Yomi</span><nav><button onClick={openDashboard}>Dashboard</button><button aria-expanded={panel} onClick={() => { manuallyToggled.current = true; setPanel(!panel); }}>{panel ? 'Hide pipeline' : 'Show pipeline'}</button></nav></header>
    <div className="voice-center"><div className="voice-stage"><img src={import.meta.env.BASE_URL+'yomi-b1.webp'} alt="Yomi" /><Orb phase={phase}/><div className="voice-caption" aria-live="polite"><span key={caption}>{caption}</span></div></div></div>
    <footer><button onClick={play}>{phase === 'idle' ? 'Play “Hey Yomi” demo' : 'Return to wordmark'}</button></footer>
  </section>;
}
