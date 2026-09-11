export default function SettingsPage() {
  return (
    <div className="w-full h-screen relative overflow-hidden">
      
      {/* Centered Watermark Title */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-5 flex flex-col items-center">
        <span className="material-symbols-outlined text-[200px] text-primary">settings_applications</span>
        <h1 className="font-display-lg text-[120px] text-primary tracking-[0.2em] mt-4">CONFIG</h1>
      </div>

      {/* Floating HUD: AI Personality Tuning (Top Left) */}
      <div className="absolute top-12 left-28 w-[450px] glass-card rounded-2xl p-6 pointer-events-auto animate-in fade-in slide-in-from-left-8 duration-700 shadow-[0_0_20px_rgba(192,132,252,0.1)] border-primary/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[28px] drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]">psychology</span>
            <h3 className="font-display-lg text-2xl text-primary tracking-widest uppercase">Neural Tuning</h3>
          </div>
          <span className="bg-primary/20 border border-primary/30 text-primary font-label-mono px-2 py-0.5 rounded text-[9px] uppercase tracking-widest shadow-[0_0_10px_rgba(192,132,252,0.3)]">Profile: Architect</span>
        </div>
        <div className="space-y-8">
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-label-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Creativity vs. Precision</label>
              <span className="text-primary font-label-mono text-[10px] tracking-widest">85% PRECISION</span>
            </div>
            <input className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary" defaultValue="85" max="100" min="0" type="range"/>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-label-mono text-[10px] uppercase tracking-widest text-on-surface-variant">Proactivity Level</label>
              <span className="text-primary font-label-mono text-[10px] tracking-widest">62% BALANCED</span>
            </div>
            <input className="w-full h-1 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary" defaultValue="62" max="100" min="0" type="range"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 border border-primary/50 bg-primary/10 rounded-lg cursor-pointer shadow-[0_0_10px_rgba(192,132,252,0.2)]">
              <p className="text-primary font-bold text-xs uppercase tracking-widest mb-1">Analytical</p>
              <p className="text-primary/70 text-[10px] leading-relaxed">Focus on logic, data synthesis, and objective reasoning.</p>
            </div>
            <div className="p-3 border border-border-muted bg-surface-container-lowest rounded-lg cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all">
              <p className="text-on-surface font-bold text-xs uppercase tracking-widest mb-1">Creative</p>
              <p className="text-on-surface-variant text-[10px] leading-relaxed">Emphasize lateral thinking, divergent ideas, and nuance.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating HUD: Memory Controls (Bottom Left) */}
      <div className="absolute bottom-12 left-28 w-[450px] glass-card rounded-2xl p-6 pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 shadow-[0_0_20px_rgba(6,182,212,0.1)] border-secondary/20">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-secondary text-[24px] drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">memory</span>
          <h3 className="font-display-lg text-xl text-secondary tracking-widest uppercase">Memory Core</h3>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between group">
            <div>
              <p className="text-sm font-bold text-on-surface tracking-wide group-hover:text-secondary transition-colors">Ephemeral Session</p>
              <p className="text-on-surface-variant text-[10px]">No long-term data retention for current window.</p>
            </div>
            <div className="w-10 h-5 bg-surface-container-high rounded-full relative cursor-pointer border border-border-muted">
              <div className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-secondary rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            </div>
          </div>
          <div className="flex items-center justify-between group">
            <div>
              <p className="text-sm font-bold text-on-surface tracking-wide group-hover:text-secondary transition-colors">Automatic Forgetting</p>
              <p className="text-on-surface-variant text-[10px]">Purge context older than 30 days.</p>
            </div>
            <div className="w-10 h-5 bg-secondary/20 rounded-full relative cursor-pointer border border-secondary/50">
              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-3 h-3 bg-secondary rounded-full"></div>
            </div>
          </div>
          <div className="p-4 border border-secondary/30 rounded-lg bg-surface-container-highest/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-transparent pointer-events-none"></div>
            <p className="font-label-mono text-[9px] uppercase tracking-[0.2em] text-secondary mb-3">Targeted Memory Purge</p>
            <div className="flex gap-2 relative z-10">
              <input className="flex-1 bg-surface-charcoal border border-border-muted rounded h-8 px-3 text-xs focus:outline-none focus:border-secondary transition-colors text-on-surface font-label-mono placeholder:text-on-surface-variant/50" placeholder="Entity name (e.g., Project X)" type="text"/>
              <button className="px-4 bg-error/20 hover:bg-error/40 text-error border border-error/50 text-[10px] font-bold rounded uppercase tracking-widest transition-all">Purge</button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating HUD: Privacy Controls (Top Right) */}
      <div className="absolute top-12 right-[450px] w-[380px] glass-card rounded-2xl p-6 pointer-events-auto animate-in fade-in slide-in-from-right-8 duration-700 shadow-[0_0_20px_rgba(239,68,68,0.1)] border-error/20">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-error text-[24px] drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">shield</span>
          <h3 className="font-display-lg text-xl text-error tracking-widest uppercase">Security Protocols</h3>
        </div>
        <div className="space-y-3">
          <div className="p-3 border border-border-muted/50 rounded flex items-center justify-between hover:border-error/50 hover:bg-error/5 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-error transition-colors">hub</span>
              <div>
                <p className="text-xs font-bold tracking-wide">Domain Isolation</p>
                <p className="text-[10px] text-on-surface-variant font-label-mono tracking-widest mt-0.5">PREVENT LEAKS</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-error">chevron_right</span>
          </div>
          <div className="p-3 border border-border-muted/50 rounded flex items-center justify-between hover:border-error/50 hover:bg-error/5 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-error transition-colors">description</span>
              <div>
                <p className="text-xs font-bold tracking-wide">End-to-End Keys</p>
                <p className="text-[10px] text-on-surface-variant font-label-mono tracking-widest mt-0.5">RSA-4096 TOKENS</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-error">chevron_right</span>
          </div>
          <div className="p-3 border border-border-muted/50 rounded flex items-center justify-between hover:border-error/50 hover:bg-error/5 transition-all cursor-pointer group">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-error transition-colors">captive_portal</span>
              <div>
                <p className="text-xs font-bold tracking-wide">Network Firewall</p>
                <p className="text-[10px] text-on-surface-variant font-label-mono tracking-widest mt-0.5">RESTRICT API CALLS</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-error">chevron_right</span>
          </div>
        </div>
        <div className="mt-6 p-3 rounded bg-error/10 border border-error/30 flex gap-3 items-start animate-pulse">
          <span className="material-symbols-outlined text-error text-[18px]">warning</span>
          <p className="text-[10px] text-error font-label-mono leading-relaxed tracking-widest">
            LOCAL-ONLY MODE ACTIVE.<br/> CLOUD SYNTHESIZERS UNAVAILABLE.
          </p>
        </div>
      </div>

      {/* Floating HUD: Local Storage (Bottom Right) */}
      <div className="absolute bottom-12 right-[450px] w-[380px] glass-card rounded-2xl p-6 pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 shadow-[0_0_20px_rgba(168,85,247,0.1)] border-tertiary/20 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-tertiary text-[24px] drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]">database</span>
            <h3 className="font-display-lg text-xl text-tertiary tracking-widest uppercase">Archive State</h3>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="font-display-lg text-5xl leading-none text-on-surface drop-shadow-md">42.8</span>
            <span className="text-tertiary font-label-mono text-[14px] pb-1 uppercase tracking-widest">GB</span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-5">
            <div className="h-full bg-tertiary shadow-[0_0_10px_rgba(168,85,247,1)] relative" style={{ width: "65%" }}>
               <div className="absolute inset-0 bg-white/20 w-full animate-[pulse_2s_infinite]"></div>
            </div>
          </div>
          <ul className="space-y-4">
            <li className="flex justify-between items-center group">
              <span className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] group-hover:text-tertiary transition-colors">Neural Weights</span>
              <span className="font-label-mono text-[10px] text-on-surface">12.4 GB</span>
            </li>
            <li className="flex justify-between items-center group">
              <span className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] group-hover:text-tertiary transition-colors">Context Index</span>
              <span className="font-label-mono text-[10px] text-on-surface">24.2 GB</span>
            </li>
            <li className="flex justify-between items-center group">
              <span className="font-label-mono text-[10px] text-on-surface-variant uppercase tracking-[0.2em] group-hover:text-tertiary transition-colors">Cached Media</span>
              <span className="font-label-mono text-[10px] text-on-surface">6.2 GB</span>
            </li>
          </ul>
        </div>
        <button className="mt-8 py-2 w-full border border-error/30 bg-error/5 hover:bg-error/20 hover:border-error text-error text-[10px] font-label-mono tracking-[0.3em] uppercase rounded transition-all active-glow">
          Wipe Local Cache
        </button>
      </div>

    </div>
  );
}
