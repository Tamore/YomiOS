"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CreateModal } from "../modals/CreateModal";
import { useCommand } from "../CommandContext";

type DomainType = { id: string, name: string, icon: string | null, colorCode: string | null };

export default function Sidebar({ domains }: { domains: DomainType[] }) {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { tutorLanguage, setTutorLanguage } = useCommand();

  return (
    <>
      {/* Floating Arcane Sigils Navigation */}
      <aside className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-6 z-50 pointer-events-none">
        
        {/* Home / Tactical Horizon */}
        <div className="pointer-events-auto">
          <Link href="/" className={`w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all group relative ${pathname === '/' ? 'text-primary shadow-[0_0_15px_rgba(192,132,252,0.3)]' : 'text-on-surface-variant hover:text-primary active-glow'}`}>
            <span className="material-symbols-outlined text-[24px]">dashboard</span>
            <span className="absolute left-16 opacity-0 group-hover:opacity-100 transition-opacity font-label-mono text-[10px] tracking-widest text-primary whitespace-nowrap bg-background/80 px-2 py-1 rounded border border-primary/30">TACTICAL HORIZON</span>
          </Link>
        </div>
        
        {/* Activity Center */}
        <div className="pointer-events-auto">
          <Link href="/activity" className={`w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all group relative ${pathname === '/activity' ? 'text-secondary shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'text-on-surface-variant hover:text-secondary active-glow'}`}>
            <span className="material-symbols-outlined text-[24px]">analytics</span>
            <span className="absolute left-16 opacity-0 group-hover:opacity-100 transition-opacity font-label-mono text-[10px] tracking-widest text-secondary whitespace-nowrap bg-background/80 px-2 py-1 rounded border border-secondary/30">ACTIVITY CENTER</span>
          </Link>
        </div>
        
        {/* Create New */}
        <div className="pointer-events-auto">
          <button onClick={() => setIsModalOpen(true)} className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-primary hover:text-white transition-all active-glow group relative border-primary/50 shadow-[0_0_20px_rgba(192,132,252,0.4)]">
            <span className="material-symbols-outlined text-[24px]">add_circle</span>
            <span className="absolute left-16 opacity-0 group-hover:opacity-100 transition-opacity font-label-mono text-[10px] tracking-widest text-primary whitespace-nowrap bg-background/80 px-2 py-1 rounded border border-primary/30">CREATE TASK</span>
          </button>
        </div>

        {/* Settings */}
        <div className="pointer-events-auto mt-8">
          <Link href="/settings" className={`w-12 h-12 rounded-full glass-card flex items-center justify-center transition-all group relative ${pathname === '/settings' ? 'text-tertiary shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-on-surface-variant hover:text-tertiary active-glow'}`}>
            <span className="material-symbols-outlined text-[24px]">settings</span>
            <span className="absolute left-16 opacity-0 group-hover:opacity-100 transition-opacity font-label-mono text-[10px] tracking-widest text-tertiary whitespace-nowrap bg-background/80 px-2 py-1 rounded border border-tertiary/30">SYSTEM CONFIG</span>
          </Link>
        </div>

      </aside>

      <CreateModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        domains={domains.map(d => ({...d, icon: d.icon || "", colorCode: d.colorCode || ""}))} 
      />
    </>
  );
}
