"use client";

import { useState } from "react";
import { createTask, createProject, createDomain } from "@/app/actions";

export function CreateModal({ 
  isOpen, onClose, domains, defaultType = "Domain", defaultDomainId = "" 
}: { 
  isOpen: boolean, onClose: () => void, domains: {id: string, name: string, icon?: string, colorCode?: string}[], defaultType?: "Domain" | "Project" | "Task", defaultDomainId?: string 
}) {
  const [type, setType] = useState<"Domain" | "Project" | "Task">(defaultType);
  const [selectedDomainId, setSelectedDomainId] = useState<string>(defaultDomainId);
  const [isDomainDropdownOpen, setIsDomainDropdownOpen] = useState(false);
  
  const [selectedPriority, setSelectedPriority] = useState<string>("3");
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-container-highest/20 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-on-surface">Create New {type}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-surface-container-high rounded-xl">
          <button 
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-sm ${type === "Domain" ? "bg-primary text-white shadow-md" : "hover:bg-surface-container text-on-surface-variant"}`}
            onClick={() => setType("Domain")}
          >
            Domain
          </button>
          <button 
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-sm ${type === "Project" ? "bg-primary text-white shadow-md" : "hover:bg-surface-container text-on-surface-variant"}`}
            onClick={() => setType("Project")}
          >
            Project
          </button>
          <button 
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all text-sm ${type === "Task" ? "bg-primary text-white shadow-md" : "hover:bg-surface-container text-on-surface-variant"}`}
            onClick={() => setType("Task")}
          >
            Task
          </button>
        </div>

        <form 
          action={async (formData) => {
            if (type === "Task") await createTask(formData);
            if (type === "Project") await createProject(formData);
            if (type === "Domain") await createDomain(formData);
            onClose();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">{type === "Domain" ? "Domain Name" : "Title"}</label>
            <input 
              type="text" 
              name={type === "Domain" ? "name" : "title"}
              required 
              autoFocus
              className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder={`Enter ${type.toLowerCase()} name...`}
            />
          </div>

          {(type === "Task" || type === "Project") && (
            <div className="relative">
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Domain</label>
              <input type="hidden" name="domainId" value={selectedDomainId} />
              
              <div 
                onClick={() => setIsDomainDropdownOpen(!isDomainDropdownOpen)}
                className={`w-full bg-surface-container-highest/50 border ${!selectedDomainId ? 'border-error/50' : 'border-outline-variant'} rounded-lg p-3 text-on-surface cursor-pointer flex justify-between items-center hover:border-primary transition-all`}
              >
                {selectedDomainId ? (
                  <div className="flex items-center gap-2">
                    <span 
                      className="material-symbols-outlined text-[18px]" 
                      style={{ color: domains.find(d => d.id === selectedDomainId)?.colorCode || "inherit" }}
                    >
                      {domains.find(d => d.id === selectedDomainId)?.icon || "folder"}
                    </span>
                    <span>{domains.find(d => d.id === selectedDomainId)?.name}</span>
                  </div>
                ) : (
                  <span className="text-on-surface-variant/70">Select a Domain...</span>
                )}
                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
              </div>

              {isDomainDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl overflow-hidden z-50">
                  {domains.length === 0 ? (
                    <div className="p-4 text-sm text-on-surface-variant text-center">No domains exist. Create a Domain first!</div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
                      {domains.map(d => (
                        <div 
                          key={d.id} 
                          className="flex items-center gap-3 p-3 hover:bg-surface-container-highest cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedDomainId(d.id);
                            setIsDomainDropdownOpen(false);
                          }}
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ color: d.colorCode || "inherit" }}>{d.icon || "folder"}</span>
                          <span className="text-sm font-medium">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {type === "Task" && (
            <div className="relative">
              <label className="block text-sm font-medium text-on-surface-variant mb-1">Priority</label>
              <input type="hidden" name="priority" value={selectedPriority} />

              <div 
                onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg p-3 text-on-surface cursor-pointer flex justify-between items-center hover:border-primary transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className={`font-label-mono text-[10px] font-bold px-1.5 py-0.5 border rounded-sm ${
                    selectedPriority === "1" ? "text-error border-error/30" : 
                    selectedPriority === "2" ? "text-tertiary border-tertiary/30" : 
                    selectedPriority === "3" ? "text-primary border-primary/30" : 
                    "text-on-surface-variant border-border-muted"
                  }`}>
                    P{selectedPriority}
                  </span>
                  <span className="text-sm font-medium">
                    {selectedPriority === "1" ? "Urgent" : 
                     selectedPriority === "2" ? "High" : 
                     selectedPriority === "3" ? "Normal" : "Low"}
                  </span>
                </div>
                <span className="material-symbols-outlined text-on-surface-variant">expand_more</span>
              </div>

              {isPriorityDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-xl overflow-hidden z-50 py-1">
                  {[
                    { val: "1", label: "Urgent", colorClass: "text-error border-error/30" },
                    { val: "2", label: "High", colorClass: "text-tertiary border-tertiary/30" },
                    { val: "3", label: "Normal", colorClass: "text-primary border-primary/30" },
                    { val: "4", label: "Low", colorClass: "text-on-surface-variant border-border-muted" },
                  ].map(p => (
                    <div 
                      key={p.val} 
                      className="flex items-center gap-3 p-3 hover:bg-surface-container-highest cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedPriority(p.val);
                        setIsPriorityDropdownOpen(false);
                      }}
                    >
                      <span className={`font-label-mono text-[10px] font-bold px-1.5 py-0.5 border rounded-sm ${p.colorClass}`}>
                        P{p.val}
                      </span>
                      <span className="text-sm font-medium">{p.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {type === "Domain" && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Icon (Material Symbol)</label>
                <input 
                  type="text" 
                  name="icon" 
                  defaultValue="folder"
                  className="w-full bg-surface-container-highest/50 border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary transition-all"
                  placeholder="e.g., science, terminal..."
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Color Code</label>
                <input 
                  type="color" 
                  name="colorCode" 
                  defaultValue="#e040a0"
                  className="w-full h-[50px] bg-surface-container-highest/50 border border-outline-variant rounded-lg p-1 cursor-pointer"
                />
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg font-medium text-on-surface-variant hover:bg-surface-container-highest transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={(type === "Task" || type === "Project") && !selectedDomainId}
              className={`px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                (type === "Task" || type === "Project") && !selectedDomainId 
                  ? "bg-surface-container-highest text-on-surface-variant/50 cursor-not-allowed" 
                  : "bg-primary text-white active-glow hover:-translate-y-0.5"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Create {type}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
