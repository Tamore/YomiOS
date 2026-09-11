"use client";

import React from 'react';
import HolographicWindow from './HolographicWindow';

export default function AgentsWindow() {
  return (
    <HolographicWindow 
      widgetId="agents" 
      title="Agents Pipeline" 
      subtitle="Autonomous System Orchestrator" 
      icon="account_tree"
      defaultMaximized={true}
    >
      {/* 
        Horizontal scrolling container for the pipeline stages. 
        Using flex row to lay out the 6 stages horizontally.
      */}
      <div className="flex h-full w-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-6 px-4 gap-8">
        
        {/* STAGE 1: CAPTURE */}
        <div className="flex-shrink-0 w-[280px] flex flex-col h-full">
          <div className="mb-4">
            <h3 className="font-label-mono text-[10px] text-primary tracking-[0.2em] uppercase mb-1">STAGE 01: CAPTURE</h3>
            <p className="text-on-surface-variant text-[11px] font-label-mono opacity-70">vault/_inbox/</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-4 flex flex-col gap-3 border-l-2 border-l-primary/50 relative">
            <div className="absolute right-0 top-1/2 w-8 h-[1px] bg-primary/30 translate-x-full"></div>
            
            <button className="bg-surface-charcoal/50 border border-border-muted hover:border-primary/50 text-left p-3 rounded-lg flex items-center gap-3 transition-colors group">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary">send</span>
              <span className="text-[12px] font-bold text-on-surface">Telegram drop</span>
            </button>
            
            <button className="bg-surface-charcoal/50 border border-border-muted hover:border-primary/50 text-left p-3 rounded-lg flex items-center gap-3 transition-colors group">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary">mic</span>
              <span className="text-[12px] font-bold text-on-surface">Voice memo</span>
            </button>

            <button className="bg-primary/10 border border-primary text-left p-3 rounded-lg flex items-center gap-3 shadow-[0_0_15px_rgba(192,132,252,0.15)] group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
              <span className="material-symbols-outlined text-[16px] text-primary relative z-10">description</span>
              <span className="text-[12px] font-bold text-primary relative z-10">Master prompt + project idea</span>
            </button>

            <button className="bg-surface-charcoal/50 border border-border-muted hover:border-primary/50 text-left p-3 rounded-lg flex items-center gap-3 transition-colors group">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary">edit_note</span>
              <span className="text-[12px] font-bold text-on-surface">Typed note</span>
            </button>

            <button className="bg-surface-charcoal/50 border border-border-muted hover:border-primary/50 text-left p-3 rounded-lg flex items-center gap-3 transition-colors group">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary">link</span>
              <span className="text-[12px] font-bold text-on-surface">URL drop</span>
            </button>
          </div>
        </div>

        {/* STAGE 2: CLASSIFY */}
        <div className="flex-shrink-0 w-[280px] flex flex-col h-full relative">
          <div className="mb-4">
            <h3 className="font-label-mono text-[10px] text-secondary tracking-[0.2em] uppercase mb-1">STAGE 02: CLASSIFY</h3>
            <p className="text-on-surface-variant text-[11px] font-label-mono opacity-70">inbox-classifier</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-4 flex flex-col gap-4 border-l-2 border-l-secondary/50 relative">
            <div className="absolute right-0 top-1/2 w-8 h-[1px] bg-secondary/30 translate-x-full"></div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-[#1E3A8A]/30 border border-[#3B82F6]/50 text-[#60A5FA] px-2 py-0.5 rounded text-[10px] font-label-mono font-bold tracking-widest flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></div>
                HAIKU
              </div>
              <span className="text-[10px] font-label-mono text-on-surface-variant">route_inbox_item.js</span>
            </div>

            <div className="bg-[#0f141e] border border-border-muted/50 rounded-lg p-3 font-label-mono text-[10px] text-[#A78BFA] leading-relaxed shadow-inner">
              <span className="text-[#F472B6]">{"{"}</span>
              <div className="pl-4">
                <div><span className="text-[#818CF8]">"route"</span>: <span className="text-[#34D399]">"PROJECT"</span>,</div>
                <div><span className="text-[#818CF8]">"slug"</span>: <span className="text-[#34D399]">"yomi-os-v2"</span>,</div>
                <div><span className="text-[#818CF8]">"confidence"</span>: <span className="text-[#FBBF24]">0.98</span>,</div>
                <div><span className="text-[#818CF8]">"tags"</span>: [<span className="text-[#34D399]">"frontend"</span>, <span className="text-[#34D399]">"agents"</span>]</div>
              </div>
              <span className="text-[#F472B6]">{"}"}</span>
            </div>

            <div className="mt-auto pt-4 border-t border-border-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-label-mono text-on-surface-variant uppercase">Status</span>
                <span className="text-[10px] font-label-mono text-secondary uppercase animate-pulse">Classified</span>
              </div>
            </div>
          </div>
        </div>

        {/* STAGE 3: ROUTE */}
        <div className="flex-shrink-0 w-[280px] flex flex-col h-full relative">
          <div className="mb-4">
            <h3 className="font-label-mono text-[10px] text-tertiary tracking-[0.2em] uppercase mb-1">STAGE 03: ROUTE</h3>
            <p className="text-on-surface-variant text-[11px] font-label-mono opacity-70">5-way fork - one wins</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-4 flex flex-col gap-3 border-l-2 border-l-tertiary/50 relative">
            <div className="absolute right-0 top-1/2 w-8 h-[1px] bg-tertiary/30 translate-x-full"></div>
            
            <div className="bg-tertiary/10 border border-tertiary/50 text-left p-3 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.15)] relative overflow-hidden">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[16px] text-tertiary">account_tree</span>
                <span className="text-[12px] font-bold text-tertiary">Project shaped</span>
              </div>
              <span className="bg-tertiary/20 text-tertiary text-[9px] font-label-mono px-2 py-0.5 rounded border border-tertiary/30">yomi-os-v2</span>
            </div>
            
            <div className="bg-surface-charcoal/50 border border-border-muted text-left p-3 rounded-lg flex items-center gap-3 opacity-60">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">check_circle</span>
              <span className="text-[12px] font-bold text-on-surface-variant">GTD / action</span>
            </div>

            <div className="bg-surface-charcoal/50 border border-border-muted text-left p-3 rounded-lg flex items-center gap-3 opacity-60">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">lightbulb</span>
              <span className="text-[12px] font-bold text-on-surface-variant">Idea capture</span>
            </div>

            <div className="bg-surface-charcoal/50 border border-border-muted text-left p-3 rounded-lg flex items-center gap-3 opacity-60">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">bookmark</span>
              <span className="text-[12px] font-bold text-on-surface-variant">Reference</span>
            </div>

            <div className="bg-surface-charcoal/50 border border-border-muted text-left p-3 rounded-lg flex items-center gap-3 opacity-60">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">flag</span>
              <span className="text-[12px] font-bold text-on-surface-variant">Escalate (Review)</span>
            </div>
          </div>
        </div>

        {/* STAGE 4: PROCESS */}
        <div className="flex-shrink-0 w-[280px] flex flex-col h-full relative">
          <div className="mb-4">
            <h3 className="font-label-mono text-[10px] text-primary tracking-[0.2em] uppercase mb-1">STAGE 04: PROCESS</h3>
            <p className="text-on-surface-variant text-[11px] font-label-mono opacity-70">auto-research ratifies scaffold</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-4 flex flex-col gap-4 border-l-2 border-l-primary/50 relative">
            <div className="absolute right-0 top-1/2 w-8 h-[1px] bg-primary/30 translate-x-full"></div>
            
            <div className="bg-surface-charcoal border border-border-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[14px] text-primary">folder_open</span>
                <span className="text-[11px] font-label-mono text-on-surface font-bold">workspace/yomi-os-v2</span>
              </div>
              <div className="flex flex-col gap-2 pl-4 border-l border-border-muted/30 ml-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant">description</span>
                    <span className="text-[10px] font-label-mono text-on-surface">proposed-plan.md</span>
                  </div>
                  <span className="text-[8px] font-label-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">[ratified]</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[12px] text-on-surface-variant">description</span>
                    <span className="text-[10px] font-label-mono text-on-surface">findings.md</span>
                  </div>
                  <span className="text-[8px] font-label-mono bg-secondary/20 text-secondary px-1.5 py-0.5 rounded">[updated]</span>
                </div>
              </div>
            </div>

            <div className="flex-1 bg-[#0f141e] border border-border-muted/50 rounded-lg p-3 overflow-hidden flex flex-col">
              <div className="text-[9px] font-label-mono text-on-surface-variant mb-2 border-b border-border-muted/30 pb-1">AGENT RUNTIME CONSOLE</div>
              <div className="font-label-mono text-[9px] text-[#A78BFA] flex flex-col gap-1">
                <div><span className="text-on-surface-variant">[09:42:11]</span> Executing WebSearch: "Agentic UI patterns"</div>
                <div><span className="text-on-surface-variant">[09:42:14]</span> Fetched 3 references.</div>
                <div><span className="text-on-surface-variant">[09:42:15]</span> <span className="text-[#34D399]">Updating findings.md...</span></div>
                <div className="animate-pulse flex items-center gap-1 mt-1 text-primary">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Ratifying plan...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STAGE 5: HUMAN GATE */}
        <div className="flex-shrink-0 w-[280px] flex flex-col h-full relative">
          <div className="mb-4">
            <h3 className="font-label-mono text-[10px] text-[#F59E0B] tracking-[0.2em] uppercase mb-1">STAGE 05: HUMAN GATE</h3>
            <p className="text-on-surface-variant text-[11px] font-label-mono opacity-70">the only checkpoint</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-4 flex flex-col justify-center items-center gap-4 border-l-2 border-l-[#F59E0B]/50 relative">
            <div className="absolute right-0 top-1/2 w-8 h-[1px] bg-[#F59E0B]/30 translate-x-full"></div>
            
            <div className="w-full bg-surface-charcoal/80 border border-[#F59E0B]/50 rounded-xl p-5 shadow-[0_0_20px_rgba(245,158,11,0.15)] flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-[#F59E0B]/20 border border-[#F59E0B]/50 flex items-center justify-center mb-3 animate-[pulse_2s_ease-in-out_infinite]">
                <span className="material-symbols-outlined text-[24px] text-[#F59E0B]">admin_panel_settings</span>
              </div>
              <h4 className="font-label-mono text-[12px] font-bold text-[#F59E0B] tracking-widest mb-1">HUMAN IN THE LOOP</h4>
              <p className="text-[10px] text-on-surface-variant font-label-mono text-center mb-5">
                Reviewing proposed changes for<br/>
                <span className="text-on-surface font-bold">yomi-os-v2</span>
              </p>

              <div className="flex w-full gap-3">
                <button className="flex-1 bg-error/10 hover:bg-error/30 border border-error/50 text-error text-xs py-2 rounded-lg flex justify-center items-center transition-all">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
                <button className="flex-1 bg-[#34D399]/10 hover:bg-[#34D399]/30 border border-[#34D399]/50 text-[#34D399] text-xs py-2 rounded-lg flex justify-center items-center transition-all shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* STAGE 6: EXECUTE */}
        <div className="flex-shrink-0 w-[280px] flex flex-col h-full relative">
          <div className="mb-4">
            <h3 className="font-label-mono text-[10px] text-secondary tracking-[0.2em] uppercase mb-1">STAGE 06: EXECUTE</h3>
            <p className="text-on-surface-variant text-[11px] font-label-mono opacity-70">PM spawns the team</p>
          </div>
          <div className="flex-1 glass-card rounded-xl p-4 flex flex-col gap-4 border-l-2 border-l-secondary/50 relative">
            
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-[#EF4444]/20 border border-[#EF4444]/50 text-[#EF4444] px-2 py-0.5 rounded text-[10px] font-label-mono font-bold tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                <span className="material-symbols-outlined text-[10px]">engineering</span>
                PM
              </div>
              <span className="text-[10px] font-label-mono text-on-surface-variant">orchestrating workers</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="bg-surface-charcoal border border-border-muted/50 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
                  <span className="text-[11px] font-label-mono text-on-surface">worker-research</span>
                </div>
                <span className="text-[9px] font-label-mono bg-secondary/10 text-secondary px-1.5 py-0.5 rounded border border-secondary/20">SONNET</span>
              </div>
              
              <div className="bg-surface-charcoal border border-border-muted/50 rounded-lg p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  <span className="text-[11px] font-label-mono text-on-surface">worker-build</span>
                </div>
                <span className="text-[9px] font-label-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">OPUS</span>
              </div>
            </div>

            <div className="flex-1 bg-[#0f141e] border border-border-muted/50 rounded-lg p-3 overflow-hidden flex flex-col">
              <div className="text-[9px] font-label-mono text-on-surface-variant mb-2 border-b border-border-muted/30 pb-1">PM RUNTIME</div>
              <div className="font-label-mono text-[9px] text-secondary flex flex-col gap-1 opacity-80">
                <div>&gt; Initializing workers...</div>
                <div>&gt; Dispatching plan to SONNET.</div>
                <div>&gt; Waiting for dependency resolution...</div>
                <div className="animate-pulse mt-1">&gt; executing build tasks_</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </HolographicWindow>
  );
}
