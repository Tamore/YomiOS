import VoiceHome from './VoiceHome';
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, GraduationCap, Languages, Layers, 
  Send, Volume2, ExternalLink,
  ChevronDown, ChevronLeft, CheckSquare, Square,
  RefreshCw, Search, Download, AlertCircle, Loader2
} from 'lucide-react';
import { 
  fetchState, 
  toggleTask as apiToggleTask, 
  fetchJapaneseCards, 
  fetchCitexStatus, 
  fetchGoogleStatus, 
  searchAcademic, 
  sendChat, 
  fetchChatHistory,
  type Task, 
  type JapaneseCard,
  type StoredChatMessage 
} from './api';

interface ChatMessage {
  id: string;
  sender: 'user' | 'yomi';
  text: string;
  timestamp: string;
  toolUsed?: string;
  downloadUrl?: string;
  webUrl?: string;
  isError?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'hud' | 'academics' | 'dojo' | 'mcp'>('hud');

  // Sticky Floating Window starts MINIMIZED by default so it never blocks the view
  const [home, setHome] = useState(true);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [stickyTab, setStickyTab] = useState<'pipeline' | 'actions'>('pipeline');

  // Real SQLite Tasks from Backend API (Empty initial state)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tracks, setTracks] = useState<{ id: string; name: string; program: string }[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [togglingTaskIds, setTogglingTaskIds] = useState<Set<string>>(new Set());

  // Activity logs from backend state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Integration Health States (Fetched from backend)
  const [citexHealth, setCitexHealth] = useState<{ online: boolean; error?: string }>({ online: false });
  const [googleHealth, setGoogleHealth] = useState<{ connected: boolean; mode: string; status: string }>({ 
    connected: false, 
    mode: 'web_bridge', 
    status: 'Checking...' 
  });
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'yomi',
      text: "System initialized. Academic research satellite, admissions pipeline, and SQLite memory are synchronized with Bklit UI engine. How may I assist your preparation today?",
      timestamp: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Refresh real integration health
  const refreshIntegrationHealth = async () => {
    setIsRefreshingHealth(true);
    const citex = await fetchCitexStatus();
    const google = await fetchGoogleStatus();
    setCitexHealth(citex);
    setGoogleHealth(google);
    setIsRefreshingHealth(false);
  };

  // Reload backend tasks & state
  const reloadBackendState = async () => {
    try {
      const data = await fetchState();
      setTracks(data.admissions || []);
      setTasks(data.tasks || []);
      setActivityLogs(data.logs || []);
      setTasksLoading(false);
      setTasksError(null);
    } catch {
      setTasksLoading(false);
      setTasksError("Could not connect to Yomi backend tasks API on http://127.0.0.1:8765");
    }
  };

