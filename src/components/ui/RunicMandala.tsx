"use client";

import { useCommand } from "../CommandContext";
import { useEffect, useState } from "react";

const RUNES = "ᚠ ᚢ ᚦ ᚬ ᚱ ᚴ ᚼ ᚽ ᚾ ᛁ ᛅ ᛋ ᛏ ᛒ ᛘ ᛚ ᛦ ᛨ ᛪ ᛫ ᛭ ᛮ ᛯ ᚠ ᚢ ᚦ ᚬ ᚱ ᚴ ᚼ ᚽ ᚾ ᛁ ᛅ ᛋ ᛏ ᛒ ᛘ ᛚ ᛦ ᛨ ᛪ";

export default function RunicMandala() {
  const { appState, visibleWidgets } = useCommand();
  const [scale, setScale] = useState(1);
  const hasWidgets = visibleWidgets.length > 0;

  // Simulated audio pulsing when speaking
  useEffect(() => {
    let interval: any;
    if (appState === 'speaking') {
      interval = setInterval(() => {
        setScale(1 + Math.random() * 0.2);
      }, 80);
    } else {
      setScale(1);
    }
    return () => clearInterval(interval);
  }, [appState]);

  // Color mapping based on state
  const stateColor = {
    idle: "var(--color-primary)",
    listening: "var(--color-secondary)", // cyan
    thinking: "var(--color-tertiary)", // deep magic purple
    speaking: "var(--color-primary)",
  }[appState];

  const dropShadow = `drop-shadow(0 0 20px ${stateColor})`;

  // If widgets are present, move orb to top-left and scale it down. Otherwise keep it centered and larger.
  // We use top-[50%] left-[50%] to ensure absolute centering, and -translate-x-1/2 -translate-y-1/2 to adjust for the element's width/height.
  const containerClasses = `absolute transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] flex items-center justify-center ${
    hasWidgets 
      ? 'w-[200px] h-[200px] top-12 left-1/2 -translate-x-1/2 opacity-40' 
      : 'w-[450px] h-[450px] top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 opacity-100'
  }`;

  return (
    <div className={containerClasses}>
      <div className="relative w-full h-full flex items-center justify-center transition-transform" style={{ transform: `scale(${scale})`, filter: dropShadow }}>
      
      {/* Outer Ring: Rotating Runic Glyphs */}
      <svg className={`absolute w-full h-full text-primary transition-all duration-[3000ms] ${appState === 'thinking' ? 'animate-[spin_4s_linear_infinite]' : 'animate-[spin_30s_linear_infinite]'}`} viewBox="0 0 200 200">
        <defs>
          <path id="runeCircle" d="M 100, 100 m -90, 0 a 90,90 0 1,1 180,0 a 90,90 0 1,1 -180,0" />
        </defs>
        <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 6" className="opacity-40" />
        <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20" />
        <text className="fill-currentColor font-bold tracking-[0.5em] opacity-80" fontSize="8">
          <textPath href="#runeCircle" startOffset="0%">
            {RUNES}
          </textPath>
        </text>
      </svg>

      {/* Middle Ring: Constellation Network (Memory Links) */}
      <svg className={`absolute w-[75%] h-[75%] transition-all duration-[2000ms] ${appState === 'listening' ? 'text-secondary animate-[spin_8s_linear_infinite_reverse]' : 'text-primary animate-[spin_25s_linear_infinite_reverse]'}`} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="85" fill="none" stroke="currentColor" strokeWidth="0.2" className="opacity-30" />
        {/* Constellation Nodes and Links */}
        <g stroke="currentColor" strokeWidth="0.5" className="opacity-60">
          <line x1="100" y1="15" x2="160" y2="40" />
          <line x1="160" y1="40" x2="185" y2="100" />
          <line x1="185" y1="100" x2="160" y2="160" />
          <line x1="160" y1="160" x2="100" y2="185" />
          <line x1="100" y1="185" x2="40" y2="160" />
          <line x1="40" y1="160" x2="15" y2="100" />
          <line x1="15" y1="100" x2="40" y2="40" />
          <line x1="40" y1="40" x2="100" y2="15" />
          
          {/* Cross links */}
          <line x1="100" y1="15" x2="185" y2="100" className="opacity-30" />
          <line x1="160" y1="160" x2="15" y2="100" className="opacity-30" />
        </g>
        {/* Glowing Nodes */}
        <g fill="currentColor" className={`${appState === 'thinking' ? 'animate-pulse' : ''}`}>
          <circle cx="100" cy="15" r="3" />
          <circle cx="160" cy="40" r="2" />
          <circle cx="185" cy="100" r="3" />
          <circle cx="160" cy="160" r="2" />
          <circle cx="100" cy="185" r="3" />
          <circle cx="40" cy="160" r="2" />
          <circle cx="15" cy="100" r="3" />
          <circle cx="40" cy="40" r="2" />
        </g>
      </svg>

      {/* Inner Geometry (Hexagram & Spell Circles) */}
      <svg className={`absolute w-[55%] h-[55%] transition-all duration-1000 ${appState === 'thinking' ? 'text-tertiary animate-[spin_3s_linear_infinite]' : 'text-primary animate-[spin_60s_linear_infinite]'}`} viewBox="0 0 100 100">
        <polygon points="50,5 89,72.5 11,72.5" fill="none" stroke="currentColor" strokeWidth="0.5" className="opacity-50" />
        <polygon points="50,95 11,27.5 89,27.5" fill="none" stroke="currentColor" strokeWidth="0.5" className="opacity-50" />
        <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-40" strokeDasharray="5 2" />
        <circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" strokeWidth="0.2" className="opacity-60" />
      </svg>

      {/* The Core Spirit (Magical Plasma) */}
      <div className="absolute flex items-center justify-center">
        {/* Ethereal blurs */}
        <div className={`absolute rounded-full mix-blend-screen blur-[20px] transition-all duration-700 ${appState === 'idle' ? 'w-24 h-24 bg-primary/40 animate-pulse' : ''} ${appState === 'listening' ? 'w-32 h-32 bg-secondary/60 animate-pulse' : ''} ${appState === 'thinking' ? 'w-40 h-40 bg-tertiary/70 animate-bounce' : ''} ${appState === 'speaking' ? 'w-48 h-48 bg-primary/80' : ''}`}></div>
        
        {/* Condensed Core */}
        <div className={`absolute w-12 h-12 rounded-full transition-all duration-500 flex items-center justify-center z-10 ${appState === 'idle' ? 'bg-primary shadow-[0_0_40px_rgba(192,132,252,1)]' : ''} ${appState === 'listening' ? 'bg-secondary shadow-[0_0_50px_rgba(6,182,212,1)]' : ''} ${appState === 'thinking' ? 'bg-white shadow-[0_0_60px_rgba(255,255,255,1)] animate-ping' : ''} ${appState === 'speaking' ? 'bg-white shadow-[0_0_80px_rgba(192,132,252,1)]' : ''}`}>
          <div className="w-6 h-6 bg-white rounded-full opacity-100 shadow-[0_0_20px_white]"></div>
        </div>
      </div>
      
      {/* State Text */}
      <div className="absolute -bottom-12 text-center bg-background/50 backdrop-blur-sm px-4 py-1 rounded-full border border-border-muted/30">
        <div className="font-label-mono text-[11px] tracking-[0.4em] uppercase text-on-surface">
          {appState}
        </div>
      </div>
      
      </div>
    </div>
  );
}
