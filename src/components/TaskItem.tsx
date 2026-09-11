"use client";

import { useTransition } from "react";
import { toggleTaskCompletion } from "@/app/actions";

export default function TaskItem({ task }: { task: any }) {
  const [isPending, startTransition] = useTransition();
  const isP1 = task.priority === 'P1';
  const colorClass = isP1 ? 'text-error border-error' : task.priority === 'P2' ? 'text-tertiary border-tertiary' : 'text-primary border-primary';

  return (
    <div className={`flex items-center gap-4 p-4 glass-card rounded-xl active-glow group transition-all ${task.isCompleted ? 'opacity-50' : ''} ${isPending ? 'opacity-50 animate-pulse' : ''}`}>
      <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
        <input 
          className={`w-5 h-5 rounded ${colorClass} bg-surface-container-highest border-border-muted cursor-pointer`} 
          type="checkbox" 
          checked={task.isCompleted}
          onChange={(e) => {
            const checked = e.target.checked;
            startTransition(() => {
              toggleTaskCompletion(task.id, checked);
            });
          }}
          disabled={isPending}
        />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`font-label-mono text-[10px] font-bold px-1.5 py-0.5 border rounded-sm ${colorClass.replace('text-', 'border-').replace('border-', 'border-opacity-30 border-')} ${colorClass.split(' ')[0]}`}>
            {task.priority}
          </span>
          <h4 className={`text-on-surface font-semibold text-body-base leading-tight ${task.isCompleted ? 'line-through text-on-surface-variant' : ''}`}>{task.title}</h4>
        </div>
      </div>
      <span className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">more_vert</span>
    </div>
  );
}
