"use client";

import { useEffect, useState } from "react";

export default function AmbientParticles() {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    // Generate random particles on client side to avoid hydration mismatch
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10, // 10s to 30s
      delay: Math.random() * 10,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? "bg-primary" : "bg-secondary",
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`absolute rounded-full blur-[1px] ${p.color} animate-float`}
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.size * 2}px var(--color-${p.color.replace('bg-', '')})`
          }}
        />
      ))}
    </div>
  );
}
