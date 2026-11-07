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
    function draw(now: number) {
      if (!ctx) return;
      const t = reduced.matches ? 0 : now / 1000;
      const beat = phase === 'speaking' ? Math.abs(Math.sin(t*7) * Math.cos(t*2.7)) : 0;
      const radius = 139 + 4*Math.sin(t*1.4) + 15*beat;
      ctx.clearRect(0, 0, 880, 440);
      ctx.save();
      ctx.translate(440, 220);
      const halo = ctx.createRadialGradient(0, 0, 62, 0, 0, 215);
      halo.addColorStop(0, 'transparent');
      halo.addColorStop(.56, 'rgba(244,65,141,.13)');
      halo.addColorStop(1, 'transparent');
      ctx.fillStyle = halo;
      ctx.fillRect(-220,-220,440,440);
      ctx.globalCompositeOperation = 'lighter';
      // Offset closed curves form a folded ribbon; the moving highlight reveals its depth.
      const angle = t*.7;
      const ink = ctx.createLinearGradient(-160*Math.cos(angle),-160*Math.sin(angle),160*Math.cos(angle),160*Math.sin(angle));
      ink.addColorStop(0,'#923262');
      ink.addColorStop(.42,'#f168a1');
      ink.addColorStop(.72,'#ffd3d9');
      ink.addColorStop(1,'#df5488');
      ctx.strokeStyle = ink;
      for (let strand = 0; strand < 44; strand++) {
        const v = strand/43;
        ctx.globalAlpha = .18 + .36*Math.pow(Math.abs(2*v-1),4);
        ctx.lineWidth = strand === 43 ? 2 : 1.15;
        ctx.beginPath();
        for (let point = 0; point <= 144; point++) {
          const a = point * Math.PI/72;
          const fold = Math.sin(3*a - t + 2.1*v);
          const r = radius + 16*fold + 8*Math.cos(2*a+t*.64) + 19*(v-.5);
          const x = r*Math.cos(a) + 10*Math.sin(2*a+t*.6);
          const y = r*Math.sin(a)*(.63 + .35*v) + 25*(1-v)*Math.sin(2*a+t*.85);
          if (point === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
      if (!reduced.matches) frame = requestAnimationFrame(draw);
    }
    draw(performance.now());
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
