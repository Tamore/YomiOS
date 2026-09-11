"use client";

import React, { useState } from 'react';
import { useCommand } from '@/components/CommandContext';

type Props = {
  widgetId: string;
  title: string;
  icon: string;
  subtitle?: string;
  defaultMaximized?: boolean;
  children: React.ReactNode;
};

export default function HolographicWindow({ widgetId, title, icon, subtitle, defaultMaximized = false, children }: Props) {
  const { visibleWidgets, hideWidget } = useCommand();
  const [isMaximized, setIsMaximized] = useState(defaultMaximized);

  if (!visibleWidgets.includes(widgetId)) return null;

  // The base container handles the transition between docked side-panel and full-screen.
  // We use ease-[cubic-bezier(0.34,1.56,0.64,1)] for a bouncy macOS-like scale effect.
  const containerClasses = isMaximized 
    ? "absolute inset-4 z-[100] flex flex-col pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
    : "absolute right-8 top-8 bottom-8 w-[450px] z-40 flex flex-col pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]";

  return (
    <div className={containerClasses}>
      
      {/* The actual Window Card. animate-in provides the initial spawn animation. */}
      <div className="w-full h-full glass-card border border-primary/20 rounded-2xl shadow-[0_0_50px_rgba(192,132,252,0.15)] flex flex-col overflow-hidden pointer-events-auto bg-background/70 backdrop-blur-3xl animate-in zoom-in-75 slide-in-from-bottom-16 duration-500 ease-out">
        
        {/* Header - Mac Style */}
        <div className="bg-surface-container-lowest/80 p-4 border-b border-border-muted/50 flex items-center justify-between shrink-0 group/header select-none">
          
          <div className="flex items-center gap-4">
            {/* macOS Traffic Lights */}
            <div className="flex items-center gap-2 group-hover/header:opacity-100 transition-opacity">
              <button 
                onClick={() => hideWidget(widgetId)}
                className="w-3.5 h-3.5 rounded-full bg-error/80 hover:bg-error flex items-center justify-center transition-colors shadow-sm"
                title="Close"
              >
                <span className="material-symbols-outlined text-[10px] text-black opacity-0 hover:opacity-100">close</span>
              </button>
              <button 
                onClick={() => hideWidget(widgetId)}
                className="w-3.5 h-3.5 rounded-full bg-[#f59e0b]/80 hover:bg-[#f59e0b] flex items-center justify-center transition-colors shadow-sm"
                title="Minimize (Dock)"
              >
                <span className="material-symbols-outlined text-[10px] text-black opacity-0 hover:opacity-100">remove</span>
              </button>
              <button 
                onClick={() => setIsMaximized(!isMaximized)}
                className="w-3.5 h-3.5 rounded-full bg-[#10b981]/80 hover:bg-[#10b981] flex items-center justify-center transition-colors shadow-sm"
                title={isMaximized ? "Restore" : "Maximize"}
              >
                <span className="material-symbols-outlined text-[10px] text-black opacity-0 hover:opacity-100">
                  {isMaximized ? "close_fullscreen" : "open_in_full"}
                </span>
              </button>
            </div>

            {/* Title & Icon */}
            <div className="flex items-center gap-3 border-l border-border-muted/50 pl-4">
              <span className="material-symbols-outlined text-[20px] text-primary">{icon}</span>
              <div>
                <h2 className="font-display-lg text-lg text-primary tracking-[0.1em] uppercase leading-none mt-0.5">{title}</h2>
                {subtitle && <p className="font-label-mono text-[9px] text-on-surface-variant tracking-[0.2em] uppercase mt-0.5">{subtitle}</p>}
              </div>
            </div>
          </div>
          
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
          {children}
        </div>

      </div>
    </div>
  );
}
