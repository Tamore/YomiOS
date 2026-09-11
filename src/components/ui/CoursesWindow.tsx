"use client";

import HolographicWindow from './HolographicWindow';

export default function CoursesWindow() {
  return (
    <HolographicWindow widgetId="courses" title="Grimoire" icon="school" subtitle="Library & Courses">
      
        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-6">
          
          {/* Main Viewer */}
          <div className="flex-1 border border-border-muted rounded-xl bg-surface-container-high/50 flex items-center justify-center flex-col text-center p-8">
            <span className="material-symbols-outlined text-6xl text-primary/30 mb-4">menu_book</span>
            <h3 className="text-xl font-bold text-on-surface mb-2 font-display-lg">No Tomes Active</h3>
            <p className="text-on-surface-variant text-sm max-w-md font-body-base">
              Upload a course PDF or tutorial file. The Yomi AI will ingest the contents, allowing you to ask questions or request a tutoring session on the material.
            </p>
            <button className="mt-6 px-6 py-2 bg-primary text-on-primary rounded font-bold uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(192,132,252,0.4)] hover:bg-primary-fixed-dim transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">upload</span>
              Upload Tome
            </button>
          </div>

          {/* Sidebar */}
          <div className="w-full flex flex-col gap-4">
            <div className="border border-border-muted rounded-xl bg-surface-container-high/50 p-4">
              <h4 className="font-bold text-sm text-primary uppercase tracking-widest mb-3 border-b border-primary/20 pb-2">Active Courses</h4>
              <ul className="flex flex-col gap-2">
                <li className="text-sm text-on-surface-variant py-2 border-b border-border-muted/50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-learning-cyan">code</span>
                  React Fundamentals
                </li>
                <li className="text-sm text-on-surface-variant py-2 border-b border-border-muted/50 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-learning-cobalt">language</span>
                  Japanese N5
                </li>
              </ul>
            </div>
          </div>
        </div>
    </HolographicWindow>
  );
}
