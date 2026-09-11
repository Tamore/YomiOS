import prisma from "@/lib/prisma";
import { format, isToday, isYesterday } from "date-fns";

export default async function ActivityCenter() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  });

  // Group logs by date
  type LogType = typeof logs[0];
  const groupedLogs = logs.reduce((groups: Record<string, LogType[]>, log: LogType) => {
    let dateStr = "";
    if (isToday(log.createdAt)) {
      dateStr = `Today — ${format(log.createdAt, "dd MMM yyyy")}`;
    } else if (isYesterday(log.createdAt)) {
      dateStr = `Yesterday — ${format(log.createdAt, "dd MMM yyyy")}`;
    } else {
      dateStr = format(log.createdAt, "dd MMM yyyy");
    }

    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(log);
    return groups;
  }, {});

  return (
    <div className="w-full h-screen relative overflow-hidden">
      
      {/* Top Left Title Overlay */}
      <div className="absolute top-12 left-28 pointer-events-none animate-in fade-in slide-in-from-left-8 duration-700">
        <h2 className="font-display-lg text-4xl text-primary tracking-widest drop-shadow-[0_0_15px_rgba(192,132,252,0.8)]">ACTIVITY CENTER</h2>
        <div className="flex items-center gap-2 mt-2">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse"></span>
          <p className="font-label-mono text-[10px] text-secondary uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">System Monitoring Active // All Threads Operational</p>
        </div>
      </div>

      {/* Floating HUD Timeline Window */}
      <div className="absolute top-32 left-28 bottom-12 w-[600px] glass-card rounded-2xl p-6 pointer-events-auto flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 shadow-[0_0_30px_rgba(192,132,252,0.15)] border-primary/20">
        
        {/* Filters Header inside the Window */}
        <div className="flex flex-wrap gap-4 mb-6 shrink-0 justify-end border-b border-border-muted/30 pb-4">
          <button className="bg-surface-container-high/50 px-3 py-1.5 rounded border border-border-muted font-label-mono text-[9px] text-on-surface hover:border-primary transition-all flex items-center gap-2 tracking-widest uppercase active-glow">
            <span className="material-symbols-outlined text-[14px]">filter_list</span>
            DOMAIN: ALL
          </button>
          <button className="bg-primary/10 px-3 py-1.5 rounded border border-primary/30 font-label-mono text-[9px] text-primary flex items-center gap-2 tracking-widest uppercase active-glow">
            <span className="material-symbols-outlined text-[14px]">history</span>
            LIVE LOGS
          </button>
        </div>

        {/* TIMELINE CONTENT */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative pr-2">
          {logs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
              <span className="material-symbols-outlined text-[48px] text-primary">history_toggle_off</span>
              <div className="max-w-sm">
                <h3 className="font-headline-md text-lg text-primary mb-2 tracking-wider">NO ACTIVITY DETECTED</h3>
                <p className="font-label-mono text-[10px] text-on-surface-variant tracking-widest leading-relaxed">
                  The audit log is completely empty. Start creating Domains, Projects, and Tasks to populate this timeline.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-[1px] bg-primary/20 hidden md:block"></div>
              
              <div className="space-y-6">
                {Object.entries(groupedLogs).map(([dateLabel, dayLogs]) => (
                  <div key={dateLabel} className="space-y-4">
                    {/* Day Separator */}
                    <div className="relative flex items-center md:ml-6 py-2 sticky top-0 bg-surface-charcoal/90 backdrop-blur z-30">
                      <div className="pr-4 z-10">
                        <span className="font-label-mono text-[9px] text-primary uppercase tracking-[0.3em] font-bold">{dateLabel}</span>
                      </div>
                      <div className="flex-grow border-t border-primary/20"></div>
                    </div>

                    {/* Day Events */}
                    {dayLogs.map((log) => {
                      const isPrimary = log.colorClass.includes("primary");
                      const isSecondary = log.colorClass.includes("secondary");
                      const isTertiary = log.colorClass.includes("tertiary");
                      const isError = log.colorClass.includes("error");
                      
                      const bgClass = isPrimary ? "bg-primary/10 text-primary" : 
                                      isSecondary ? "bg-secondary/10 text-secondary" : 
                                      isTertiary ? "bg-tertiary/10 text-tertiary" : 
                                      isError ? "bg-error/10 text-error" : 
                                      "bg-surface-container-highest text-on-surface-variant";

                      const dotColor = isPrimary ? "border-primary shadow-[0_0_10px_rgba(192,132,252,0.8)] bg-primary" : 
                                       isSecondary ? "border-secondary shadow-[0_0_10px_rgba(6,182,212,0.8)] bg-secondary" : 
                                       isTertiary ? "border-tertiary shadow-[0_0_10px_rgba(168,85,247,0.8)] bg-tertiary" : 
                                       isError ? "border-error shadow-[0_0_10px_rgba(255,0,0,0.8)] bg-error" : 
                                       "border-border-muted bg-surface-dim";

                      return (
                        <div key={log.id} className="group relative md:pl-16 animate-in slide-in-from-right-4 fade-in duration-300">
                          <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${dotColor} z-20 hidden md:block group-hover:scale-150 transition-transform`}></div>
                          
                          <div className="glass-card p-4 rounded-xl flex flex-col md:flex-row md:items-center gap-4 hover:border-primary/50 transition-all border-l-2 hover:bg-primary/5" style={{ borderLeftColor: isPrimary ? 'var(--color-primary)' : isSecondary ? 'var(--color-secondary)' : isTertiary ? 'var(--color-tertiary)' : isError ? 'var(--color-error)' : 'var(--color-border-muted)' }}>
                            <div className="flex-shrink-0 flex items-center gap-3 md:w-28">
                              <span className="font-label-mono text-[9px] text-on-surface-variant/60 tracking-widest">{format(log.createdAt, "HH:mm:ss")}</span>
                              <div className={`${bgClass} p-1.5 rounded-lg flex items-center justify-center border border-current/20`}>
                                <span className="material-symbols-outlined text-[16px]">{log.icon}</span>
                              </div>
                            </div>
                            
                            <div className="flex-grow">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-on-surface text-xs tracking-wide">{log.title}</span>
                                <span className={`font-label-mono text-[8px] px-1.5 py-0.5 rounded-sm border uppercase tracking-widest ${log.colorClass.replace('text-', 'border-').replace('border-', 'border-opacity-30 border-')} ${log.colorClass.split(' ')[0]}`}>
                                  {log.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-on-surface-variant/80">{log.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-col items-center gap-4 py-8 opacity-50">
                <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                <span className="font-label-mono text-[9px] text-primary uppercase tracking-[0.4em]">END OF AUDIT LOG</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
