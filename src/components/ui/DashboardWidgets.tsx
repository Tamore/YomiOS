"use client";

import React from 'react';
import { useCommand } from '@/components/CommandContext';
import TaskItem from '@/components/TaskItem';

type Props = {
  tasks: any[];
  projects: any[];
  exportedFiles: string[];
};

export default function DashboardWidgets({ tasks, projects, exportedFiles }: Props) {
  const { visibleWidgets } = useCommand();

  const showProjects = visibleWidgets.includes('projects');
  const showTasks = visibleWidgets.includes('tasks');
  const showArchives = visibleWidgets.includes('archives');

  if (visibleWidgets.length === 0) return null;

  return (
    <div className="absolute inset-0 p-8 pointer-events-none z-10 hidden md:block">
      
      {/* Top Right (Layer 1): Active Projects */}
      {showProjects && (
        <div className="absolute top-12 right-[500px] w-80 pointer-events-auto flex flex-col animate-in fade-in slide-in-from-right-8 duration-700">
          <h3 className="font-headline-md text-xl text-primary mb-4 tracking-wider flex items-center gap-2 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]">
            ACTIVE PROJECTS
          </h3>
          <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto no-scrollbar pb-4">
            {projects.map((project) => (
              <div key={project.id} className="glass-card p-4 rounded-lg active-glow group border-l-2 border-l-primary/70">
                <span className="font-label-mono text-[9px] text-primary uppercase mb-1 block tracking-widest opacity-80">
                  {project.domain?.name || 'UNASSIGNED'}
                </span>
                <h4 className="font-bold text-on-surface text-sm tracking-wide">{project.title}</h4>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="font-label-mono text-xs text-on-surface-variant/50 tracking-widest p-4 border border-border-muted/30 rounded glass-card">
                NO ACTIVE PROJECTS
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Right (Layer 1): Mission Critical Tasks */}
      {showTasks && (
        <div className="absolute bottom-12 right-[500px] w-[350px] pointer-events-auto flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-[800ms]">
          <h3 className="font-headline-md text-xl text-tertiary mb-4 tracking-wider flex items-center gap-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
            MISSION CRITICAL TASKS
          </h3>
          <div className="flex flex-col gap-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-4 pr-2">
            {tasks.map((task: any) => (
              <div key={task.id} className="scale-95 origin-left hover:scale-100 transition-transform">
                <TaskItem task={task} />
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="font-label-mono text-xs text-on-surface-variant/50 tracking-widest p-4 border border-border-muted/30 rounded glass-card">
                NO TASKS DETECTED
              </div>
            )}
          </div>
        </div>
      )}



      {/* Bottom Right: Archives */}
      {showArchives && (
        <div className="absolute bottom-12 right-12 w-72 pointer-events-auto flex flex-col items-end text-right animate-in fade-in slide-in-from-right-8 duration-1000">
          <h3 className="font-headline-md text-lg text-on-surface-variant mb-4 tracking-wider drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            SYSTEM ARCHIVES
          </h3>
          <div className="flex flex-col gap-3 w-full max-h-[30vh] overflow-y-auto no-scrollbar pb-4">
            {exportedFiles.map((file) => {
              const cleanName = file.replace(/^\d+_/, '').replace('.pdf', '').replace(/_/g, ' ').toUpperCase();
              return (
                <a key={file} href={`/exports/${file}`} target="_blank" rel="noopener noreferrer" className="glass-card p-3 rounded-lg flex items-center justify-between group hover:border-primary/50 transition-all text-left border-r-2 border-r-surface-container-highest">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-[18px]">picture_as_pdf</span>
                  <div className="flex-1 ml-3 text-right">
                    <p className="text-xs font-bold text-on-surface truncate">{cleanName}</p>
                  </div>
                </a>
              );
            })}
            {exportedFiles.length === 0 && (
              <div className="font-label-mono text-[9px] text-on-surface-variant/50 tracking-widest text-right">
                NO ARCHIVES FOUND
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
