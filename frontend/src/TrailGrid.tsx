import { useEffect, useRef } from 'react';

export default function TrailGrid() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!host || !canvas || !ctx) return;
    const wordmark = host.querySelector<HTMLImageElement>('.voice-stage img');
    const size = 44;
    const cells = new Map<string, { x: number; y: number; time: number; strength: number }>();
    let frame = 0;
    let previous: [number, number] | undefined;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const ratio = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(host.clientWidth * ratio);
      canvas.height = Math.round(host.clientHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const paint = (now: number) => {
      frame = 0;
      ctx.clearRect(0, 0, host.clientWidth, host.clientHeight);
      for (const [key, cell] of cells) {
        const age = Math.max(0, now - cell.time);
        const alpha = Math.max(0, 1 - age / 1650) ** 1.4 * cell.strength;
        if (alpha < .008) { cells.delete(key); continue; }
        ctx.fillStyle = `rgba(255,195,215,${alpha * .17})`;
        ctx.strokeStyle = `rgba(255,206,224,${alpha * .84})`;
        ctx.fillRect(cell.x * size, cell.y * size, size, size);
        ctx.strokeRect(cell.x * size + .5, cell.y * size + .5, size-1, size-1);
      }
      if (wordmark?.complete && wordmark.naturalWidth && !host.classList.contains('awake')) {
        const mark = wordmark.getBoundingClientRect();
        const grid = canvas.getBoundingClientRect();
        const padding = 6;
        // Clear complete trail cells near the wordmark so no partial square edges remain.
        const left = Math.floor((mark.left - grid.left - padding) / size) * size;
        const top = Math.floor((mark.top - grid.top - padding) / size) * size;
        const right = Math.ceil((mark.right - grid.left + padding) / size) * size;
        const bottom = Math.ceil((mark.bottom - grid.top + padding) / size) * size;
        ctx.clearRect(left, top, right - left, bottom - top);
      }
      if (cells.size) frame = requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || motion.matches) return;
      const bounds = host.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / size, y = (event.clientY - bounds.top) / size;
      const [px, py] = previous ?? [x,y];
      const steps = Math.max(1, Math.ceil(Math.hypot(x-px,y-py)*2));
      const time = performance.now();
      for (let i=1; i<=steps; i++) {
        const cx=px+(x-px)*i/steps, cy=py+(y-py)*i/steps;
        for (let col=Math.floor(cx)-1; col<=Math.floor(cx)+1; col++)
          for (let row=Math.floor(cy)-1; row<=Math.floor(cy)+1; row++) {
            const strength=Math.max(0,1-Math.hypot(col+.5-cx,row+.5-cy)/1.85);
            if (!strength) continue;
            const key=col+','+row, old=cells.get(key);
            const remaining=old ? old.strength*Math.max(0,1-(time-old.time)/1650)**1.4 : 0;
            cells.set(key,{x:col,y:row,time,strength:Math.max(strength,remaining)});
          }
      }
      previous=[x,y];
      if (!frame) frame=requestAnimationFrame(paint);
    };
    const leave=()=>{previous=undefined;};
    resize();
    const observer=new ResizeObserver(resize);
    observer.observe(host);
    host.addEventListener('pointermove',move);
    host.addEventListener('pointerleave',leave);
    return ()=>{observer.disconnect();cancelAnimationFrame(frame);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);};
  }, []);
  return <canvas className="voice-trail-grid" ref={ref} aria-hidden="true" />;
}
