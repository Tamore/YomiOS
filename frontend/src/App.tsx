import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, Target, CheckCircle2, Circle, 
  FileText, Download, Bot, Play, Trash2, 
  Cpu, Battery, Mic, Send, BookOpen, Volume2, 
  Code, Copy, Check, RefreshCw, 
  School, HelpCircle, HardDrive, Mail
} from 'lucide-react';

interface Domain {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
}

interface Project {
  id: string;
  domain_id: string;
  domain_name?: string;
  title: string;
  status: string;
  progress: number;
  target_date?: string;
}

interface Task {
  id: string;
  domain_id?: string;
  project_id?: string;
  domain_name?: string;
  project_title?: string;
  title: string;
  priority: string;
  is_completed: number;
  due_date?: string;
}

interface Subagent {
  id: string;
  name: string;
  role: string;
  prompt_template: string;
  tools_bound: string[];
  schedule: string;
  status: string;
  last_run?: string;
  last_output?: string;
}

interface Telemetry {
  cpu_percent: number;
  cpu_cores?: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_free_gb?: number;
  disk_percent?: number;
  disk_used_gb?: number;
  disk_total_gb?: number;
  battery_percent: number;
  is_charging: boolean;
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

interface JapaneseQuiz {
  question_id: string;
  prompt_kanji: string;
  prompt_hiragana: string;
  prompt_romaji: string;
  category: string;
  correct_answer: string;
  options: string[];
  usage_tip: string;
}

interface UniversitySummary {
  id: string;
  name: string;
  program: string;
  advisors: Array<{
    name: string;
    lab: string;
    email?: string;
    topics: string[];
    status?: string;
  }>;
  deadlines: Array<{
    event: string;
    date: string;
    days_left: number;
    urgent: boolean;
  }>;
  portal: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'yomi';
  text: string;
  data?: any;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'academic' | 'admissions' | 'japanese' | 'system'>('chat');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subagents, setSubagents] = useState<Subagent[]>([]);
  const [admissions, setAdmissions] = useState<UniversitySummary[]>([]);
  const [telemetry, setTelemetry] = useState<Telemetry>({
    cpu_percent: 18,
    ram_percent: 42,
    ram_used_gb: 6.8,
    ram_total_gb: 16.0,
    disk_percent: 48,
    battery_percent: 100,
    is_charging: true
  });

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'yomi',
      text: "System online. Bklit Executive HUD initialized. Research Satellites, Admissions Horizon, Japanese Dojo & MCP Bridges are all primed.",
      timestamp: "Just now"
    }
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Japanese Dojo State
  const [japaneseCards, setJapaneseCards] = useState<JapaneseCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [japaneseCategory, setJapaneseCategory] = useState<string>("all");
  const [activeQuiz, setActiveQuiz] = useState<JapaneseQuiz | null>(null);
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  // Admissions & Email Drafter State
  const [selectedProfForEmail, setSelectedProfForEmail] = useState("Hiroaki Fukuda");
  const [selectedUniForEmail, setSelectedUniForEmail] = useState("Shibaura Institute of Technology");
  const [emailPurpose, setEmailPurpose] = useState("inquiry");
  const [draftedEmail, setDraftedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Code Sandbox State
  const [sandboxCode, setSandboxCode] = useState<string>(
`# Distributed Consensus Byzantine Threshold Formula
# n >= 3f + 1
def calculate_byzantine_fault_tolerance(total_nodes):
    max_faulty = (total_nodes - 1) // 3
    quorom_size = 2 * max_faulty + 1
    return {
        "nodes": total_nodes,
        "max_byzantine_faults": max_faulty,
        "required_quorum": quorom_size,
        "safety_margin": f"{round((max_faulty/total_nodes)*100, 1)}%"
    }

print(calculate_byzantine_fault_tolerance(10))`
  );
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isExecutingCode, setIsExecutingCode] = useState(false);

  // CiteX MCP State
  const [citexOnline, setCitexOnline] = useState<boolean>(false);
  const [citexQuery, setCitexQuery] = useState("");
  const [isDispatchingCitex, setIsDispatchingCitex] = useState(false);

  // Academic Search State
  const [researchQuery, setResearchQuery] = useState("");
  const [isSearchingPaper, setIsSearchingPaper] = useState(false);

  // Subagents State
  const [newAgentPrompt, setNewAgentPrompt] = useState("");
  const [isSpawningAgent, setIsSpawningAgent] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInitialState();
    fetchJapaneseCards();
    checkCitexStatus();

    const ws = new WebSocket("ws://127.0.0.1:8765/ws");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'INITIAL_STATE' || data.type === 'STATE_UPDATE') {
          updateStateFromPayload(data.payload);
        } else if (data.type === 'CHAT_REPLY') {
          const reply = data.payload;
          setMessages(prev => [
            ...prev,
            {
              id: Date.now().toString(),
              sender: 'yomi',
              text: reply.reply,
              data: reply.data,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };
    return () => ws.close();
  }, []);

  const fetchInitialState = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8765/api/state");
      if (res.ok) {
        const data = await res.json();
        updateStateFromPayload(data);
      }
    } catch (e) {
      console.log("Backend offline or booting...", e);
    }
  };

  const updateStateFromPayload = (payload: any) => {
    if (payload.domains) setDomains(payload.domains);
    if (payload.projects) setProjects(payload.projects);
    if (payload.tasks) setTasks(payload.tasks);
    if (payload.subagents) setSubagents(payload.subagents);
    if (payload.telemetry) setTelemetry(payload.telemetry);
    if (payload.admissions) setAdmissions(payload.admissions);
  };

  const fetchJapaneseCards = async (cat?: string) => {
    try {
      const url = cat && cat !== "all" 
        ? `http://127.0.0.1:8765/api/japanese/cards?category=${cat}` 
        : "http://127.0.0.1:8765/api/japanese/cards";
      const res = await fetch(url);
      if (res.ok) {
        const cards = await res.json();
        setJapaneseCards(cards);
        setCurrentCardIndex(0);
        setIsCardFlipped(false);
      }
    } catch (e) {
      console.error("Failed to load cards", e);
    }
  };

  const checkCitexStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8765/api/mcp/citex/status");
      if (res.ok) {
        const data = await res.json();
        setCitexOnline(data.online === true);
      }
    } catch (e) {
      setCitexOnline(false);
    }
  };

  const speakJapanese = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85; // slightly slower for optimal clarity
      window.speechSynthesis.speak(utterance);
    }
  };

  const startJapaneseQuiz = async () => {
    try {
      const url = japaneseCategory && japaneseCategory !== "all"
        ? `http://127.0.0.1:8765/api/japanese/quiz?category=${japaneseCategory}`
        : "http://127.0.0.1:8765/api/japanese/quiz";
      const res = await fetch(url);
      if (res.ok) {
        const q = await res.json();
        setActiveQuiz(q);
        setQuizSelectedOption(null);
        setQuizFeedback(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const answerQuiz = (option: string) => {
    if (!activeQuiz) return;
    setQuizSelectedOption(option);
    if (option === activeQuiz.correct_answer) {
      setQuizFeedback("正解! Excellent! That is the exact correct meaning.");
    } else {
      setQuizFeedback(`不合格. The correct meaning is: "${activeQuiz.correct_answer}".`);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) {
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSendMessage(transcript);
      };
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setInput("");
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch("http://127.0.0.1:8765/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'yomi',
            text: data.reply,
            data: data.data,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'yomi',
          text: "I am having trouble reaching the local core brain. Let's make sure the backend server is active.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      await fetch(`http://127.0.0.1:8765/api/tasks/${taskId}/toggle`, { method: "POST" });
    } catch (e) {
      console.error(e);
    }
  };

  const executeSandbox = async () => {
    if (!sandboxCode.trim() || isExecutingCode) return;
    setIsExecutingCode(true);
    try {
      const res = await fetch("http://127.0.0.1:8765/api/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sandboxCode })
      });
      if (res.ok) {
        const data = await res.json();
        setSandboxResult(data);
      }
    } catch (e) {
      setSandboxResult({ success: false, stderr: String(e), stdout: "" });
    } finally {
      setIsExecutingCode(false);
    }
  };

  const handleDraftEmail = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8765/api/admissions/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professor_name: selectedProfForEmail,
          university_name: selectedUniForEmail,
          research_topic: "Self-Adaptive Distributed Systems & Fault-Tolerant Multi-Agent Architectures",
          purpose: emailPurpose
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDraftedEmail(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const triggerAcademicSearch = async () => {
    if (!researchQuery.trim() || isSearchingPaper) return;
    setIsSearchingPaper(true);
    try {
      const res = await fetch("http://127.0.0.1:8765/api/academic/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: researchQuery })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'yomi',
            text: `Retrieved primary paper: **${data.paper.title}** (${data.paper.year}). Synthesized research brief to \`${data.pdf_filename}\`.`,
            data: data,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setActiveTab('chat');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearchingPaper(false);
      setResearchQuery("");
    }
  };

  const dispatchCitexResearch = async () => {
    if (!citexQuery.trim() || isDispatchingCitex) return;
    setIsDispatchingCitex(true);
    try {
      const res = await fetch("http://127.0.0.1:8765/api/mcp/citex/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: citexQuery, max_papers: 4 })
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'yomi',
            text: `CiteX Autonomous Engine synthesized literature review for **${citexQuery}** across multi-source preprints!`,
            data: data,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setActiveTab('chat');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDispatchingCitex(false);
      setCitexQuery("");
    }
  };

  const activeCard = japaneseCards[currentCardIndex] || null;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-white/20 selection:text-white">
      
      {/* 1. Frosted Navigation Bar */}
      <header className="h-14 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-sm tracking-widest text-zinc-300 font-semibold uppercase">Yomi OS 2.0</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-400 font-mono">Bklit Engine</span>
          {citexOnline && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> CiteX Bridge Active
            </span>
          )}
        </div>

        {/* 5 Segmented Navigation Hubs */}
        <nav className="flex items-center gap-1 bg-[#121215] p-1 rounded-lg border border-white/[0.06]">
          {[
            { id: 'chat', label: 'Intelligence HUD', icon: Terminal },
            { id: 'admissions', label: 'Admissions & Labs', icon: School },
            { id: 'japanese', label: 'Nihongo Dojo', icon: Volume2 },
            { id: 'academic', label: 'Academic & CiteX', icon: BookOpen },
            { id: 'system', label: 'System & Sandbox', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                  isActive 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-zinc-100' : 'text-zinc-400'} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Telemetry Micro-Pill */}
        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Cpu size={13} className="text-zinc-400" />
            <span>{telemetry.cpu_percent}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive size={13} className="text-zinc-400" />
            <span>{telemetry.ram_used_gb} GB</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Battery size={13} className="text-zinc-400" />
            <span>{telemetry.battery_percent}%</span>
          </div>
        </div>
      </header>

      {/* 2. Main Work Canvas */}
      <main className="flex-1 overflow-hidden relative">

        {/* TAB 1: INTELLIGENCE HUD */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col max-w-4xl mx-auto px-6 py-6 justify-between">
            {/* Scrollable Chat Stream */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                        {isUser ? 'Nirmiti' : 'Yomi Chief of Staff'}
                      </span>
                      <span className="text-[10px] text-zinc-400">{m.timestamp}</span>
                    </div>

                    <div className={`p-4 rounded-xl text-sm leading-relaxed max-w-[85%] border transition-all ${
                      isUser 
                        ? 'bg-zinc-900 border-white/[0.08] text-zinc-100 shadow-sm' 
                        : 'bg-[#121215] border-white/[0.06] text-zinc-200'
                    }`}>
                      <div className="whitespace-pre-wrap">{m.text}</div>

                      {/* Download PDF Artifact Card */}
                      {m.data && m.data.pdf_filename && (
                        <div className="mt-3.5 p-3 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText size={18} className="text-emerald-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-mono text-zinc-200 truncate">{m.data.pdf_filename}</p>
                              <p className="text-[10px] text-zinc-400">Compiled Executive Research Brief</p>
                            </div>
                          </div>
                          <a
                            href={`http://127.0.0.1:8765/api/exports/${m.data.pdf_filename}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium rounded-md text-white transition-colors"
                          >
                            <Download size={13} /> Download PDF
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Action Chips & Floating Input Capsule */}
            <div className="mt-4 shrink-0 space-y-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  "Check admissions deadlines",
                  "Japanese quiz",
                  "Match lab Fukuda",
                  "Draft email to Prof Fukuda",
                  "Proposal stats",
                  "CiteX status"
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleSendMessage(chip)}
                    className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Floating Input Capsule */}
              <div className="relative flex items-center bg-[#121215] border border-white/[0.08] rounded-xl px-3 py-2 shadow-lg focus-within:border-white/20 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask Yomi, test Japanese, execute Python, or dispatch research..."
                  className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none px-2"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={toggleListening}
                    className={`p-2 rounded-lg transition-all ${
                      isListening ? 'bg-rose-500/30 text-rose-300 animate-pulse' : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                    }`}
                    title="Voice dictation"
                  >
                    <Mic size={15} />
                  </button>
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isProcessing}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADMISSIONS & LABS */}
        {activeTab === 'admissions' && (
          <div className="h-full overflow-y-auto max-w-5xl mx-auto px-6 py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-100">AY2027 Japan Admissions Radar</h2>
                <p className="text-xs text-zinc-400 mt-1">Live tracking for verified prospective universities, deadlines, and faculty alignment.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                  {domains.length} Domains Active
                </span>
                <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                  {projects.length} Roadmaps Tracked
                </span>
              </div>
            </div>

            {/* University Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {admissions.map((uni) => (
                <div key={uni.id} className="p-4 rounded-xl bg-[#121215] border border-white/[0.08] flex flex-col justify-between hover:border-white/20 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-zinc-100">{uni.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-400">
                        {uni.portal}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{uni.program}</p>

                    {/* Advisors list */}
                    <div className="mt-3 space-y-2">
                      {uni.advisors.map((adv) => (
                        <div key={adv.name} className="p-2.5 rounded-lg bg-zinc-900 border border-white/[0.04]">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-emerald-400">{adv.name}</span>
                            <button
                              onClick={() => {
                                setSelectedProfForEmail(adv.name);
                                setSelectedUniForEmail(uni.name);
                                handleDraftEmail();
                              }}
                              className="text-[10px] text-zinc-400 hover:text-white underline font-mono"
                            >
                              Draft Reachout
                            </button>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{adv.lab}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {adv.topics.slice(0, 3).map((t) => (
                              <span key={t} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-300">
                                {t}
                              </span>
                            ))}
                          </div>
                          {adv.status && (
                            <p className="text-[10px] text-amber-400/90 mt-2 font-mono">
                              Status: {adv.status}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deadlines footer */}
                  {uni.deadlines.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">{uni.deadlines[0].event}:</span>
                      <span className={uni.deadlines[0].urgent ? "text-amber-400 font-semibold" : "text-zinc-300"}>
                        {uni.deadlines[0].date} ({uni.deadlines[0].days_left}d left)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Academic Email Drafter Panel */}
            <div className="p-5 rounded-xl bg-[#121215] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    <School size={16} className="text-emerald-400" /> Academic Reachout & Email Drafter
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Formats formal correspondence adhering to Japanese institutional etiquette.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={emailPurpose}
                    onChange={(e) => setEmailPurpose(e.target.value)}
                    className="bg-zinc-900 border border-white/[0.08] text-xs rounded-lg px-2.5 py-1.5 text-zinc-200"
                  >
                    <option value="inquiry">Initial Inquiry / Proposal</option>
                    <option value="followup">Follow-up / Documentation</option>
                  </select>
                  <button
                    onClick={handleDraftEmail}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition-all"
                  >
                    Generate Email
                  </button>
                </div>
              </div>

              {draftedEmail && (
                <div className="p-4 rounded-lg bg-zinc-900 border border-white/[0.08] space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="text-xs font-mono text-zinc-300">Subject: {draftedEmail.subject}</span>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedProfForEmail === 'Hiroaki Fukuda' ? 'hiroaki@shibaura-it.ac.jp' : '')}&su=${encodeURIComponent(draftedEmail.subject)}&body=${encodeURIComponent(draftedEmail.body)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 hover:text-emerald-300"
                      >
                        <Mail size={13} /> Open in Gmail
                      </a>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${draftedEmail.subject}\n\n${draftedEmail.body}`);
                          setCopiedEmail(true);
                          setTimeout(() => setCopiedEmail(false), 2000);
                        }}
                        className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white"
                      >
                        {copiedEmail ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        {copiedEmail ? "Copied!" : "Copy Full Text"}
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">
                    {draftedEmail.body}
                  </pre>
                </div>
              )}
            </div>

            {/* Active Task Matrix */}
            <div className="p-5 rounded-xl bg-[#121215] border border-white/[0.08] space-y-3">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Target size={16} className="text-indigo-400" /> Master's Execution Task Matrix
              </h3>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900 border border-white/[0.04] hover:border-white/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      {task.is_completed ? (
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      ) : (
                        <Circle size={16} className="text-zinc-400" />
                      )}
                      <span className={`text-xs ${task.is_completed ? 'line-through text-zinc-400' : 'text-zinc-200'}`}>
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NIHONGO DOJO (LANGUAGE LEARNING) */}
        {activeTab === 'japanese' && (
          <div className="h-full overflow-y-auto max-w-4xl mx-auto px-6 py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
                  🎌 Nihongo Dojo (日本語)
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Academic Lab Keigo, JLPT N5/N4 Grammar, and CS Tech terms with offline audio pronunciation.</p>
              </div>
              <button
                onClick={startJapaneseQuiz}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-500/30 transition-all flex items-center gap-1.5"
              >
                <HelpCircle size={14} /> Start Quiz Mode
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { id: "all", label: "All Curricula" },
                { id: "lab_keigo", label: "🔬 Academic Lab Keigo" },
                { id: "tech_cs", label: "💻 Tech & CS Vocab" },
                { id: "jlpt_n5_n4", label: "⛩️ JLPT N5/N4 Patterns" },
                { id: "daily_life", label: "🍱 Daily Living in Japan" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setJapaneseCategory(c.id);
                    fetchJapaneseCards(c.id);
                  }}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    japaneseCategory === c.id
                      ? "bg-white text-zinc-950 font-semibold border-white"
                      : "bg-[#121215] text-zinc-400 hover:text-white border-white/[0.08]"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Interactive Flashcard with Flip Animation */}
            {activeCard && !activeQuiz && (
              <div className="flex flex-col items-center justify-center space-y-4 my-6">
                <div
                  onClick={() => setIsCardFlipped(!isCardFlipped)}
                  className="w-full max-w-lg min-h-[260px] p-8 rounded-2xl bg-[#121215] border border-white/[0.08] hover:border-white/20 shadow-xl cursor-pointer flex flex-col justify-between transition-all duration-300 hover:scale-[1.01]"
                >
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                    <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-300">
                      {activeCard.level}
                    </span>
                    <span>Click card to {isCardFlipped ? "view Kanji" : "reveal meaning"}</span>
                  </div>

                  {/* Card Front (Kanji & Hiragana) */}
                  {!isCardFlipped ? (
                    <div className="text-center py-6 space-y-3">
                      <h3 className="text-2xl md:text-3xl font-semibold text-zinc-100 tracking-wide">
                        {activeCard.kanji}
                      </h3>
                      <p className="text-sm font-normal text-emerald-400">
                        {activeCard.hiragana}
                      </p>
                      <p className="text-xs font-mono text-zinc-400">
                        {activeCard.romaji}
                      </p>
                    </div>
                  ) : (
                    /* Card Back (English Meaning & Usage Tip) */
                    <div className="text-center py-6 space-y-3">
                      <h4 className="text-lg font-medium text-emerald-300">
                        {activeCard.meaning}
                      </h4>
                      <p className="text-xs text-zinc-400 max-w-md mx-auto italic leading-relaxed">
                        💡 {activeCard.usage_tip}
                      </p>
                    </div>
                  )}

                  {/* Footer Audio Control */}
                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJapanese(activeCard.kanji);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-200 transition-colors"
                    >
                      <Volume2 size={14} className="text-emerald-400" /> Pronounce (Native Audio)
                    </button>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Card {currentCardIndex + 1} of {japaneseCards.length}
                    </span>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setIsCardFlipped(false);
                      setCurrentCardIndex((prev) => (prev > 0 ? prev - 1 : japaneseCards.length - 1));
                    }}
                    className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 text-xs font-medium text-zinc-300"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => {
                      setIsCardFlipped(false);
                      const rand = Math.floor(Math.random() * japaneseCards.length);
                      setCurrentCardIndex(rand);
                    }}
                    className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-1"
                  >
                    <RefreshCw size={13} /> Random
                  </button>
                  <button
                    onClick={() => {
                      setIsCardFlipped(false);
                      setCurrentCardIndex((prev) => (prev < japaneseCards.length - 1 ? prev + 1 : 0));
                    }}
                    className="px-4 py-2 rounded-lg bg-zinc-900 border border-white/[0.08] hover:bg-zinc-800 text-xs font-medium text-zinc-300"
                  >
                    Next Card
                  </button>
                </div>
              </div>
            )}

            {/* Quiz Mode Interface */}
            {activeQuiz && (
              <div className="p-6 rounded-2xl bg-[#121215] border border-white/[0.08] max-w-lg mx-auto space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Interactive Quiz Mode</span>
                  <button
                    onClick={() => setActiveQuiz(null)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Exit Quiz
                  </button>
                </div>

                <div className="text-center py-2 space-y-1">
                  <h3 className="text-2xl font-bold text-zinc-100">{activeQuiz.prompt_kanji}</h3>
                  <p className="text-xs text-emerald-400">{activeQuiz.prompt_hiragana}</p>
                  <p className="text-xs font-mono text-zinc-400">{activeQuiz.prompt_romaji}</p>
                </div>

                <div className="space-y-2">
                  {activeQuiz.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => answerQuiz(opt)}
                      className={`w-full text-left p-3 rounded-lg text-xs font-medium border transition-all ${
                        quizSelectedOption === opt
                          ? opt === activeQuiz.correct_answer
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : "bg-rose-500/20 border-rose-500/40 text-rose-300"
                          : "bg-zinc-900 border-white/[0.06] text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {quizFeedback && (
                  <div className="p-3 rounded-lg bg-zinc-900 border border-white/[0.06] text-center space-y-2">
                    <p className="text-xs font-semibold text-zinc-200">{quizFeedback}</p>
                    <p className="text-[11px] text-zinc-400 italic">💡 {activeQuiz.usage_tip}</p>
                    <button
                      onClick={startJapaneseQuiz}
                      className="mt-2 px-3 py-1 rounded bg-white/[0.1] hover:bg-white/[0.18] text-xs font-medium text-white"
                    >
                      Next Question
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ACADEMIC & CITEX MCP */}
        {activeTab === 'academic' && (
          <div className="h-full overflow-y-auto max-w-4xl mx-auto px-6 py-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Academic Literature & CiteX MCP Engine</h2>
              <p className="text-xs text-zinc-400 mt-1">Autonomous multi-source preprint scraping, BibTeX generation, and IEEE PDF compiler.</p>
            </div>

            {/* CiteX MCP Control Capsule */}
            <div className="p-5 rounded-xl bg-[#121215] border border-white/[0.08] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${citexOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                  <span className="text-sm font-semibold text-zinc-200">CiteX Autonomous Research Engine</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                    {citexOnline ? "Port :8000 Connected" : "Offline"}
                  </span>
                </div>
                {!citexOnline && (
                  <button
                    onClick={async () => {
                      await fetch("http://127.0.0.1:8765/api/mcp/citex/launch", { method: "POST" });
                      setTimeout(checkCitexStatus, 3000);
                    }}
                    className="px-3 py-1 rounded bg-white/[0.08] hover:bg-white/[0.14] text-xs font-medium text-white transition-colors"
                  >
                    Launch CiteX Engine
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={citexQuery}
                  onChange={(e) => setCitexQuery(e.target.value)}
                  placeholder="Dispatch multi-source research (e.g. self-adaptive microservices)..."
                  className="flex-1 bg-zinc-900 border border-white/[0.08] text-xs rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={dispatchCitexResearch}
                  disabled={!citexQuery.trim() || isDispatchingCitex}
                  className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-500/30 disabled:opacity-40"
                >
                  {isDispatchingCitex ? "Synthesizing..." : "Dispatch to CiteX"}
                </button>
              </div>
            </div>

            {/* ArXiv Research Satellite */}
            <div className="p-5 rounded-xl bg-[#121215] border border-white/[0.08] space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-400" /> ArXiv Satellite & PDF Brief Generator
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={researchQuery}
                  onChange={(e) => setResearchQuery(e.target.value)}
                  placeholder="Query topic or author (e.g., Kenji Tei self-adaptive systems)..."
                  className="flex-1 bg-zinc-900 border border-white/[0.08] text-xs rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={triggerAcademicSearch}
                  disabled={!researchQuery.trim() || isSearchingPaper}
                  className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-40"
                >
                  {isSearchingPaper ? "Searching..." : "Synthesize Brief"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM & CODE SANDBOX */}
        {activeTab === 'system' && (
          <div className="h-full overflow-y-auto max-w-4xl mx-auto px-6 py-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Python Code Sandbox & Subagents</h2>
              <p className="text-xs text-zinc-400 mt-1">Isolated computational REPL and autonomous worker execution runtime.</p>
            </div>

            {/* Python Code Sandbox */}
            <div className="p-5 rounded-xl bg-[#121215] border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <Code size={16} className="text-emerald-400" /> Python REPL & Computation Sandbox
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSandboxCode(
`# JASSO 3.0 Scale GPA Conversion Formula
def calculate_jasso_gpa(grade_points):
    # grade_points: list of course grades out of 10
    converted = [((g - 1) / 9.0) * 3.0 for g in grade_points]
    jasso_gpa = sum(converted) / len(converted)
    return {"original_avg": round(sum(grade_points)/len(grade_points), 2), "jasso_gpa": round(jasso_gpa, 2)}

print(calculate_jasso_gpa([8.5, 9.0, 7.8, 8.9, 9.2]))`
                    )}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-white/[0.04] text-zinc-400 hover:text-white"
                  >
                    Preset: JASSO GPA
                  </button>
                  <button
                    onClick={executeSandbox}
                    disabled={isExecutingCode}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 disabled:opacity-40"
                  >
                    {isExecutingCode ? "Executing..." : "Run Sandbox"}
                  </button>
                </div>
              </div>

              <textarea
                value={sandboxCode}
                onChange={(e) => setSandboxCode(e.target.value)}
                rows={7}
                className="w-full p-3 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs font-mono text-zinc-200 focus:outline-none focus:border-white/20 resize-y"
              />

              {sandboxResult && (
                <div className="p-3 rounded-lg bg-zinc-900 border border-white/[0.08] text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Execution Result:</span>
                    <span>{sandboxResult.execution_time_ms} ms</span>
                  </div>
                  <pre className="text-emerald-400 whitespace-pre-wrap">
                    {sandboxResult.stdout || sandboxResult.stderr || "Executed with zero output."}
                  </pre>
                </div>
              )}
            </div>

            {/* Sub-Agent Spawner & Workers Panel */}
            <div className="p-5 rounded-xl bg-[#121215] border border-white/[0.08] space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                <Bot size={16} className="text-indigo-400" /> Autonomous Sub-Agents
              </h3>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAgentPrompt}
                  onChange={(e) => setNewAgentPrompt(e.target.value)}
                  placeholder="Deploy new worker (e.g. monitor SIT admission guidelines)..."
                  className="flex-1 bg-zinc-900 border border-white/[0.08] text-xs rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={async () => {
                    if (!newAgentPrompt.trim() || isSpawningAgent) return;
                    setIsSpawningAgent(true);
                    await fetch("http://127.0.0.1:8765/api/subagents", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ prompt: newAgentPrompt })
                    });
                    setIsSpawningAgent(false);
                    setNewAgentPrompt("");
                  }}
                  disabled={!newAgentPrompt.trim() || isSpawningAgent}
                  className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium hover:bg-indigo-500/30 disabled:opacity-40"
                >
                  Deploy Worker
                </button>
              </div>

              <div className="space-y-2 mt-3">
                {subagents.map((ag) => (
                  <div key={ag.id} className="p-3 rounded-lg bg-zinc-900 border border-white/[0.04] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-zinc-200">{ag.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">{ag.status}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{ag.role}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={async () => {
                          await fetch(`http://127.0.0.1:8765/api/subagents/${ag.id}/run`, { method: "POST" });
                        }}
                        className="p-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300"
                        title="Run agent"
                      >
                        <Play size={13} />
                      </button>
                      <button
                        onClick={async () => {
                          await fetch(`http://127.0.0.1:8765/api/subagents/${ag.id}`, { method: "DELETE" });
                        }}
                        className="p-1.5 rounded bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300"
                        title="Decommission"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