  // Load real tasks, chat history, and integration health on mount
  useEffect(() => {
    let isMounted = true;
    void reloadBackendState();
    void refreshIntegrationHealth();

    // Restore saved chat history for this session
    fetchChatHistory("default").then((history: StoredChatMessage[]) => {
      if (isMounted && history && history.length > 0) {
        const mapped: ChatMessage[] = history.map(h => ({
          id: h.id,
          sender: h.role === "user" ? "user" : "yomi",
          text: h.content,
          timestamp: h.timestamp ? new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
          toolUsed: h.tool_calls || undefined
        }));
        setMessages(mapped);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
  }, []);

  const handleToggleTask = async (id: string) => {
    if (togglingTaskIds.has(id)) return; // Prevent conflicting repeated toggles

    setTogglingTaskIds(prev => new Set(prev).add(id));
    setTasksError(null);

    // Save previous state for rollback on error
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === id ? { ...t, is_completed: t.is_completed ? 0 : 1 } : t));

    try {
      const updated = await apiToggleTask(id);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
    } catch {
      // Restore previous state accurately
      setTasks(previousTasks);
      setTasksError(`Failed to update task ${id}. Connection to backend lost.`);
    } finally {
      setTogglingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Scroll strictly inside chat container without scrolling the entire window
  useEffect(() => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setIsProcessing(true);

    try {
      const data = await sendChat(textToSend);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'yomi',
        text: data.reply || "Context indexed.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolUsed: data.tool_used,
        downloadUrl: data.data?.pdf_download_url || (data.data?.filename ? `http://127.0.0.1:8765/exports/${data.data.filename}` : undefined),
        webUrl: data.data?.web_url,
        isError: !!data.error || !!data.is_error
      }]);

      // Refresh task state after chat actions that modify tasks
      if (data.data?.task_modified || data.tool_used === "task_manager") {
        await reloadBackendState();
      }
    } catch {
      // Honest error reporting: never fabricate a successful answer when connection fails
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'yomi',
        text: "Connection failed: Could not reach Yomi Engine at 127.0.0.1:8765. Please ensure the backend server is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Japanese Dojo State & Live Deck
  const [cards, setCards] = useState<JapaneseCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  useEffect(() => {
    fetchJapaneseCards().then(fetched => {
      if (fetched && fetched.length > 0) {
        setCards(fetched);
      }
      setCardsLoading(false);
    }).catch(() => {
      setCardsLoading(false);
    });
  }, []);

  const [cardIdx, setCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);

  const fallbackCard: JapaneseCard = {
    id: 'f1',
    kanji: "お世話になっております",
    hiragana: "おせわになっております",
    romaji: "Osewa ni natte orimasu",
    meaning: "Thank you for your ongoing support / Guidance",
    category: "Lab Keigo",
    level: "N4 / Business",
    usage_tip: "Essential opening greeting for formal correspondence to laboratory professors and academic mentors."
  };

  const currentCard = cards.length > 0 ? (cards[cardIdx] || cards[0]) : fallbackCard;

  const speakJapanese = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Live Research Satellite Search State (Honest empty initial state)
  const [researchQuery, setResearchQuery] = useState("Decentralized Edge Intelligence");
  const [researchPapers, setResearchPapers] = useState<any[]>([]);
  const [isSearchingPapers, setIsSearchingPapers] = useState(false);
  const [latestBriefUrl, setLatestBriefUrl] = useState<string | null>(null);
  const [researchError, setResearchError] = useState<string | null>(null);

  const handleExecuteResearchSearch = async () => {
    if (!researchQuery.trim() || isSearchingPapers) return;

    // Clear stale research PDF links and previous errors when starting a new search
    setLatestBriefUrl(null);
    setResearchError(null);
    setIsSearchingPapers(true);

    try {
      const res = await searchAcademic(researchQuery);
      if (res.success) {
        const found = res.all_papers || (res.paper ? [res.paper] : []);
        if (found.length > 0) {
          setResearchPapers(found);
          if (res.pdf_download_url) {
            setLatestBriefUrl(res.pdf_download_url);
          }
        } else {
          // Honest empty state: clear old content on zero results
          setResearchPapers([]);
          setResearchError(`Zero papers found matching query: "${researchQuery}".`);
        }
      } else {
        // Failed request: clear old content and show useful error
        setResearchPapers([]);
        setResearchError(res.message || "Academic query failed to retrieve results.");
      }
    } catch {
      setResearchPapers([]);
      setResearchError("Failed to reach Academic Research Satellite at 127.0.0.1:8765. Verify backend is active.");
    } finally {
      setIsSearchingPapers(false);
    }
  };

  // Heatmap workflow filter & hover detail
  const [heatmapFilter, setHeatmapFilter] = useState<'all' | 'dojo' | 'research' | 'admissions'>('all');
  const [hoveredCell, setHoveredCell] = useState<{ count: number; day: number; week: number; activity: string } | null>(null);

  // Unrecorded baseline 52-week grid (Honest: no synthetic fake contributions or fake streaks)
  const heatmapData = useMemo(() => {
    return Array.from({ length: 52 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        return { 
          level: '01', 
          count: 0, 
          activity: 'No activity recorded for this period', 
          week: w + 1, 
          day: d + 1 
        };
      })
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f5f5f5] font-sans antialiased p-4 md:p-8 flex flex-col items-center">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CHROME & NAVIGATION (Bklit Container & Frame)          */}
      {/* ------------------------------------------------------------- */}
      {home ? <VoiceHome panel={isWindowOpen} setPanel={setIsWindowOpen} openDashboard={() => setHome(false)} /> : <>
      <header className="dashboard-header">
        <button className="dashboard-home" aria-label="Return to Yomi home" title="Yomi home" onClick={() => setHome(true)}>
          <img src={import.meta.env.BASE_URL + 'yomi-symbol.svg'} alt="" width="64" height="64" />
        </button>
        <nav className="dashboard-nav" aria-label="Dashboard sections">
              <button 
                aria-pressed={activeTab === 'hud'}
                onClick={() => setActiveTab('hud')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'hud' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Intelligence HUD</span>
              </button>
              <button 
                aria-pressed={activeTab === 'academics'}
                onClick={() => setActiveTab('academics')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'academics' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academics & Dossier</span>
              </button>
              <button 
                aria-pressed={activeTab === 'dojo'}
                onClick={() => setActiveTab('dojo')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'dojo' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>Nihongo Dojo</span>
              </button>
              <button 
                aria-pressed={activeTab === 'mcp'}
                onClick={() => setActiveTab('mcp')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'mcp' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>MCP & Connections</span>
              </button>
            </nav>

      </header>

      {/* Full-bleed Hairline Divider with Rivets */}
      <div className="bklit-container">
        <div className="bklit-divider" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN ACTIVE VIEWS                                          */}
      {/* ------------------------------------------------------------- */}
      <main className="bklit-container dashboard-motion space-y-8 pb-20"
        onPointerMove={event => {
          if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
          const card = event.target.closest<HTMLElement>('.bklit-frame');
          if (!card) return;
          const bounds = card.getBoundingClientRect();
          card.style.setProperty('--glow-x', (event.clientX - bounds.left) + 'px');
          card.style.setProperty('--glow-y', (event.clientY - bounds.top) + 'px');
        }}>

        {/* Global Error Notice if task connection failed */}
        {tasksError && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{tasksError}</span>
            </div>
            <button 
              onClick={reloadBackendState} 
              className="text-xs underline text-rose-200 hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: INTELLIGENCE HUD                                      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'hud' && (
          <div className="yomi-tiles tiles-hud">
            
            {/* Activity & Habit Heatmap Frame */}
            <section id="activity-calendar" className="bklit-frame">
              <div className="bklit-frame-panel space-y-6">
                
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Daily Habit & Research Activity</h1>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/[0.08] text-zinc-400 bg-white/[0.03]">
                        {activityLogs.length > 0 ? `${activityLogs.length} Activity Logs` : "No activity recorded"}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                      Consistency heatmap tracking JLPT N4 drills, distributed systems engineering, ArXiv literature synthesis, and admissions prep.
                    </p>
                  </div>
                  
                  {/* Spaced Workflow Filter Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.08] text-xs font-medium gap-1.5">
                    <button 
                      onClick={() => setHeatmapFilter('all')}
                      className={`px-3 py-1 rounded-lg transition-colors ${heatmapFilter === 'all' ? 'text-white bg-white/[0.12] shadow-xs' : 'text-zinc-400 hover:text-white'}`}
                    >
                      All Workflows
                    </button>
                    <button 
                      onClick={() => setHeatmapFilter('dojo')}
                      className={`px-3 py-1 rounded-lg transition-colors ${heatmapFilter === 'dojo' ? 'text-white bg-white/[0.12] shadow-xs' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Japanese Dojo
                    </button>
                    <button 
                      onClick={() => setHeatmapFilter('research')}
                      className={`px-3 py-1 rounded-lg transition-colors ${heatmapFilter === 'research' ? 'text-white bg-white/[0.12] shadow-xs' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Research & Thesis
                    </button>
                    <button 
                      onClick={() => setHeatmapFilter('admissions')}
                      className={`px-3 py-1 rounded-lg transition-colors ${heatmapFilter === 'admissions' ? 'text-white bg-white/[0.12] shadow-xs' : 'text-zinc-400 hover:text-white'}`}
                    >
                      Admissions
                    </button>
                  </div>
                </div>

                {/* Heatmap Matrix */}
                <div className="rounded-xl border border-white/[0.08] bg-[#09090b] p-6 space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--border)' }} />
                      <span className="text-white font-medium">No active streak</span>
                      <span className="text-zinc-500">· Not measured</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400">
                      <span>Avg: <strong className="text-white font-normal">Not measured</strong></span>
                      <span>Best: <strong className="text-white font-normal">Not measured</strong></span>
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-2 card-scroll">
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pl-8 pr-2 pb-2">
                      <span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex flex-col justify-between h-[96px] text-[10px] font-mono text-zinc-500 py-0.5">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                      </div>

                      <div className="flex gap-1">
                        {heatmapData.map((week, wIdx) => (
                          <div key={wIdx} className="flex flex-col gap-1">
                            {week.map((cell, dIdx) => (
                              <div 
                                key={dIdx}
                                onMouseEnter={() => setHoveredCell({ count: cell.count, day: cell.day, week: cell.week, activity: cell.activity })}
                                className="w-[11px] h-[11px] rounded-[2px] transition-transform duration-120 hover:scale-125 cursor-pointer"
                                style={{ backgroundColor: 'var(--chart-scale-01)' }}
                                title="No activity recorded for this date"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Legend */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-4 border-t border-white/[0.04]">
                      <span className="text-zinc-400">
                        {hoveredCell ? (
                          <>
                            <span className="text-white font-medium">Day {hoveredCell.day}, Week {hoveredCell.week}</span> — <span className="text-zinc-400">{hoveredCell.activity}</span>
                          </>
                        ) : (
                          "Hover over any day to inspect recorded activity telemetry."
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Less</span>
                        <div className="flex items-center gap-1">
                          {['01', '02', '03', '04', '05'].map(l => (
                            <div 
                              key={l} 
                              className="w-[11px] h-[11px] rounded-[2px]"
                              style={{ backgroundColor: `var(--chart-scale-${l})` }} 
                            />
                          ))}
                        </div>
                        <span>More</span>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </section>

            {/* 3 Metric Summary Cards */}
            <section className="bklit-frame metric-tile">
<div className="bklit-frame-panel flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Research Velocity</span>
                    <span className="text-xs font-mono font-medium text-zinc-400">Not measured</span>
                  </div>
                  <div className="h-24 flex items-center justify-center relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 300 80" fill="none">
                      <path d="M0 50 Q 75 10, 150 45 T 300 20" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" opacity="0.6" />
                      <path d="M0 60 Q 75 35, 150 55 T 300 40" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" fill="none" opacity="0.4" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <span>Active Citations</span>
                    <span className="font-mono text-zinc-400 font-medium">Not tracked</span>
                  </div>
                </div>
            </section>
            <section className="bklit-frame metric-tile">
<div className="bklit-frame-panel flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Dossier Completion</span>
                    <span className="text-xs font-mono text-zinc-400">Not verified</span>
                  </div>
                  <div className="flex items-center justify-center py-1">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--chart-1)" strokeWidth="3.5" strokeDasharray="0, 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-bold font-mono text-zinc-400">0%</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Unverified</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <span>Credentials</span>
                    <span className="font-mono text-zinc-400 font-medium">Not verified</span>
                  </div>
                </div>
            </section>
            <section className="bklit-frame metric-tile">
<div className="bklit-frame-panel flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">JLPT N4 Horizon</span>
                    <span className="text-xs font-mono text-zinc-400">Schedule Unset</span>
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Lab Keigo Fluency</span>
                      <span className="font-mono text-zinc-400 font-medium">Not measured</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: '0%', backgroundColor: 'var(--chart-1)' }} />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-400">CS Technical Kanji</span>
                      <span className="font-mono text-zinc-400 font-medium">Not measured</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: '0%', backgroundColor: 'var(--chart-2)' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <span>Target Score</span>
                    <span className="font-mono text-zinc-400 font-medium">Unset</span>
                  </div>
                </div>
            </section>

            {/* Conversational Chief of Staff Dialogue Frame */}
            <section className="bklit-frame">
              <div className="bklit-frame-panel space-y-6">
                
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <h2 className="text-lg font-semibold">Chat with Yomi</h2>
                </div>

                <div ref={chatScrollContainerRef} className="space-y-4 max-h-[380px] overflow-y-auto pr-2 card-scroll">
                  {messages.map(msg => (
                    <div key={msg.id} className={`chat-row flex items-start gap-2 ${msg.sender === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-mono font-medium shrink-0 ${
                        msg.isError 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                          : msg.sender === 'yomi' 
                            ? 'bg-white/[0.06] border-white/[0.08] text-white' 
                            : 'bg-white text-black font-semibold'
                      }`}>
                        {msg.isError ? '!' : msg.sender === 'yomi' ? 'Y' : 'U'}
                      </div>
                      <div className={`rounded-xl border p-4 text-xs md:text-sm leading-relaxed max-w-3xl space-y-2.5 ${
                        msg.isError 
                          ? 'border-rose-500/30 bg-rose-950/20 text-rose-200' 
                          : 'border-white/[0.08] bg-[#0c0c0e]'
                      }`}>
                        <p className={msg.isError ? "text-rose-200" : "text-zinc-200 whitespace-pre-wrap"}>{msg.text}</p>
                        
                        {/* Direct Download Action Link */}
                        {msg.downloadUrl && (
                          <div className="pt-1">
                            <a 
                              href={msg.downloadUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.1] transition-all"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Generated PDF Brief</span>
                            </a>
                          </div>
                        )}

                        {/* Direct Web Compose Link */}
                        {msg.webUrl && (
                          <div className="pt-1">
                            <a 
                              href={msg.webUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.1] transition-all"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Draft in Gmail</span>
                            </a>
                          </div>
                        )}

                        <span className="text-[10px] font-mono text-zinc-500 block">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Integrated Chat Input */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-black/40 border border-white/[0.08]">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Message Yomi…" 
                    className="flex-1 bg-transparent px-3 py-2 text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={isProcessing}
                    className="bklit-btn bklit-btn-default flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isProcessing ? "Processing..." : "Send"}</span>
                  </button>
                </div>

              </div>
            </section>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: ACADEMICS & DOSSIER                                   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'academics' && (
          <div className="yomi-tiles tiles-academics">
            <div className="border-b border-white/[0.06] pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Academics & Dossier</h1>
              <p className="text-xs md:text-sm text-zinc-400 mt-1">
                Consolidated repository of academic research satellites, proposal tracking, and verified literature briefs.
              </p>
            </div>

            {/* Master's Thesis Proposal */}
            <section className="bklit-frame">
              <div className="bklit-frame-panel space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Research Proposal & Monograph</span>
                    <h2 className="text-lg font-bold text-white mt-0.5">
                      Decentralized Edge Intelligence & Fault-Tolerant Consensus for Distributed Systems
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-zinc-400">
                      Draft Monograph
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-y border-white/[0.06]">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Target Domain</span>
                    <p className="text-xs font-medium text-white mt-0.5">Distributed Computing</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Architecture</span>
                    <p className="text-xs font-medium text-white mt-0.5">Low-Latency Consensus</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Edge Runtime</span>
                    <p className="text-xs font-medium text-white mt-0.5">Jetson Orin Nano</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Verification Status</span>
                    <p className="text-xs font-medium text-amber-400 mt-0.5">Peer Review Pending</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Live ArXiv Literature Satellite */}
            <section className="bklit-frame">
              <div className="bklit-frame-panel space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">ArXiv Literature Satellite</h2>
                    <p className="text-xs text-zinc-400">Live search across ArXiv repository with instant PDF brief compilation.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteResearchSearch()}
                      placeholder="Search ArXiv papers..."
                      className="px-3 py-1.5 rounded-lg text-xs bg-black/40 border border-white/[0.08] text-white w-64 focus:outline-none"
                    />
                    <button 
                      onClick={handleExecuteResearchSearch}
                      disabled={isSearchingPapers}
                      className="bklit-btn bklit-btn-default text-xs flex items-center gap-1.5"
                    >
                      {isSearchingPapers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                      <span>{isSearchingPapers ? "Querying..." : "Query"}</span>
                    </button>
                  </div>
                </div>

                {/* Latest PDF brief download button if available */}
                {latestBriefUrl && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between">
                    <span className="text-xs text-zinc-300">Generated Research Brief PDF is ready for download:</span>
                    <a 
                      href={latestBriefUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bklit-btn bklit-btn-default text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF Brief</span>
                    </a>
                  </div>
                )}

                {/* Research Errors or Zero Results */}
                {researchError && (
                  <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{researchError}</span>
                  </div>
                )}

                {/* Papers List */}
                {isSearchingPapers ? (
                  <div className="p-8 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                    <span>Querying ArXiv API and compiling reference brief...</span>
                  </div>
                ) : researchPapers.length > 0 ? (
                  <div className="space-y-3">
                    {researchPapers.map((paper, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1 max-w-2xl">
                          <span className="text-[10px] font-mono text-zinc-500">{paper.id || "arXiv"}</span>
                          <h4 className="text-xs md:text-sm font-medium text-white">{paper.title}</h4>
                          <p className="text-xs text-zinc-400">
                            {Array.isArray(paper.authors) ? paper.authors.join(", ") : paper.authors} · {paper.published || "Recent"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {paper.url && (
                            <a 
                              href={paper.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="bklit-btn bklit-btn-outline text-xs flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>ArXiv Link</span>
                            </a>
                          )}
                          <button 
                            onClick={() => {
                              const citeKey = paper.id?.replace(/[^a-zA-Z0-9]/g, '_') || 'cite';
                              const auths = Array.isArray(paper.authors) ? paper.authors.join(' and ') : (paper.authors || 'Unknown');
                              const bib = `@article{${citeKey},\n  title={${paper.title}},\n  author={${auths}},\n  year={${paper.year || 2026}},\n  url={${paper.url || ''}}\n}`;
                              navigator.clipboard.writeText(bib);
                              alert("BibTeX citation copied to clipboard!");
                            }}
                            className="bklit-btn bklit-btn-outline text-xs font-mono"
                          >
                            Copy BibTeX
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-white/[0.06] rounded-xl">
                    No research literature loaded. Enter an academic topic or ArXiv identifier above to query live repositories.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: NIHONGO DOJO                                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dojo' && (
          <div className="yomi-tiles tiles-dojo">
            <div className="border-b border-white/[0.06] pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Nihongo Dojo</h1>
              <p className="text-xs md:text-sm text-zinc-400 mt-1">
                Targeted Japanese language acquisition for laboratory research, academic communication (Keigo), and JLPT certification.
              </p>
            </div>

            <section className="dojo-tiles">
              {/* Left: 3D Flip Card */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">
                    {cardsLoading ? "Loading flashcard deck..." : `Card ${cardIdx + 1} of ${cards.length || 1} · ${currentCard.category}`}
                  </span>
                  <span className="text-xs font-mono text-zinc-500">Click card to flip</span>
                </div>

                <div 
                  onClick={() => setIsFlipped(prev => !prev)}
                  className="cursor-pointer h-72 bklit-frame hover:border-white/[0.18] transition-all"
                >
                  <div className="bklit-frame-panel flex flex-col justify-between h-full">
                    {!isFlipped ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-zinc-400">
                            {currentCard.level}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              speakJapanese(currentCard.kanji);
                            }}
                            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] text-white transition-all"
                            title="Listen Pronunciation"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-center space-y-2">
                          <h2 className="text-4xl md:text-5xl font-semibold tracking-wide text-white">
                            {currentCard.kanji}
                          </h2>
                          <p className="text-sm font-mono text-zinc-400">
                            {currentCard.hiragana}
                          </p>
                        </div>

                        <div className="text-center text-xs font-mono text-zinc-500">
                          Romaji: {currentCard.romaji}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]" style={{ color: 'var(--chart-1)' }}>
                            Translation & Academic Context
                          </span>
                          <span className="text-xs font-mono text-zinc-500">Tap to flip back</span>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-xl font-medium text-white">
                            {currentCard.meaning}
                          </h3>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {currentCard.usage_tip}
                          </p>
                        </div>

                        <div className="text-xs font-mono text-zinc-500">
                          Category: {currentCard.category} ({currentCard.level})
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIdx(prev => (prev > 0 ? prev - 1 : (cards.length > 0 ? cards.length - 1 : 0)));
                    }}
                    className="bklit-btn bklit-btn-outline text-xs"
                  >
                    Previous Card
                  </button>
                  <span className="text-xs font-mono text-zinc-500">
                    {cardIdx + 1} / {cards.length || 1}
                  </span>
                  <button 
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIdx(prev => (prev < (cards.length - 1) ? prev + 1 : 0));
                    }}
                    className="bklit-btn bklit-btn-default text-xs"
                  >
                    Next Card
                  </button>
                </div>
              </div>

              {/* Right: Rapid Drill Practice */}
              <div className="space-y-4">
                <div className="bklit-frame">
                  <div className="bklit-frame-panel space-y-4">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <span className="text-xs font-mono font-medium text-white">Laboratory Interaction Drill</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                        Formal Keigo
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Context Prompt</span>
                      <p className="text-xs text-zinc-200">
                        "You are emailing a laboratory professor for the first time requesting thesis guidance. Which phrase is appropriate?"
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <span className="text-xs text-zinc-400">Select matching translation:</span>
                      {[
                        "A. Excuse me for leaving before you",
                        "B. I humbly look forward to working with you / Best regards",
                        "C. I have not received your email yet",
                        "D. Good morning, sensei"
                      ].map((opt, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setQuizAnswered(idx)}
                          className={`w-full p-3 rounded-xl border text-left text-xs transition-all ${
                            quizAnswered === idx
                              ? idx === 1
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                                : 'border-rose-500 bg-rose-500/10 text-rose-300'
                              : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {quizAnswered !== null && (
                      <div className={`p-3 rounded-xl text-xs font-mono border ${
                        quizAnswered === 1 
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                          : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      }`}>
                        {quizAnswered === 1 
                          ? "Correct: 'Yoroshiku onegai itashimasu' is the standard polite Japanese phrase for establishing formal collaboration."
                          : "Incorrect. Option B is correct: 'I humbly look forward to working with you / Best regards'."
                        }
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: MCP & CONNECTIONS                                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'mcp' && (
          <div className="yomi-tiles tiles-mcp">
            <div className="border-b border-white/[0.06] pb-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">MCP & Connected Services</h1>
                <p className="text-xs md:text-sm text-zinc-400 mt-1">
                  Model Context Protocol servers, active local bridges, and real integration status.
                </p>
              </div>
              <button 
                onClick={refreshIntegrationHealth}
                disabled={isRefreshingHealth}
                className="bklit-btn bklit-btn-outline text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </button>
            </div>

            <div className="service-tiles">
              {/* Connection 1: CiteX */}
              <div className="bklit-frame">
                <div className="bklit-frame-panel flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono text-xs font-bold text-white">
                      CX
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">CiteX Academic Intelligence Engine</h3>
                        <span className={`w-1.5 h-1.5 rounded-full ${citexHealth.online ? 'bg-emerald-400 shadow-sm' : 'bg-zinc-600'}`} />
                        <span className={`text-[10px] font-mono ${citexHealth.online ? 'text-emerald-400' : 'text-zinc-500'}`}>
                          {citexHealth.online ? 'Online (:8000)' : 'Offline (:8000)'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Multi-source academic literature review and faculty researcher radar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-500 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.06]">
                      {citexHealth.online ? "REST Bridge Ready" : "Service Offline"}
                    </span>
                    <button 
                      onClick={refreshIntegrationHealth}
                      className="bklit-btn bklit-btn-outline flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Ping</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Connection 2: Google Workspace */}
              <div className="bklit-frame">
                <div className="bklit-frame-panel flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono text-xs font-bold text-white">
                      GW
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">Google Workspace (Gmail & Drive)</h3>
                        <span className={`w-1.5 h-1.5 rounded-full ${googleHealth.connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <span className={`text-[10px] font-mono ${googleHealth.connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {googleHealth.connected ? 'Authorized (API Mode)' : 'Web-Bridge Mode (Direct Links)'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {googleHealth.status}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-400 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.06]">
                      Mode: {googleHealth.mode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connection 3: GitHub Working Copy */}
              <div className="bklit-frame">
                <div className="bklit-frame-panel flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono text-xs font-bold text-white">
                      GH
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">Local Git Checkout</h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />
                        <span className="text-[10px] font-mono text-emerald-400">Active Workspace</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Canonical Git checkout location: D:\Projects\Yomi (branch fix/audit-repairs).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-zinc-400 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.06]">
                      Status: Local Working Tree
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
      </>}

      {/* ------------------------------------------------------------- */}
      {/* 3. MINIMIZABLE / MAXIMIZABLE DOCKED CONTROLLER                */}
      {/* ------------------------------------------------------------- */}
      <div hidden={home && !isWindowOpen} className={home ? "voice-tracker" : "dashboard-drawer"}>
        {!isWindowOpen ? (
          <button type="button" className="drawer-handle" onClick={() => setIsWindowOpen(true)}
              aria-label="Open pipeline and actions" title="Open pipeline and actions">
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
        ) : (
          <div className="w-80 md:w-[380px] max-h-[500px] bklit-frame shadow-2xl backdrop-blur-2xl transition-all">
            <div className="bklit-frame-panel p-0 overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
                  <span className="text-xs font-semibold tracking-tight text-white">Pipeline & Action Tracker</span>
                </div>
                <button 
                  onClick={() => setIsWindowOpen(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all"
                  title="Minimize window"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sub Tabs */}
              <div className="p-1.5 border-b border-white/[0.06] bg-black/20 flex gap-1">
                <button 
                  onClick={() => setStickyTab('pipeline')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    stickyTab === 'pipeline' ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Research Tracks
                </button>
                <button 
                  onClick={() => setStickyTab('actions')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    stickyTab === 'actions' ? 'bg-white/[0.08] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  SQLite Tasks ({tasks.filter(t => !t.is_completed).length})
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto card-scroll p-3.5 space-y-3 max-h-[380px]">
                {stickyTab === 'pipeline' ? (
                  <div className="space-y-3">
                    {tasksLoading ? "Loading research tracks…" : tasksError ? "Research tracks unavailable." : tracks.length === 0 ? "No research tracks added." : tracks.map(track => (
                      <div key={track.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <strong>{track.name}</strong>
                        <p>{track.program}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {tasksLoading ? (
                      <div className="p-6 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        <span>Loading tasks from SQLite...</span>
                      </div>
                    ) : tasks.length > 0 ? (
                      tasks.map(task => {
                        const isToggling = togglingTaskIds.has(task.id);
                        return (
                          <div 
                            key={task.id}
                            onClick={() => !isToggling && handleToggleTask(task.id)}
                            className={`flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-all ${
                              isToggling ? 'opacity-60 cursor-wait' : ''
                            }`}
                          >
                            <div className="mt-0.5 text-zinc-400 hover:text-white transition-colors">
                              {isToggling ? (
                                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                              ) : task.is_completed ? (
                                <CheckSquare className="w-4 h-4" style={{ color: 'var(--chart-1)' }} />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-medium leading-snug ${task.is_completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                  {task.title}
                                </span>
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                  task.priority === 'P1' 
                                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' 
                                    : 'bg-white/[0.04] text-zinc-400 border border-white/[0.06]'
                                }`}>
                                  {task.priority}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500 block">
                                Status: {task.is_completed ? 'Completed' : task.status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-white/[0.06] rounded-xl">
                        No active tasks found in SQLite. Say "add task: ..." to Yomi in chat to create one.
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

    </div>
  );
}
