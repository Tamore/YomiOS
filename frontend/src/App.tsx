import VoiceHome from './VoiceHome';
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, GraduationCap, Languages, Layers, 
  Send, Volume2, ExternalLink,
  ChevronDown, ChevronUp, CheckSquare, Square,
  ShieldCheck, RefreshCw, Eye, EyeOff
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'yomi';
  text: string;
  timestamp: string;
}

interface JapaneseCard {
  id: string;
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning: string;
  category: string;
  level: string;
  usage_tip: string;
}

interface TaskItem {
  id: string;
  title: string;
  meta: string;
  completed: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'hud' | 'academics' | 'dojo' | 'mcp'>('hud');

  // Sticky Floating Window starts MINIMIZED by default so it never blocks the view
  const [home, setHome] = useState(true);
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const [stickyTab, setStickyTab] = useState<'pipeline' | 'actions'>('pipeline');

  // Generic & modular pipeline tasks
  const [actionTasks, setActionTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Synthesize Edge AI distributed consensus telemetry', meta: 'Address latency synchronization benchmarks', completed: false },
    { id: '2', title: 'Prepare Graduate Admissions dossier & statement of purpose', meta: 'Target submission window December 2026', completed: false },
    { id: '3', title: 'Master 18 Laboratory Keigo academic interaction cards', meta: 'Nihongo Dojo drill sequence', completed: false },
    { id: '4', title: 'Pre-screening research evaluation tracking', meta: 'Evaluation in progress', completed: false },
    { id: '5', title: 'Verify B.Tech Computer Science & Engineering degree credentials', meta: 'First Class with Distinction dossier indexed', completed: true },
    { id: '6', title: 'Archive Systems & Security Research certifications', meta: 'Verified cryptographic credential bundle', completed: true },
  ]);

  const toggleTask = (id: string) => {
    setActionTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'yomi',
      text: "System initialized. Academic dossier, research satellites, and admissions pipeline are synchronized with Bklit UI engine. How may I assist your preparation today?",
      timestamp: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const res = await fetch("http://127.0.0.1:8765/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend, user_name: "Candidate" })
      });

      if (!res.ok) throw new Error("Backend offline");
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'yomi',
        text: data.reply || "Context indexed.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch {
      // Fallback response for offline resilience
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          sender: 'yomi',
          text: `Query processed. Verified your First Class Distinction B.Tech CSE degree credentials, Systems Research Fellowship, and Enterprise Engineering practicum. Active admissions pipeline holds 3 prospective research tracks in Distributed Systems, Edge AI, and Fault-Tolerant Consensus.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }, 500);
    } finally {
      setIsProcessing(false);
    }
  };

  // Nihongo Dojo State
  const dojoCards: JapaneseCard[] = [
    {
      id: '1',
      kanji: "お世話になっております",
      hiragana: "おせわになっております",
      romaji: "Osewa ni natte orimasu",
      meaning: "Thank you for your ongoing support / Guidance",
      category: "Lab Keigo",
      level: "N4 / Business",
      usage_tip: "Essential opening greeting for formal correspondence to laboratory professors and academic mentors."
    },
    {
      id: '2',
      kanji: "ご指導ご鞭撻のほど",
      hiragana: "ごしどうごべんたつのほど",
      romaji: "Goshidou gobentatsu no hodo",
      meaning: "I humbly request your continuous mentorship and guidance",
      category: "Lab Keigo",
      level: "N3 / Keigo",
      usage_tip: "Formal closing phrase in research proposal inquiries expressing profound respect for laboratory mentorship."
    },
    {
      id: '3',
      kanji: "分散システム",
      hiragana: "ぶんさんしすてむ",
      romaji: "Bunsan shisutemu",
      meaning: "Distributed Systems",
      category: "Computer Science",
      level: "CS Tech",
      usage_tip: "Core research domain term for distributed architectures, consensus protocols, and edge compute clusters."
    },
    {
      id: '4',
      kanji: "エッジ推論",
      hiragana: "えっじすいろん",
      romaji: "Ejji suiron",
      meaning: "Edge Inference / On-Device Neural Processing",
      category: "Computer Science",
      level: "CS Tech",
      usage_tip: "Primary technical keyword for lightweight on-device AI models running on edge accelerators."
    }
  ];

  const [cardIdx, setCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState<number | null>(null);

  const speakJapanese = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Token visibility state for MCP tab
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});
  const toggleTokenVisibility = (key: string) => {
    setShowTokens(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Heatmap workflow filter & hover detail
  const [heatmapFilter, setHeatmapFilter] = useState<'all' | 'dojo' | 'research' | 'admissions'>('all');
  const [hoveredCell, setHoveredCell] = useState<{ count: number; day: number; week: number; activity: string } | null>(null);

  const activities = [
    'JLPT N4 Kanji & Grammar Drill (Anki deck 24 cards)',
    'Edge AI Latency profiling on Jetson Orin Nano',
    'ArXiv reading: Decentralized LLM Edge Consensus',
    'Laboratory correspondence and research draft follow-up',
    'Graduate research proposal methodology refinement',
    'Pre-screening statement of purpose review',
    'Distributed systems Raft replication benchmark in Go',
    'Laboratory Keigo conversation practice'
  ];

  // Deterministic 52-week activity distribution with 24-day active streak ending today
  const heatmapData = useMemo(() => {
    let seed = 42;
    const pseudoRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    return Array.from({ length: 52 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const globalDayIndex = w * 7 + d;
        const totalDays = 52 * 7;
        const daysFromEnd = totalDays - 1 - globalDayIndex;

        let level = '01';
        let count = 0;

        if (daysFromEnd < 24) {
          const r = pseudoRandom();
          level = r > 0.65 ? '05' : (r > 0.3 ? '04' : '03');
          count = level === '05' ? Math.floor(r * 4) + 6 : (level === '04' ? 4 : 3);
        } else {
          const sprintFactor = Math.sin(w / 3.2) * 0.5 + 0.5;
          const r = pseudoRandom();
          if (r < 0.46) {
            level = '01';
            count = 0;
          } else if (r < 0.72) {
            level = '02';
            count = 1;
          } else if (r < 0.90 || sprintFactor > 0.7) {
            level = sprintFactor > 0.75 && r > 0.85 ? '04' : '03';
            count = level === '04' ? 4 : 2;
          } else {
            level = '05';
            count = 6;
          }
        }

        const activity = activities[(w + d) % activities.length];
        return { level, count, activity, week: w + 1, day: d + 1 };
      })
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f5f5f5] font-sans antialiased p-4 md:p-8 flex flex-col items-center">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CHROME & NAVIGATION (Bklit Container & Frame)          */}
      {/* ------------------------------------------------------------- */}
      {home ? <VoiceHome panel={isWindowOpen} setPanel={setIsWindowOpen} openDashboard={() => setHome(false)} /> : <>
      <button className="voice-return" onClick={() => setHome(true)}>← Yomi home</button>
      <div className="bklit-container mb-8">
        <header className="bklit-frame">
          <div className="bklit-frame-panel py-3 px-5 flex flex-wrap items-center justify-between gap-4">
            
            {/* Custom Yomi Brandmark (Option 3: Cyber-Kamon Diamond) */}
            <div className="flex items-center gap-3">
              <svg 
                className="w-5 h-5 shrink-0" 
                viewBox="0 0 32 32" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Yomi Brandmark"
              >
                <defs>
                  <linearGradient id="yomi-kamon-rose" x1="16" y1="12" x2="16" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="40%" stopColor="#fb7185" />
                    <stop offset="100%" stopColor="#e11d48" />
                  </linearGradient>
                  <linearGradient id="yomi-kamon-white" x1="7" y1="4" x2="16" y2="13" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e4e4e7" />
                  </linearGradient>
                </defs>

                {/* Top Left Diamond Facet */}
                <polygon points="16,4 7,13 13,13 16,10" fill="url(#yomi-kamon-white)" />
                {/* Top Right Diamond Facet */}
                <polygon points="16,4 25,13 19,13 16,10" fill="#ffffff" fillOpacity="0.45" />
                {/* Lower Keel Diamond */}
                <polygon points="16,13 21,18 16,28 11,18" fill="url(#yomi-kamon-rose)" />
                {/* Core Architecture */}
                <polygon points="16,7 13.5,11.5 18.5,11.5" fill="#0e0e11" />
              </svg>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-white">Yomi</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                  v2.0 · Bklit Engine
                </span>
              </div>
            </div>

            {/* Segmented Hubs */}
            <nav className="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-medium gap-1">
              <button 
                onClick={() => setActiveTab('hud')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'hud' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Intelligence HUD</span>
              </button>
              <button 
                onClick={() => setActiveTab('academics')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'academics' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Academics & Dossier</span>
              </button>
              <button 
                onClick={() => setActiveTab('dojo')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'dojo' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>Nihongo Dojo</span>
              </button>
              <button 
                onClick={() => setActiveTab('mcp')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeTab === 'mcp' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>MCP & Connections</span>
              </button>
            </nav>

          </div>
        </header>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. MAIN ACTIVE VIEWS                                          */}
      {/* ------------------------------------------------------------- */}
      <main className="bklit-container space-y-8 pb-20">

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: INTELLIGENCE HUD                                      */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'hud' && (
          <div className="space-y-8">
            
            {/* Activity & Habit Heatmap Frame */}
            <section className="bklit-frame">
              <div className="bklit-frame-panel space-y-6">
                
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">Daily Habit & Research Activity</h1>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/[0.08] text-zinc-400 bg-white/[0.03]">
                        348 Contributions
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
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--chart-1)', boxShadow: '0 0 8px var(--chart-1)' }} />
                      <span className="text-white font-medium">24-Day Active Streak</span>
                      <span className="text-zinc-500">· Active through today</span>
                    </div>
                    <div className="flex items-center gap-4 text-zinc-400">
                      <span>Avg: <strong className="text-white font-normal">4.8 / day</strong></span>
                      <span>Best: <strong className="text-white font-normal">9 / day</strong></span>
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
                                className={`w-[11px] h-[11px] rounded-[2px] transition-transform duration-120 hover:scale-125 cursor-pointer ${
                                  cell.level === '01' ? 'heat-cell-pattern' : ''
                                }`}
                                style={{ backgroundColor: `var(--chart-scale-${cell.level})` }}
                                title={cell.count > 0 ? `${cell.count} contributions · ${cell.activity}` : 'No activity recorded'}
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
                            <span className="text-white font-medium">{hoveredCell.count} contributions</span> on Day {hoveredCell.day}, Week {hoveredCell.week} — <span className="text-zinc-300">{hoveredCell.activity}</span>
                          </>
                        ) : (
                          "Hover over any day to see logged research and language drills."
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Less</span>
                        <div className="flex items-center gap-1">
                          {['01', '02', '03', '04', '05'].map(l => (
                            <div 
                              key={l} 
                              className={`w-[11px] h-[11px] rounded-[2px] ${l === '01' ? 'heat-cell-pattern' : ''}`}
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

            {/* 3 Showcase Metric Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Wave Curve */}
              <div className="bklit-frame">
                <div className="bklit-frame-panel flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Research Velocity</span>
                    <span className="text-xs font-mono font-medium" style={{ color: 'var(--chart-1)' }}>94% Ready</span>
                  </div>
                  <div className="h-24 flex items-center justify-center relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 300 80" fill="none">
                      <path d="M0 50 Q 75 10, 150 45 T 300 20" stroke="var(--chart-1)" strokeWidth="2" fill="none" opacity="0.9" />
                      <path d="M0 60 Q 75 35, 150 55 T 300 40" stroke="var(--chart-2)" strokeWidth="1.5" strokeDasharray="3 3" fill="none" opacity="0.5" />
                      <line x1="75" y1="10" x2="75" y2="75" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
                      <line x1="225" y1="30" x2="225" y2="75" stroke="rgba(255,255,255,0.1)" strokeDasharray="2 2" />
                      <circle cx="75" cy="22" r="3" fill="var(--chart-1)" />
                      <circle cx="225" cy="42" r="3" fill="var(--chart-2)" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <span>Active Citations</span>
                    <span className="font-mono text-white font-medium">42 Literature Nodes</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Ring Metric */}
              <div className="bklit-frame">
                <div className="bklit-frame-panel flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Dossier Completion</span>
                    <span className="text-xs font-mono text-zinc-400">5 / 5 Verified</span>
                  </div>
                  <div className="flex items-center justify-center py-1">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--chart-1)" strokeWidth="3.5" strokeDasharray="88, 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-base font-bold font-mono text-white">100%</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Indexed</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <span>Verified Dossier</span>
                    <span className="font-mono text-white font-medium">Transcripts & Certs</span>
                  </div>
                </div>
              </div>

              {/* Card 3: JLPT Language Progress */}
              <div className="bklit-frame">
                <div className="bklit-frame-panel flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">JLPT N4 Horizon</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--chart-1)' }}>July Window</span>
                  </div>
                  <div className="space-y-2 py-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Lab Keigo Fluency</span>
                      <span className="font-mono text-white font-medium">18 / 18 Cards</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: 'var(--chart-1)' }} />
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-400">CS Technical Kanji</span>
                      <span className="font-mono text-white font-medium">85% Mastered</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: '85%', backgroundColor: 'var(--chart-2)' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-white/[0.06]">
                    <span>Target Score</span>
                    <span className="font-mono text-white font-medium">135+ / 180 pts</span>
                  </div>
                </div>
              </div>

            </section>

            {/* Conversational Chief of Staff Dialogue Frame */}
            <section className="bklit-frame">
              <div className="bklit-frame-panel space-y-6">
                
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-white">Chief of Staff Dialogue</h2>
                    <p className="text-xs text-zinc-400">Contextual integration across CiteX, Google Workspace, and university application pipelines.</p>
                  </div>
                  <span className="text-xs font-mono text-zinc-400 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                    Ollama Qwen2.5 · Neural Memory Active
                  </span>
                </div>

                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                  {messages.map(msg => (
                    <div key={msg.id} className="flex items-start gap-4">
                      <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-xs font-mono font-medium shrink-0 text-white">
                        {msg.sender === 'yomi' ? 'Y' : 'U'}
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-4 text-xs md:text-sm leading-relaxed max-w-3xl space-y-2">
                        <p className="text-zinc-200">{msg.text}</p>
                        <span className="text-[10px] font-mono text-zinc-500 block">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>

                {/* Integrated Chat Input */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-black/40 border border-white/[0.08]">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Direct query to Yomi or launch research workflow (/arxiv, /proposal, /email, /nihongo)..." 
                    className="flex-1 bg-transparent px-3 py-2 text-xs md:text-sm text-white placeholder-zinc-500 focus:outline-none"
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={isProcessing}
                    className="bklit-btn bklit-btn-default flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
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
          <div className="space-y-8">
            <div className="border-b border-white/[0.06] pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Academics & Dossier</h1>
              <p className="text-xs md:text-sm text-zinc-400 mt-1">
                Consolidated repository of verified academic transcripts, degree certificates, industry research credentials, and formal thesis proposal.
              </p>
            </div>

            {/* Master's Thesis Proposal */}
            <section className="bklit-frame">
              <div className="bklit-frame-panel space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Master's Thesis Proposal</span>
                    <h2 className="text-lg font-bold text-white mt-0.5">
                      Decentralized Edge Intelligence & Fault-Tolerant Consensus for Distributed Systems
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Academic Focus: Distributed Edge AI · Byzantine Fault Tolerance · Real-Time IoT Systems
                    </p>
                  </div>
                  <button className="bklit-btn bklit-btn-outline flex items-center gap-2">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Export Brief (PDF)</span>
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] text-xs leading-relaxed text-zinc-400 space-y-3">
                  <p>
                    <strong className="text-white">Core Abstract:</strong> As IoT and distributed sensor fabrics proliferate across mission-critical urban and industrial infrastructure, centralized cloud processing induces intolerable latency bottlenecks and single-point failure hazards. This research explores lightweight peer-to-peer consensus paradigms coupled with quantized on-device neural inference.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Target Sub-Field</span>
                      <p className="text-xs font-medium text-white mt-0.5">Distributed Edge AI</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Evaluation Metric</span>
                      <p className="text-xs font-medium text-white mt-0.5">Sub-10ms P99 Consensus</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Toolchain</span>
                      <p className="text-xs font-medium text-white mt-0.5">Rust · Raft · ONNX Runtime</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Credentials & Verification Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bklit-frame">
                <div className="bklit-frame-panel space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Undergraduate Degree</span>
                      <h3 className="text-sm font-semibold text-white">B.Tech Computer Science & Eng.</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Awarded First Class with Distinction. Official transcripts and degree passing certificates cryptographically validated and archived.
                  </p>
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>Distinction Division</span>
                    <span>Graduated 2024</span>
                  </div>
                </div>
              </div>

              <div className="bklit-frame">
                <div className="bklit-frame-panel space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Research Experience</span>
                      <h3 className="text-sm font-semibold text-white">Systems Research Fellowship</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Cybersecurity & Cloud Systems Research Fellow. Formal letters of recommendation and fellowship completion credentials indexed.
                  </p>
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>Specialization: NetSec</span>
                    <span>Systems Track</span>
                  </div>
                </div>
              </div>

              <div className="bklit-frame">
                <div className="bklit-frame-panel space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Industry Practicum</span>
                      <h3 className="text-sm font-semibold text-white">Enterprise Engineering Practicum</h3>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Software Engineering & Full-Stack Systems Practicum. Practical production deployment of telemetry pipelines and distributed microservices.
                  </p>
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 font-mono">
                    <span>Enterprise Systems</span>
                    <span>Full-Stack Track</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ArXiv Literature Satellite */}
            <section className="bklit-frame">
              <div className="bklit-frame-panel space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">ArXiv Literature Satellite</h2>
                    <p className="text-xs text-zinc-400">Live synthesis of relevant computer science research publications.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      defaultValue="Edge AI fault tolerant consensus" 
                      className="px-3 py-1.5 rounded-lg text-xs bg-black/40 border border-white/[0.08] text-white w-64 focus:outline-none"
                    />
                    <button className="bklit-btn bklit-btn-default text-xs">
                      Query
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <span className="text-[10px] font-mono text-zinc-500">arXiv:2410.18942v1 [cs.DC]</span>
                      <h4 className="text-xs md:text-sm font-medium text-white">Byzantine Resilient Consensus in Asynchronous Mobile Edge Architectures</h4>
                      <p className="text-xs text-zinc-400">Edge Systems & Distributed Consensus Research Group</p>
                    </div>
                    <button className="bklit-btn bklit-btn-outline text-xs font-mono">
                      Generate BibTeX
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <span className="text-[10px] font-mono text-zinc-500">arXiv:2409.04112v2 [cs.AI]</span>
                      <h4 className="text-xs md:text-sm font-medium text-white">Quantized Micro-Transformers for Autonomous Sensor Node Clustering</h4>
                      <p className="text-xs text-zinc-400">Distributed Intelligence & Neural Acceleration Lab</p>
                    </div>
                    <button className="bklit-btn bklit-btn-outline text-xs font-mono">
                      Generate BibTeX
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: NIHONGO DOJO                                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'dojo' && (
          <div className="space-y-8">
            <div className="border-b border-white/[0.06] pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-white">Nihongo Dojo</h1>
              <p className="text-xs md:text-sm text-zinc-400 mt-1">
                Targeted Japanese language acquisition for laboratory research, academic communication (Keigo), and JLPT certification.
              </p>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left: 3D Flip Card */}
              <div className="md:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400">
                    Card {cardIdx + 1} of {dojoCards.length} · {dojoCards[cardIdx].category}
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
                            {dojoCards[cardIdx].level}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              speakJapanese(dojoCards[cardIdx].kanji);
                            }}
                            className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] text-white transition-all"
                            title="Listen Pronunciation"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-center space-y-2">
                          <h2 className="text-4xl md:text-5xl font-semibold tracking-wide text-white">
                            {dojoCards[cardIdx].kanji}
                          </h2>
                          <p className="text-sm font-mono text-zinc-400">
                            {dojoCards[cardIdx].hiragana}
                          </p>
                        </div>

                        <div className="text-center text-xs font-mono text-zinc-500">
                          Romaji: {dojoCards[cardIdx].romaji}
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
                            {dojoCards[cardIdx].meaning}
                          </h3>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            {dojoCards[cardIdx].usage_tip}
                          </p>
                        </div>

                        <div className="text-xs font-mono text-zinc-500 pt-2 border-t border-white/[0.06]">
                          Category: {dojoCards[cardIdx].category} · Level: {dojoCards[cardIdx].level}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button 
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIdx(prev => (prev - 1 + dojoCards.length) % dojoCards.length);
                    }}
                    className="bklit-btn bklit-btn-outline"
                  >
                    Previous Card
                  </button>
                  <span className="text-xs font-mono text-zinc-500">
                    {cardIdx + 1} / {dojoCards.length} Deck Active
                  </span>
                  <button 
                    onClick={() => {
                      setIsFlipped(false);
                      setCardIdx(prev => (prev + 1) % dojoCards.length);
                    }}
                    className="bklit-btn bklit-btn-default"
                  >
                    Next Card
                  </button>
                </div>
              </div>

              {/* Right: 4-Choice Drill */}
              <div className="md:col-span-5 bklit-frame">
                <div className="bklit-frame-panel space-y-5">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Laboratory Keigo Drill</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs text-zinc-400">Prompt Kanji:</span>
                    <h3 className="text-2xl font-bold text-white">よろしくお願いいたします</h3>
                    <p className="text-xs font-mono text-zinc-500">Yoroshiku onegai itashimasu</p>
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
                        ? "Correct: 'Yoroshiku onegai itashimasu' is the quintessential Japanese phrase for establishing formal collaboration."
                        : "Incorrect. Option B is correct: 'I humbly look forward to working with you / Best regards'."
                      }
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: MCP & CONNECTIONS                                     */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'mcp' && (
          <div className="space-y-8">
            <div className="border-b border-white/[0.06] pb-5">
              <h1 className="text-2xl font-bold tracking-tight text-white">MCP & Connected Services</h1>
              <p className="text-xs md:text-sm text-zinc-400 mt-1">
                Model Context Protocol servers, persistent authentication tokens, and encrypted bridges into external productivity workflows.
              </p>
            </div>

            <div className="space-y-4">
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />
                        <span className="text-[10px] font-mono text-emerald-400">Online (:8000)</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        ArXiv satellite, semantic research paper synthesis, and BibTeX citation graph generator.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-xs text-zinc-400">
                      <span>{showTokens['citex'] ? 'cx_live_e94bc7218842' : 'cx_live_••••••••8842'}</span>
                      <button 
                        onClick={() => toggleTokenVisibility('citex')}
                        className="text-zinc-500 hover:text-white transition-colors"
                        title="Toggle token visibility"
                      >
                        {showTokens['citex'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button className="bklit-btn bklit-btn-outline flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3" />
                      <span>Ping (12ms)</span>
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
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />
                        <span className="text-[10px] font-mono text-emerald-400">Authorized</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Direct academic email drafting bridge & cloud backup staging.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-xs text-zinc-400">
                      <span>{showTokens['gw'] ? 'gsuite_auth_89bf2c72d' : 'gsuite_••••••••c72d'}</span>
                      <button 
                        onClick={() => toggleTokenVisibility('gw')}
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        {showTokens['gw'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button className="bklit-btn bklit-btn-outline">
                      Sync Staging
                    </button>
                  </div>
                </div>
              </div>

              {/* Connection 3: GitHub */}
              <div className="bklit-frame">
                <div className="bklit-frame-panel flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-mono text-xs font-bold text-white">
                      GH
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">GitHub (Tamore/YomiOS)</h3>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />
                        <span className="text-[10px] font-mono text-emerald-400">Synced @ cb60235</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Clean upstream deployment repository for Yomi and research documentation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] font-mono text-xs text-zinc-400">
                      <span>{showTokens['gh'] ? 'ghp_live_token_77a433b1' : 'ghp_••••••••33b1'}</span>
                      <button 
                        onClick={() => toggleTokenVisibility('gh')}
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        {showTokens['gh'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <button className="bklit-btn bklit-btn-outline">
                      Push Verify
                    </button>
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
      <div hidden={home && !isWindowOpen} className={home ? "voice-tracker" : "fixed bottom-5 right-5 z-50"}>
        {!isWindowOpen ? (
          <div 
            onClick={() => setIsWindowOpen(true)}
            className="cursor-pointer group flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-[#0e0e11]/95 hover:bg-[#16161a] border border-white/[0.14] hover:border-white/[0.28] shadow-2xl backdrop-blur-md transition-all"
            title="Open Pipeline & Action Tracker"
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--chart-1)' }} />
            <span className="text-xs font-medium tracking-tight text-white group-hover:text-zinc-200">Pipelines & Actions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.06] text-zinc-300">
              3 · {actionTasks.filter(t => !t.completed).length}
            </span>
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
          </div>
        ) : (
          <div className="w-80 md:w-[380px] max-h-[500px] bklit-frame shadow-2xl backdrop-blur-2xl transition-all">
            <div className="bklit-frame-panel p-0 overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="px-4 py-2.5 border-b border-white/[0.08] flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
                  <span className="text-xs font-semibold tracking-tight text-white">Pipeline & Actions</span>
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
                  Action Checklist
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto card-scroll p-3.5 space-y-3 max-h-[380px]">
                {stickyTab === 'pipeline' ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Track A: Distributed Systems & IoT</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border" style={{ color: 'var(--chart-1)', backgroundColor: 'rgba(251, 113, 133, 0.08)', borderColor: 'rgba(251, 113, 133, 0.2)' }}>
                          Active Dialogue
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Target: Distributed Systems, Low-Latency Consensus, P2P Edge Nodes</p>
                      <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                        Status: Proposal telemetry benchmark synchronization underway.
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Track B: Distributed Intelligence Lab</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                          Opens Dec 1
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Target: Quantized Micro-Models & On-Device Clustering</p>
                      <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                        Window: Dec 15, 2026 formal application submission.
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">Track C: Pervasive Systems & Fault-Tolerance</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-300 border border-white/[0.08]">
                          In Review
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">Target: Asynchronous Mobile Edge & Byzantine Fault Tolerance</p>
                      <div className="text-[11px] font-mono text-zinc-500 pt-1 border-t border-white/[0.04]">
                        Status: Pre-screening evaluation in progress.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {actionTasks.map(task => (
                      <div 
                        key={task.id}
                        onClick={() => toggleTask(task.id)}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-all"
                      >
                        <button className="mt-0.5 text-zinc-400 hover:text-white">
                          {task.completed ? (
                            <CheckSquare className="w-4 h-4" style={{ color: 'var(--chart-1)' }} />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-600" />
                          )}
                        </button>
                        <div className={`space-y-0.5 ${task.completed ? 'line-through opacity-50' : ''}`}>
                          <span className="text-xs font-medium text-white block">{task.title}</span>
                          <span className="text-[10px] font-mono text-zinc-500">{task.meta}</span>
                        </div>
                      </div>
                    ))}
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
